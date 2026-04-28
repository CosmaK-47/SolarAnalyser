#include "NetworkTask.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "../config.h"
#include "../shared/SharedState.h"

static void connectToWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    Serial.print("Connecting to WiFi");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED) {
        vTaskDelay(pdMS_TO_TICKS(500));
        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
}

static String createJsonPayload(const SensorData &data) {
    StaticJsonDocument<256> doc;

    doc["device_id"] = "solar_node_001";
    doc["temperature"] = data.temperature;
    doc["humidity"] = data.humidity;
    doc["irradiance"] = data.lux;
    doc["panel_voltage"] = data.panelVoltage;
    doc["panel_current"] = data.panelCurrent;
    doc["panel_power"] = data.panelPower;
    doc["timestamp_ms"] = data.timestamp;

    String output;
    serializeJson(doc, output);

    return output;
}

static void sendToBackend(const String &payload) {
    HTTPClient http;

    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");

    Serial.println("Sending JSON:");
    Serial.println(payload);

    int responseCode = http.POST(payload);

    Serial.print("HTTP Response code: ");
    Serial.println(responseCode);

    if (responseCode > 0) {
        Serial.println("Server response:");
        Serial.println(http.getString());
    } else {
        Serial.println("Failed to send request.");
    }

    http.end();
}

void NetworkTask(void *pvParameters) {
    connectToWiFi();

    while (true) {
        if (WiFi.status() != WL_CONNECTED) {
            connectToWiFi();
        }

        SensorData copy;

        if (xSemaphoreTake(dataMutex, portMAX_DELAY)) {
            copy = latestData;
            xSemaphoreGive(dataMutex);
        }

        String payload = createJsonPayload(copy);
        sendToBackend(payload);

        vTaskDelay(pdMS_TO_TICKS(NETWORK_SEND_INTERVAL_MS));
    }
}