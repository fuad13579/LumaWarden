# LumaWarden

LumaWarden is a FastAPI backend that acts as the single source of truth for the dashboard and Discord bot. It uses an in-memory simulator for a fixed office layout and exposes REST plus WebSocket endpoints for live reads.

## Submission Snapshot

- Frontend dashboard: React + Vite, reads live REST and WebSocket data from the backend.
- Dashboard visualization: statement-style office floor plan with live light/fan indicators.
- Energy view: live whole-office watts, per-room wattage bar chart, and after-hours waste summary.
- Discord bot: reads the same backend APIs and never generates its own device state.
- Circuit concept: Wokwi representative hardware for one room, used as a demo schematic.
- Architecture diagram: [diagrams/lumawarden-architecture-diagram.drawio](diagrams/lumawarden-architecture-diagram.drawio) and [diagrams/architecture-diagram.png](diagrams/architecture-diagram.png).
- Circuit docs: [diagrams/circuit-explanation.md](diagrams/circuit-explanation.md), [diagrams/pin-mapping.md](diagrams/pin-mapping.md), and [diagrams/wokwi-link.md](diagrams/wokwi-link.md).

## Demo Flow

1. Start the backend.
2. Start the frontend dashboard.
3. Open the dashboard in a browser.
4. Show live power, device, and alert updates.
5. Show the office floor plan: yellow lights turn on/off and fans rotate when active.
6. Show the power panel: total watts, per-room bar chart, and after-hours waste summary.
7. Show the Discord bot commands: `!status`, `!room work1`, `!usage`, and `!summary`.
8. Point judges to the architecture and circuit docs above.

## Judging Checklist

- Live backend source of truth is used by both the dashboard and the bot.
- Device states, room usage, and alerts update from the shared backend snapshot.
- The floor visualization reflects backend device state instead of static artwork.
- The power chart compares current room wattage as categories, not as a time-series trend.
- After-hours alerts and waste estimates are calculated from backend device state.
- The dashboard is responsive on mobile, tablet, laptop, and desktop widths.
- There is no fake-looking clickable UI in the top header.
- The project documents the architecture diagram and circuit schematic.
- Setup commands and environment variables are clearly documented below.

## Problem Statement Alignment

- This repository uses the fixed 3-room, 15-device model implemented in the backend, frontend, bot, and tests.
- The statement text also mentions 18 devices in places, which conflicts with the listed room breakdown.
- The implementation keeps the shared backend state as the source of truth and does not add fake devices to reconcile that mismatch.

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

## Alert Rules

- After-hours alert: triggered outside 9 AM-5 PM if any device is ON.
- Long-running room alert: triggered if all 5 devices in a room are ON for more than 2 hours.

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

The bot is in `bot/`. It reads the same backend APIs as the dashboard and does not create its own random device data.

Features:

- `!status` - live office-wide status
- `!status <name>` - room status shortcut, such as `!status Work Room 1`
- `!room <name>` - room status, such as `!room work1`
- `!usage` - live wattage and today's tracked after-hours waste
- `!summary` - previous day's after-hours wasted energy
- automatic after-hours alarm messages in a configured Discord channel
- premade response personalities: `warden`, `boss`, and `minimal`

Setup:

```powershell
cd bot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Environment variables:

```powershell
$env:DISCORD_TOKEN="your_bot_token"
$env:DISCORD_CHANNEL_ID="your_channel_id"
$env:LUMAWARDEN_API_BASE="http://127.0.0.1:8000"
$env:BOT_PERSONALITY="warden"
```

Run:

```powershell
python bot.py
```

## Integration Notes

- The frontend must read live state from the backend using REST and WebSocket.
- The Discord bot must call the backend REST APIs.
- Neither the frontend nor the bot should generate separate random device data.
