#include "LightSensor.h"
#include <BH1750.h>

static BH1750 lightMeter;

bool LightSensor::begin() {
    return lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
}

bool LightSensor::read(float &lux) {
    lux = lightMeter.readLightLevel();

    if (lux < 0) {
        return false;
    }

    return true;
}