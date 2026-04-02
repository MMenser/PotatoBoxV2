#include <SoftwareSerial.h>
#include "Arduino_LED_Matrix.h"

SoftwareSerial LoRa(0, 1);
ArduinoLEDMatrix matrix;

// Simple "!" exclamation frame to flash on receive
const uint32_t receiveFrame[3] = {
    0x00040004,
    0x00040000,
    0x04000000
};

// Smiley face to show after receive
const uint32_t smileyFrame[3] = {
    0x00000000,
    0x66006600,  // eyes
    0x42423c00   // mouth
};

void flashReceived() {
    // Flash the matrix 3 times
    for (int i = 0; i < 3; i++) {
        matrix.loadFrame(receiveFrame);
        delay(200);
        matrix.clear();
        delay(200);
    }
    // Hold smiley for 1 second
    matrix.loadFrame(smileyFrame);
    delay(1000);
    matrix.clear();
}

void setup() {
    Serial.begin(115200);
    LoRa.begin(115200);
    matrix.begin();
    delay(1000);

    // LoRa.println("AT+NETWORKID=18");
    // delay(500);
    // LoRa.println("AT+ADDRESS=0");
    // delay(500);

    Serial.println("RX Ready. Waiting for messages...");
}

void loop() {
    if (LoRa.available()) {
        String response = LoRa.readStringUntil('\n');
        response.trim();

        if (response.startsWith("+RCV")) {
            int firstComma  = response.indexOf(',');
            int secondComma = response.indexOf(',', firstComma + 1);
            int thirdComma  = response.indexOf(',', secondComma + 1);
            String data = response.substring(secondComma + 1, thirdComma);
            Serial.println("Message: " + data);

            if (data == "Hello from TX") {
                flashReceived();
            }
        }
    }
}