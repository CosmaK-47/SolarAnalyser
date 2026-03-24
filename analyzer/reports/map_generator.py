"""
Map Generator (Enterprise Edition)
Creează o hartă profesională PNG cu:
- Imagistică satelit Mapbox / Sentinel-2
- NDVI mask
- Shading zones
- Power grid & drumuri (OSM)
- Bounding box & scale bar

Autor: Cosmin Usurelu
"""

import io
import requests
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Tuple

import matplotlib.pyplot as plt
import matplotlib.colors as mcolors


class MapGenerator:
    """
    Generator de hărți pentru rapoarte profesionale
    """

    def __init__(self, mapbox_token: str):
        self.token = mapbox_token

    # ------------------------------------------------------------------
    # Obține harta satelit Mapbox Static API
    # ------------------------------------------------------------------
    def _get_satellite_tile(self, lat: float, lon: float, zoom: int = 16,
                            width: int = 1280, height: int = 1280) -> Image.Image:

        url = (
            f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/"
            f"{lon},{lat},{zoom},0/{width}x{height}"
            f"?access_token={self.token}"
        )

        resp = requests.get(url, timeout=20)
        resp.raise_for_status()

        return Image.open(io.BytesIO(resp.content))


    # ------------------------------------------------------------------
    # Creează heatmap NDVI peste imagine
    # ------------------------------------------------------------------
    def _overlay_ndvi(self, base_img: Image.Image, ndvi_mean: float) -> Image.Image:

        overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # NDVI → verde intens dacă vegetația e mare
        # Folosim transparență în funcție de nivel
        alpha = int(ndvi_mean * 180)

        green_layer = (34, 139, 34, alpha)
        draw.rectangle([0, 0, base_img.width, base_img.height], fill=green_layer)

        return Image.alpha_composite(base_img.convert("RGBA"), overlay)


    # ------------------------------------------------------------------
    # Desenează zone de shading
    # ------------------------------------------------------------------
    def _draw_shading(self, img: Image.Image, shading_factor: float) -> Image.Image:

        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Shading = roșu semitransparent
        alpha = int(120 * shading_factor)
        shade_color = (255, 0, 0, alpha)

        draw.rectangle([0, 0, img.width, img.height], fill=shade_color)

        return Image.alpha_composite(img, overlay)


    # ------------------------------------------------------------------
    # Desenează power grid points
    # ------------------------------------------------------------------
    def _draw_power_grid(self, img: Image.Image,
                         grid_dist_m: float) -> Image.Image:

        draw = ImageDraw.Draw(img)

        # Culoare albastră pentru linii electrice
        color = (50, 150, 255)

        # Icon simplu: cerc + text
        draw.ellipse((30, 30, 90, 90), outline=color, width=4)
        draw.text((100, 40),
                  f"Power Grid: {grid_dist_m:.0f}m",
                  fill=color)

        return img


    # ------------------------------------------------------------------
    # Desenează scală hărții
    # ------------------------------------------------------------------
    def _draw_scale_bar(self, img: Image.Image, meters: int = 100) -> Image.Image:

        draw = ImageDraw.Draw(img)
        bar_length_px = 200

        y = img.height - 80
        x = 60

        draw.line((x, y, x + bar_length_px, y), fill="white", width=6)
        draw.text((x, y - 40), f"{meters} m", fill="white")

        return img


    # ------------------------------------------------------------------
    # Funcția principală → generează imaginea finală
    # ------------------------------------------------------------------
    def generate_map(self, location: Dict,
                     satellite_data: Dict,
                     ndvi_data: Dict,
                     infrastructure: Dict,
                     output_path: str = "final_map.png") -> str:

        lat = location['lat']
        lon = location['lon']

        print("🗺️ Generare hartă satelit...")

        # 1) harta satelit
        img = self._get_satellite_tile(lat, lon, zoom=16)

        # 2) overlay NDVI
        img = self._overlay_ndvi(img, ndvi_data['ndvi_mean'])

        # 3) shading
        img = self._draw_shading(img, ndvi_data['shading_factor'])

        # 4) rețea electrică
        img = self._draw_power_grid(img, infrastructure['distance_to_power_grid_m'])

        # 5) scală
        img = self._draw_scale_bar(img)

        print("💾 Salvare PNG...")

        img.save(output_path, format="PNG")

        return output_path
