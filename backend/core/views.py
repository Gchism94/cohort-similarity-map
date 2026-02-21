# backend/core/views.py
from __future__ import annotations

from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from core.models import Document, AnalysisRun, DocProjection, AuditEvent
from core.serializers import (
    DocumentSerializer,
    AnalysisRunSerializer,
    ProjectionPointSerializer,
)
from core.tasks import run_analysis
from core.neighbor import nearest_documents


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
def upload(request):
    cohort_key = request.data.get("cohort_key", "default")
    f = request.FILES.get("file")
    if not f:
        return Response({"error": "Missing file"}, status=status.HTTP_400_BAD_REQUEST)

    # Save under cohort prefix; works for local filesystem or S3 via default_storage
    stored_rel_path = default_storage.save(f"{cohort_key}/{f.name}", f)
    stored_name = stored_rel_path.split("/")[-1]

    doc = Document.objects.create(
        cohort_key=cohort_key,
        filename=f.name,  # compatibility
        original_filename=f.name,
        stored_name=stored_name,
        content_type=getattr(f, "content_type", "") or "",
        file_path=stored_rel_path,
        status="uploaded",
    )
    return Response(DocumentSerializer(doc).data)


@api_view(["GET"])
def documents(request):
    cohort_key = request.query_params.get("cohort_key", "default")
    qs = Document.objects.filter(cohort_key=cohort_key).order_by("-created_at")
    return Response(DocumentSerializer(qs, many=True).data)


@api_view(["POST"])
def start_run(request):
    cohort_key = request.data.get("cohort_key", "default")
    embedding_model = request.data.get(
        "embedding_model", "sentence-transformers/all-MiniLM-L6-v2"
    )
    umap_params = request.data.get(
        "umap_params",
        {"n_neighbors": 15, "min_dist": 0.1, "metric": "cosine", "random_state": 42},
    )

    run = AnalysisRun.objects.create(
        cohort_key=cohort_key,
        embedding_model=embedding_model,
        umap_params=umap_params,
        status="queued",
    )
    run_analysis.delay(run.id)
    return Response(AnalysisRunSerializer(run).data)


@api_view(["GET"])
def run_status(request, run_id: int):
    run = AnalysisRun.objects.get(id=run_id)
    return Response(AnalysisRunSerializer(run).data)


@api_view(["GET"])
def projection(request, run_id: int):
    section = request.query_params.get("section", "doc")
    pts = (
        DocProjection.objects.filter(run_id=run_id, section=section)
        .select_related("document")
        .order_by("id")
    )
    return Response(ProjectionPointSerializer(pts, many=True).data)


@api_view(["GET"])
def doc_detail(request, run_id: int, doc_id: int):
    section = request.query_params.get("section", "doc")
    k = int(request.query_params.get("k", 5))
    nn = nearest_documents(run_id=run_id, doc_id=doc_id, section=section, k=k)
    return Response({"doc_id": doc_id, "section": section, "neighbors": nn})


@api_view(["GET"])
def herd(request, run_id: int):
    run = AnalysisRun.objects.get(id=run_id)
    return Response(run.herd_phrases or {})


@api_view(["DELETE"])
def delete_cohort(request, cohort_key: str):
    actor = request.META.get("REMOTE_ADDR", "")

    docs = Document.objects.filter(cohort_key=cohort_key)
    n_docs = docs.count()

    # Delete stored files via default_storage (works for local or S3)
    for d in docs.only("file_path"):
        if d.file_path:
            try:
                default_storage.delete(d.file_path)
            except Exception:
                # Keep going; DB deletion still proceeds
                pass

    with transaction.atomic():
        docs.delete()
        AnalysisRun.objects.filter(cohort_key=cohort_key).delete()
        AuditEvent.objects.create(
            action="cohort_delete",
            cohort_key=cohort_key,
            actor=actor,
            detail={"documents_deleted": n_docs},
        )

    return Response({"cohort_key": cohort_key, "documents_deleted": n_docs})


@api_view(["GET"])
def list_runs(request):
    cohort_key = request.query_params.get("cohort_key", "default")
    qs = AnalysisRun.objects.filter(cohort_key=cohort_key).order_by("-created_at")
    return Response(AnalysisRunSerializer(qs, many=True).data)


@api_view(["POST"])
def rerun(request, run_id: int):
    base = AnalysisRun.objects.get(id=run_id)
    umap_params = request.data.get("umap_params", base.umap_params)
    label = request.data.get("label", f"rerun of {run_id}")

    run = AnalysisRun.objects.create(
        cohort_key=base.cohort_key,
        embedding_model=base.embedding_model,
        chunking_version=base.chunking_version,
        umap_params=umap_params,
        parent_run=base,
        label=label,
        status="queued",
    )
    AuditEvent.objects.create(
        action="run_rerun",
        cohort_key=run.cohort_key,
        detail={"base_run_id": base.id, "new_run_id": run.id, "umap_params": umap_params},
    )
    run_analysis.delay(run.id)
    return Response(AnalysisRunSerializer(run).data)