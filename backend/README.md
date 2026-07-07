# LumaWarden Backend

FastAPI backend for LumaWarden. This service is the single source of truth for
the web dashboard and Discord bot.

## Why this backend exists

The hackathon problem statement asks for one shared backend that both the
dashboard and the bot use. That means this service is responsible for:

- storing the simulated office device state in memory
- exposing REST APIs for the dashboard and the bot
- pushing live updates to the browser through WebSocket
- calculating power usage, summaries, and alerts
- running the background simulator that keeps the demo active

The frontend and bot never simulate their own devices. They only read the data
returned by this backend.

## Responsibilities

- Store simulated office device state in memory.
- Expose REST APIs for dashboard and Discord bot reads.
- Push live dashboard updates through WebSocket.
- Calculate total and per-room power usage.
- Calculate active alerts from the current device snapshot.
- Track after-hours wasted energy for dashboard and Discord summaries.
- Run a background simulator that changes device states over time.

## Office Model

The backend uses the fixed 15-device office setup:

- Drawing Room: 2 fans, 3 lights
- Work Room 1: 2 fans, 3 lights
- Work Room 2: 2 fans, 3 lights

The problem statement mentions 18 devices in a few places, but this
implementation uses 15 devices because the room breakdown is fixed and
self-consistent.

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

Why this separate environment exists:

- it keeps the backend dependencies isolated from the frontend
- it matches the deploy setup on hosts like Render
- it avoids confusion between Python and Node package managers

## Run

From the repository root:

```bash
uvicorn backend.main:app --reload
```

Use this command during development so changes reload automatically.

Default URLs:

- API base: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`
- WebSocket: `ws://127.0.0.1:8000/ws`

## REST API

### `GET /health`

Returns backend health.

Example:

```json
{
  "status": "ok"
}
```

Use this as a deployment smoke test.

### `GET /api/snapshot`

Returns the full live backend snapshot.

This is the dashboard's main packet because it bundles:

- device list
- current power usage
- active alerts

Example:

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

Use this when you want the raw inventory without the usage or alert summary.

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

This endpoint is intentionally compact so the dashboard can render KPI cards
and charts without requesting the full snapshot every time.

Example:

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

The backend recalculates alerts on demand so the list always reflects the live
device snapshot instead of a cached copy.

### `GET /api/summary`

Returns after-hours energy waste tracked by the backend, plus the dashboard
session estimate for the current page load.

Optional query parameter:

- `dashboard_loaded_at_ms` - timestamp in milliseconds used to calculate the
  session estimate that the dashboard shows in the Power card

Why the query parameter exists:

- the backend can calculate the "since dashboard opened" metric
- the frontend stays display-only
- the result is consistent for both the dashboard and any future consumer that
  wants the same value

Example:

```json
{
  "office_hours": {
    "start_hour": 9,
    "end_hour": 17
  },
  "previous_day": {
    "date": "2026-07-03",
    "watt_hours": 360.0,
    "kwh": 0.36,
    "rooms": {
      "Drawing Room": {
        "watt_hours": 360.0,
        "devices": {
          "drawing_fan_1": 360.0
        }
      },
      "Work Room 1": {
        "watt_hours": 0,
        "devices": {}
      },
      "Work Room 2": {
        "watt_hours": 0,
        "devices": {}
      }
    }
  },
  "today": {
    "date": "2026-07-04",
    "watt_hours": 0,
    "kwh": 0,
    "rooms": {
      "Drawing Room": {
        "watt_hours": 0,
        "devices": {}
      },
      "Work Room 1": {
        "watt_hours": 0,
        "devices": {}
      },
      "Work Room 2": {
        "watt_hours": 0,
        "devices": {}
      }
    }
  },
  "today_usage": {
    "date": "2026-07-04",
    "watt_hours": 0,
    "kwh": 0,
    "rooms": {
      "Drawing Room": {
        "watt_hours": 0,
        "devices": {}
      },
      "Work Room 1": {
        "watt_hours": 0,
        "devices": {}
      },
      "Work Room 2": {
        "watt_hours": 0,
        "devices": {}
      }
    }
  },
  "dashboard_estimate_kwh": 0
}
```

The summary is in-memory, like device state, so it resets when the backend
restarts. That is acceptable here because the project is a simulation demo, not
a persistent production energy platform.

### Why there are two kWh values

- `today_usage.kwh` is the backend's current-day ON-time energy total.
- `dashboard_estimate_kwh` is the session estimate shown in the UI for
  "since dashboard opened."

Both are backend-calculated so the frontend only displays values instead of
duplicating accounting logic.

## WebSocket

Connect to:

```text
ws://127.0.0.1:8000/ws
```

Behavior:

- Sends the current snapshot immediately after connection.
- Sends an updated snapshot whenever the simulator changes device state.
- Snapshot shape matches `GET /api/snapshot`.

Why WebSocket is used:

- it gives the dashboard instant updates without page refreshes
- it reduces the need for repeated polling while the backend is healthy
- it makes the demo feel live even though the devices are simulated

## Simulator

The simulator runs automatically when the FastAPI app starts.

- Waits 5-10 seconds between ticks.
- Toggles 1-3 random devices per tick.
- Updates `last_changed` only when device state changes.
- Recalculates usage and alerts through the shared store.
- Broadcasts the updated snapshot to connected WebSocket clients.

Why the simulator is in the backend:

- the backend must own the state transitions so the bot and UI never diverge
- the simulator is a deterministic source of demo activity, not a separate app
- keeping it here makes deployment and debugging much simpler

## Alert Rules

### After-Hours Alert

Office hours are 9 AM through 5 PM.

If any device is ON before 9 AM or at/after 5 PM, the backend creates a
device-level alert.

### Long-Running Room Alert

If all 5 devices in a room are ON and each has been ON continuously for more
than 2 hours, the backend creates a room-level alert.

This is a simulation heuristic for the hackathon demo. In a real deployment,
occupancy signals would make this rule more reliable.

Why the alert rules are written this way:

- after-hours alerts are easy to understand and show obvious waste
- room-wide alerts represent a broader inefficiency than a single device
- both rules are simple enough to explain in a short judging walkthrough
