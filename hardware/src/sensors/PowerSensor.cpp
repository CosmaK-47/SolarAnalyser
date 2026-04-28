#include "PowerSensor.h"
#include <Adafruit_INA219.h>

static Adafruit_INA219 ina219;

bool PowerSensor::begin() {
    return ina219.begin();
}

bool PowerSensor::read(float &voltage, float &current, float &power) {
    float busVoltage = ina219.getBusVoltage_V();
    float shuntVoltage = ina219.getShuntVoltage_mV() / 1000.0;
    float current_mA = ina219.getCurrent_mA();

    voltage = busVoltage + shuntVoltage;
    current = current_mA / 1000.0;
    power = voltage * current;

    return true;
}