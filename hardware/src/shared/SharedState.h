#pragma once
#include "SensorData.h"
#include <Arduino.h>

extern SensorData latestData;
extern SemaphoreHandle_t dataMutex;