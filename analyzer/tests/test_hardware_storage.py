from django.test import SimpleTestCase

from analyzer.hardware.storage import normalize_iot_measurements


class HardwareStorageTests(SimpleTestCase):
    def test_raw_esp32_payload_uses_device_gps_and_lux(self):
        records = normalize_iot_measurements([
            {
                "temperature": 18.5,
                "humidity": 34,
                "bh1750_lux": 1432.5,
                "panel_voltage": 8.187999725,
                "panel_current": 0,
                "panel_power": 0,
                "gps_valid": True,
                "latitude": 47.030028,
                "longitude": 28.86544483,
                "satellites": 12,
                "received_at": "2026-05-14T11:09:37.364084",
            }
        ])

        by_metric = {record["metric"]: record for record in records}

        self.assertEqual(
            set(by_metric),
            {
                "temperature",
                "humidity",
                "irradiance",
                "panel_voltage",
                "panel_current",
                "panel_power",
            },
        )
        self.assertEqual(by_metric["temperature"]["lat"], 47.030028)
        self.assertEqual(by_metric["temperature"]["lng"], 28.86544483)
        self.assertEqual(by_metric["temperature"]["location"], "Current GPS")
        self.assertEqual(by_metric["temperature"]["point_id"], "pt-47.03003-28.86544")
        self.assertEqual(by_metric["irradiance"]["value"], 11.94)

    def test_invalid_gps_payload_does_not_create_coordinates(self):
        records = normalize_iot_measurements([
            {
                "temperature": 24.1,
                "gps_valid": False,
                "latitude": 47.030028,
                "longitude": 28.86544483,
                "received_at": "2026-05-14T10:28:12.298714",
            }
        ])

        self.assertEqual(records[0]["lat"], None)
        self.assertEqual(records[0]["lng"], None)
        self.assertEqual(records[0]["point_id"], None)
