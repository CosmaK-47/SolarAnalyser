#include "SensorTask.h"

#include "../include/config.h"
#include "../shared/SharedState.h"

#include "../sensors/WeatherSensor.h"
#include "../sensors/PowerSensor.h"
#include "../sensors/GpsSensor.h"

static WeatherSensor weatherSensor;
static PowerSensor powerSensor;
static GpsSensor gpsSensor;

void SensorTask(void *pvParameters) {
    Serial.println("Initializing sensors...");

    bool weatherOk = weatherSensor.begin();
    bool powerOk = powerSensor.begin();
    bool gpsOk = gpsSensor.begin();

    Serial.print("DHT11: ");
    Serial.println(weatherOk ? "OK" : "ERROR");

    Serial.print("INA219: ");
    Serial.println(powerOk ? "OK" : "ERROR");

    Serial.print("GPS: ");
    Serial.println(gpsOk ? "OK" : "ERROR");

    Serial.println("BH1750: SKIPPED");

    while (true) {
        SensorData tempData;

        weatherSensor.read(tempData.temperature, tempData.humidity);

        powerSensor.read(
            tempData.panelVoltage,
            tempData.panelCurrent,
            tempData.panelPower
        );

        gpsSensor.read(
            tempData.latitude,
            tempData.longitude,
            tempData.altitude,
            tempData.satellites,
            tempData.gpsValid
        );

        tempData.lux = NAN;
        tempData.timestamp = millis();

        if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
            latestData = tempData;
            xSemaphoreGive(dataMutex);
        }

        Serial.println();
        Serial.println("===== SENSOR DATA =====");

        Serial.print("Temperature: ");
        Serial.print(tempData.temperature);
        Serial.println(" C");

        Serial.print("Humidity: ");
        Serial.print(tempData.humidity);
        Serial.println(" %");

        Serial.println("Light: SKIPPED");

        Serial.print("Panel voltage: ");
        Serial.print(tempData.panelVoltage);
        Serial.println(" V");

        Serial.print("Panel current: ");
        Serial.print(tempData.panelCurrent);
        Serial.println(" A");

        Serial.print("Panel power: ");
        Serial.print(tempData.panelPower);
        Serial.println(" W");

        Serial.print("GPS valid: ");
        Serial.println(tempData.gpsValid ? "YES" : "NO");

        Serial.print("Latitude: ");
        Serial.println(tempData.latitude, 6);

        Serial.print("Longitude: ");
        Serial.println(tempData.longitude, 6);

        Serial.print("Altitude: ");
        Serial.print(tempData.altitude);
        Serial.println(" m");

        Serial.print("Satellites: ");
        Serial.println(tempData.satellites);

        vTaskDelay(pdMS_TO_TICKS(SENSOR_READ_INTERVAL_MS));
    }
}