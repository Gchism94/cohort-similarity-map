# backend/core/models.py
from django.db import models
from pgvector.django import VectorField

class AnalysisRun(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    cohort_key = models.CharField(max_length=200, default="default")
    embedding_model = models.CharField(max_length=200, default="sentence-transformers/all-MiniLM-L6-v2")
    chunking_version = models.CharField(max_length=50, default="v1_doc_only")
    umap_params = models.JSONField(default=dict)
    status = models.CharField(max_length=50, default="pending")  # pending/running/done/failed
    error = models.TextField(blank=True, default="")

class Document(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    cohort_key = models.CharField(max_length=200, default="default")
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True, default="")
    file_path = models.CharField(max_length=500)
    raw_text = models.TextField(blank=True, default="")
    scrubbed_text = models.TextField(blank=True, default="")
    status = models.CharField(max_length=50, default="uploaded")  # uploaded/extracted/embedded/projected/failed
    error = models.TextField(blank=True, default="")

class DocEmbedding(models.Model):
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name="embedding")
    run = models.ForeignKey(AnalysisRun, on_delete=models.CASCADE, related_name="embeddings")
    vector = VectorField(dimensions=384)  # all-MiniLM-L6-v2 = 384
    norm = models.FloatField(default=0.0)

class DocProjection(models.Model):
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name="projection")
    run = models.ForeignKey(AnalysisRun, on_delete=models.CASCADE, related_name="projections")
    x = models.FloatField()
    y = models.FloatField()
    cluster_id = models.IntegerField(null=True, blank=True)
    outlier_score = models.FloatField(null=True, blank=True)
