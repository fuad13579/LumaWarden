"""FastAPI application entry point for LumaWarden backend.

This file is the public API surface for the entire project. The frontend dashboard
and the Discord bot both talk to this app, so the responsibilities here are very
deliberate:

- keep one shared in-memory office state
- expose read-only REST endpoints for dashboard and bot consumers
- expose a WebSocket that pushes live snapshots to the browser
- start and stop the background simulator with the app lifecycle

The code stays small on purpose. All of the domain logic lives in `store.py`,
`simulator.py`, and `alerts.py` so the API layer only coordinates requests and
translates backend data into HTTP/WebSocket responses.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import os

from datetime import datetime

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend import store
from backend.simulator import run_simulator


def _parse_allowed_origins() -> list[str]:
	"""Return CORS origins from the environment, with local defaults.

	Why this exists:
	- the frontend runs on localhost during development
	- the frontend runs on Vercel in production
	- both need browser access to the same backend API

	If `ALLOWED_ORIGINS` is set, we append those values to the built-in local
	values instead of replacing them, so local development remains frictionless.
	"""

	env_value = os.getenv("ALLOWED_ORIGINS", "")
	env_origins = [origin.strip() for origin in env_value.split(",") if origin.strip()]
	default_origins = [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:5173",
		"http://127.0.0.1:5173",
	]
	return default_origins + env_origins


ALLOWED_ORIGINS = _parse_allowed_origins()


@asynccontextmanager
async def lifespan(app: FastAPI):
	# The simulator is tied to app startup/shutdown so it behaves like a single
	# long-running office controller rather than a request-scoped helper.
	_ensure_simulator_task(app)
	try:
		yield
	finally:
		await _cancel_simulator_task(app)


app = FastAPI(title="LumaWarden Backend", lifespan=lifespan)

app.add_middleware(
	CORSMiddleware,
	allow_origins=ALLOWED_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# `app.state` is the simplest safe place to keep process-wide runtime objects:
# - connected WebSocket clients
# - the background simulator task
# This keeps the backend source of truth centralized for every request handler.
app.state.connected_clients = set()
app.state.simulator_task = None


def _ensure_simulator_task(app_instance: FastAPI) -> None:
	"""Create the background simulator task only when one is not already running.

	We guard against double-starting because the FastAPI lifespan handler can be
	invoked only once per process, but defensive checks keep the code robust if
	this helper is ever reused elsewhere.
	"""

	task = app_instance.state.simulator_task
	if task is not None and not task.done():
		return

	app_instance.state.simulator_task = asyncio.create_task(run_simulator(broadcast_snapshot))


async def _cancel_simulator_task(app_instance: FastAPI) -> None:
	"""Cancel the background simulator task cleanly during shutdown.

	This ensures the process does not leave a dangling async task behind when the
	app is stopped or reloaded in development.
	"""

	task = app_instance.state.simulator_task
	if task is None:
		return

	task.cancel()
	try:
		await task
	except asyncio.CancelledError:
		pass
	finally:
		app_instance.state.simulator_task = None


async def broadcast_snapshot(snapshot: dict) -> None:
	"""Send a snapshot to all connected WebSocket clients and drop any that fail.

	Each connected browser gets the same snapshot payload, which keeps all
	dashboards in sync and avoids any frontend-side simulation logic.
	"""

	# Iterate over a copy so failed clients can be removed safely while broadcasting.
	for client in list(app.state.connected_clients):
		try:
			await client.send_json(snapshot)
		except Exception:
			app.state.connected_clients.discard(client)


@app.get("/api/snapshot")
async def get_snapshot() -> dict:
	# A snapshot is the dashboard's one-stop payload: devices, usage, and alerts.
	return store.get_snapshot()


@app.get("/api/devices")
async def get_devices() -> list[dict]:
	# This is the raw device inventory if a consumer wants to render rooms itself.
	return store.get_devices()


@app.get("/api/usage")
async def get_usage() -> dict:
	# Useful for lightweight widgets or consumers that only care about wattage.
	return store.get_usage()


@app.get("/api/alerts")
async def get_alerts() -> list[dict]:
	# The alert list is calculated from the current live device state each time.
	return store.get_alerts()


@app.get("/api/summary")
async def get_summary(dashboard_loaded_at_ms: int | None = Query(default=None, ge=0)) -> dict:
	# The dashboard passes its own load timestamp so the backend can compute the
	# session-based kWh estimate without duplicating business logic in the browser.
	dashboard_loaded_at = (
		datetime.fromtimestamp(dashboard_loaded_at_ms / 1000).replace(microsecond=0)
		if dashboard_loaded_at_ms is not None
		else None
	)
	return store.get_waste_summary(dashboard_loaded_at=dashboard_loaded_at)


@app.get("/health")
async def health() -> dict:
	# Simple deploy health check used by Render and local debugging.
	return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
	# The browser opens a WebSocket to receive live snapshots without refresh.
	await websocket.accept()
	app.state.connected_clients.add(websocket)

	try:
		# Send the current snapshot immediately so the UI has data as soon as it connects.
		await websocket.send_json(store.get_snapshot())
		while True:
			# Keep the socket open until the client disconnects.
			message = await websocket.receive()
			if message["type"] == "websocket.disconnect":
				break
	except WebSocketDisconnect:
		pass
	finally:
		# Always remove disconnected clients so broadcasts do not keep stale references.
		app.state.connected_clients.discard(websocket)

