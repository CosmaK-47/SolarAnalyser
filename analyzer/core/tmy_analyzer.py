"""
TMY Analyzer (Enterprise Edition)
Calculează producția solară reală (8760 ore) din date TMY:
- corecție radiație după pantă și orientare
- temperatură panou (NOCT)
- eficiență reală pe oră
- pierderi sistem
- producție anuală (kWh/kWp)
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple


class TMYAnalyzer:
    """
    Analizor complet pentru TMY (Typical Meteorological Year)
    """

    def __init__(
            self,
            tmy_df: pd.DataFrame,
            tilt: float = 30.0,
            azimuth: float = 180.0,
            system_losses_pct: float = 14.0,
            module_temp_coeff: float = -0.004,
            noct_temp: float = 45.0
    ):
        """
        Args:
            tmy_df: DataFrame cu 8760 ore (ghi, dni, dhi, temp_air, wind_speed)
            tilt: unghi înclinație panouri (grade)
            azimuth: 180 = sud, 90 = est, 270 = vest
            system_losses_pct: pierderi totale sistem
            module_temp_coeff: coeficient temperatură panou
            noct_temp: NOCT (°C)
        """
        self.df = tmy_df.copy()
        self.tilt = np.radians(tilt)
        self.azimuth = np.radians(azimuth)
        self.loss_factor = 1 - system_losses_pct / 100
        self.module_temp_coeff = module_temp_coeff
        self.noct_temp = noct_temp

        print("🌞 TMY Analyzer inițializat")
        print(f"  Panouri: tilt={np.degrees(self.tilt)}°, azimut={np.degrees(self.azimuth)}°")
        print(f"  Pierderi sistem: {system_losses_pct}%")

    # -------------------------------------------------------------------
    # Calcul poziție solară (solar elevation & solar azimuth)
    # -------------------------------------------------------------------
    def _calculate_solar_position(self):
        """
        Calculează poziția soarelui pentru fiecare oră.
        Folosește algoritm NOAA Solar Position.

        Output:
            df[['solar_zenith', 'solar_azimuth']]
        """

        # ziua anului
        self.df["day"] = self.df.index.dayofyear
        hour = self.df.index.hour + self.df.index.minute / 60

        # declinație solară
        gamma = 2 * np.pi * (self.df["day"] - 1) / 365
        decl = (
                0.006918
                - 0.399912 * np.cos(gamma)
                + 0.070257 * np.sin(gamma)
                - 0.006758 * np.cos(2 * gamma)
                + 0.000907 * np.sin(2 * gamma)
                - 0.002697 * np.cos(3 * gamma)
                + 0.00148 * np.sin(3 * gamma)
        )

        lat_rad = np.radians(self.df.attrs["lat"])
        lon = self.df.attrs["lon"]

        # equation of time
        eq_time = (
                229.18
                * (
                        0.000075
                        + 0.001868 * np.cos(gamma)
                        - 0.032077 * np.sin(gamma)
                        - 0.014615 * np.cos(2 * gamma)
                        - 0.040849 * np.sin(2 * gamma)
                )
        )

        # solar time fix
        time_offset = eq_time + 4 * lon
        tst = hour * 60 + time_offset
        ha = np.radians((tst / 4) - 180)  # hour angle

        # solar elevation & azimuth
        cos_zenith = (
                np.sin(lat_rad) * np.sin(decl)
                + np.cos(lat_rad) * np.cos(decl) * np.cos(ha)
        )
        zenith = np.arccos(np.clip(cos_zenith, -1, 1))

        # solar azimuth
        sin_az = -np.sin(ha) * np.cos(decl) / np.sin(zenith)
        cos_az = (
                (np.sin(decl) - np.sin(lat_rad) * np.cos(zenith))
                / (np.cos(lat_rad) * np.sin(zenith))
        )
        az = np.arctan2(sin_az, cos_az)

        self.df["solar_zenith"] = zenith
        self.df["solar_azimuth"] = (az + 2 * np.pi) % (2 * np.pi)

    # -------------------------------------------------------------------
    # Proiecția radiației pe suprafața panoului (Hay-Davies Model)
    # -------------------------------------------------------------------
    def _calculate_poa_irradiance(self):
        """
        POA (Plane-of-Array irradiance)
        Model: Hay-Davies
        """

        ghi = self.df["ghi"]
        dni = self.df["dni"]
        dhi = self.df["dhi"]
        zenith = self.df["solar_zenith"]
        az = self.df["solar_azimuth"]

        # cosθ între panou și soare
        cos_theta = (
                np.cos(zenith) * np.cos(self.tilt)
                + np.sin(zenith) * np.sin(self.tilt)
                * np.cos(az - self.azimuth)
        )
        cos_theta = np.clip(cos_theta, 0, 1)

        # componentă directă
        poa_direct = dni * cos_theta

        # componentă difuză
        poa_diffuse = dhi * (1 + np.cos(self.tilt)) / 2

        # componentă reflectată (albedo ~0.2)
        albedo = 0.2
        poa_reflected = ghi * albedo * (1 - np.cos(self.tilt)) / 2

        self.df["poa"] = poa_direct + poa_diffuse + poa_reflected

    # -------------------------------------------------------------------
    # Temperatura panoului (NOCT Model)
    # -------------------------------------------------------------------
    def _calculate_cell_temperature(self):
        irradiance = self.df["poa"].clip(lower=0)
        t_air = self.df["temp_air"]
        wind = self.df["wind_speed"].clip(lower=0.1)

        self.df["t_cell"] = t_air + (self.noct_temp - 20) / 800 * irradiance - 3 * wind

    # -------------------------------------------------------------------
    # Eficiența reală a panoului (temperatură + pierderi)
    # -------------------------------------------------------------------
    def _calculate_power_output(self):
        """
        Transformăm POA în putere reală pe oră (kWh/kWp)
        """
        k_temp = self.module_temp_coeff
        t_cell = self.df["t_cell"]

        efficiency = 1 + k_temp * (t_cell - 25)
        efficiency = efficiency.clip(lower=0)

        self.df["power_kwp"] = (self.df["poa"] / 1000) * efficiency
        self.df["power_kwp"] *= self.loss_factor  # pierderi sistem

    # -------------------------------------------------------------------
    # Funcția principală
    # -------------------------------------------------------------------
    def calculate_yield(self) -> Dict:
        """
        Returnează producția:
        - anuală (kWh/kWp)
        - lunară
        - medie orară
        """

        self._calculate_solar_position()
        self._calculate_poa_irradiance()
        self._calculate_cell_temperature()
        self._calculate_power_output()

        # total anual
        annual_yield = self.df["power_kwp"].sum()

        # producție lunară
        self.df["month"] = self.df.index.month
        monthly = self.df.groupby("month")["power_kwp"].sum()

        return {
            "annual_kwh_kwp": float(annual_yield),
            "monthly_kwh_kwp": monthly.to_dict(),
            "df": self.df,
        }
