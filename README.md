# LumaWarden

LumaWarden is a FastAPI backend that acts as the single source of truth for the dashboard and Discord bot. It uses an in-memory simulator for a fixed office layout and exposes REST plus WebSocket endpoints for live reads.

## Backend Setup

From the repo root:

```powershell
cd backend
python -m venv .venv
```

Activate the virtual environment:

- Windows:

```powershell
.venv\Scripts\activate
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

## Run the Backend

From the repo root:

```powershell
uvicorn backend.main:app --reload
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

> The problem statement mentions 18 devices in some places, but this project intentionally uses 15 based on the fixed room layout above.

## REST Endpoints

- `GET /health`
- `GET /api/snapshot`
- `GET /api/devices`
- `GET /api/usage`
- `GET /api/alerts`

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

## Alert Rules

- After-hours alert: triggered outside 9 AM-5 PM if any device is ON.
- Long-running room alert: triggered if all 5 devices in a room are ON for more than 2 hours.

## Integration Notes

- The frontend must read live state from the backend using REST and WebSocket.
- The Discord bot must call the backend REST APIs.
- Neither the frontend nor the bot should generate separate random device data.
