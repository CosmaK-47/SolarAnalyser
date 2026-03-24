"""
Utilities package for Solar Analyzer Pro (Enterprise Edition)
Provides:
- High-performance caching (disk + memory)
- Geospatial utilities (Haversine, bounding boxes, DEM grids)
- Global constants and configuration helpers
"""

from .cache import CacheManager
from .constants import (
    EARTH_RADIUS_M,
    MOLDOVA_BOUNDS,
    SOLAR_CONSTANT,
    DEM_CONFIG,
    SATELLITE_CONFIG,
    OSM_CONFIG
)
from .geo_utils import (
    haversine_distance,
    calculate_bbox,
    generate_grid_points,
    calculate_slope_aspect
)

__all__ = [
    "CacheManager",
    "EARTH_RADIUS_M",
    "MOLDOVA_BOUNDS",
    "SOLAR_CONSTANT",
    "DEM_CONFIG",
    "SATELLITE_CONFIG",
    "OSM_CONFIG",
    "haversine_distance",
    "calculate_bbox",
    "generate_grid_points",
    "calculate_slope_aspect"
]
