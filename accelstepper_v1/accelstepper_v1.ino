// ZMPT101B AC Voltage Measurement - UNO R4 WiFi
// Uses waveform min/max to get AC amplitude, then applies
// a two-step calibration:
//   1) Convert module AC amplitude to a "raw" line voltage
//   2) Map that raw value to actual line voltage using your data

const int sensorPin = A5;      // ZMPT101B OUT → A0

// ADC characteristics for UNO R4 WiFi (12-bit ADC)
const float ADC_MAX = 4095.0;
const float V_REF   = 5.0;

// --- First-stage calibration (old estimate, can be rough) ---
// moduleAC [V] ≈ CAL_SLOPE * V_line + CAL_INTERCEPT  (original idea)
// V_line_raw = (moduleAC - CAL_INTERCEPT) / CAL_SLOPE
const float CAL_SLOPE     = 0.0018;  // from earlier attempt
const float CAL_INTERCEPT = 0.004;

// --- Second-stage calibration (from your IN vs OUT data) ---
// From your measurements:
//   IN ≈ 2.64 * OUT + 4.06
// where OUT was the previous lineVoltage value.
// So we use:
//   V_line_corrected = FINAL_SLOPE * V_line_raw + FINAL_OFFSET
const float FINAL_SLOPE  = 2.6367;   // scale
const float FINAL_OFFSET = 4.06;     // volts

// Sampling settings
const unsigned int NUM_SAMPLES = 500;     // enough for several 50/60 Hz cycles
const unsigned int SAMPLE_DELAY_US = 200; // ~100 kHz sampling

void setup() {
  Serial.begin(9600);
  delay(2000); // give Serial Monitor time to attach
}

void loop() {
  int rawMin = 4095;
  int rawMax = 0;

  // ----- Capture waveform: track min and max -----
  for (unsigned int i = 0; i < NUM_SAMPLES; i++) {
    int raw = analogRead(sensorPin);

    if (raw < rawMin) rawMin = raw;
    if (raw > rawMax) rawMax = raw;

    delayMicroseconds(SAMPLE_DELAY_US);
  }

  // Convert ADC counts to volts
  float vMin = rawMin * (V_REF / ADC_MAX);
  float vMax = rawMax * (V_REF / ADC_MAX);

  // DC offset (center) and peak-to-peak
  float vOffset = (vMax + vMin) / 2.0;   // should be around 2.35 V
  float vP2P    = vMax - vMin;
  float moduleAC_peak = vP2P / 2.0;      // zero-to-peak amplitude

  // If your original 0.0018x+0.004 line used RMS instead of peak,
  // change this to: moduleAC_peak / sqrt(2.0);
  float moduleAC = moduleAC_peak;

  // ----- Stage 1: rough conversion to "raw" line voltage -----
  float lineVoltage_raw = (moduleAC - CAL_INTERCEPT) / CAL_SLOPE;

  // ----- Stage 2: your data-based calibration -----
  float lineVoltage_cal = FINAL_SLOPE * lineVoltage_raw + FINAL_OFFSET;

  // ----- Print results -----
  Serial.print("vMin: ");
  Serial.print(vMin, 4);
  Serial.print("  vMax: ");
  Serial.print(vMax, 4);

  Serial.print("  | Offset: ");
  Serial.print(vOffset, 4);

  Serial.print("  | Module AC (peak): ");
  Serial.print(moduleAC, 4);

  Serial.print("  | Raw Line V: ");
  Serial.print(lineVoltage_raw, 2);

  Serial.print("  | Cal Line V: ");
  Serial.print(lineVoltage_cal, 2);
  Serial.println(" V");

  delay(500);
}
