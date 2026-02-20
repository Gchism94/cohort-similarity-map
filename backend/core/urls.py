# backend/core/urls.py
from django.urls import path
from core import views

urlpatterns = [
    path("upload/", views.upload),
    path("documents/", views.documents),
    path("runs/start/", views.start_run),
    path("runs/<int:run_id>/", views.run_status),
    path("runs/<int:run_id>/projection/", views.projection),
    path("runs/<int:run_id>/doc/<int:doc_id>/", views.doc_detail),
]
