"""Background simulator for changing device states over time.

The simulator is deliberately simple: it flips a handful of random devices every
few seconds to keep the UI alive during the demo. The important part is not the
randomness itself, but that every change goes through the shared store so the
frontend, backend, and Discord bot all see the same reality.
"""

from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable

from backend import store

MIN_INTERVAL_SECONDS = 5
MAX_INTERVAL_SECONDS = 10
MIN_CHANGES_PER_TICK = 1
MAX_CHANGES_PER_TICK = 3


async def _run_tick(broadcast_snapshot: Callable[[dict], Awaitable[None]]) -> None:
	"""Apply one simulator tick and broadcast a fresh snapshot after real changes.

	A tick is small on purpose:
	- read the current live device list
	- choose a few unique devices to toggle
	- broadcast only if at least one device actually changed

	This keeps the dashboard active without spamming duplicate updates.
	"""

	# Read the current store state once per tick so the simulator acts on live device data.
	devices = store.get_devices()
	if not devices:
		return

	# Randomly choose a small number of unique devices to flip on each tick.
	change_count = random.randint(MIN_CHANGES_PER_TICK, MAX_CHANGES_PER_TICK)
	change_count = min(change_count, len(devices))
	selected_devices = random.sample(devices, change_count)

	# Track whether any toggle actually changed the store before broadcasting.
	changed = False
	for device in selected_devices:
		changed = store.toggle_device(device["id"]) or changed

	if changed:
		await broadcast_snapshot(store.get_snapshot())


async def run_simulator(broadcast_snapshot: Callable[[dict], Awaitable[None]]) -> None:
	"""Run the background simulator until cancelled.

	The sleep interval is intentionally random so the dashboard feels more like a
	live office than a metronome. If one tick fails, the loop keeps running so the
	simulator does not die during a demo.
	"""

	while True:
		try:
			# Pause for a random interval so device activity feels naturally staggered.
			await asyncio.sleep(random.uniform(MIN_INTERVAL_SECONDS, MAX_INTERVAL_SECONDS))
			await _run_tick(broadcast_snapshot)
		except asyncio.CancelledError:
			raise
		except Exception:
			# Keep the simulator alive even if one tick fails.
			continue
