#include "WeatherSensor.h"
#include "../include/config.h"
#include <DHT.h>

static DHT dht(DHT_PIN, DHT_TYPE);

bool WeatherSensor::begin() {
    dht.begin();
    return true;
}

bool WeatherSensor::read(float &temperature, float &humidity) {
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();

    if (isnan(temperature) || isnan(humidity)) {
        return false;
    }

    return true;
}