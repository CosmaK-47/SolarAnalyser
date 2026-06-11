#include "PowerSensor.h"

#include <Arduino.h>
#include <Adafruit_INA219.h>

static Adafruit_INA219 ina219;

bool PowerSensor::begin() {
    return ina219.begin();
}

bool PowerSensor::read(float &voltage, float &current, float &power) {
    voltage = ina219.getBusVoltage_V();

    // Adafruit library returns current in mA
    float current_mA = ina219.getCurrent_mA();

    current = current_mA / 1000.0f;   // A
    power = voltage * current;        // W

    return true;
}