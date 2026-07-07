# LumaWarden

LumaWarden is a simulated smart-office power monitoring system built for Techathon 2026 Preliminary Round.
It has one shared FastAPI backend that acts as the single source of truth for:

- the React/Vite dashboard
- the Discord bot
- live device state, power usage, and alerts
- a background simulator that produces realistic office activity

The project uses the fixed 3-room office layout from the statement:

- Drawing Room
- Work Room 1
- Work Room 2

Each room has:

- 2 fans
- 3 lights

## Repository Layout

- `backend/` — FastAPI app, in-memory store, simulator, alerts, and WebSocket stream
- `frontend/` — React/Vite dashboard
- `bot/` — Discord bot that reads the same backend APIs
- `diagrams/` — architecture and circuit documentation

## What the project demonstrates

- shared backend state for dashboard and bot
- real-time dashboard updates through WebSocket
- REST APIs for bot and dashboard reads
- simulated device toggles every 5-10 seconds
- power usage calculation
- alert generation
- representative circuit documentation for one room

## Quick Start

The services are started separately because each one has a different runtime
role:

- backend = shared state, simulator, REST, WebSocket
- frontend = browser UI only
- bot = Discord process that reads backend data

That split is intentional. It keeps the backend as the only place where device
state changes, which makes the demo architecture easy to explain and verify.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm.cmd run dev
```

If PowerShell blocks `npm`, use `npm.cmd` as shown above.

> The frontend is a browser app. It reads the backend and renders what it gets;
> it does not decide device states or create alerts on its own.

### Bot

```powershell
cd bot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python bot.py
```

> The bot is intentionally long-running because Discord bots keep a live
> connection open. That is why it belongs on a worker-like host, not Vercel.

## Required Environment Variables

### Frontend

- `VITE_API_BASE_URL` — backend URL in production, for example `https://lumawarden.onrender.com`

Example:

```powershell
$env:VITE_API_BASE_URL="https://lumawarden.onrender.com"
npm.cmd run dev
```

## URLs

- API base: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs
- WebSocket: ws://127.0.0.1:8000/ws

## Backend Overview

- Single source of truth for the dashboard and Discord bot.
- In-memory simulated device store.
- Fixed office setup with exactly 15 devices:
  - Drawing Room: 2 fans, 3 lights
  - Work Room 1: 2 fans, 3 lights
  - Work Room 2: 2 fans, 3 lights
- Fan ON = 60W.
- Light ON = 15W.
- OFF = 0W.
- Simulator toggles 1-3 devices every 5-10 seconds.
- WebSocket clients receive updated snapshots after device changes.
- After-hours waste is accumulated in memory and resets when the backend restarts.

> The problem statement mentions 18 devices in some places, but this project intentionally uses 15 based on the fixed room layout above.

## REST Endpoints

- `GET /health`
- `GET /api/snapshot`
- `GET /api/devices`
- `GET /api/usage`
- `GET /api/alerts`
- `GET /api/summary`

## Snapshot Shape

Example response from `GET /api/snapshot`:

```json
{
  "devices": [
    {
      "id": "drawing_fan_1",
      "name": "Fan 1",
      "room": "Drawing Room",
      "type": "fan",
      "status": "off",
      "power_watts": 0,
      "last_changed": "2026-07-04T10:00:00"
    }
  ],
  "usage": {
    "total_watts": 0,
    "rooms": {
      "Drawing Room": 0,
      "Work Room 1": 0,
      "Work Room 2": 0
    }
  },
  "alerts": []
}
```

- `DISCORD_TOKEN`
- `DISCORD_CHANNEL_ID`
- `LUMAWARDEN_API_BASE`
- `BOT_PERSONALITY` — optional
- `AUTO_ALERT_INTERVAL_SECONDS` — optional, defaults to `300`

Example:

## After-Hours Waste Summary

`GET /api/summary` returns the office-hour settings, today's after-hours waste, and the previous day's after-hours waste. The calculation is based on each ON device's wattage and the amount of time it stayed ON outside office hours.

This is prototype storage: the summary is kept in backend memory, so it resets when the backend process restarts. For a production deployment, this should be persisted in SQLite or another database.

For a demo video, the office cutoff can be temporarily adjusted in [backend/alerts.py](backend/alerts.py):

```python
OFFICE_START_HOUR = 9
OFFICE_END_HOUR = 17
```

Set `OFFICE_END_HOUR` to the current hour or earlier, then restart the backend to trigger after-hours behavior immediately.

## Discord Bot

### Backend

- `ALLOWED_ORIGINS` — optional comma-separated CORS allowlist for deployed frontend domains

## Documentation

- `backend/README.md` — backend APIs, simulator, alert logic, and summary model
- `frontend/README.md` — dashboard setup, runtime behavior, and backend dependency
- `bot/README.md` — Discord bot setup and commands
- `diagrams/circuit-explanation.md` — representative circuit notes
- `diagrams/pin-mapping.md` — pin mapping for the Wokwi concept
- `diagrams/wokwi-link.md` — simulation link notes
- `diagrams/architecture-diagram.png` — high-level system diagram

## What reviewers should notice first

1. The backend is the only writer of device state.
2. The frontend never invents its own devices or alerts.
3. The bot uses the same backend APIs as the dashboard.
4. The simulator is in-memory, which is enough for a hackathon demo.

## Validation

The expected checks for submission are:

- backend starts with `uvicorn`
- frontend builds with `npm run build`
- dashboard connects to the backend without CORS issues
- WebSocket pushes live updates
- Discord bot reads the same backend snapshot
- docs explain the 15-device fixed layout and the simulation approach

## Problem Statement Fit

- no physical hardware is required
- device data is simulated
- the dashboard and bot share one backend
- the dashboard supports live telemetry and alerts without refresh
- the circuit deliverable is represented with a practical one-room schematic concept
