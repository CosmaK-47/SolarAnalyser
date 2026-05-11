import json
import math
from pathlib import Path
from datetime import datetime
from uuid import uuid4

from django.conf import settings


HARDWARE_METRICS = {
    "temperature": {"unit": "°C", "label": "Temperature"},
    "humidity": {"unit": "%", "label": "Humidity"},
    "irradiance": {"unit": "W/m²", "label": "Irradiance"},
    "panel_voltage": {"unit": "V", "label": "Panel Voltage"},
    "panel_current": {"unit": "A", "label": "Panel Current"},
    "panel_power": {"unit": "W", "label": "Panel Power"},
}


class HardwareCaptureError(RuntimeError):
    pass


def _measurements_path() -> Path:
    hardware_dir = Path(settings.BASE_DIR) / "data" / "hardware"
    hardware_dir.mkdir(parents=True, exist_ok=True)
    return hardware_dir / "iot_measurements.json"


def load_iot_measurements() -> list[dict]:
    file_path = _measurements_path()

    if file_path.exists() and file_path.stat().st_size > 0:
        return json.loads(file_path.read_text(encoding="utf-8"))

    return []


def save_iot_measurement(data: dict) -> int:
    file_path = _measurements_path()
    measurements = load_iot_measurements()

    measurements.append(data)

    file_path.write_text(
        json.dumps(measurements, indent=4, ensure_ascii=False),
        encoding="utf-8"
    )

    return len(measurements)


def capture_location_measurement(
    *,
    lat: float,
    lng: float,
    location: str | None = None,
    mode: str = "latest",
) -> tuple[dict, int]:
    measurements = load_iot_measurements()
    normalized_mode = (mode or "demo").lower()

    if normalized_mode not in {"latest", "demo"}:
        raise HardwareCaptureError("mode must be 'latest' or 'demo'")

    if normalized_mode == "latest":
        latest = find_latest_raw_esp32_measurement(measurements)
        if not latest:
            raise HardwareCaptureError(
                "No raw ESP32 sample is available yet. Send a device sample first or use Demo reading."
            )
        measurement = {
            **latest,
            "capture_source": "latest_esp32_sample",
            "status": "located",
        }
    else:
        measurement = _build_demo_measurement(lat, lng)

    measurement.update({
        "measurement_id": f"hw-capture-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:8]}",
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "location": location or f"Hardware point {lat:.5f}, {lng:.5f}",
        "received_at": datetime.now().isoformat(),
    })

    count = save_iot_measurement(measurement)
    return measurement, count


def find_latest_raw_esp32_measurement(measurements: list[dict] | None = None) -> dict | None:
    measurements = load_iot_measurements() if measurements is None else measurements

    for measurement in reversed(measurements):
        capture_source = measurement.get("capture_source")
        if capture_source in {"development_simulation", "latest_esp32_sample"}:
            continue
        if measurement.get("measurement_id"):
            continue
        if not any(measurement.get(metric) is not None for metric in HARDWARE_METRICS):
            continue
        return measurement

    return None


def _build_demo_measurement(lat: float, lng: float) -> dict:
    now = datetime.now()
    daylight = max(0, math.sin(((now.hour + now.minute / 60) - 6) / 12 * math.pi))
    location_factor = (math.sin(math.radians(lat * 3)) + math.cos(math.radians(lng * 2))) / 2
    irradiance = max(0, 850 * daylight + 60 * location_factor)
    temperature = 22 + 8 * daylight + 3 * location_factor
    humidity = 55 - 12 * daylight + 4 * abs(location_factor)
    panel_voltage = 5.0 + daylight * 1.2
    panel_current = max(0.02, irradiance / 3200)

    return {
        "device_id": "solar_node_dev",
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "irradiance": round(irradiance, 2),
        "panel_voltage": round(panel_voltage, 2),
        "panel_current": round(panel_current, 3),
        "panel_power": round(panel_voltage * panel_current, 3),
        "capture_source": "development_simulation",
        "status": "simulated",
    }


def normalize_iot_measurements(measurements: list[dict] | None = None) -> list[dict]:
    measurements = load_iot_measurements() if measurements is None else measurements
    records = []

    for index, measurement in enumerate(measurements):
        timestamp = measurement.get("received_at") or measurement.get("timestamp")
        device_id = measurement.get("device_id") or measurement.get("deviceId") or "solar_node"
        location = measurement.get("location") or device_id

        for metric, meta in HARDWARE_METRICS.items():
            value = measurement.get(metric)
            if value is None:
                continue

            records.append({
                "id": f"{measurement.get('measurement_id', f'hw-{index}')}-{metric}",
                "source": "hardware",
                "timestamp": timestamp,
                "date": timestamp[:10] if isinstance(timestamp, str) else None,
                "deviceId": device_id,
                "location": location,
                "lat": measurement.get("lat"),
                "lng": measurement.get("lng"),
                "metric": metric,
                "label": meta["label"],
                "value": value,
                "unit": meta["unit"],
                "status": measurement.get("status", "stored"),
                "provider": measurement.get("capture_source", "ESP32"),
            })

    return records


def delete_iot_measurements_by_record_ids(record_ids: list[str]) -> int:
    ids = set(record_ids)
    measurements = load_iot_measurements()
    remaining = []
    deleted = 0

    for index, measurement in enumerate(measurements):
        record_ids_for_measurement = {
            record["id"] for record in normalize_iot_measurements([measurement])
        }

        fallback_ids = {
            f"{measurement.get('measurement_id', f'hw-{index}')}-{metric}"
            for metric in HARDWARE_METRICS
        }

        if ids.intersection(record_ids_for_measurement) or ids.intersection(fallback_ids):
            deleted += 1
        else:
            remaining.append(measurement)

    _measurements_path().write_text(
        json.dumps(remaining, indent=4, ensure_ascii=False),
        encoding="utf-8"
    )

    return deleted
