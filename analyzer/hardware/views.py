import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .storage import (
    HardwareCaptureError,
    capture_location_measurement,
    delete_iot_measurements_by_record_ids,
    find_latest_raw_esp32_measurement,
    load_iot_measurements,
    normalize_iot_measurements,
    save_iot_measurement,
)


@csrf_exempt
def receive_iot_data(request):
    if request.method == "DELETE":
        try:
            payload = json.loads(request.body or "{}")
            record_ids = payload.get("ids", [])
            if not isinstance(record_ids, list):
                return JsonResponse({"error": "ids must be a list"}, status=400)

            deleted = delete_iot_measurements_by_record_ids(record_ids)
            return JsonResponse({"status": "deleted", "deleted": deleted})
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    if request.method == "GET":
        measurements = load_iot_measurements()
        records = normalize_iot_measurements(measurements)
        latest = measurements[-1] if measurements else None
        latest_raw = find_latest_raw_esp32_measurement(measurements)

        return JsonResponse({
            "measurements": measurements,
            "records": records,
            "latest": latest,
            "latest_raw": latest_raw,
            "total_measurements": len(measurements),
        })

    if request.method != "POST":
        return JsonResponse({"error": "Only GET, POST or DELETE allowed"}, status=405)

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


@csrf_exempt
def capture_hardware_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        lat = float(payload["lat"])
        lng = float(payload["lng"])
        location = str(payload.get("location") or "").strip() or None
        mode = str(payload.get("mode") or "latest")
        point_id = str(payload.get("point_id") or "").strip() or None

        measurement, count = capture_location_measurement(
            lat=lat,
            lng=lng,
            location=location,
            mode=mode,
            point_id=point_id,
        )

        records = normalize_iot_measurements([measurement])

        return JsonResponse({
            "status": "saved",
            "measurement": measurement,
            "records": records,
            "total_measurements": count,
        })

    except KeyError as exc:
        return JsonResponse({"error": f"Missing field: {exc.args[0]}"}, status=400)
    except ValueError:
        return JsonResponse({"error": "lat/lng must be valid numbers"}, status=400)
    except HardwareCaptureError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
