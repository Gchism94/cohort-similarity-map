# backend/core/tasks.py
from __future__ import annotations
import os
import numpy as np
from celery import shared_task
from django.conf import settings
from django.db import transaction

from core.models import AnalysisRun, Document, DocEmbedding, DocProjection
from core.text_extract import extract_text
from core.scrub import scrub_pii
from core.embed import embed_text, l2_norm
from core.umap_project import project_umap, cluster_and_outliers

@shared_task
def run_analysis(run_id: int):
    run = AnalysisRun.objects.get(id=run_id)
    run.status = "running"
    run.save(update_fields=["status"])

    try:
        docs = list(Document.objects.filter(cohort_key=run.cohort_key).order_by("id"))
        if not docs:
            raise RuntimeError("No documents found for cohort_key")

        # 1) extract + scrub (idempotent-ish)
        for d in docs:
            if d.status in {"uploaded", "failed"}:
                try:
                    text = extract_text(d.file_path)
                    d.raw_text = text
                    d.scrubbed_text = scrub_pii(text)
                    d.status = "extracted"
                    d.error = ""
                except Exception as e:
                    d.status = "failed"
                    d.error = str(e)
                d.save()

        docs = [d for d in docs if d.status != "failed"]
        if not docs:
            raise RuntimeError("All documents failed extraction")

        # 2) embeddings
        vectors = []
        kept_docs = []
        for d in docs:
            vec = embed_text(run.embedding_model, d.scrubbed_text[:12000])  # guard huge docs
            vectors.append(vec)
            kept_docs.append(d)

        V = np.vstack(vectors)  # shape (n, dim)

        with transaction.atomic():
            # clean old for run
            DocEmbedding.objects.filter(run=run).delete()
            DocProjection.objects.filter(run=run).delete()

            for d, vec in zip(kept_docs, V):
                DocEmbedding.objects.create(
                    document=d,
                    run=run,
                    vector=vec.tolist(),
                    norm=l2_norm(vec),
                )
                d.status = "embedded"
                d.save(update_fields=["status"])

        # 3) UMAP projection
        coords = project_umap(V, run.umap_params or {})
        labels, outlier = cluster_and_outliers(coords)

        with transaction.atomic():
            for d, (x, y), lab, sc in zip(kept_docs, coords, labels, outlier):
                DocProjection.objects.create(
                    document=d,
                    run=run,
                    x=float(x),
                    y=float(y),
                    cluster_id=int(lab),
                    outlier_score=float(sc),
                )
                d.status = "projected"
                d.save(update_fields=["status"])

        run.status = "done"
        run.save(update_fields=["status"])

    except Exception as e:
        run.status = "failed"
        run.error = str(e)
        run.save(update_fields=["status", "error"])
        raise
