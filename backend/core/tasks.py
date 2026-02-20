# backend/core/tasks.py
from __future__ import annotations
from asyn
from pdb import runcio import run
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
from core.chunking import chunk_sections
from core.herd import herd_phrases

SECTIONS_FOR_VIEWS = ["doc", "skills", "experience"]  # keep small for now

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
        
        texts = [d.scrubbed_text for d in docs if d.status != "failed"]
        run.herd_phrases = {"bigrams": herd_phrases(texts, top_n=30)}
        run.save(update_fields=["herd_phrases"])

        # 2) embeddings (per section)
        section_texts = {s: [] for s in SECTIONS_FOR_VIEWS}
        section_docs  = {s: [] for s in SECTIONS_FOR_VIEWS}

        for d in docs:
            chunks = chunk_sections(d.scrubbed_text[:20000])  # guard
            for s in SECTIONS_FOR_VIEWS:
                t = chunks.get(s, "")
                if t:
                    section_texts[s].append(t)
                    section_docs[s].append(d)

        with transaction.atomic():
            DocEmbedding.objects.filter(run=run).delete()
            DocProjection.objects.filter(run=run).delete()

        for s in SECTIONS_FOR_VIEWS:
            texts = section_texts[s]
            docs_s = section_docs[s]
            if len(docs_s) < 5:
                continue

            vectors = [embed_text(run.embedding_model, t[:12000]) for t in texts]
            V = np.vstack(vectors)

            with transaction.atomic():
                for d, vec in zip(docs_s, V):
                    DocEmbedding.objects.create(
                        document=d, run=run, section=s,
                        vector=vec.tolist(), norm=l2_norm(vec)
                    )

            coords = project_umap(V, run.umap_params or {})
            labels, outlier = cluster_and_outliers(coords)

            with transaction.atomic():
                for d, (x, y), lab, sc in zip(docs_s, coords, labels, outlier):
                    DocProjection.objects.create(
                        document=d, run=run, section=s,
                        x=float(x), y=float(y),
                        cluster_id=int(lab), outlier_score=float(sc)
                    )

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
