"""
PIPELINE — Solar Analyzer Pro (Enterprise Edition)
Orchestratorul complet al întregului sistem.

Acest modul realizează:
    ✓ colectare date
    ✓ analiză TMY
    ✓ shading_analysis
    ✓ terrain_analysis
    ✓ infrastructure scoring
    ✓ p50/p90 Monte Carlo
    ✓ map generation
    ✓ PDF report generation
    ✓ validation engine
    ✓ return JSON final
"""

import json
from pathlib import Path
from datetime import datetime

# ---- IMPORTĂ TOATE MODULELE EXISTENTE ----

# ---- IMPORTĂ TOATE MODULELE EXISTENTE ----

from analyzer.core.data_fetcher import DataFetcherPro
from analyzer.core.tmy_analyzer import TMYAnalyzer
from analyzer.core.shading_analyzer import ShadingAnalyzer
from analyzer.core.p50_p90_calculator import P50P90Calculator
from analyzer.core.terrain_analyzer import TerrainAnalyzer
from analyzer.core.infrastructure import InfrastructureAnalyzer
from analyzer.core.validation import ValidationEngine
from analyzer.reports.map_generator import MapGenerator
from analyzer.reports.pdf_generator import PDFReportGenerator

from config import REPORTS_DIR



# ======================================================================
#                MAIN PIPELINE FUNCTION (ENTRYPOINT)
# ======================================================================

def run_full_analysis(
        lat: float,
        lon: float,
        area_ha: float,
        address: str = "N/A",
        zone: str = "N/A",
        output_prefix: str = None
):
    """
    Execută TOT procesul de analiză solară într-un singur call.

    Args:
        lat: latitude
        lon: longitude
        area_ha: hectar area
        address: optional address for the PDF report
        zone: rural/urban/industrial
        output_prefix: optional prefix for PDF files

    Returns:
        dict: full output suitable for API / dashboard
    """

    print("\n🚀 Pipeline START — Solar Analyzer Pro")
    print("=====================================")

    # ----------------------------------------------------------------------
    # 1. FETCH DATA (PVGIS, NASA, DEM, Sentinel, OSM)
    # ----------------------------------------------------------------------
    fetcher = DataFetcherPro(lat=lat, lon=lon, area_ha=area_ha)
    data = fetcher.fetch_all_data()

    tmy = data["tmy_data"]
    elevation_data = data["elevation_data"]
    satellite = data["satellite_imagery"]
    infra_raw = data["infrastructure"]

    print("\n📦 Date colectate complet.")


    # ----------------------------------------------------------------------
    # 2. TERRAIN ANALYSIS
    # ----------------------------------------------------------------------
    terrain = TerrainAnalyzer(
        lat=lat,
        lon=lon,
        elevation_data=elevation_data
    ).analyze()

    print("🗻 Analiză teren completă.")

    # ----------------------------------------------------------------------
    # 3. TMY Solar Analyzer (PVlib)
    # ----------------------------------------------------------------------
    tmy_analyzer = TMYAnalyzer(
        lat=lat,
        lon=lon,
        tmy_data=tmy
    )

    tmy_results = tmy_analyzer.analyze_complete()

    print("🌞 Analiză TMY completă.")


    # ----------------------------------------------------------------------
    # 4. SHADING ANALYSIS
    # ----------------------------------------------------------------------
    shading_engine = ShadingAnalyzer(
        lat=lat,
        lon=lon,
        site_elevation=elevation_data["elevation_mean"]
    )

    shading_engine.detect_obstacles_from_satellite(
        vegetation_data=satellite
    )

    shading_results = shading_engine.calculate_shading_loss(
        solar_position=tmy_analyzer._calculate_solar_position(),
        poa_irradiance=tmy_analyzer._calculate_poa_irradiance(
            tmy_analyzer._calculate_solar_position(),
            tmy_analyzer._get_default_system_params()
        )
    )

    print("🌳 Analiză umbrire completă.")


    # ----------------------------------------------------------------------
    # 5. INFRASTRUCTURE SCORING
    # ----------------------------------------------------------------------
    infra_score = InfrastructureAnalyzer(
        infrastructure_data=infra_raw
    ).calculate_score()

    print("🏗️ Infrastructură evaluată.")


    # ----------------------------------------------------------------------
    # 6. P50 / P90 Monte Carlo
    # ----------------------------------------------------------------------
    p50_engine = P50P90Calculator(
        base_production_kwh=tmy_results["annual_production_kwh"]
    )

    p50_p90 = p50_engine.calculate_p_values()

    print("🎲 Analiză probabilistică P50/P90 completă.")


    # ----------------------------------------------------------------------
    # 7. VALIDATION ENGINE (Quality Gate)
    # ----------------------------------------------------------------------
    validation = ValidationEngine(
        site_info={"lat": lat, "lon": lon, "area_ha": area_ha},
        tmy_data=tmy,
        terrain_data=terrain,
        shading_data=shading_results,
        infrastructure_score=infra_score
    ).calculate_final_validation()

    print("🛡️ Validare completă.")


    # ----------------------------------------------------------------------
    # 8. MAP GENERATION
    # ----------------------------------------------------------------------
    map_renderer = MapGenerator(
        lat=lat, lon=lon, bbox=data["location"]["bbox"]
    )
    map_path = map_renderer.render_static_map()
    heatmap_path = map_renderer.render_heatmap()

    print("🗺️ Hărți generate.")


    # ----------------------------------------------------------------------
    # 9. PDF REPORT GENERATION
    # ----------------------------------------------------------------------
    if not output_prefix:
        output_prefix = f"solar_report_{lat:.4f}_{lon:.4f}"

    pdf_path = REPORTS_DIR / f"{output_prefix}.pdf"

    pdf = PDFReportGenerator(str(pdf_path))
    pdf.generate_complete_report(
        analysis_results=tmy_results,
        p50_p90_results={
            "p10": p50_p90.p10,
            "p50": p50_p90.p50,
            "p90": p50_p90.p90,
            "mean": p50_p90.mean,
            "std": p50_p90.std
        },
        shading_results=shading_results,
        site_info={
            "lat": lat,
            "lon": lon,
            "area_ha": area_ha,
            "address": address,
            "zone": zone,
            "elevation": elevation_data["elevation_mean"]
        }
    )

    print("📄 PDF generat.")


    # ----------------------------------------------------------------------
    # 10. RETURN FULL OUTPUT FOR API / UI
    # ----------------------------------------------------------------------

    result = {
        "site": {"lat": lat, "lon": lon, "area": area_ha},
        "tmy_results": tmy_results,
        "terrain": terrain,
        "shading": shading_results,
        "infra": infra_score,
        "p50_p90": {
            "p10": p50_p90.p10,
            "p50": p50_p90.p50,
            "p90": p50_p90.p90,
            "mean": p50_p90.mean,
            "std": p50_p90.std
        },
        "validation": validation,
        "maps": {
            "static_map": map_path,
            "heatmap": heatmap_path
        },
        "pdf_report": str(pdf_path),
        "generated_at": datetime.now().isoformat()
    }

    print("\n🎉 PIPELINE COMPLET!")
    print("====================")
    print(f"PDF: {pdf_path}")

    return result
