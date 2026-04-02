#include <SoftwareSerial.h>
SoftwareSerial LoRa(0, 1);

void setup() {
    Serial.begin(115200);
    LoRa.begin(115200);
    delay(1000);

    // LoRa.println("AT+NETWORKID=18");
    // delay(500);
    // LoRa.println("AT+ADDRESS=1");
    // delay(500);

    Serial.println("TX Ready. Sending every 2.5 seconds...");
}

void loop() {
    String msg = "Hello from TX";
    String cmd = "AT+SEND=0," + String(msg.length()) + "," + msg;
    
    Serial.println("> " + cmd);
    LoRa.println(cmd);

    if (LoRa.available()) {
        String response = LoRa.readStringUntil('\n');
        response.trim();
        Serial.println("< " + response);
    }

    delay(2500);
}