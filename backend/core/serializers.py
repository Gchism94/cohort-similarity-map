# backend/core/serializers.py
from rest_framework import serializers
from core.models import Document, AnalysisRun, DocProjection

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "cohort_key",
            "filename",
            "original_filename",
            "stored_name",
            "content_type",
            "status",
            "created_at",
        ]

class AnalysisRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisRun
        fields = ["id", "created_at", "cohort_key", "embedding_model", "chunking_version", "umap_params", "status", "error"]

class ProjectionPointSerializer(serializers.ModelSerializer):
    document_id = serializers.IntegerField(source="document.id")
    filename = serializers.CharField(source="document.filename")
    status = serializers.CharField(source="document.status")

    class Meta:
        model = DocProjection
        fields = ["document_id", "filename", "status", "x", "y", "cluster_id", "outlier_score"]
