#include <Adafruit_MAX31865.h>

// Use software SPI: CS, DI, DO, CLK
Adafruit_MAX31865 sensor1 = Adafruit_MAX31865(10, 11, 12, 13); // CS pin 10 -- CS pins are what allows Arduino board to identify seperate devices
Adafruit_MAX31865 sensor2 = Adafruit_MAX31865(9, 11, 12, 13); 
Adafruit_MAX31865 sensor3 = Adafruit_MAX31865(8, 11, 12, 13); 
Adafruit_MAX31865 sensor4 = Adafruit_MAX31865(7, 11, 12, 13); 
Adafruit_MAX31865 sensor5 = Adafruit_MAX31865(6, 11, 12, 13); 
// use hardware SPI, just pass in the CS pin
// Adafruit_MAX31865 sensor1 = Adafruit_MAX31865(9); // CS pin 10
// Adafruit_MAX31865 sensor2 = Adafruit_MAX31865(5);  // CS pin 9 -- CS pins are what allows Arduino board to identify seperate devices

#define RREF      430.0
#define RNOMINAL  100
#define dirPin 2
#define stepPin 3

void setup() {
  Serial.begin(9600);
  Serial.println("Adafruit MAX31865 PT100 Sensor Test!");
  sensor1.begin(MAX31865_3WIRE);  // set to 2WIRE or 4WIRE as necessary
  sensor2.begin(MAX31865_3WIRE);
  sensor3.begin(MAX31865_3WIRE);
  sensor4.begin(MAX31865_3WIRE);
  sensor5.begin(MAX31865_3WIRE);

  pinMode(stepPin, OUTPUT);
  pinMode(dirPin, OUTPUT);
}

unsigned long lastUpdate = 0;  // Stores last sensor update time
const unsigned long updateInterval = 5000;  // 15 seconds

float temp1, temp2, temp3, temp4, temp5;  // Store sensor values

void loop() {
  unsigned long currentMillis = millis();

  // Update sensor data every 15 seconds
  if (currentMillis - lastUpdate >= updateInterval) {
    lastUpdate = currentMillis;  // Reset timer

    temp1 = sensor1.temperature(RNOMINAL, RREF);
    temp2 = sensor2.temperature(RNOMINAL, RREF);
    temp3 = sensor3.temperature(RNOMINAL, RREF);
    temp4 = sensor4.temperature(RNOMINAL, RREF);
    temp5 = sensor5.temperature(RNOMINAL, RREF);    

    Serial.println("Updated sensor readings:");
    Serial.print("Sensor 1: "); Serial.println(temp1);
    Serial.print("Sensor 2: "); Serial.println(temp2);
    Serial.print("Sensor 3: "); Serial.println(temp3);
    Serial.print("Sensor 4: "); Serial.println(temp4);
    Serial.print("Sensor 5: "); Serial.println(temp5);
    Serial.println("----------------------");
  }
}
