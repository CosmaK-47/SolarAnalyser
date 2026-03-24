"""
Constants & global configuration for Solar Analyzer Pro (Enterprise)
"""

from pathlib import Path

# --- Earth & Physics ---
EARTH_RADIUS_M = 6371008.8  # IERS 2003

SOLAR_CONSTANT = 1367  # W/m2 – constantă solară medie

# --- Moldova regional settings ---
MOLDOVA_BOUNDS = {
    "min_lat": 45.5,
    "max_lat": 48.6,
    "min_lon": 26.6,
    "max_lon": 30.2
}

# --- DEM / Elevation configuration ---
DEM_CONFIG = {
    "grid_size": 10,          # 10×10 = 100 puncte
    "default_slope_deg": 3.0,
    "default_aspect_deg": 180,
    "max_cache_age": 60 * 60 * 24 * 10,  # 10 zile
}

# --- Sentinel-2 / Satellite settings ---
SATELLITE_CONFIG = {
    "ndvi_tree_threshold": 0.55,
    "resolution_m": 10,
    "fallback_max_shading": 0.18,
}

# --- OSM / Infrastructure settings ---
OSM_CONFIG = {
    "max_distance_fallback_m": 5000,
    "cost_cable_per_km": 50000,
    "cost_transformer": 80000,
    "cost_multiplier": 1.3
}

# --- Cache settings ---
BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BASE_DIR / "data" / "cache"
TEMP_DIR = BASE_DIR / "data" / "temp"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

CACHE_SETTINGS = {
    "memory_cache_max_entries": 128,
    "file_cache_ttl": 86400 * 7,  # 7 zile
    "compression": "brotli",
}
