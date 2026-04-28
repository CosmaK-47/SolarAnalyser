#pragma once
#include <Arduino.h>

struct SensorData {
    float temperature = NAN;
    float humidity = NAN;

    float lux = NAN;

    float panelVoltage = NAN;
    float panelCurrent = NAN;
    float panelPower = NAN;

    unsigned long timestamp = 0;
};