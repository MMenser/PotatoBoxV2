#include <SoftwareSerial.h>
#include <vector>
#include <algorithm>
#include <cmath>
#include <string>
using namespace std;

float getVariacVoltage(int samples = 5);


const int voltageSensor = A5; // Analog pin for reading voltage sensor
const float ADC_MAX = 4095.0;
const float V_REF   = 5.0;
const float CAL_SLOPE     = 0.0014;  // from earlier attempt
const float CAL_INTERCEPT = 0.004;
const float FINAL_SLOPE  = 2.6367;   // scale
const float FINAL_OFFSET = 4.06;     // volts
const unsigned int NUM_SAMPLES = 500;     // enough for several 50/60 Hz cycles
const unsigned int SAMPLE_DELAY_US = 200; // ~100 kHz sampling


void setup()
{
  Serial.begin(9600);

}

float getVariacVoltage(int samples)
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
  return averageVoltage;
}

void loop()
{
  Serial.println(getVariacVoltage());
  delay(1500);
}