import json
from pathlib import Path

from django.conf import settings


def _records_path() -> Path:
    satellite_dir = Path(settings.BASE_DIR) / "data" / "satellite"
    satellite_dir.mkdir(parents=True, exist_ok=True)
    return satellite_dir / "satellite_records.json"


def load_satellite_records() -> list[dict]:
    file_path = _records_path()

    if not file_path.exists() or file_path.stat().st_size == 0:
        return []

    records = json.loads(file_path.read_text(encoding="utf-8"))
    return [record for record in records if _is_satellite_record(record)]


def save_satellite_records(records: list[dict]) -> int:
    existing = load_satellite_records()
    existing.extend(records)

    _records_path().write_text(
        json.dumps(existing, indent=4, ensure_ascii=False),
        encoding="utf-8",
    )

    return len(existing)


def delete_satellite_records(record_ids: list[str]) -> int:
    ids = set(record_ids)
    existing = load_satellite_records()
    remaining = [record for record in existing if record.get("id") not in ids]

    _records_path().write_text(
        json.dumps(remaining, indent=4, ensure_ascii=False),
        encoding="utf-8",
    )

    return len(existing) - len(remaining)


def _is_satellite_record(record: dict) -> bool:
    return (
        isinstance(record, dict)
        and record.get("source") == "satellite"
        and bool(record.get("id"))
    )
