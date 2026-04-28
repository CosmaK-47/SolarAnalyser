import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .storage import save_iot_measurement


@csrf_exempt
def receive_iot_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)

        data["received_at"] = datetime.now().isoformat()

        count = save_iot_measurement(data)

        return JsonResponse({
            "status": "saved",
            "total_measurements": count
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)