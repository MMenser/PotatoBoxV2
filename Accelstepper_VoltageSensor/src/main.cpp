#include <AccelStepper.h>

// Define pin connections
const int dirPin = 2;
const int stepPin = 3;

// Define motor interface type
#define motorInterfaceType 1
#define sleepPin 4
// Creates an instance
AccelStepper myStepper(motorInterfaceType, stepPin, dirPin);

const int voltageSensor = A5; // Analog pin for reading voltage sensor
const float ADC_MAX = 4095.0;
const float V_REF = 5.0;
const float CAL_SLOPE = 0.0018; // from earlier attempt
const float CAL_INTERCEPT = 0.004;
const float FINAL_SLOPE = 2.6367;         // scale
const float FINAL_OFFSET = 4.06;          // volts
const unsigned int NUM_SAMPLES = 500;     // enough for several 50/60 Hz cycles
const unsigned int SAMPLE_DELAY_US = 200; // ~100 kHz sampling

float currentVoltage = -1.0;
float targetVoltage = -1.0;

unsigned long lastUpdateVoltage = 0;
const unsigned long updateInterval = 15000;

bool s = false;

void setup()
{
  Serial.begin(9600);

  pinMode(sleepPin, OUTPUT);
  // Wake the driver
  digitalWrite(sleepPin, HIGH);
  delay(10);
}

float getVariacVoltage(int samples = 5)
{
  int count = 0;
  float voltageTotal = 0;
  while (count != samples)
  {
    int rawMin = 4095;
    int rawMax = 0;

    // ----- Capture waveform: track min and max -----
    for (unsigned int i = 0; i < NUM_SAMPLES; i++)
    {
      int raw = analogRead(voltageSensor);

      if (raw < rawMin)
        rawMin = raw;
      if (raw > rawMax)
        rawMax = raw;

      delayMicroseconds(SAMPLE_DELAY_US);
    }

    // Convert ADC counts to volts
    float vMin = rawMin * (V_REF / ADC_MAX);
    float vMax = rawMax * (V_REF / ADC_MAX);

    // DC offset (center) and peak-to-peak
    float vOffset = (vMax + vMin) / 2.0; // should be around 2.35 V
    float vP2P = vMax - vMin;
    float moduleAC_peak = vP2P / 2.0; // zero-to-peak amplitude

    // If your original 0.0018x+0.004 line used RMS instead of peak,
    // change this to: moduleAC_peak / sqrt(2.0);
    float moduleAC = moduleAC_peak;

    // ----- Stage 1: rough conversion to "raw" line voltage -----
    float lineVoltage_raw = (moduleAC - CAL_INTERCEPT) / CAL_SLOPE;

    // ----- Stage 2: your data-based calibration -----
    float lineVoltage_cal = FINAL_SLOPE * lineVoltage_raw + FINAL_OFFSET;
    voltageTotal += lineVoltage_cal;
    count++;
  }
  float averageVoltage = voltageTotal / (float)samples;
  Serial.print("Measured Voltage: ");
  Serial.println(averageVoltage);
  return averageVoltage;
}

void runMotor(int steps = 25)
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

void loop()
{
  unsigned long currentMillis = millis();

  if (currentMillis - lastUpdateVoltage >= updateInterval) {
    lastUpdateVoltage = currentMillis;
    currentVoltage = getVariacVoltage();
    if (s) {
      targetVoltage = currentVoltage + 10;
      s = false;
    }
    else {
      targetVoltage = currentVoltage - 20;
      s = true;
    }

    if (abs(targetVoltage - currentVoltage) >= 1.0)
    {
      Serial.print("Increasing to target: ");
      Serial.println(targetVoltage);

      float difference = targetVoltage - currentVoltage;
      if (difference > 0)
      {
        digitalWrite(dirPin, LOW);
        while (getVariacVoltage() < targetVoltage)
        {
          runMotor(15);
        }
      }
      else
      {
        Serial.print("Decreasing to target: ");
        Serial.println(targetVoltage);

        digitalWrite(dirPin, HIGH); // Set direction to decrease voltage
        while (getVariacVoltage() > targetVoltage)
        {
          runMotor(15);
        }
      }
    }
  }
}