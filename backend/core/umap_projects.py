# backend/core/umap_project.py
from __future__ import annotations
import numpy as np
import umap
import hdbscan

def project_umap(vectors: np.ndarray, params: dict) -> np.ndarray:
    reducer = umap.UMAP(
        n_neighbors=int(params.get("n_neighbors", 15)),
        min_dist=float(params.get("min_dist", 0.1)),
        metric=str(params.get("metric", "cosine")),
        random_state=int(params.get("random_state", 42)),
    )
    return reducer.fit_transform(vectors).astype(np.float32)

def cluster_and_outliers(coords: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    min_cluster_size = max(3, min(10, coords.shape[0] // 5))
    clusterer = hdbscan.HDBSCAN(min_cluster_size=min_cluster_size)
    labels = clusterer.fit_predict(coords)

    # Outlier score: use HDBSCAN outlier scores if present, else zeros
    scores = getattr(clusterer, "outlier_scores_", None)
    if scores is None:
        scores = np.zeros(coords.shape[0], dtype=np.float32)
    return labels.astype(int), scores.astype(np.float32)
