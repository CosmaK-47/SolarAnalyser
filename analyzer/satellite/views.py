import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services import METRIC_DEFS, SatelliteFetchError, fetch_satellite_records
from .storage import delete_satellite_records, load_satellite_records, save_satellite_records


def satellite_metrics(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    return JsonResponse({"metrics": METRIC_DEFS})


@csrf_exempt
def satellite_records(request):
    if request.method == "DELETE":
        try:
            payload = json.loads(request.body or "{}")
            record_ids = payload.get("ids", [])
            if not isinstance(record_ids, list):
                return JsonResponse({"error": "ids must be a list"}, status=400)

            deleted = delete_satellite_records(record_ids)
            return JsonResponse({"status": "deleted", "deleted": deleted})
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    if request.method != "GET":
        return JsonResponse({"error": "Only GET or DELETE allowed"}, status=405)

    return JsonResponse({"records": load_satellite_records()})


@csrf_exempt
def fetch_satellite_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        lat = float(payload["lat"])
        lng = float(payload["lng"])
        location = str(payload.get("location") or "").strip() or None
        point_id = str(payload.get("point_id") or "").strip() or None

        metrics = payload.get("metrics", payload.get("metric"))
        if isinstance(metrics, str):
            metrics = [metrics]
        if not isinstance(metrics, list):
            raise SatelliteFetchError("metrics must be a string or list")

        records = fetch_satellite_records(
            lat=lat,
            lng=lng,
            metrics=metrics,
            location=location,
            point_id=point_id,
        )
        total = save_satellite_records(records)

        return JsonResponse({
            "status": "saved",
            "records": records,
            "total_records": total,
        })

    except KeyError as exc:
        return JsonResponse({"error": f"Missing field: {exc.args[0]}"}, status=400)
    except ValueError:
        return JsonResponse({"error": "lat/lng must be valid numbers"}, status=400)
    except SatelliteFetchError as exc:
        return JsonResponse({"error": str(exc)}, status=502)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
