#pragma once

#define DHT_PIN 4
#define DHT_TYPE DHT22

#define I2C_SDA 21
#define I2C_SCL 22

#define SENSOR_READ_INTERVAL_MS 2000
#define NETWORK_SEND_INTERVAL_MS 5000

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define API_URL "http://192.168.1.105:8000/api/hardware/measurements/"