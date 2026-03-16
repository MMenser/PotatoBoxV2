# PotatoBox V2 — System Architecture

## Overview

PotatoBox is a remote temperature management system for potato storage boxes. Each box contains sensors and a motor-controlled vent. A central Raspberry Pi communicates with the boxes over LoRa radio, stores sensor data, and exposes an API consumed by a web dashboard.

---

## Architecture Diagram

```
[ Potato Boxes (1-4) ]
        |  LoRa Radio (RYLR998)
        |
[ Raspberry Pi ]
  ├── /dev/ttyS0 (UART → LoRa module)
  │
  └── Docker
        ├── backend (Flask + Gunicorn :5000)
        │     ├── transciever.py  ← listens on serial, writes to DB, pushes to ThingSpeak
        │     └── server.py       ← REST API, schedule runner
        └── db (PostgreSQL :5432)
              └── pgdata volume (persistent)

[ nginx ]  ← reverse proxy on host, port 80
    |
[ Cloudflare Tunnel ]
    |
[ Internet ]
    |
[ Netlify ] ← React/Vite frontend (static, deployed separately)
```

---

## Components

### Potato Boxes (Hardware)
- Up to 4 boxes, each with:
  - 4 temperature sensors
  - Ambient temperature sensor
  - Voltage sensor
  - Motor-controlled vent (delta = vent open %)
  - LoRa radio (RYLR998) for wireless communication

- **LoRa addresses:** Box 1 → 9, Box 2 → 18, Box 3 → 27, Box 4 → 36

### Raspberry Pi (Host)
- Runs Docker (backend + database containers)
- LoRa module connected via UART at `/dev/ttyS0` (9600 baud)
- nginx reverse proxy forwards traffic from port 80 → backend container port 5000
- Cloudflare Tunnel exposes the Pi to the internet without port forwarding

### Backend Container (`./backend`)
- **Runtime:** Python 3.11, Flask, Gunicorn (1 worker, `0.0.0.0:5000`)
- **Dockerfile:** `backend/Dockerfile`
- **Key files:**
  - `server.py` — REST API + APScheduler (checks schedules every minute)
  - `transciever.py` — serial listener thread, parses LoRa messages, writes to DB, mirrors data to ThingSpeak
  - `gunicorn.conf.py` — Gunicorn config
  - `wsgi.py` — WSGI entrypoint
- **Serial access:** `/dev/ttyS0` is passed into the container via `devices:` in `docker-compose.yml`
- **Environment:** `backend/.env` (DB credentials, ThingSpeak API keys)

### Database Container (`db`)
- **Image:** `postgres:15`
- **Database name:** `potatodb`
- **Tables:**
  - `_box` — sensor readings (boxID, avgTemp, ambientTemp, delta, voltage, sensors 1-4, timestamp)
  - `schedules` — timed vent commands (box_id, time HH:MM, delta)
- **Persistence:** Docker named volume `pgdata` — survives container restarts

### Frontend (Netlify)
- React + Vite + TypeScript app in `frontend/`
- Deployed and built automatically by Netlify from the repo
- Talks to the backend API at `api.potatoheatbox.live`
- **No Docker container needed** — Netlify handles build and hosting

### nginx (Host, not containerized)
- Config: `/etc/nginx/sites-available/potato.conf`
- Listens on port 80, proxies to `http://127.0.0.1:5000` (backend container)
- TLS certificates stored at `/home/mason/Desktop/potatoheatbox.live-ssl-bundle/`

### Cloudflare Tunnel
- Exposes the Pi's nginx at `api.potatoheatbox.live` without opening firewall ports
- Traffic flow: `Cloudflare → Tunnel daemon on Pi → nginx → backend container`

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/getData/<boxID>/<limit>` | Get last N readings for a box. Use `limit=99` for all. |
| POST | `/changeDelta/<boxID>/<delta>` | Send vent command to a box (delta: 0–30) |
| GET | `/schedules/<boxID>` | Get scheduled vent commands for a box |
| POST | `/schedules` | Create a scheduled vent command |
| DELETE | `/schedules/<scheduleID>` | Delete a scheduled vent command |

---

## Data Flow

### Incoming (Box → Pi)
1. Box transmits LoRa packet: `boxID|avgT|ambientT|delta|voltage|s1|s2|s3|s4`
2. `transciever.py` reads from `/dev/ttyS0`, parses the `+RCV=` response
3. Data is written to the `_box` table in PostgreSQL
4. Data is also mirrored to ThingSpeak via HTTP GET

### Outgoing (Pi → Box)
1. API call hits `/changeDelta/<boxID>/<delta>` or the scheduler fires
2. `server.py` calls `sendLoraMessage(boxID, content)` in `transciever.py`
3. `transciever.py` sends `AT+SEND=<loraAddr>,<len>,<content>` over serial

### Scheduled Commands
- APScheduler runs `check_schedules()` every minute
- Matches current `HH:MM` against the `schedules` table
- Sends matching delta commands via LoRa

---

## Environment Variables

### `backend/.env`
| Variable | Description |
|----------|-------------|
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `THINGSPEAK_API_WRITE_KEY1–4` | ThingSpeak write keys per box |

### `.env` (root, used by docker-compose)
| Variable | Description |
|----------|-------------|
| `DB_USERNAME` | PostgreSQL username (must match backend/.env) |
| `DB_PASSWORD` | PostgreSQL password (must match backend/.env) |

---

## Running the Stack

```bash
# First time setup
docker compose up --build
docker compose exec backend python init_db.py

# Stop
docker compose down

# Run in background
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f db

# Reload nginx after config changes
sudo nginx -t && sudo systemctl reload nginx
```

---

## ThingSpeak
Each box has its own ThingSpeak channel for external data visualization:
- Field 1: Average Temperature
- Field 2: Ambient Temperature
- Field 3: Delta (vent %)
- Field 4: Voltage
- Fields 5–8: Sensors 1–4
