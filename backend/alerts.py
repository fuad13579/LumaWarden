"""Alert calculation logic for office-hours and long-running room rules.

Alerting is intentionally deterministic: given the same snapshot, it produces
the same alerts. That makes the dashboard and Discord bot consistent and keeps
the demo easy to reason about.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

# Office schedule and alert thresholds are kept as constants so the rules are easy to read and test.
OFFICE_START_HOUR = 9
OFFICE_END_HOUR = 17
LONG_RUNNING_THRESHOLD = timedelta(hours=2)

# The office setup is fixed at three rooms with five devices each.
ROOM_DEVICE_COUNT = 5


def _to_naive_datetime(value: Any) -> datetime | None:
	"""Parse ISO timestamps and normalize timezone-aware values to naive local time."""

	if isinstance(value, datetime):
		parsed = value
	elif isinstance(value, str):
		try:
			parsed = datetime.fromisoformat(value)
		except ValueError:
			return None
	else:
		return None

	if parsed.tzinfo is not None:
		parsed = parsed.astimezone().replace(tzinfo=None)

	return parsed


def _room_slug(room: str) -> str:
	"""Convert a room name into a stable identifier fragment."""

	return room.strip().lower().replace(" ", "_")


def _device_slug(device_id: str) -> str:
	"""Convert a device id into a stable identifier fragment."""

	return device_id.strip().lower().replace(" ", "_")


def _alert_id(prefix: str, room: str, device_id: str | None = None) -> str:
	"""Build deterministic alert ids for both device-level and room-level alerts."""

	room_part = _room_slug(room)
	if device_id is None:
		return f"{prefix}_{room_part}"
	return f"{prefix}_{room_part}_{_device_slug(device_id)}"


def _make_alert(
	alert_id: str,
	alert_type: str,
	severity: str,
	message: str,
	room: str,
	device_id: str | None,
	created_at: datetime,
) -> dict:
	"""Return a plain dictionary ready for JSON serialization."""

	return {
		"id": alert_id,
		"type": alert_type,
		"severity": severity,
		"message": message,
		"room": room,
		"device_id": device_id,
		"created_at": created_at.isoformat(),
	}


def calculate_alerts(devices: list[dict], now: datetime | None = None) -> list[dict]:
	"""Calculate deterministic alerts from the current device snapshot.

	The function is split into two passes for clarity:
	1. emit device-level after-hours alerts
	2. emit room-level long-running alerts

	This structure maps directly to the problem statement and keeps the rules
	easy to explain during a review.
	"""

	if not devices:
		return []

	# Normalize the reference time so comparisons stay consistent even if callers pass timezone-aware values.
	current_time = now or datetime.now()
	if current_time.tzinfo is not None:
		current_time = current_time.astimezone().replace(tzinfo=None)

	alerts: list[dict] = []
	devices_by_room: dict[str, list[dict]] = defaultdict(list)

	# First pass: group devices by room and emit per-device after-hours alerts.
	# The alert is only raised when a device is ON outside office hours, which is
	# a simple but effective way to surface wasted energy in the demo.
	for device in devices:
		room = device.get("room")
		device_id = device.get("id")
		status = str(device.get("status", "")).lower()

		if not room or not device_id:
			continue

		devices_by_room[room].append(device)

		if status == "on" and (current_time.hour < OFFICE_START_HOUR or current_time.hour >= OFFICE_END_HOUR):
			alerts.append(
				_make_alert(
					alert_id=f"after_hours_{_device_slug(str(device_id))}",
					alert_type="after_hours",
					severity="medium",
					message=f"{device.get('name', device_id)} in {room} is still ON outside office hours.",
					room=room,
					device_id=str(device_id),
					created_at=current_time,
				)
			)

	# Second pass: inspect each room as a whole for the long-running condition.
	# The room rule is stricter because it represents a broader office-level
	# inefficiency rather than a single forgotten device.
	for room, room_devices in devices_by_room.items():
		if len(room_devices) != ROOM_DEVICE_COUNT:
			continue

		if any(str(device.get("status", "")).lower() != "on" for device in room_devices):
			continue

		parsed_times = []
		for device in room_devices:
			# Invalid timestamps are ignored so one bad device does not break room-level alerting.
			parsed = _to_naive_datetime(device.get("last_changed"))
			if parsed is None:
				continue
			parsed_times.append(parsed)

		if len(parsed_times) != ROOM_DEVICE_COUNT:
			continue

		if all(current_time - changed_time > LONG_RUNNING_THRESHOLD for changed_time in parsed_times):
			alerts.append(
				_make_alert(
					alert_id=_alert_id("long_running_room", room),
					alert_type="long_running_room",
					severity="high",
					message=f"All devices in {room} have been ON for more than 2 hours.",
					room=room,
					device_id=None,
					created_at=current_time,
				)
			)

	return alerts
