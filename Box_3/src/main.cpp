#include "headers.cpp"

// Use software SPI: CS, DI, DO, CLK
Adafruit_MAX31865 sensor1 = Adafruit_MAX31865(10, 11, 12, 13); // CS pin 10 -- CS pins are what allows Arduino board to identify seperate devices
Adafruit_MAX31865 sensor2 = Adafruit_MAX31865(9, 11, 12, 13); 
Adafruit_MAX31865 sensor3 = Adafruit_MAX31865(8, 11, 12, 13); 
Adafruit_MAX31865 sensor4 = Adafruit_MAX31865(7, 11, 12, 13); 
Adafruit_MAX31865 sensor5 = Adafruit_MAX31865(6, 11, 12, 13); 
SoftwareSerial lora(0,1);

float currentVoltage = -1.0;
TemperatureContainer recentTemperatures(5);
TemperatureContainer recentAmbients(5);
float target = 0.0;

const char* WIFI_SSID         = "WSU Othello Farm";
const char* WIFI_PASSWORD     = "WSU12345!";
const char* THINGSPEAK_API_KEY = "LU53UJ2QX91N0JF8";
const char* TS_HOST           = "api.thingspeak.com";
WiFiClient tsClient;

unsigned long lastUpdate = 0; 
unsigned long lastMaintainTemperature = 0;

unsigned long lastChangeVoltage = -60000;
const unsigned long updateInterval = 15000;

unsigned long lastLoraMessage = 0;         
const unsigned long loraUpdateInterval = 60000;

float ambient, temp1, temp2, temp3, temp4, averageInsideBox, maxSensor, minSensor, averageAmbient;
float delta = 10.0;

const float ambientOffsetC = 4.30;
const float temp1OffsetC = 3.45;
const float temp2OffsetC = 3.55;
const float temp3OffsetC = 3.55;
const float temp4OffsetC = 0.0;

const int voltageSensor = A5; // Analog pin for reading voltage sensor
const float ADC_MAX = 4095.0;
const float V_REF   = 5.0;
const float CAL_SLOPE     = 0.0018;  // from earlier attempt
const float CAL_INTERCEPT = 0.004;
const float FINAL_SLOPE  = 2.6367;   // scale
const float FINAL_OFFSET = 4.06;     // volts
const unsigned int NUM_SAMPLES = 500;     // enough for several 50/60 Hz cycles
const unsigned int SAMPLE_DELAY_US = 200; // ~100 kHz sampling

const float MIN_VOLTAGE_STEP = 1.0;
const int MAX_VOLTAGE_ADJUST_ATTEMPTS = 20;
const int MAX_STALLED_ATTEMPTS = 3;

enum WiFiState { WIFI_IDLE, WIFI_CONNECTING };
WiFiState wifiState = WIFI_IDLE;
unsigned long wifiRetryAt = 0;
const unsigned long WIFI_RETRY_INTERVAL = 30000;

void wifiTick() {
  switch (wifiState) {
    case WIFI_IDLE:
      if (WiFi.status() != WL_CONNECTED && millis() >= wifiRetryAt) {
        Serial.println("[WiFi] Starting connection attempt...");
        WiFi.end();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        wifiState = WIFI_CONNECTING;
        wifiRetryAt = millis() + WIFI_RETRY_INTERVAL;
      }
      break;
    case WIFI_CONNECTING:
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[WiFi] Connected: " + WiFi.localIP().toString());
        wifiState = WIFI_IDLE;
      } else if (millis() >= wifiRetryAt) {
        Serial.println("[WiFi] Timed out. Will retry.");
        WiFi.end();
        wifiState = WIFI_IDLE;
      }
      break;
  }
}

void setup()
{
  Serial.begin(9600);
  lora.begin(9600);
  sensor1.begin(MAX31865_3WIRE); // set to 2WIRE or 4WIRE as necessary
  sensor2.begin(MAX31865_3WIRE);
  sensor3.begin(MAX31865_3WIRE);
  sensor4.begin(MAX31865_3WIRE);
  sensor5.begin(MAX31865_3WIRE);

  pinMode(stepPin, OUTPUT);
  pinMode(dirPin, OUTPUT);
  pinMode(sleepPin, OUTPUT);

  digitalWrite(dirPin, LOW);
  digitalWrite(sleepPin, LOW); // Keep motor asleep to start
  lora.setTimeout(500);

  currentVoltage = getVariacVoltage();

  // WiFi init
  WiFi.end();
  delay(3000);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED)
    Serial.println("[WiFi] Connected: " + WiFi.localIP().toString());
  else
    Serial.println("[WiFi] Not connected — will retry on first send.");
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

void printTemps()
{
  Serial.println("Updated sensor readings:");
  Serial.print("Current Ambient Temperature: ");
  Serial.println(ambient);
  Serial.print("Average Ambient Temperature: ");
  Serial.println(averageAmbient);
  Serial.print("Sensor 1: ");
  Serial.println(temp1);
  Serial.print("Sensor 2: ");
  Serial.println(temp2);
  Serial.print("Sensor 3: ");
  Serial.println(temp3);
  Serial.print("Sensor 4: ");
  Serial.println(temp4);
  Serial.print("Current Voltage: ");
  Serial.println(currentVoltage);
  Serial.print("Sensor Deltas: ");
  Serial.println(maxSensor - minSensor);
  Serial.print("Target Temperature: ");
  Serial.println(target);
  Serial.print("Average Temperature: ");
  Serial.println(averageInsideBox);
  Serial.print("Delta: ");
  Serial.println(delta);
  Serial.println("----------------------");
}

void loop()
{
  wifiTick();
  unsigned long currentMillis = millis();
  // // Update sensor data every 15 seconds
  if (currentMillis - lastUpdate >= updateInterval)
  {
    lastUpdate = currentMillis; // Reset timer

    ambient = calibrateTemp(sensor1.temperature(RNOMINAL, RREF), ambientOffsetC);
    temp1 = calibrateTemp(sensor2.temperature(RNOMINAL, RREF), temp1OffsetC);
    temp2 = calibrateTemp(sensor3.temperature(RNOMINAL, RREF), temp2OffsetC);
    temp3 = calibrateTemp(sensor4.temperature(RNOMINAL, RREF), temp3OffsetC);
    temp4 = calibrateTemp(sensor5.temperature(RNOMINAL, RREF), temp4OffsetC);
    currentVoltage = getVariacVoltage();
    maxSensor = max(temp1, max(temp2, max(temp3, temp4)));
    minSensor = min(temp1, min(temp2, min(temp3, temp4)));
    averageInsideBox = (temp1 + temp2 + temp3 + temp4) / 4;
    target = ambient + delta; // Target is ambient + delta

    recentTemperatures.push(averageInsideBox);
    recentAmbients.push(ambient);
    if (recentTemperatures.size() == 5 && recentAmbients.size() == 5) { // Containers are full of data 
      if (currentMillis - lastMaintainTemperature >= 60000 
        && currentMillis - lastChangeVoltage >= 120000) { 
        // Only run maintainTemperature() every minute, unless voltage was changed less than 2 minutes ago then wait for temp changes.
        lastMaintainTemperature = currentMillis;
        maintainTemperature();
      }
    }

    printTemps();
  }

  if (currentMillis - lastLoraMessage >= loraUpdateInterval) { // Every 1 minute
    sendLoraData();
    sendToThingSpeak();
    lastLoraMessage = currentMillis;
  }
  
  if (lora.available()) {
    recieveLoraMessage();
  }
  delay(100);
}

float calibrateTemp(float raw, float offsetC) {
  // Single-point calibration: shift the raw Celsius reading by the
  // measured probe-specific offset from the boiling-water reference.
  float calibratedCelsius = raw + offsetC;

  return (calibratedCelsius * 9.0 / 5.0) + 32.0;
}


void recieveLoraMessage() {
  String message = "";
  message = lora.readString();
  if (message.length() < 6) {
    return;
  }

  // Assume message always looks like: +RCV=9,2,D5,-34,11
  message = message.substring(9);
  int commaIndex = message.indexOf(',');
  message = message.substring(0, commaIndex);
  char changeParamter = message[0]; // D for Delta, V for Voltage
  String value = message.substring(1);
  Serial.print("Message: "); Serial.println(message);
  Serial.print("Change Parameter: "); Serial.println(changeParamter);
  if (changeParamter == 'D') {
    delta = atof(value.c_str());
    Serial.println("Delta updated.");
  }
  else if (changeParamter == 'V') {
    currentVoltage = atoi(value.c_str());
    Serial.println("Voltage updated.");
  }
  else {
    Serial.println("Unknown change parameter/value.");
  }

  return;
}

void sendLoraError(int errorCode)
{
  // Format: "ERR|<boxID>|<errorCode>"
  string msg = "ERR|" + to_string(boxID) + "|" + to_string(errorCode);
  String loraCommand = "AT+SEND=9," + String(msg.length()) + "," + msg.c_str();
  Serial.print("Sending error: "); Serial.println(loraCommand);
  lora.println(loraCommand);
  delay(100);
}

void sendLoraData()
{
  std::vector<float> dataToSend = {averageInsideBox, averageAmbient, delta, currentVoltage, temp1, temp2, temp3, temp4};
  string combinedMessage = to_string(boxID) + "|";
  for (int i = 0; i < dataToSend.size(); i++)
  {
    if (i == 2) {
      combinedMessage += to_string(int(delta)) + "|";
    }
    else {
      string stringVersion = to_string(dataToSend[i]);
      size_t decimalPos = stringVersion.find('.');
      if (decimalPos != std::string::npos && decimalPos + 3 < stringVersion.length())
      {                                                          // Truncate if there is a decimal
        stringVersion = stringVersion.substr(0, decimalPos + 3); // Truncate to 2 decimal
      }
  
      combinedMessage += stringVersion + "|";
    }
  }

  String loraCommand = "AT+SEND=9," + String(combinedMessage.length()) + "," + combinedMessage.c_str();
  Serial.print("Sending: "); Serial.println(loraCommand);
  lora.println(loraCommand);
  delay(100);
}

// Call this at the same time as sendLoraData().
// If WiFi isn't up it returns instantly — LoRa path is unaffected.
// If WiFi is up the TCP connect is ~200-500ms, which is acceptable since
// this only runs every 60s alongside the already-slow LoRa send.
void sendToThingSpeak() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ThingSpeak] WiFi not connected — skipping, LoRa still sent.");
    return;  // ← instant return, no blocking
  }
 
  if (!tsClient.connect(TS_HOST, 80)) {
    Serial.println("[ThingSpeak] Cannot reach server — skipping.");
    return;
  }
 
  // Uses your existing globals directly — same values sendLoraData() sends
  String query = "api_key=";
  query += THINGSPEAK_API_KEY;
  query += "&field1=" + String(averageInsideBox, 2);
  query += "&field2=" + String(averageAmbient,   2);
  query += "&field3=" + String(delta,            2);
  query += "&field4=" + String(currentVoltage,   2);
  query += "&field5=" + String(temp1,            2);
  query += "&field6=" + String(temp2,            2);
  query += "&field7=" + String(temp3,            2);
  query += "&field8=" + String(temp4,            2);
 
  tsClient.print("GET /update?");
  tsClient.print(query);
  tsClient.println(" HTTP/1.1");
  tsClient.println("Host: api.thingspeak.com");
  tsClient.println("Connection: close");
  tsClient.println();
 
  // Short timeout — if server doesn't respond in 2s, bail out
  // 2s is safe here since we're inside the 60s LoRa block already
  unsigned long timeout = millis();
  while (!tsClient.available() && millis() - timeout < 2000) {
    // intentionally empty — this is the only remaining brief block
    // but it's bounded to 2s max, only runs every 60s
  }
 
  if (tsClient.available()) {
    String statusLine = tsClient.readStringUntil('\n');
    Serial.println("[ThingSpeak] Response: " + statusLine);
  } else {
    Serial.println("[ThingSpeak] No response within 2s.");
  }
 
  tsClient.stop();
}

int maintainTemperature()
{
  // Preconditions: recentTemperatures is full
  // First, check if the temperature is constant at the given voltage
  // We'll allow a 0.75 F difference in range as constant
  float minElement = recentTemperatures.min();
  float maxElement = recentTemperatures.max();
  float range = recentTemperatures.range();
  // Serial.print("Recent Max Average: "); Serial.println(maxElement);
  // Serial.print("Recent Min Average: "); Serial.println(minElement);
  // Serial.print("Range between 5 most recent temp average: "); Serial.println(range);

  averageAmbient = recentAmbients.average();
  float currentAverage = recentTemperatures.back(); // Get most recent average
  float changeNeeded = currentAverage - (delta + averageAmbient);
  bool increase = changeNeeded < 0 ? true : false; // -changeNeeded means current average is below the target & we need to increase  
  float changeMagnitude = abs(changeNeeded);
  Serial.print("Target: ");
  Serial.println(delta + averageAmbient);
  Serial.print("Current Average: ");
  Serial.println(currentAverage);
  Serial.print("Average - Target: ");
  Serial.println(changeMagnitude);

  if (changeMagnitude < 1.0)
  { // Within 1 degree from target
    Serial.println("Box within 1.0 degree of target.");
    return 1;
  }
  else { // More than 1 degree from target - need to change voltages
    changeVoltage(increase, changeMagnitude);
  }
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

void changeVoltage(bool increase, float changeMagnitude)  {
  float targetVoltage = increase ? currentVoltage + changeMagnitude * 5 : currentVoltage - changeMagnitude * 5; // 1 F * 5 = 5V change for 1 degree
  Serial.print("Target Voltage: "); Serial.println(targetVoltage);
  currentVoltage = getVariacVoltage();
  int attempts = 0;
  int stalledAttempts = 0;
  if (increase) {
        if (currentVoltage > 115) {
          Serial.println("Max voltage reached. Cannot increase more.");
          return;
        }
        digitalWrite(dirPin, LOW);
        while (currentVoltage < targetVoltage)
        {
          if (attempts++ >= MAX_VOLTAGE_ADJUST_ATTEMPTS) {
            Serial.println("Voltage adjustment timed out. Returning to main loop.");
            return;
          }

          float before = currentVoltage;
          runMotor(15);
          float after = getVariacVoltage();
          float voltageStep = abs(after - before);
          if (voltageStep < MIN_VOLTAGE_STEP) {
            stalledAttempts++;
          }
          else {
            stalledAttempts = 0;
          }

          if (stalledAttempts >= MAX_STALLED_ATTEMPTS) {
            Serial.println("Motor not turning effectively. Returning to main loop.");
            sendLoraError(ERR_MOTOR_STALL);
            return;
          }
          currentVoltage = after;
        }
        lastChangeVoltage = millis();
  }
  else {
        if (currentVoltage < 5) {
          Serial.println("Min voltage reached. Cannot decrease more.");
          return;
        }
        digitalWrite(dirPin, HIGH); // Set direction to decrease voltage
        while (currentVoltage > targetVoltage)
        {
          if (attempts++ >= MAX_VOLTAGE_ADJUST_ATTEMPTS) {
            Serial.println("Voltage adjustment timed out. Returning to main loop.");
            return;
          }

          float before = currentVoltage;
          runMotor(15);
          float after = getVariacVoltage();
          float voltageStep = abs(after - before);
          if (voltageStep < MIN_VOLTAGE_STEP) {
            stalledAttempts++;
          }
          else {
            stalledAttempts = 0;
          }

          if (stalledAttempts >= MAX_STALLED_ATTEMPTS) {
            Serial.println("Motor not turning effectively. Returning to main loop.");
            sendLoraError(ERR_MOTOR_STALL);
            return;
          }
          currentVoltage = after;
        }
        lastChangeVoltage = millis();
  }
}