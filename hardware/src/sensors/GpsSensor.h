#pragma once

class GpsSensor {
public:
    bool begin();
    bool read(
        double &latitude,
        double &longitude,
        double &altitude,
        int &satellites,
        bool &valid
    );
};