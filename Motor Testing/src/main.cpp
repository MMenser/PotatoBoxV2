#include <AccelStepper.h>
using namespace std;

void runMotor(int steps = 15);

#define boxID 2
#define dirPin 2
#define stepPin 3
#define sleepPin 4
#define resetPin 5

#define RREF 430.0
#define RNOMINAL 100.0
void setup()
{
  Serial.begin(9600);

  pinMode(stepPin, OUTPUT);
  pinMode(dirPin, OUTPUT);
  pinMode(sleepPin, OUTPUT);
  pinMode(resetPin, OUTPUT);

  digitalWrite(resetPin, HIGH);
  digitalWrite(dirPin, LOW);
  digitalWrite(sleepPin, HIGH); // Wake the driver
}

void loop()
{
  runMotor(100);
  digitalWrite(dirPin, HIGH);
  delay(2500);
  runMotor(100);
  digitalWrite(dirPin, LOW);
  delay(5000);
}

void runMotor(int steps)
{
  digitalWrite(sleepPin, HIGH); // Wake the driver
  delay(3);
  for (int i = 0; i < steps; i++)
  {
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(5000);
    digitalWrite(stepPin, LOW);
    delayMicroseconds(5000);
  }
  digitalWrite(sleepPin, LOW); // Sleep the driver
}
