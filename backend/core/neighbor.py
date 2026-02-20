# backend/core/neighbor.py
from __future__ import annotations
from django.db import connection

def nearest_documents(run_id: int, doc_id: int, k: int = 5):
    """
    Uses pgvector cosine distance operator (<=>) for nearest neighbors.
    Lower distance = more similar.
    """
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT d2.id, d2.filename, (e1.vector <=> e2.vector) AS cosine_distance
            FROM core_docembedding e1
            JOIN core_docembedding e2 ON e1.run_id = e2.run_id
            JOIN core_document d2 ON e2.document_id = d2.id
            WHERE e1.run_id = %s AND e1.document_id = %s AND e2.document_id <> %s
            ORDER BY cosine_distance ASC
            LIMIT %s;
            """,
            [run_id, doc_id, doc_id, k],
        )
        rows = cur.fetchall()
    return [{"id": r[0], "filename": r[1], "cosine_distance": float(r[2])} for r in rows]
