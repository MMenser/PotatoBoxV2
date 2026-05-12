import threading
import serial
import time
import os
import logging
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler("transciever.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

ser = serial.Serial('/dev/ttyS0', 9600, timeout=1)
serial_lock = threading.Lock()
boxIDtoLoraAddress = {1: 1, 2: 18, 3: 27, 4: 36}
#NetworkId = 6
#Pi LoRa is 9

# Error codes from headers.cpp
ERROR_CODES = {
    1: "Motor stall detected",
    # Add more as defined in headers.cpp
}

def getDBConnection():
    conn = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database="potatodb",
        user=os.environ['DB_USERNAME'],
        password=os.environ['DB_PASSWORD'],
        connect_timeout=5)
    return conn

def handleError(boxID, errorCode):
    description = ERROR_CODES.get(errorCode, f"Unknown error code {errorCode}")
    log.error(f"[RX] Error from box {boxID}: [{errorCode}] {description}")

def recieveData():
    log.info("Starting to listen for LoRa messages.")
    while True:
        data = None
        with serial_lock:
            if ser.in_waiting:
                data = ser.readline().decode('utf-8').strip()
        if data is None:
            time.sleep(0.01)
            continue
        log.info(f"[RX] Raw: {data}")
        try:
            if not data.startswith('+RCV'):
                continue
            parts = data.split('=')[1].split(',')
            if len(parts) < 3:
                continue
            payload = parts[2]

            # Handle error messages: ERR|<boxID>|<errorCode>
            if payload.startswith('ERR|'):
                errParts = payload.split('|')
                if len(errParts) >= 3:
                    handleError(errParts[1], int(errParts[2]))
                else:
                    log.warning(f"[RX] Malformed error message: {payload}")
                continue

            # Handle sensor data: boxID|avgT|ambientT|delta|voltage|s1|s2|s3|s4
            sensorData = payload.split('|')
            if len(sensorData) < 9:
                log.warning(f"[RX] Unexpected payload format: {payload}")
                continue

            # Address - Data Length -- ASCII Data -- Signal Strength(RSSI) -- Signal-to-noise ratio
            # BoxID | Average Temperature | Ambient Temperature | Delta | Current Voltage | Sensor1 | Sensor2 | Sensor3 | Sensor4
            boxID    = sensorData[0]
            avgT     = sensorData[1]
            ambientT = sensorData[2]
            delta    = sensorData[3]
            currentV = sensorData[4]
            sensor1  = sensorData[5]
            sensor2  = sensorData[6]
            sensor3  = sensorData[7]
            sensor4  = sensorData[8]

            log.info(f"[RX] Box {boxID} | avg={avgT} ambient={ambientT} delta={delta} voltage={currentV} sensors=[{sensor1},{sensor2},{sensor3},{sensor4}]")
            addData(boxID, avgT, ambientT, delta, currentV, sensor1, sensor2, sensor3, sensor4)
        except Exception as e:
            log.exception(f"Error processing message: {e}")

def addData(boxID, avgerageTemperature, ambientTemperature, delta, currentVoltage, sensor1, sensor2, sensor3, sensor4):
    conn = getDBConnection()
    cur = conn.cursor()
    delta = float(delta)
    cur.execute(
        'INSERT INTO _box (_boxID, _ambientTemperature, _averageTemperature, _delta, _currentVoltage, _sensor1, _sensor2, _sensor3, _sensor4)'
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (boxID, ambientTemperature, avgerageTemperature, delta, currentVoltage, sensor1, sensor2, sensor3, sensor4)
    )
    conn.commit()
    cur.close()
    conn.close()

def sendLoraMessage(boxID, content):
    loraAddress = boxIDtoLoraAddress.get(boxID)
    if loraAddress is None:
        log.error(f"[TX] Unknown box ID: {boxID}")
        return
    message = f"AT+SEND={loraAddress},{len(content)},{content}\r\n"
    with serial_lock:
        ser.write(message.encode('utf-8'))
    log.info(f"[TX] Box {boxID} (LoRa addr {loraAddress}): {content}")

def main():
    recieveData()

if __name__ == "__main__":
    main()
