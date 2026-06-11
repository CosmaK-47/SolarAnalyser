#include "NetworkTask.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "../include/config.h"
#include "../shared/SharedState.h"

static void connectWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("WiFi connection failed!");
    }
}

void NetworkTask(void *pvParameters) {
    connectWiFi();

    while (true) {
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi lost. Reconnecting...");
            connectWiFi();
            vTaskDelay(pdMS_TO_TICKS(3000));
            continue;
        }

        SensorData data;

        if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
            data = latestData;
            xSemaphoreGive(dataMutex);
        }

        StaticJsonDocument<512> doc;

        doc["temperature"] = data.temperature;
        doc["humidity"] = data.humidity;
        doc["lux"] = data.lux;

        doc["panel_voltage"] = data.panelVoltage;
        doc["panel_current"] = data.panelCurrent;
        doc["panel_power"] = data.panelPower;

        doc["latitude"] = data.latitude;
        doc["longitude"] = data.longitude;
        doc["altitude"] = data.altitude;
        doc["satellites"] = data.satellites;
        doc["gps_valid"] = data.gpsValid;

        doc["timestamp_ms"] = data.timestamp;

        String payload;
        serializeJson(doc, payload);

        HTTPClient http;
        http.begin(API_URL);
        http.addHeader("Content-Type", "application/json");

        int responseCode = http.POST(payload);

        Serial.println();
        Serial.println("===== NETWORK SEND =====");
        Serial.println(payload);

        Serial.print("HTTP response: ");
        Serial.println(responseCode);

        http.end();

        vTaskDelay(pdMS_TO_TICKS(NETWORK_SEND_INTERVAL_MS));
    }
}