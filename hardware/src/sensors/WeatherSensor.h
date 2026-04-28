#pragma once

class WeatherSensor {
public:
    bool begin();
    bool read(float &temperature, float &humidity);
};