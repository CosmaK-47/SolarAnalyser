from django.urls import path

from .views import fetch_satellite_data, satellite_metrics, satellite_records


urlpatterns = [
    path("metrics/", satellite_metrics, name="satellite_metrics"),
    path("records/", satellite_records, name="satellite_records"),
    path("fetch/", fetch_satellite_data, name="fetch_satellite_data"),
]
