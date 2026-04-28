#include "SensorTask.h"
#include "../include/config.h"
#include "../shared/SharedState.h"
#include "../sensors/WeatherSensor.h"
#include "../sensors/LightSensor.h"
#include "../sensors/PowerSensor.h"

static WeatherSensor weatherSensor;
static LightSensor lightSensor;
static PowerSensor powerSensor;

void SensorTask(void *pvParameters) {
    weatherSensor.begin();
    lightSensor.begin();
    powerSensor.begin();

    while (true) {
        SensorData tempData;

        weatherSensor.read(tempData.temperature, tempData.humidity);
        lightSensor.read(tempData.lux);
        powerSensor.read(
            tempData.panelVoltage,
            tempData.panelCurrent,
            tempData.panelPower
        );

        tempData.timestamp = millis();

        if (xSemaphoreTake(dataMutex, portMAX_DELAY)) {
            latestData = tempData;
            xSemaphoreGive(dataMutex);
        }

        Serial.println("===== SENSOR DATA =====");
        Serial.print("Temperature: ");
        Serial.print(tempData.temperature);
        Serial.println(" C");

        Serial.print("Humidity: ");
        Serial.print(tempData.humidity);
        Serial.println(" %");

        Serial.print("Lux: ");
        Serial.print(tempData.lux);
        Serial.println(" lx");

        Serial.print("Panel voltage: ");
        Serial.print(tempData.panelVoltage);
        Serial.println(" V");

        Serial.print("Panel current: ");
        Serial.print(tempData.panelCurrent);
        Serial.println(" A");

        Serial.print("Panel power: ");
        Serial.print(tempData.panelPower);
        Serial.println(" W");

        vTaskDelay(pdMS_TO_TICKS(SENSOR_READ_INTERVAL_MS));
    }
}