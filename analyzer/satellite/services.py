from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import requests


PVGIS_TMY_URL = "https://re.jrc.ec.europa.eu/api/tmy"
OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"

METRIC_DEFS = {
    "irradiance": {
        "label": "Irradiance",
        "unit": "W/m²",
        "provider": "PVGIS TMY",
        "pvgis_key": "G(h)",
    },
    "temperature": {
        "label": "Temperature",
        "unit": "°C",
        "provider": "PVGIS TMY",
        "pvgis_key": "T2m",
    },
    "wind_speed": {
        "label": "Wind Speed",
        "unit": "m/s",
        "provider": "PVGIS TMY",
        "pvgis_key": "WS10m",
    },
    "humidity": {
        "label": "Humidity",
        "unit": "%",
        "provider": "PVGIS TMY",
        "pvgis_key": "RH",
    },
    "pressure": {
        "label": "Pressure",
        "unit": "hPa",
        "provider": "PVGIS TMY",
        "pvgis_key": "SP",
    },
    "elevation": {
        "label": "Elevation",
        "unit": "m",
        "provider": "Open-Elevation",
    },
    "vegetation": {
        "label": "Vegetation Coverage",
        "unit": "%",
        "provider": "Sentinel-2 estimate",
    },
    "shading": {
        "label": "Shading Factor",
        "unit": "%",
        "provider": "Sentinel-2 estimate",
    },
}


class SatelliteFetchError(RuntimeError):
    pass


def fetch_satellite_records(
    *,
    lat: float,
    lng: float,
    metrics: list[str],
    location: str | None = None,
) -> list[dict]:
    if not metrics:
        raise SatelliteFetchError("At least one metric is required")

    unknown = [metric for metric in metrics if metric not in METRIC_DEFS]
    if unknown:
        raise SatelliteFetchError(f"Unsupported metric(s): {', '.join(unknown)}")

    now = datetime.now(timezone.utc)
    pvgis_row: dict[str, Any] | None = None
    needs_pvgis = any("pvgis_key" in METRIC_DEFS[metric] for metric in metrics)

    if needs_pvgis:
        pvgis_row = _fetch_matching_pvgis_hour(lat, lng, now)

    records = []
    for metric in metrics:
        value, unit, provider, details = _extract_metric(
            metric=metric,
            lat=lat,
            lng=lng,
            pvgis_row=pvgis_row,
        )
        records.append(
            {
                "id": f"sat-{now.strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:8]}",
                "source": "satellite",
                "timestamp": now.isoformat(),
                "date": now.date().isoformat(),
                "location": location or f"{lat:.5f}, {lng:.5f}",
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "metric": metric,
                "label": METRIC_DEFS[metric]["label"],
                "value": value,
                "unit": unit,
                "quality": "modelled",
                "provider": provider,
                "details": details,
            }
        )

    return records


def _fetch_matching_pvgis_hour(lat: float, lng: float, now: datetime) -> dict[str, Any]:
    params = {
        "lat": lat,
        "lon": lng,
        "outputformat": "json",
        "startyear": 2005,
        "endyear": 2020,
        "usehorizon": 1,
        "browser": 0,
    }

    try:
        response = requests.get(PVGIS_TMY_URL, params=params, timeout=45)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise SatelliteFetchError(f"PVGIS request failed: {exc}") from exc

    hourly = payload.get("outputs", {}).get("tmy_hourly")
    if not hourly:
        raise SatelliteFetchError("PVGIS returned no TMY hourly data")

    target = (now.month, now.day, now.hour)
    exact = [_row for _row in hourly if _pvgis_month_day_hour(_row) == target]
    if exact:
        return exact[0]

    month_hour = (now.month, now.hour)
    candidates = [
        _row for _row in hourly
        if (_pvgis_month_day_hour(_row)[0], _pvgis_month_day_hour(_row)[2]) == month_hour
    ]
    if candidates:
        return candidates[0]

    return hourly[0]


def _pvgis_month_day_hour(row: dict[str, Any]) -> tuple[int, int, int]:
    value = str(row.get("time(UTC)", "20000101:0000"))
    return int(value[4:6]), int(value[6:8]), int(value[9:11])


def _extract_metric(
    *,
    metric: str,
    lat: float,
    lng: float,
    pvgis_row: dict[str, Any] | None,
) -> tuple[float, str, str, dict[str, Any]]:
    metric_def = METRIC_DEFS[metric]

    if "pvgis_key" in metric_def:
        if pvgis_row is None:
            raise SatelliteFetchError("PVGIS data is required for this metric")
        raw_value = float(pvgis_row.get(metric_def["pvgis_key"], 0))
        unit = metric_def["unit"]
        value = raw_value
        if metric == "pressure" and raw_value > 2000:
            value = raw_value / 100

        return (
            round(value, 2),
            unit,
            metric_def["provider"],
            {
                "pvgis_time_utc": pvgis_row.get("time(UTC)"),
                "note": "PVGIS TMY is a modelled typical meteorological year, not live satellite telemetry.",
            },
        )

    if metric == "elevation":
        return _fetch_elevation(lat, lng)

    vegetation = _estimate_vegetation(lat, lng)
    if metric == "vegetation":
        return (
            round(vegetation["vegetation_coverage_pct"], 2),
            metric_def["unit"],
            metric_def["provider"],
            vegetation,
        )

    if metric == "shading":
        return (
            round(vegetation["shading_factor"] * 100, 2),
            metric_def["unit"],
            metric_def["provider"],
            vegetation,
        )

    raise SatelliteFetchError(f"Unsupported metric: {metric}")


def _fetch_elevation(lat: float, lng: float) -> tuple[float, str, str, dict[str, Any]]:
    try:
        response = requests.post(
            OPEN_ELEVATION_URL,
            json={"locations": [{"latitude": lat, "longitude": lng}]},
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        elevation = float(payload["results"][0]["elevation"])
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError) as exc:
        raise SatelliteFetchError(f"Open-Elevation request failed: {exc}") from exc

    return (
        round(elevation, 2),
        "m",
        "Open-Elevation",
        {"note": "DEM elevation lookup for the selected point."},
    )


def _estimate_vegetation(lat: float, lng: float) -> dict[str, float | str]:
    chisinau_lat, chisinau_lng = 47.0105, 28.8638
    dist_to_chisinau = ((lat - chisinau_lat) ** 2 + (lng - chisinau_lng) ** 2) ** 0.5

    if dist_to_chisinau < 0.1:
        vegetation = 0.3
        buildings = 0.4
    elif dist_to_chisinau < 0.5:
        vegetation = 0.5
        buildings = 0.15
    else:
        vegetation = 0.6
        buildings = 0.05

    trees = max(0, vegetation - 0.3)

    return {
        "ndvi_mean": round(0.4 + vegetation * 0.3, 3),
        "vegetation_coverage_pct": vegetation * 100,
        "tree_coverage_pct": trees * 100,
        "building_coverage_pct": buildings * 100,
        "shading_factor": min(0.15, trees + buildings * 0.5),
        "note": "Placeholder estimate. The older SentinelHub implementation is present but not wired safely yet.",
    }
