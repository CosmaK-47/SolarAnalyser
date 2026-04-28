from django.urls import path
from .views import receive_iot_data

urlpatterns = [
    path("measurements/", receive_iot_data, name="receive_iot_data"),
]