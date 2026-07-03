"""In-memory device store and snapshot helpers."""

from __future__ import annotations

from datetime import datetime
from threading import Lock

from backend.alerts import calculate_alerts

ROOM_NAMES = ("Drawing Room", "Work Room 1", "Work Room 2")
FAN_WATTAGE = 60
LIGHT_WATTAGE = 15

# Device ids are generated from the room prefix plus the device type and index so they stay stable.
_ROOM_PREFIXES = {
	"Drawing Room": "drawing",
	"Work Room 1": "work1",
	"Work Room 2": "work2",
}

# Each room has the same 5-device layout: 2 fans and 3 lights.
_DEVICE_LAYOUT = (
	("fan", "Fan", 2, FAN_WATTAGE),
	("light", "Light", 3, LIGHT_WATTAGE),
)

_STATE_LOCK = Lock()


def _make_device(device_id: str, name: str, room: str, device_type: str, power_watts: int) -> dict:
	return {
		"id": device_id,
		"name": name,
		"room": room,
		"type": device_type,
		"status": "off",
		"power_watts": 0,
		"last_changed": datetime.now().replace(microsecond=0).isoformat(),
	}


def _build_initial_devices() -> list[dict]:
	"""Create the fixed 15-device office inventory."""

	devices: list[dict] = []

	for room in ROOM_NAMES:
		prefix = _ROOM_PREFIXES[room]
		for device_type, label, count, wattage in _DEVICE_LAYOUT:
			for index in range(1, count + 1):
				device_id = f"{prefix}_{device_type}_{index}"
				devices.append(
					_make_device(
						device_id=device_id,
						name=f"{label} {index}",
						room=room,
						device_type=device_type,
						power_watts=wattage,
					)
				)

	return devices


# The store starts with a deterministic, fully off snapshot.
_DEVICES = _build_initial_devices()


def _copy_device(device: dict) -> dict:
	return dict(device)


def _copy_alert(alert: dict) -> dict:
	return dict(alert)


def _normalize_status(status: str) -> str | None:
	"""Accept only the two supported device states."""

	normalized = status.strip().lower()
	if normalized in {"on", "off"}:
		return normalized
	return None


def _power_for(device: dict, status: str) -> int:
	"""Map a device state to its current watt draw."""

	if status != "on":
		return 0
	return FAN_WATTAGE if device["type"] == "fan" else LIGHT_WATTAGE


def _find_device(device_id: str) -> dict | None:
	"""Locate a device in the in-memory store."""

	for device in _DEVICES:
		if device["id"] == device_id:
			return device
	return None


def get_devices() -> list[dict]:
	"""Return a copy of the current device list."""

	with _STATE_LOCK:
		return [_copy_device(device) for device in _DEVICES]


def get_usage() -> dict:
	"""Calculate current total and per-room consumption from the live device state."""

	with _STATE_LOCK:
		room_usage = {room: 0 for room in ROOM_NAMES}
		total_watts = 0

		for device in _DEVICES:
			room = device["room"]
			power_watts = int(device["power_watts"])
			room_usage[room] += power_watts
			total_watts += power_watts

		return {
			"total_watts": total_watts,
			"rooms": dict(room_usage),
		}


def get_alerts() -> list[dict]:
	"""Compute alerts from the current device snapshot."""

	with _STATE_LOCK:
		alerts = calculate_alerts([dict(device) for device in _DEVICES])
		return [_copy_alert(alert) for alert in alerts]


def get_snapshot() -> dict:
	"""Return the combined devices, usage, and alert snapshot for API responses."""

	return {
		"devices": get_devices(),
		"usage": get_usage(),
		"alerts": get_alerts(),
	}


def set_device_status(device_id: str, status: str) -> bool:
	"""Update a device status and refresh its consumption when the status actually changes."""

	normalized_status = _normalize_status(status)
	if normalized_status is None:
		return False

	with _STATE_LOCK:
		device = _find_device(device_id)
		if device is None:
			return False

		# Leave last_changed untouched if the caller repeats the current state.
		if device["status"] == normalized_status:
			return True

		device["status"] = normalized_status
		device["power_watts"] = _power_for(device, normalized_status)
		device["last_changed"] = datetime.now().replace(microsecond=0).isoformat()
		return True


def toggle_device(device_id: str) -> bool:
	"""Flip a device between on and off."""

	with _STATE_LOCK:
		device = _find_device(device_id)
		if device is None:
			return False

		new_status = "off" if device["status"] == "on" else "on"
		device["status"] = new_status
		device["power_watts"] = _power_for(device, new_status)
		device["last_changed"] = datetime.now().replace(microsecond=0).isoformat()
		return True

