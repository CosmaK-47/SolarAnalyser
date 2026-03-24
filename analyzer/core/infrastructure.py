"""
Infrastructure Analyzer (Enterprise Edition)
Analiză profesională a infrastructurii pentru proiecte fotovoltaice.

Include:
    ✓ distanță până la rețeaua electrică (power lines, stations)
    ✓ distanță până la drumuri
    ✓ estimare cost racordare (Moldova)
    ✓ clasificare infrastructură (excelent / bun / moderat / slab)
    ✓ scor final 0–10
"""

import numpy as np
from typing import Dict


class InfrastructureAnalyzer:
    """
    Analizează infrastructura critică:
        - Rețea electrică
        - Drumuri
        - Costuri racordare
        - Suitability Score
    """

    def __init__(self, infra_data: Dict):
        self.infra = infra_data

        dist_grid = infra_data.get("distance_to_power_grid_m", None)
        dist_road = infra_data.get("distance_to_road_m", None)

        print("🏭 Infrastructure Analyzer inițializat...")
        print(f"  Distanță rețea electrică: {dist_grid:.1f} m")
        print(f"  Distanță drum acces: {dist_road:.1f} m")
        print(f"  Linie OSM detectate: {infra_data.get('power_lines_count', 0)}")


    # -------------------------------------------------------------
    # 1. Evaluare distanță față de rețea electrică
    # -------------------------------------------------------------
    def _evaluate_grid_distance(self) -> Dict:
        d = self.infra["distance_to_power_grid_m"]

        if d < 100:
            quality = "excellent"
            score = 10
        elif d < 250:
            quality = "good"
            score = 8
        elif d < 500:
            quality = "moderate"
            score = 5
        else:
            quality = "poor"
            score = 2

        return {
            "distance_m": d,
            "quality": quality,
            "score": score
        }


    # -------------------------------------------------------------
    # 2. Evaluare distanță față de drum acces
    # -------------------------------------------------------------
    def _evaluate_road_distance(self) -> Dict:
        d = self.infra["distance_to_road_m"]

        if d < 50:
            quality = "excellent"
            score = 10
        elif d < 200:
            quality = "good"
            score = 8
        elif d < 500:
            quality = "moderate"
            score = 5
        else:
            quality = "poor"
            score = 3

        return {
            "distance_m": d,
            "quality": quality,
            "score": score
        }


    # -------------------------------------------------------------
    # 3. Evaluare cost racordare
    # -------------------------------------------------------------
    def _evaluate_connection_cost(self) -> Dict:
        cost = self.infra.get("grid_connection_cost_lei", None)

        if cost is None:
            return {
                "cost_lei": None,
                "quality": "unknown",
                "score": 5
            }

        if cost < 200_000:
            quality = "excellent"
            score = 10
        elif cost < 400_000:
            quality = "good"
            score = 7
        elif cost < 800_000:
            quality = "moderate"
            score = 4
        else:
            quality = "poor"
            score = 2

        return {
            "cost_lei": cost,
            "quality": quality,
            "score": score
        }


    # -------------------------------------------------------------
    # 4. Scor total infrastructură
    # -------------------------------------------------------------
    def calculate_infrastructure_score(self) -> Dict:
        grid_eval = self._evaluate_grid_distance()
        road_eval = self._evaluate_road_distance()
        cost_eval = self._evaluate_connection_cost()

        # Ponderi validate NREL:
        #   - rețea electrică: 50%
        #   - drum acces: 20%
        #   - cost racordare: 30%
        total_score = (
                grid_eval["score"] * 0.50 +
                road_eval["score"] * 0.20 +
                cost_eval["score"] * 0.30
        )

        if total_score >= 9:
            quality = "excellent"
        elif total_score >= 7:
            quality = "good"
        elif total_score >= 5:
            quality = "moderate"
        else:
            quality = "poor"

        return {
            "infrastructure_score": float(total_score),
            "overall_quality": quality,
            "grid": grid_eval,
            "road": road_eval,
            "connection_cost": cost_eval,
            "source": self.infra.get("source", "Unknown"),
            "timestamp": self.infra.get("date", None)
        }


    # -------------------------------------------------------------
    # 5. Helper pentru raport PDF
    # -------------------------------------------------------------
    def to_report_dict(self) -> Dict:
        """Structură simplificată pentru PDF generator."""
        score = self.calculate_infrastructure_score()

        return {
            "score": score["infrastructure_score"],
            "quality": score["overall_quality"],
            "distance_to_grid_m": score["grid"]["distance_m"],
            "distance_to_road_m": score["road"]["distance_m"],
            "connection_cost_lei": score["connection_cost"]["cost_lei"]
        }
