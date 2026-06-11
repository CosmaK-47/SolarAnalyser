#include "GpsSensor.h"

#include <Arduino.h>
#include <TinyGPSPlus.h>
#include "../include/config.h"

static TinyGPSPlus gps;
static HardwareSerial gpsSerial(1);

bool GpsSensor::begin() {
    gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    return true;
}

bool GpsSensor::read(
    double &latitude,
    double &longitude,
    double &altitude,
    int &satellites,
    bool &valid
) {
    while (gpsSerial.available() > 0) {
        gps.encode(gpsSerial.read());
    }

    valid = gps.location.isValid();

    satellites = gps.satellites.isValid()
        ? gps.satellites.value()
        : 0;

    if (valid) {
        latitude = gps.location.lat();
        longitude = gps.location.lng();
        altitude = gps.altitude.isValid()
            ? gps.altitude.meters()
            : NAN;

        return true;
    }

    latitude = NAN;
    longitude = NAN;
    altitude = NAN;

    return false;
}