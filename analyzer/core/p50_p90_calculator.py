"""
P50 / P90 Energy Yield Calculator (Enterprise Monte-Carlo Engine)
Autor: Cosmin Usurelu (SolarAnalyzer Pro)
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class UncertaintyConfig:
    # Incertitudini sursă iradiere
    irradiance_source_error: float = 0.042   # PVGIS ±4.2%
    irradiance_year_variation: float = 0.035 # Variabilitate naturală ±3.5%

    # Pierderi sistem
    inverter_efficiency: float = 0.98
    temperature_loss: float = 0.04           # ±4% pierderi din temperatura panourilor
    soiling_loss: float = 0.02               # ±2% mizerie / praf
    mismatch_loss: float = 0.015             # ±1.5% mismatch panouri

    # Degradare anuală panouri
    degradation_rate: float = 0.005          # 0.5% pe an

    # Pierderi shading
    shading_uncertainty: float = 0.10        # ±10% incertitudine


class P50P90Calculator:
    """
    Monte-Carlo simulator pentru calcul P50 / P90 / P10.
    """

    def __init__(self, uncertainty: Optional[UncertaintyConfig] = None):
        self.unc = uncertainty or UncertaintyConfig()

    # ----------------------------------------------------------
    # 1) Funcția principală
    # ----------------------------------------------------------
    def simulate(self, annual_yield_kwh: float, shading_loss_pct: float, years: int = 1,
                 iterations: int = 10000) -> Dict:

        """
        Args:
            annual_yield_kwh: producția anuală fără pierderi
            shading_loss_pct: pierdere shading reală (%)
            years: număr de ani analizați
            iterations: simulări Monte Carlo (10000 = standard bancabil)

        Returns:
            dict cu P90, P50, P10, histogramă etc.
        """

        shading_loss = shading_loss_pct / 100

        # Lista în care stocăm rezultatele simulării
        results = []

        for _ in range(iterations):
            # 1) variația iradierii globale
            irr_var = np.random.normal(0, self.unc.irradiance_year_variation)

            # 2) eroare sursă PVGIS
            irr_source = np.random.normal(0, self.unc.irradiance_source_error)

            # 3) incertitudine shading
            shading_error = np.random.normal(0, self.unc.shading_uncertainty / 2)

            # 4) degradare anuală
            degradation = (1 - self.unc.degradation_rate) ** years

            # 5) pierderi tehnice diverse
            temperature = np.random.normal(self.unc.temperature_loss, 0.01)
            soiling = np.random.normal(self.unc.soiling_loss, 0.005)
            mismatch = np.random.normal(self.unc.mismatch_loss, 0.003)

            # --------------------------------------------------
            # CALCUL FINAL PRODUCȚIE
            # --------------------------------------------------

            production = annual_yield_kwh * \
                         (1 + irr_var) * \
                         (1 + irr_source) * \
                         (1 - shading_loss + shading_error) * \
                         degradation * \
                         self.unc.inverter_efficiency * \
                         (1 - temperature) * \
                         (1 - soiling) * \
                         (1 - mismatch)

            results.append(production)

        results = np.array(results)

        return {
            "P90": np.percentile(results, 10),
            "P50": np.percentile(results, 50),
            "P10": np.percentile(results, 90),
            "mean": float(results.mean()),
            "std_dev": float(results.std()),
            "histogram": results
        }
