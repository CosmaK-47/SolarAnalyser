#pragma once

class PowerSensor {
public:
    bool begin();
    bool read(float &voltage, float &current, float &power);
};