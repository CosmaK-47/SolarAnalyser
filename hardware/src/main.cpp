#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "shared/SharedState.h"
#include "tasks/SensorTask.h"
#include "tasks/NetworkTask.h"

SensorData latestData;
SemaphoreHandle_t dataMutex;

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("Solar IoT Node starting...");

    Wire.begin(I2C_SDA, I2C_SCL);

    dataMutex = xSemaphoreCreateMutex();

    if (dataMutex == NULL) {
        Serial.println("Failed to create data mutex!");
        while (true) {
            delay(1000);
        }
    }

    xTaskCreatePinnedToCore(
        SensorTask,
        "SensorTask",
        4096,
        NULL,
        1,
        NULL,
        1
    );

    xTaskCreatePinnedToCore(
        NetworkTask,
        "NetworkTask",
        8192,
        NULL,
        1,
        NULL,
        0
    );

    Serial.println("System initialized.");
}

void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));
}