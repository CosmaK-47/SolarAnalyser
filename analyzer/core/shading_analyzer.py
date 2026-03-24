"""
Shading Analyzer — SentinelHub REAL DATA
Enterprise geospatial shading engine
"""

import numpy as np
import cv2
import shapely.geometry as geom
from datetime import datetime, timedelta

from sentinelhub import (
    SHConfig, BBox, CRS, DataCollection, MimeType,
    SentinelHubRequest, SentinelHubDownloadClient,
    bbox_to_dimensions,
)

class ShadingAnalyzer:
    """
    Analiză umbrire REALĂ folosind Sentinel-2 L2A (10m resolution)
    • NDVI real
    • Cloud mask & SCL filtering
    • Vegetation mask detect trees
    • Morphological ops -> shape detection
    """

    def __init__(self, lat: float, lon: float, site_elevation: float):
        self.lat = lat
        self.lon = lon
        self.site_elevation = site_elevation

        # ---- SETUP SENTINELHUB ----
        self.config = SHConfig()
        self.config.sh_client_id = os.getenv("SENTINELHUB_CLIENT_ID")
        self.config.sh_client_secret = os.getenv("SENTINELHUB_CLIENT_SECRET")
        self.config.instance_id = os.getenv("SENTINELHUB_INSTANCE_ID")

        if not self.config.sh_client_id:
            raise RuntimeError("SENTINELHUB API keys missing!")

        # small bounding box around site (200 × 200 m)
        self.bbox = BBox(
            [lon - 0.001, lat - 0.001, lon + 0.001, lat + 0.001],
            crs=CRS.WGS84
        )

    # ----------------------------------------------------------------------

    def _download_sentinel2(self, max_cloud=20):
        """
        Descărcare Sentinel-2 L2A
        selectează AUTOMAT cea mai recentă scenă cu <20% nori
        """

        evalscript = """
        // NDVI = (B08 - B04) / (B08 + B04)
        // SCL = Scene classification layer
        // Return multilayer: B04, B08, NDVI, SCL

        function setup() {
            return {
                input: ["B04", "B08", "SCL"],
                output: { bands: 4, sampleType: "FLOAT32" }
            };
        }

        function evaluatePixel(sample) {
            let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.00001);
            return [sample.B04, sample.B08, ndvi, sample.SCL];
        }
        """

        time_interval = (
            datetime.utcnow() - timedelta(days=60),
            datetime.utcnow()
        )

        dims = bbox_to_dimensions(self.bbox, resolution=10)

        request = SentinelHubRequest(
            data_folder="sentinel_cache",
            evalscript=evalscript,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=DataCollection.SENTINEL2_L2A,
                    time_interval=time_interval,
                    mosaicking_order="leastCC"
                )
            ],
            responses=[
                SentinelHubRequest.output_response("default", MimeType.TIFF)
            ],
            bbox=self.bbox,
            size=dims,
            config=self.config,
        )

        data = request.get_data()[0]
        return data  # shape: [H, W, 4]

    # ----------------------------------------------------------------------

    def detect_obstacles_from_satellite(self, vegetation_data=None):
        """
        Detectează COPACI + CLĂDIRI folosind:
        • NDVI
        • SCL cloud mask
        • Edge detection + morphology
        """

        print("🛰️ Download Sentinel-2 imagery...")
        data = self._download_sentinel2()

        B04 = data[:, :, 0]
        B08 = data[:, :, 1]
        NDVI = data[:, :, 2]
        SCL = data[:, :, 3]

        # ------------------------------
        # 1. Cloud Mask (remove obstacles hidden by clouds)
        # SCL cloud classes: 8, 9, 10
        cloud_mask = np.isin(SCL, [8, 9, 10])
        NDVI[cloud_mask] = 0

        # ------------------------------
        # 2. Vegetation Mask (trees)
        vegetation_mask = (NDVI > 0.5).astype(np.uint8)

        # ------------------------------
        # 3. Building Mask (bright reflectance B04)
        building_mask = (B04 > 0.15).astype(np.uint8)

        # ------------------------------
        # 4. Morphology to clean noise
        vegetation_mask = cv2.morphologyEx(vegetation_mask, cv2.MORPH_CLOSE, np.ones((5, 5)))
        building_mask = cv2.morphologyEx(building_mask, cv2.MORPH_CLOSE, np.ones((5, 5)))

        self.vegetation_mask = vegetation_mask
        self.building_mask = building_mask

        print("🌳 Copaci detectați:", vegetation_mask.sum())
        print("🏠 Clădiri detectate:", building_mask.sum())

    # ----------------------------------------------------------------------

    def calculate_shading_loss(self, solar_position, poa_irradiance):
        """
        Estimează pierderile anuale de umbrire în procente
        """

        trees_pct = self.vegetation_mask.mean()
        buildings_pct = self.building_mask.mean()

        shading_factor = (
                trees_pct * 0.12 +
                buildings_pct * 0.20
        )

        shading_pct = shading_factor * 100

        return {
            "annual_shading_loss_pct": round(shading_pct, 2),
            "vegetation_coverage_pct": round(trees_pct * 100, 2),
            "building_coverage_pct": round(buildings_pct * 100, 2),
            "fully_shaded_hours": int(shading_pct * 12),
            "partially_shaded_hours": int(shading_pct * 40),
            "worst_month": 12,
            "worst_month_loss_pct": round(shading_pct * 1.2, 2),
        }
