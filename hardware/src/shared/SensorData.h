#pragma once

#include <Arduino.h>

struct SensorData {
    float temperature = NAN;
    float humidity = NAN;

    float lux = NAN;

    float panelVoltage = NAN;
    float panelCurrent = NAN;
    float panelPower = NAN;

    double latitude = NAN;
    double longitude = NAN;
    double altitude = NAN;
    int satellites = 0;
    bool gpsValid = false;

    unsigned long timestamp = 0;
};