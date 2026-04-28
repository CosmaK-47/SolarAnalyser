from django.urls import path, include

urlpatterns = [
    path("hardware/", include("analyzer.hardware.urls")),
]