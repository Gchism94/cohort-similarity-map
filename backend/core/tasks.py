# backend/core/tasks.py
from __future__ import annotations

import numpy as np
from celery import shared_task
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
    run.error = ""
    run.save(update_fields=["status", "error"])

    try:
        docs = list(Document.objects.filter(cohort_key=run.cohort_key).order_by("id"))
        if not docs:
            raise RuntimeError("No documents found for cohort_key")

        # 1) Extract + scrub (best-effort per doc)
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

        docs_ok = [d for d in docs if d.status != "failed"]
        if not docs_ok:
            raise RuntimeError("All documents failed extraction")

        # 1b) Herd phrases from scrubbed text (cohort-level)
        texts_for_herd = [d.scrubbed_text for d in docs_ok if d.scrubbed_text]
        run.herd_phrases = {"bigrams": herd_phrases(texts_for_herd, top_n=30)}
        run.save(update_fields=["herd_phrases"])

        # 2) Clear prior results for this run
        with transaction.atomic():
            DocEmbedding.objects.filter(run=run).delete()
            DocProjection.objects.filter(run=run).delete()

        # 3) Per-section embeddings + projection
        for section in SECTIONS_FOR_VIEWS:
            section_texts: list[str] = []
            section_docs: list[Document] = []

            for d in docs_ok:
                chunks = chunk_sections((d.scrubbed_text or "")[:20000])  # guard
                t = (chunks.get(section) or "").strip()
                if t:
                    section_texts.append(t)
                    section_docs.append(d)

            # Need enough docs to make UMAP meaningful
            if len(section_docs) < 5:
                continue

            vectors = [embed_text(run.embedding_model, t[:12000]) for t in section_texts]
            V = np.vstack(vectors).astype(np.float32)

            # store embeddings
            with transaction.atomic():
                for d, vec in zip(section_docs, V):
                    DocEmbedding.objects.create(
                        document=d,
                        run=run,
                        section=section,
                        vector=vec.tolist(),
                        norm=l2_norm(vec),
                    )

            # project + cluster
            coords = project_umap(V, run.umap_params or {})
            labels, outlier = cluster_and_outliers(coords)

            with transaction.atomic():
                for d, (x, y), lab, sc in zip(section_docs, coords, labels, outlier):
                    DocProjection.objects.create(
                        document=d,
                        run=run,
                        section=section,
                        x=float(x),
                        y=float(y),
                        cluster_id=int(lab),
                        outlier_score=float(sc),
                    )

        # mark docs projected (optional but nice)
        with transaction.atomic():
            Document.objects.filter(id__in=[d.id for d in docs_ok]).update(status="projected")

        run.status = "done"
        run.save(update_fields=["status"])

    except Exception as e:
        run.status = "failed"
        run.error = str(e)
        run.save(update_fields=["status", "error"])
        raise