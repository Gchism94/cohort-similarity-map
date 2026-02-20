# backend/core/embed.py
from __future__ import annotations
import numpy as np
from sentence_transformers import SentenceTransformer

_MODEL_CACHE: dict[str, SentenceTransformer] = {}

def get_model(name: str) -> SentenceTransformer:
    if name not in _MODEL_CACHE:
        _MODEL_CACHE[name] = SentenceTransformer(name)
    return _MODEL_CACHE[name]

def embed_text(model_name: str, text: str) -> np.ndarray:
    model = get_model(model_name)
    vec = model.encode([text], normalize_embeddings=False)[0]
    return vec.astype(np.float32)

def l2_norm(vec: np.ndarray) -> float:
    return float(np.linalg.norm(vec) + 1e-12)
