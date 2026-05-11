from django.urls import path
from .views import capture_hardware_data, receive_iot_data

urlpatterns = [
    path("measurements/", receive_iot_data, name="receive_iot_data"),
    path("capture/", capture_hardware_data, name="capture_hardware_data"),
]
