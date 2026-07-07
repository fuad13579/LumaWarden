# LumaWarden Discord Bot

Python Discord bot for the LumaWarden backend.

The bot reads from the same FastAPI backend as the dashboard. It does not simulate device data on its own.

## Features

- `!status` - office-wide live device summary
- `!status <name>` - room status shortcut, such as `!status Work Room 1`
- `!room <name>` - live status for one room, such as `!room work1`
- `!usage` - current power draw and per-room breakdown
- `!summary` - previous day's after-hours wasted energy from backend tracking
- `!personalities` - list available response styles
- `!persona <name>` - switch response style during demo
- Automatic after-hours alarm messages in a configured Discord channel

## Setup

From the repository root:

```bash
cd bot
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

## Configuration

Set these environment variables:

```bash
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id
LUMAWARDEN_API_BASE=http://127.0.0.1:8000
BOT_PERSONALITY=warden
AUTO_ALERT_INTERVAL_SECONDS=300
```

The bot reads the backend REST API at `LUMAWARDEN_API_BASE` and never generates its own random room or device state.

Available personalities:

- `warden` - warm, watchful, demo-friendly
- `boss` - playful office-manager style
- `minimal` - short and plain

The Discord bot must have the Message Content Intent enabled in the Discord Developer Portal.

## Run

Start the backend first:

```bash
uvicorn backend.main:app --reload
```

Then run the bot:

```bash
python bot.py
```

## Data Flow

- `!status` and `!room` call the backend snapshot API.
- `!usage` reads both the live usage payload and the backend summary payload.
- `!summary` reads the backend summary payload.
- The after-hours alarm loop polls the backend on a timer and posts only when the active alert signature changes.

## Submission Notes

- The bot must be deployed as a long-running process, not as a serverless function.
- Use the same backend URL for the dashboard and bot so both interfaces reflect one shared source of truth.
