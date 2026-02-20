# backend/core/views.py
from __future__ import annotations
import os
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from core.models import Document, AnalysisRun, DocProjection
from core.serializers import DocumentSerializer, AnalysisRunSerializer, ProjectionPointSerializer
from core.tasks import run_analysis
from core.neighbor import nearest_documents

@api_view(["POST"])
def upload(request):
    cohort_key = request.data.get("cohort_key", "default")
    f = request.FILES.get("file")
    if not f:
        return Response({"error": "Missing file"}, status=status.HTTP_400_BAD_REQUEST)

    rel_path = os.path.join("uploads", cohort_key, f.name)
    abs_path = os.path.join(settings.MEDIA_ROOT, cohort_key)
    os.makedirs(abs_path, exist_ok=True)

    saved_path = default_storage.save(os.path.join(cohort_key, f.name), f)
    file_path = os.path.join(settings.MEDIA_ROOT, saved_path)

    doc = Document.objects.create(
        cohort_key=cohort_key,
        filename=f.name,
        content_type=getattr(f, "content_type", "") or "",
        file_path=file_path,
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
    embedding_model = request.data.get("embedding_model", "sentence-transformers/all-MiniLM-L6-v2")
    umap_params = request.data.get("umap_params", {"n_neighbors": 15, "min_dist": 0.1, "metric": "cosine", "random_state": 42})

    run = AnalysisRun.objects.create(
        cohort_key=cohort_key,
        embedding_model=embedding_model,
        umap_params=umap_params,
        status="pending",
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
    pts = DocProjection.objects.filter(run_id=run_id, section=section).select_related("document")
    return Response(ProjectionPointSerializer(pts, many=True).data)

@api_view(["GET"])
def doc_detail(request, run_id: int, doc_id: int):
    section = request.query_params.get("section", "doc")
    nn = nearest_documents(run_id=run_id, doc_id=doc_id, section=section, k=int(request.query_params.get("k", 5)))
    return Response({"doc_id": doc_id, "section": section, "neighbors": nn})
