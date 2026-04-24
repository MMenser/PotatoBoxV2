#include <Adafruit_MAX31865.h>
#include <SoftwareSerial.h>
#include <AccelStepper.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>
#include "temperature_container.cpp"
using namespace std;

void changeVoltage(bool increase, float changeTarget);
int maintainTemperature();
void recieveLoraMessage();
void runMotor(int steps = 25);
float calibrateTemp(float raw, float offsetC);
float getVariacVoltage(int samples = 5);
void sendLoraData();
void printTemps();

#define boxID 4 // Must change for each box
#define dirPin 2
#define stepPin 3
#define sleepPin 4

#define RREF 430.0
#define RNOMINAL 100.0

// Error codes
#define ERR_MOTOR_STALL 1