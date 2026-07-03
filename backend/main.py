"""FastAPI application entry point for BidyutWarden backend."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend import store
from backend.simulator import run_simulator

ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
	# Start the simulator when the app boots and stop it when the app shuts down.
	_ensure_simulator_task(app)
	try:
		yield
	finally:
		await _cancel_simulator_task(app)


app = FastAPI(title="BidyutWarden Backend", lifespan=lifespan)

app.add_middleware(
	CORSMiddleware,
	allow_origins=ALLOWED_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# WebSocket clients and the simulator task live on app.state so every request sees the same shared backend state.
app.state.connected_clients = set()
app.state.simulator_task = None


def _ensure_simulator_task(app_instance: FastAPI) -> None:
	"""Create the background simulator task only when one is not already running."""

	task = app_instance.state.simulator_task
	if task is not None and not task.done():
		return

	app_instance.state.simulator_task = asyncio.create_task(run_simulator(broadcast_snapshot))


async def _cancel_simulator_task(app_instance: FastAPI) -> None:
	"""Cancel the background simulator task cleanly during shutdown."""

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
	"""Send a snapshot to all connected WebSocket clients and drop any that fail."""

	# Iterate over a copy so failed clients can be removed safely while broadcasting.
	for client in list(app.state.connected_clients):
		try:
			await client.send_json(snapshot)
		except Exception:
			app.state.connected_clients.discard(client)


@app.get("/api/snapshot")
async def get_snapshot() -> dict:
	return store.get_snapshot()


@app.get("/api/devices")
async def get_devices() -> list[dict]:
	return store.get_devices()


@app.get("/api/usage")
async def get_usage() -> dict:
	return store.get_usage()


@app.get("/api/alerts")
async def get_alerts() -> list[dict]:
	return store.get_alerts()


@app.get("/health")
async def health() -> dict:
	return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
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

