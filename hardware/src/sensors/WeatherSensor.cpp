#include "WeatherSensor.h"

#include <Arduino.h>
#include <DHT.h>
#include "../include/config.h"

static DHT dht(DHT_PIN, DHT_TYPE);

bool WeatherSensor::begin() {
    dht.begin();
    return true;
}

bool WeatherSensor::read(float &temperature, float &humidity) {
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        return false;
    }

    return true;
}