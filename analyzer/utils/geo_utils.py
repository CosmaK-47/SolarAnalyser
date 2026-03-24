"""
Advanced geospatial utilities for Solar Analyzer Pro
Includes:
- Precise bbox based on hectares
- DEM grid generation
- Haversine distance (vectorized)
- Slope & aspect calculation
"""

import numpy as np
from typing import List, Tuple, Dict
from .constants import EARTH_RADIUS_M


# ---------------------------------------------
# 1. Haversine Distance (vectorized)
# ---------------------------------------------
def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """
    Calculează distanța (m) între 2 coordonate (WGS84)
    """
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
            np.sin(dlat / 2) ** 2
            + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    return EARTH_RADIUS_M * c


# ---------------------------------------------
# 2. Bounding Box from area (hectares)
# ---------------------------------------------
def calculate_bbox(lat: float, lon: float, area_ha: float) -> Dict:
    """
    Creează un bounding box centrat pe (lat, lon) cu aria specificată.
    1 ha ≈ 100m x 100m
    """

    # Convert ha → meters
    side_m = np.sqrt(area_ha * 10000)  # 1 ha = 10,000 m²

    # Convert meters → degrees
    lat_delta = (side_m / EARTH_RADIUS_M) * (180 / np.pi)
    lon_delta = (side_m / (EARTH_RADIUS_M * np.cos(np.radians(lat)))) * (180 / np.pi)

    return {
        "north": lat + lat_delta / 2,
        "south": lat - lat_delta / 2,
        "east": lon + lon_delta / 2,
        "west": lon - lon_delta / 2,
    }


# ---------------------------------------------
# 3. Grid generator for DEM (elevation)
# ---------------------------------------------
def generate_grid_points(bbox: Dict, n: int = 10) -> List[Tuple[float, float]]:
    """
    Generează un grid NxN de coordonate în interiorul bbox.
    """
    lat_points = np.linspace(bbox["south"], bbox["north"], n)
    lon_points = np.linspace(bbox["west"], bbox["east"], n)

    points = []
    for lat in lat_points:
        for lon in lon_points:
            points.append((lat, lon))

    return points


# ---------------------------------------------
# 4. Slope & Aspect from DEM grid
# ---------------------------------------------
def calculate_slope_aspect(elevation_grid: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Primește un grid NxN cu elevații și returnează slope & aspect în grade.
    """

    dy, dx = np.gradient(elevation_grid)

    slope = np.degrees(np.arctan(np.sqrt(dx ** 2 + dy ** 2)))
    aspect = np.degrees(np.arctan2(-dx, dy)) % 360

    return slope, aspect
