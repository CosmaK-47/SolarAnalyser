"""
Configurație globală pentru Solar Analyzer Pro
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
CACHE_DIR = DATA_DIR / 'cache'
VALIDATION_DIR = DATA_DIR / 'validation'
MEDIA_DIR = BASE_DIR / 'media'
REPORTS_DIR = MEDIA_DIR / 'reports'

# Creează directoare dacă nu există
for directory in [CACHE_DIR, VALIDATION_DIR, REPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# API Keys
SENTINELHUB_CLIENT_ID = os.getenv('SENTINELHUB_CLIENT_ID', '')
SENTINELHUB_CLIENT_SECRET = os.getenv('SENTINELHUB_CLIENT_SECRET', '')
SENTINELHUB_INSTANCE_ID = os.getenv("SENTINELHUB_INSTANCE_ID", "")


# Moldova specific constants
MOLDOVA_CONFIG = {
    'timezone': 'Europe/Chisinau',
    'latitude_range': (45.5, 48.5),
    'longitude_range': (26.5, 30.5),
    'average_albedo': 0.20,  # Albedo mediu sol Moldova
    'average_elevation': 147,  # Metri (medie națională)
}

# Solar system constants
SOLAR_CONSTANTS = {
    'standard_test_condition_irradiance': 1000,  # W/m²
    'standard_test_condition_temp': 25,  # °C
    'module_degradation_year1': 0.02,  # 2% primul an
    'module_degradation_annual': 0.0055,  # 0.55%/an după
    'inverter_lifetime': 15,  # ani
    'module_lifetime': 25,  # ani
}

# Performance parameters (validat cu ferme din Moldova)
PERFORMANCE_PARAMS = {
    'optimal_tilt_moldova': 35,  # grade
    'optimal_azimuth': 180,  # Sud
    'soiling_loss_summer': 0.04,  # 4% (praf vara)
    'soiling_loss_winter': 0.02,  # 2% (ploaie mai des)
    'snow_loss_average': 0.015,  # 1.5% mediu anual
    'dc_wiring_loss': 0.015,  # 1.5%
    'ac_wiring_loss': 0.01,  # 1%
    'mismatch_loss': 0.02,  # 2%
    'availability': 0.98,  # 98% uptime
}

# P50/P90 uncertainty budget
UNCERTAINTY_BUDGET = {
    'irradiance_data': {
        'type': 'normal',
        'std': 0.042,  # ±4.2% PVGIS-5
        'description': 'Incertitudine date satelit PVGIS'
    },
    'temperature_data': {
        'type': 'normal',
        'std': 0.02,  # ±2°C
        'description': 'Incertitudine temperatură'
    },
    'module_performance': {
        'type': 'normal',
        'std': 0.03,  # ±3% (flash test tolerance)
        'description': 'Toleranță fabricație panouri'
    },
    'degradation': {
        'type': 'normal',
        'std': 0.005,  # ±0.5%/an
        'description': 'Incertitudine degradare'
    },
    'soiling': {
        'type': 'uniform',
        'range': (0.02, 0.05),  # 2-5%
        'description': 'Variabilitate murdărire'
    },
    'system_losses': {
        'type': 'normal',
        'std': 0.015,  # ±1.5%
        'description': 'Incertitudine pierderi sistem'
    },
    'interannual_variability': {
        'type': 'normal',
        'std': 0.08,  # ±8% (variație an-la-an)
        'description': 'Variabilitate climatică interanuală'
    },
    'model_uncertainty': {
        'type': 'normal',
        'std': 0.025,  # ±2.5%
        'description': 'Incertitudine model de calcul'
    }
}

# Cache settings
CACHE_SETTINGS = {
    'tmy_data_ttl': 86400 * 30,  # 30 zile
    'satellite_imagery_ttl': 86400 * 7,  # 7 zile
    'dem_data_ttl': 86400 * 90,  # 90 zile (nu se schimbă)
    'osm_data_ttl': 86400 * 14,  # 14 zile
}

# Report settings
REPORT_CONFIG = {
    'company_name': 'Solar Analyzer Pro',
    'company_address': 'Chișinău, Moldova',
    'certification': 'IEC 61853 / EN 50583 compliant',
    'logo_path': BASE_DIR / 'static' / 'images' / 'logo.png',
}