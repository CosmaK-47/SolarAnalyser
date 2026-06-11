#pragma once

#include <DHT.h>

// DHT11
#define DHT_PIN 4
#define DHT_TYPE DHT11

// I2C: BH1750 + INA219
#define I2C_SDA 21
#define I2C_SCL 22

#define LDR_PIN 34

// GPS NEO-6M UART
#define GPS_RX_PIN 16   // ESP32 RX <- GPS TX
#define GPS_TX_PIN 17   // ESP32 TX -> GPS RX
#define GPS_BAUD 9600

// Timing
#define SENSOR_READ_INTERVAL_MS 2000
#define NETWORK_SEND_INTERVAL_MS 5000

// Wi-Fi
#define WIFI_SSID "StarNet - usurelu.gh"
#define WIFI_PASSWORD "48575443077A90AD"

// Backend API
#define API_URL "http://192.168.100.6:8000/api/hardware/measurements/"