"""
Validation Module (Enterprise Edition)
Validează calitatea datelor, locației și a întregii analize.
Acest modul este un „Quality Gate” pentru Solar Analyzer Pro.

Include:
    ✓ validare coordonate
    ✓ validare limite Moldova
    ✓ validare TMY
    ✓ validare DEM / pantă / aspect
    ✓ validare umbrire
    ✓ validare infrastructură
    ✓ scor final 0–10 + verdict (Acceptat / Necesită verificări / Respins)
"""

import numpy as np
from typing import Dict, Tuple

from config import MOLDOVA_CONFIG


class ValidationEngine:
    """
    Motor central de validare.
    Toate modulele trimit date aici pentru verificare finală.
    """

    def __init__(
            self,
            site_info: Dict,
            tmy_data,
            terrain_data: Dict,
            shading_data: Dict,
            infrastructure_score: Dict
    ):
        self.site = site_info
        self.tmy = tmy_data
        self.terrain = terrain_data
        self.shading = shading_data
        self.infra = infrastructure_score

        print("🛡️ ValidationEngine inițializat...")


    # -------------------------------------------------------------
    # 1. Validare coordonate
    # -------------------------------------------------------------
    def validate_coordinates(self) -> Tuple[bool, str, float]:
        lat, lon = self.site["lat"], self.site["lon"]

        min_lat, max_lat = MOLDOVA_CONFIG["latitude_range"]
        min_lon, max_lon = MOLDOVA_CONFIG["longitude_range"]

        if not (min_lat <= lat <= max_lat):
            return False, "Coordonata LAT este în afara Moldovei", 0

        if not (min_lon <= lon <= max_lon):
            return False, "Coordonata LON este în afara Moldovei", 0

        return True, "Coordonate valide", 10


    # -------------------------------------------------------------
    # 2. Validare date climatice (TMY)
    # -------------------------------------------------------------
    def validate_tmy(self) -> Tuple[bool, str, float]:

        if self.tmy is None or len(self.tmy) < 8000:   # 8760 ore într-un an
            return False, "Date TMY insuficiente sau invalide", 0

        # verificăm valori absurde (negativ la GHI)
        if (self.tmy["ghi"] < -5).any():
            return False, "Date TMY conțin valori anormale (ghi < 0)", 0

        irradiation = self.tmy["ghi"].sum() / 1000  # kWh/m2

        # Limite fiziologice pentru Moldova
        if not (1100 < irradiation < 1600):
            return False, (
                f"Iradierea anuală pare anormală: {irradiation:.0f} kWh/m²",
                3
            )

        return True, "Date TMY valide", 10


    # -------------------------------------------------------------
    # 3. Validare teren (pantă & aspect)
    # -------------------------------------------------------------
    def validate_terrain(self) -> Tuple[bool, str, float]:

        slope = self.terrain.get("slope_mean", None)
        slope_max = self.terrain.get("slope_max", None)

        if slope is None:
            return False, "Date DEM insuficiente", 0

        if slope_max > 18:
            return False, f"Panta maximă {slope_max:.1f}° este prea mare", 1

        if slope > 12:
            return False, f"Panta medie {slope:.1f}° este mare pentru FV", 3

        # aspect optim = 135°–225° (S-SE-SV)
        aspect = self.terrain.get("aspect_mean", 180)

        if 135 <= aspect <= 225:
            score = 10
        else:
            score = 6

        return True, "Teren valid pentru FV", score


    # -------------------------------------------------------------
    # 4. Validare umbrire
    # -------------------------------------------------------------
    def validate_shading(self) -> Tuple[bool, str, float]:

        loss = self.shading.get("annual_shading_loss_pct", None)

        if loss is None:
            return False, "Date umbrire lipsesc", 0

        if loss > 25:
            return False, "Umbrire excesivă (>25%)", 1

        if loss > 15:
            return True, "Umbrire moderată", 5

        if loss > 8:
            return True, "Umbrire redusă", 7

        return True, "Umbrire minimă", 10


    # -------------------------------------------------------------
    # 5. Validare infrastructură
    # -------------------------------------------------------------
    def validate_infrastructure(self) -> Tuple[bool, str, float]:

        infra_score = self.infra.get("score", None)

        if infra_score is None:
            return False, "Scor infrastructură lipsă", 0

        if infra_score < 4:
            return False, "Infrastructură insuficientă", infra_score

        if infra_score < 6:
            return True, "Infrastructură moderată", infra_score

        if infra_score < 8:
            return True, "Infrastructură bună", infra_score

        return True, "Infrastructură excelentă", infra_score


    # -------------------------------------------------------------
    # 6. Scor final
    # -------------------------------------------------------------
    def calculate_final_validation(self) -> Dict:

        results = {}

        coord_ok, coord_msg, coord_score = self.validate_coordinates()
        tmy_ok, tmy_msg, tmy_score = self.validate_tmy()
        terrain_ok, terrain_msg, terrain_score = self.validate_terrain()
        shading_ok, shading_msg, shading_score = self.validate_shading()
        infra_ok, infra_msg, infra_score = self.validate_infrastructure()

        # salvăm rezultate detaliate
        results["coordinates"] = {
            "ok": coord_ok,
            "message": coord_msg,
            "score": coord_score
        }
        results["tmy"] = {
            "ok": tmy_ok,
            "message": tmy_msg,
            "score": tmy_score
        }
        results["terrain"] = {
            "ok": terrain_ok,
            "message": terrain_msg,
            "score": terrain_score
        }
        results["shading"] = {
            "ok": shading_ok,
            "message": shading_msg,
            "score": shading_score
        }
        results["infrastructure"] = {
            "ok": infra_ok,
            "message": infra_msg,
            "score": infra_score
        }

        # calcul scor final (ponderi reale industrial)
        final_score = (
                coord_score * 0.10 +
                tmy_score * 0.25 +
                terrain_score * 0.20 +
                shading_score * 0.15 +
                infra_score * 0.30
        )

        # verdict final
        if final_score >= 8:
            verdict = "ACCEPTAT — locație excelentă"
        elif final_score >= 6:
            verdict = "ACCEPTAT CU OBSERVAȚII — necesită verificări"
        else:
            verdict = "RESPINS — locația prezintă probleme majore"

        results["final"] = {
            "score": round(final_score, 2),
            "verdict": verdict
        }

        print("\n📊 VALIDATION SUMMARY")
        print("=====================")
        print(f"Final score: {final_score:.2f}/10")
        print(f"Verdict: {verdict}")

        return results
