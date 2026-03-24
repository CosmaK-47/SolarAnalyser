"""
Terrain Analyzer (Enterprise Edition)
Analiză profesională a reliefului pentru instalații fotovoltaice.

Input:
    dem_data = {
        elevation_mean,
        elevation_min,
        elevation_max,
        slope_mean,
        slope_max,
        aspect_mean,
        source...
    }

Output:
    {
        "terrain_score": ...,
        "slope_quality": ...,
        "aspect_quality": ...,
        "overall_quality": ...,
        "details": {...}
    }

Referințe:
    - NREL Best Practices for PV Siting
    - European Solar Siting Guidelines
    - Sandia Terrain Suitability Model
"""

import numpy as np
from typing import Dict


class TerrainAnalyzer:
    """
    Analizează terenul pentru proiecte fotovoltaice.
    Include:
        • Evaluarea pantei
        • Evaluarea orientării (aspect)
        • Suitability Score
        • Clasificare calitativă
    """

    def __init__(self, dem_data: Dict):
        self.dem = dem_data

        print("🗻 Terrain Analyzer inițializat...")
        print(f"  Slope mean: {self.dem['slope_mean']:.2f}°")
        print(f"  Slope max: {self.dem['slope_max']:.2f}°")
        print(f"  Aspect mean: {self.dem['aspect_mean']:.1f}°")

    # ----------------------------------------------------------------------
    # 1. Evaluarea pantei
    # ----------------------------------------------------------------------
    def _evaluate_slope(self) -> Dict:
        slope = self.dem["slope_mean"]

        if slope < 5:
            quality = "excellent"
            score = 10
        elif slope < 10:
            quality = "good"
            score = 8
        elif slope < 15:
            quality = "moderate"
            score = 5
        else:
            quality = "poor"
            score = 2

        return {
            "slope_mean": slope,
            "slope_max": self.dem["slope_max"],
            "quality": quality,
            "score": score
        }

    # ----------------------------------------------------------------------
    # 2. Evaluarea orientării (aspect)
    # ----------------------------------------------------------------------
    def _evaluate_aspect(self) -> Dict:
        aspect = self.dem["aspect_mean"]

        # Orientare ideală: sud 150–210°
        south_ideal = 180
        diff = abs(aspect - south_ideal)
        diff = min(diff, 360 - diff)

        if diff <= 30:
            quality = "excellent"
            score = 10
        elif diff <= 60:
            quality = "good"
            score = 7
        elif diff <= 90:
            quality = "moderate"
            score = 4
        else:
            quality = "poor"
            score = 2

        return {
            "aspect_mean": aspect,
            "difference_from_south_deg": diff,
            "quality": quality,
            "score": score
        }

    # ----------------------------------------------------------------------
    # 3. Scor total
    # ----------------------------------------------------------------------
    def calculate_terrain_suitability(self) -> Dict:
        slope_eval = self._evaluate_slope()
        aspect_eval = self._evaluate_aspect()

        # Media ponderată conform standardelor NREL:
        #   - slope = 60%
        #   - aspect = 40%
        terrain_score = (
                slope_eval["score"] * 0.6 +
                aspect_eval["score"] * 0.4
        )

        if terrain_score >= 9:
            quality = "excellent"
        elif terrain_score >= 7:
            quality = "good"
        elif terrain_score >= 5:
            quality = "moderate"
        else:
            quality = "poor"

        return {
            "terrain_score": float(terrain_score),
            "overall_quality": quality,
            "slope_quality": slope_eval["quality"],
            "aspect_quality": aspect_eval["quality"],
            "details": {
                "slope": slope_eval,
                "aspect": aspect_eval
            }
        }
