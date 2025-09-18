#include <Adafruit_MAX31865.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>
using namespace std;

void changeVoltage(bool increase, float changeTarget);
int maintainTemperature();
void recieveLoraMessage();

void sendLoraData();
void sendSDInfo();
void sendSerialCSV(std::vector<float> dataToSend);
void printTemps();

#define boxID 3
#define dirPin 2
#define stepPin 3
#define RREF 430.0
#define RNOMINAL 100.0
#define startingVOLTAGE 54.0
#define buttonPin A3

int stepsPerRevolution = 200;
float currentVoltage = startingVOLTAGE;
std::vector<float> recentTemperatures;
std::vector<float> buttonInputs;
std::vector<float> recentAmbients;
float target = 0.0;
int counter = 0;

void setup()
{
  Serial.begin(9600);

  pinMode(stepPin, OUTPUT);
  pinMode(dirPin, OUTPUT);
  digitalWrite(dirPin, LOW);
}


void loop()
{
  counter += 1;
  if (counter % 2 == 0 ) {
    digitalWrite(dirPin, HIGH);
  }
  else {
    digitalWrite(dirPin, LOW);
  }
  for (int i = 0; i < stepsPerRevolution; i++)
  {
    // These four lines result in 1 step:
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(5000);
    digitalWrite(stepPin, LOW);
    delayMicroseconds(5000);
  }
  delay(5000);
}