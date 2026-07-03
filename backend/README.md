# LumaWarden Backend

FastAPI backend for LumaWarden. This service is the single source of truth for the web dashboard and Discord bot.

## Responsibilities

- Store simulated office device state in memory.
- Expose REST APIs for dashboard and Discord bot reads.
- Push live dashboard updates through WebSocket.
- Calculate total and per-room power usage.
- Calculate active alerts from the current device snapshot.
- Run a background simulator that changes device states over time.

## Office Model

The backend uses the fixed 15-device office setup:

- Drawing Room: 2 fans, 3 lights
- Work Room 1: 2 fans, 3 lights
- Work Room 2: 2 fans, 3 lights

The problem statement mentions 18 devices in a few places, but this implementation uses 15 devices based on the fixed room setup.

## Power Rules

- Fan ON: 60W
- Light ON: 15W
- OFF device: 0W

`power_watts` represents current power draw, not rated maximum power.

## Setup

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

From the repository root:

```bash
uvicorn backend.main:app --reload
```

Default URLs:

- API base: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`
- WebSocket: `ws://127.0.0.1:8000/ws`

## REST API

### `GET /health`

Returns backend health.

```json
{
  "status": "ok"
}
```

### `GET /api/snapshot`

Returns the full live backend snapshot.

```json
{
  "devices": [],
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

### `GET /api/devices`

Returns all 15 devices.

Each device has this shape:

```json
{
  "id": "work1_fan_1",
  "name": "Fan 1",
  "room": "Work Room 1",
  "type": "fan",
  "status": "on",
  "power_watts": 60,
  "last_changed": "2026-07-03T14:30:00"
}
```

### `GET /api/usage`

Returns current total and per-room power usage.

```json
{
  "total_watts": 75,
  "rooms": {
    "Drawing Room": 15,
    "Work Room 1": 60,
    "Work Room 2": 0
  }
}
```

### `GET /api/alerts`

Returns active alerts calculated from the current device state.

## WebSocket

Connect to:

```text
ws://127.0.0.1:8000/ws
```

Behavior:

- Sends the current snapshot immediately after connection.
- Sends an updated snapshot whenever the simulator changes device state.
- Snapshot shape matches `GET /api/snapshot`.

## Simulator

The simulator runs automatically when the FastAPI app starts.

- Waits 5-10 seconds between ticks.
- Toggles 1-3 random devices per tick.
- Updates `last_changed` only when device state changes.
- Recalculates usage and alerts through the shared store.
- Broadcasts the updated snapshot to connected WebSocket clients.

## Alert Rules

### After-Hours Alert

Office hours are 9 AM through 5 PM.

If any device is ON before 9 AM or at/after 5 PM, the backend creates a device-level alert.

### Long-Running Room Alert

If all 5 devices in a room are ON and each has been ON continuously for more than 2 hours, the backend creates a room-level alert.

## Integration Rules

- The frontend must read data from REST APIs and live WebSocket snapshots.
- The Discord bot must call REST APIs.
- Frontend and bot must not generate separate random device data.
- Backend state is in memory, so device state resets when the server restarts.
