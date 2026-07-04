# LumaWarden Discord Bot

Python Discord bot for the LumaWarden backend.

The bot reads from the same FastAPI backend as the dashboard. It does not simulate device data on its own.

## Features

- `!status` - office-wide live device summary
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
DISCORD_CHANNEL_ID=123456789012345678
LUMAWARDEN_API_BASE=http://127.0.0.1:8000
BOT_PERSONALITY=warden
AUTO_ALERT_INTERVAL_SECONDS=60
```

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
