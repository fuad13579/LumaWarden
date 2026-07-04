"""In-memory device store and snapshot helpers."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from threading import Lock

from backend.alerts import OFFICE_END_HOUR, OFFICE_START_HOUR, calculate_alerts

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
_ACCOUNTED_AT = {device["id"]: datetime.fromisoformat(device["last_changed"]) for device in _DEVICES}
_AFTER_HOURS_WATT_SECONDS: dict[str, dict[str, dict[str, float]]] = {}


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


def _date_key(value: date) -> str:
	return value.isoformat()


def _room_bucket(day: date, room: str) -> dict[str, float]:
	day_key = _date_key(day)
	day_bucket = _AFTER_HOURS_WATT_SECONDS.setdefault(day_key, {})
	return day_bucket.setdefault(room, {})


def _add_waste(device: dict, day: date, seconds: float) -> None:
	if seconds <= 0:
		return

	room_bucket = _room_bucket(day, device["room"])
	room_bucket[device["id"]] = room_bucket.get(device["id"], 0.0) + int(device["power_watts"]) * seconds


def _overlap_seconds(start: datetime, end: datetime, window_start: datetime, window_end: datetime) -> float:
	overlap_start = max(start, window_start)
	overlap_end = min(end, window_end)
	if overlap_end <= overlap_start:
		return 0.0
	return (overlap_end - overlap_start).total_seconds()


def _accrue_after_hours_waste(device: dict, start: datetime, end: datetime) -> None:
	"""Record after-hours energy for one ON device over a time interval."""

	if end <= start or device["status"] != "on":
		return

	current_day = start.date()
	last_day = end.date()

	while current_day <= last_day:
		day_start = datetime.combine(current_day, time.min)
		day_end = day_start + timedelta(days=1)
		morning_start = day_start
		morning_end = datetime.combine(current_day, time(hour=OFFICE_START_HOUR))
		evening_start = datetime.combine(current_day, time(hour=OFFICE_END_HOUR))
		evening_end = day_end

		_add_waste(device, current_day, _overlap_seconds(start, end, morning_start, morning_end))
		_add_waste(device, current_day, _overlap_seconds(start, end, evening_start, evening_end))

		current_day += timedelta(days=1)


def _accrue_device_until(device: dict, now: datetime) -> None:
	device_id = device["id"]
	accounted_at = _ACCOUNTED_AT.get(device_id)
	if accounted_at is None:
		accounted_at = _to_datetime(device["last_changed"])
		if accounted_at is None:
			accounted_at = now

	_accrue_after_hours_waste(device, accounted_at, now)
	_ACCOUNTED_AT[device_id] = now


def _to_datetime(value: str) -> datetime | None:
	try:
		return datetime.fromisoformat(value)
	except (TypeError, ValueError):
		return None


def _accrue_all(now: datetime | None = None) -> None:
	current_time = (now or datetime.now()).replace(microsecond=0)
	for device in _DEVICES:
		_accrue_device_until(device, current_time)


def _format_waste_day(day: date) -> dict:
	day_key = _date_key(day)
	room_source = _AFTER_HOURS_WATT_SECONDS.get(day_key, {})
	rooms: dict[str, dict] = {}
	total_watt_seconds = 0.0

	for room in ROOM_NAMES:
		device_source = room_source.get(room, {})
		devices = {
			device_id: round(watt_seconds / 3600, 3)
			for device_id, watt_seconds in sorted(device_source.items())
			if watt_seconds > 0
		}
		room_watt_seconds = sum(device_source.values())
		total_watt_seconds += room_watt_seconds
		rooms[room] = {
			"watt_hours": round(room_watt_seconds / 3600, 3),
			"devices": devices,
		}

	return {
		"date": day_key,
		"watt_hours": round(total_watt_seconds / 3600, 3),
		"kwh": round(total_watt_seconds / 3_600_000, 4),
		"rooms": rooms,
	}


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


def get_waste_summary(now: datetime | None = None) -> dict:
	"""Return after-hours energy waste totals accumulated by the shared backend."""

	current_time = (now or datetime.now()).replace(microsecond=0)
	with _STATE_LOCK:
		_accrue_all(current_time)
		yesterday = current_time.date() - timedelta(days=1)

		return {
			"office_hours": {
				"start_hour": OFFICE_START_HOUR,
				"end_hour": OFFICE_END_HOUR,
			},
			"previous_day": _format_waste_day(yesterday),
			"today": _format_waste_day(current_time.date()),
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
			_accrue_device_until(device, datetime.now().replace(microsecond=0))
			return True

		now = datetime.now().replace(microsecond=0)
		_accrue_device_until(device, now)
		device["status"] = normalized_status
		device["power_watts"] = _power_for(device, normalized_status)
		device["last_changed"] = now.isoformat()
		_ACCOUNTED_AT[device_id] = now
		return True


def toggle_device(device_id: str) -> bool:
	"""Flip a device between on and off."""

	with _STATE_LOCK:
		device = _find_device(device_id)
		if device is None:
			return False

		now = datetime.now().replace(microsecond=0)
		_accrue_device_until(device, now)
		new_status = "off" if device["status"] == "on" else "on"
		device["status"] = new_status
		device["power_watts"] = _power_for(device, new_status)
		device["last_changed"] = now.isoformat()
		_ACCOUNTED_AT[device_id] = now
		return True

