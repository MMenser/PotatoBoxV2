# PotatoBox V2

Remote temperature monitoring and control system for potato storage boxes.

Each box runs Arduino firmware that reads RTD temperature sensors, monitors voltage, adjusts a motor-driven variac, and reports data over LoRa. A Raspberry Pi receives box data, stores it in PostgreSQL, exposes a Flask API, and supports a React/Vite dashboard.

## Repository Layout

- `Box_1/` - `Box_4/` - PlatformIO firmware for each production box.
- `RaspberryPiV2/V2/backend/` - Flask API, LoRa serial receiver, scheduler, and database initialization.
- `RaspberryPiV2/V2/frontend/` - React/Vite dashboard.
- `RaspberryPiV2/V2/docker-compose.yml` - Raspberry Pi backend and PostgreSQL stack.
- `Lora Testing/`, `Motor Testing/`, `Temperature_Sensors/`, `Voltage Monitor/` - hardware test sketches.
- `RaspberryPiV2/V2/README.md` - detailed system architecture and deployment notes.

## Hardware Overview

- Arduino Uno R4 WiFi per box
- RYLR998 LoRa radios
- Adafruit MAX31865 RTD boards
- Four internal temperature sensors plus ambient sensing
- Motor driver for variac/vent control
- Raspberry Pi host with LoRa module on `/dev/ttyS0`

## Backend Setup

From `RaspberryPiV2/V2`:

```bash
docker compose up --build
docker compose exec backend python init_db.py
```

Required environment variables:

- Root `.env`: `DB_USERNAME`, `DB_PASSWORD`
- `backend/.env`: `DB_USERNAME`, `DB_PASSWORD`, `THINGSPEAK_API_WRITE_KEY1` through `THINGSPEAK_API_WRITE_KEY4`

Useful commands:

```bash
docker compose up -d
docker compose logs -f backend
docker compose down
```

## Frontend Setup

From `RaspberryPiV2/V2/frontend`:

```bash
npm install
npm run dev
npm run build
```

## Firmware

Each box folder is a PlatformIO project targeting `uno_r4_wifi`.

```bash
pio run
pio run --target upload
```

Before uploading firmware, confirm the `boxID` in `src/headers.cpp` matches the target box.

## API

- `GET /getData/<boxID>/<limit>` - latest readings for a box
- `POST /changeDelta/<boxID>/<delta>` - send a delta command, valid range `0-30`
- `GET /schedules/<boxID>` - list scheduled commands
- `POST /schedules` - create a scheduled command
- `DELETE /schedules/<scheduleID>` - delete a scheduled command
