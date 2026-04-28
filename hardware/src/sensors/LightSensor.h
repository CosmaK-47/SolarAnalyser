#pragma once

class LightSensor {
public:
    bool begin();
    bool read(float &lux);
};