import json
from pathlib import Path
from django.conf import settings


def save_iot_measurement(data: dict) -> int:
    hardware_dir = Path(settings.BASE_DIR) / "data" / "hardware"
    hardware_dir.mkdir(parents=True, exist_ok=True)

    file_path = hardware_dir / "iot_measurements.json"

    if file_path.exists() and file_path.stat().st_size > 0:
        measurements = json.loads(file_path.read_text(encoding="utf-8"))
    else:
        measurements = []

    measurements.append(data)

    file_path.write_text(
        json.dumps(measurements, indent=4),
        encoding="utf-8"
    )

    return len(measurements)