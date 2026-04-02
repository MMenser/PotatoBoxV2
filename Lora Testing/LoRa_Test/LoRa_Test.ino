#include <SoftwareSerial.h>

SoftwareSerial LoRa(0, 1); // RX, TX

void setup() {
    Serial.begin(9600);
    LoRa.begin(9600);

    Serial.println("RYLR998 Terminal Ready.");
    Serial.println("Type AT commands and press Enter.");
    Serial.println("-------------------------------");

    // Quick connection test
    LoRa.println("AT");
    delay(500);
    while (LoRa.available()) {
        Serial.println("Module response: " + LoRa.readStringUntil('\n'));
    }
}

void loop() {
    // If you typed something in Serial Monitor, forward it to LoRa
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        Serial.println("> " + cmd);
        LoRa.println(cmd);
    }

    // If LoRa sent something, print it to Serial Monitor
    if (LoRa.available()) {
        String response = LoRa.readStringUntil('\n');
        response.trim();
        Serial.println("< " + response);
    }
}