#pragma once

#include <Arduino.h>
#include "SensorData.h"

extern SensorData latestData;
extern SemaphoreHandle_t dataMutex;