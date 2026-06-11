#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

#include <DHT.h>
#include <Adafruit_INA219.h>
#include <TinyGPSPlus.h>
#include <MPU6050.h>
#include <BH1750.h>
#include <ArduinoJson.h>

// ===================== CONFIG =====================

#define DHT_PIN 4
#define DHT_TYPE DHT11

#define I2C_SDA 21
#define I2C_SCL 22

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD 9600

#define WIFI_SSID "StarNet - usurelu.gh"
#define WIFI_PASSWORD "48575443077A90AD"

#define API_URL "http://192.168.100.6:8000/api/hardware/measurements/"

// ===================== OBJECTS =====================

DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_INA219 ina219;
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);
MPU6050 mpu(0x69);
BH1750 lightMeter;

// ===================== STATUS =====================

bool inaOk = false;
bool mpuOk = false;
bool bhOk = false;

// ===================== WIFI =====================

void connectWiFi() {
    Serial.print("Connecting to WiFi");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("WiFi connection failed. Continuing without backend.");
    }
}

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("===== SOLAR ANALYZER IOT NODE =====");

    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setTimeOut(50);

    dht.begin();

    inaOk = ina219.begin();

    gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

    mpu.initialize();
    mpuOk = mpu.testConnection();

    bhOk = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

    connectWiFi();

    Serial.print("DHT11: ");
    Serial.println("INITIALIZED");

    Serial.print("INA219: ");
    Serial.println(inaOk ? "OK" : "ERROR");

    Serial.print("MPU6050: ");
    Serial.println(mpuOk ? "OK" : "ERROR");

    Serial.print("BH1750: ");
    Serial.println(bhOk ? "OK" : "ERROR");

    Serial.println("Type y in Serial Monitor to send one measurement to the backend.");
    Serial.println("===================================");
}

// ===================== LOOP =====================

void loop() {
    bool sendRequested = false;

    while (Serial.available()) {
        char command = Serial.read();
        if (command == 'y' || command == 'Y') {
            sendRequested = true;
        }
    }

    while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
    }

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    float lux = NAN;
    if (bhOk) {
        lux = lightMeter.readLightLevel();
        if (lux < 0) lux = NAN;
    }

    float voltage = NAN;
    float current = NAN;
    float power = NAN;

    if (inaOk) {
        voltage = ina219.getBusVoltage_V();
        current = ina219.getCurrent_mA() / 1000.0;
        power = ina219.getPower_mW() / 1000.0;

        if (abs(current) < 0.001) current = 0.0;
        if (abs(power) < 0.001) power = 0.0;
    }

    int16_t ax = 0, ay = 0, az = 0;
    int16_t gx = 0, gy = 0, gz = 0;

    if (mpuOk) {
        mpu.getAcceleration(&ax, &ay, &az);
        mpu.getRotation(&gx, &gy, &gz);
    }

    Serial.println();
    Serial.println("===== SENSOR DATA =====");

    Serial.print("Temperature: ");
    if (isnan(temperature)) Serial.println("N/A");
    else {
        Serial.print(temperature);
        Serial.println(" C");
    }

    Serial.print("Humidity: ");
    if (isnan(humidity)) Serial.println("N/A");
    else {
        Serial.print(humidity);
        Serial.println(" %");
    }

    Serial.print("BH1750 Lux: ");
    if (isnan(lux)) Serial.println("N/A");
    else {
        Serial.print(lux);
        Serial.println(" lx");
    }

    Serial.print("Panel Voltage: ");
    if (isnan(voltage)) Serial.println("N/A");
    else {
        Serial.print(voltage);
        Serial.println(" V");
    }

    Serial.print("Panel Current: ");
    if (isnan(current)) Serial.println("N/A");
    else {
        Serial.print(current);
        Serial.println(" A");
    }

    Serial.print("Panel Power: ");
    if (isnan(power)) Serial.println("N/A");
    else {
        Serial.print(power);
        Serial.println(" W");
    }

    Serial.print("GPS Valid: ");
    Serial.println(gps.location.isValid() ? "YES" : "NO");

    Serial.print("Latitude: ");
    if (gps.location.isValid()) Serial.println(gps.location.lat(), 6);
    else Serial.println("N/A");

    Serial.print("Longitude: ");
    if (gps.location.isValid()) Serial.println(gps.location.lng(), 6);
    else Serial.println("N/A");

    Serial.print("Satellites: ");
    if (gps.satellites.isValid()) Serial.println(gps.satellites.value());
    else Serial.println("0");

    Serial.println("MPU6050:");
    if (!mpuOk) {
        Serial.println("N/A");
    } else {
        Serial.print("Accel X: "); Serial.println(ax);
        Serial.print("Accel Y: "); Serial.println(ay);
        Serial.print("Accel Z: "); Serial.println(az);
        Serial.print("Gyro X: "); Serial.println(gx);
        Serial.print("Gyro Y: "); Serial.println(gy);
        Serial.print("Gyro Z: "); Serial.println(gz);
    }

    Serial.println("============================");

    if (sendRequested) {
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            http.begin(API_URL);
            http.addHeader("Content-Type", "application/json");

            StaticJsonDocument<1024> doc;

            if (!isnan(temperature)) doc["temperature"] = temperature;
            else doc["temperature"] = nullptr;

            if (!isnan(humidity)) doc["humidity"] = humidity;
            else doc["humidity"] = nullptr;

            if (!isnan(lux)) doc["bh1750_lux"] = lux;
            else doc["bh1750_lux"] = nullptr;

            doc["light_raw"] = nullptr;

            if (!isnan(voltage)) doc["panel_voltage"] = voltage;
            else doc["panel_voltage"] = nullptr;

            if (!isnan(current)) doc["panel_current"] = current;
            else doc["panel_current"] = nullptr;

            if (!isnan(power)) doc["panel_power"] = power;
            else doc["panel_power"] = nullptr;

            doc["gps_valid"] = gps.location.isValid();

            if (gps.location.isValid()) {
                doc["latitude"] = gps.location.lat();
                doc["longitude"] = gps.location.lng();
            } else {
                doc["latitude"] = nullptr;
                doc["longitude"] = nullptr;
            }

            doc["satellites"] = gps.satellites.isValid() ? gps.satellites.value() : 0;

            doc["accel_x"] = mpuOk ? ax : 0;
            doc["accel_y"] = mpuOk ? ay : 0;
            doc["accel_z"] = mpuOk ? az : 0;
            doc["gyro_x"] = mpuOk ? gx : 0;
            doc["gyro_y"] = mpuOk ? gy : 0;
            doc["gyro_z"] = mpuOk ? gz : 0;

            String body;
            serializeJson(doc, body);

            Serial.println();
            Serial.println("Sending JSON to backend:");
            Serial.println(body);

            int responseCode = http.POST(body);

            Serial.print("HTTP Response: ");
            Serial.println(responseCode);

            http.end();
        } else {
            Serial.println("WiFi not connected. Data not sent.");
        }
    } else {
        Serial.println("Press y in Serial Monitor to send this data to backend.");
    }

    delay(2000);
}
