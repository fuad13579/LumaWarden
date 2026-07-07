"""In-memory device store and snapshot helpers.

This module is the shared state engine for the project.

It intentionally avoids a database because the hackathon requirements only need
one source of truth during a single process lifetime. The store is responsible
for four things:

1. Building the fixed 15-device office inventory.
2. Mutating device state in a thread-safe way.
3. Calculating current wattage and accumulated energy summaries.
4. Handing the API layer a clean JSON-ready snapshot.

The frontend and Discord bot never write directly to this module; they only read
the values exposed by the API.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from threading import Lock

from backend.alerts import OFFICE_END_HOUR, OFFICE_START_HOUR, calculate_alerts

ROOM_NAMES = ("Drawing Room", "Work Room 1", "Work Room 2")
FAN_WATTAGE = 60
LIGHT_WATTAGE = 15

# Device ids are generated from the room prefix plus the device type and index
# so they remain stable across refreshes, simulator ticks, and bot commands.
_ROOM_PREFIXES = {
	"Drawing Room": "drawing",
	"Work Room 1": "work1",
	"Work Room 2": "work2",
}

# Each room has the same 5-device layout: 2 fans and 3 lights.
# Keeping the layout declarative makes the fixed office easy to audit.
_DEVICE_LAYOUT = (
	("fan", "Fan", 2, FAN_WATTAGE),
	("light", "Light", 3, LIGHT_WATTAGE),
)

_STATE_LOCK = Lock()


def _make_device(device_id: str, name: str, room: str, device_type: str, power_watts: int) -> dict:
	"""Build a single device record.

	`power_watts` is the rating used when the device is ON. The live
	`power_watts` field in the returned record starts at 0 because the entire
	office begins in an OFF state.
	"""

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
	"""Create the fixed 15-device office inventory.

	The function loops room-by-room so the room naming and device numbering stay
	simple and predictable:
	- Drawing Room -> drawing_fan_1, drawing_fan_2, drawing_light_1...
	- Work Room 1 -> work1_fan_1...
	- Work Room 2 -> work2_fan_1...
	"""

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


# The store starts with a deterministic, fully off snapshot so every run begins
# from the same state and the simulator can build up changes from there.
_DEVICES = _build_initial_devices()
_ACCOUNTED_AT = {device["id"]: datetime.fromisoformat(device["last_changed"]) for device in _DEVICES}
# Energy is tracked in watt-seconds rather than kWh so the store can accumulate
# partial intervals precisely before converting to display-friendly units.
_AFTER_HOURS_WATT_SECONDS: dict[str, dict[str, dict[str, float]]] = {}
_DAILY_WATT_SECONDS: dict[str, dict[str, dict[str, float]]] = {}


def _copy_device(device: dict) -> dict:
	"""Return a shallow copy so callers cannot mutate the shared store in place."""
	return dict(device)


def _copy_alert(alert: dict) -> dict:
	"""Return a copy for the same reason as `_copy_device`."""
	return dict(alert)


def _normalize_status(status: str) -> str | None:
	"""Accept only the two supported device states.

	Any invalid input is rejected instead of being coerced so the simulator and
	the API remain strict about what a device can do.
	"""

	normalized = status.strip().lower()
	if normalized in {"on", "off"}:
		return normalized
	return None


def _power_for(device: dict, status: str) -> int:
	"""Map a device state to its current watt draw.

	Fans and lights have different ratings, but both follow the same pattern:
	OFF -> 0W, ON -> rated wattage.
	"""

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


def _room_bucket(store: dict[str, dict[str, dict[str, float]]], day: date, room: str) -> dict[str, float]:
	"""Return the nested bucket that stores energy for one room on one day."""

	day_key = _date_key(day)
	day_bucket = store.setdefault(day_key, {})
	return day_bucket.setdefault(room, {})


def _add_energy(store: dict[str, dict[str, dict[str, float]]], device: dict, day: date, seconds: float) -> None:
	"""Accumulate watt-seconds for a device over a time window.

	We multiply the device wattage by the number of seconds it stayed ON during a
	period. Later, the summary helpers convert these totals to Wh and kWh for
	display. This keeps the bookkeeping precise even when the simulator tick spans
	fractional hours.
	"""

	if seconds <= 0:
		return

	room_bucket = _room_bucket(store, day, device["room"])
	room_bucket[device["id"]] = room_bucket.get(device["id"], 0.0) + int(device["power_watts"]) * seconds


def _overlap_seconds(start: datetime, end: datetime, window_start: datetime, window_end: datetime) -> float:
	"""Return the overlap between two time intervals in seconds."""

	overlap_start = max(start, window_start)
	overlap_end = min(end, window_end)
	if overlap_end <= overlap_start:
		return 0.0
	return (overlap_end - overlap_start).total_seconds()


def _accrue_after_hours_waste(device: dict, start: datetime, end: datetime) -> None:
	"""Record after-hours energy for one ON device over a time interval.

	Only the time windows before 9 AM and after 5 PM count as waste. The helper
	splits multi-day ranges so the summary remains correct across midnight.
	"""

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

		_add_energy(_AFTER_HOURS_WATT_SECONDS, device, current_day, _overlap_seconds(start, end, morning_start, morning_end))
		_add_energy(_AFTER_HOURS_WATT_SECONDS, device, current_day, _overlap_seconds(start, end, evening_start, evening_end))

		current_day += timedelta(days=1)


def _accrue_daily_energy(device: dict, start: datetime, end: datetime) -> None:
	"""Record total energy for one ON device over a time interval.

	This supports the dashboard's "Today's kWh" card. Unlike after-hours waste,
	this measures all ON time during the day so the backend can display a
	session-style energy estimate without frontend math.
	"""

	if end <= start or device["status"] != "on":
		return

	current_day = start.date()
	last_day = end.date()

	while current_day <= last_day:
		day_start = datetime.combine(current_day, time.min)
		day_end = day_start + timedelta(days=1)
		_add_energy(_DAILY_WATT_SECONDS, device, current_day, _overlap_seconds(start, end, day_start, day_end))
		current_day += timedelta(days=1)


def _accrue_device_until(device: dict, now: datetime) -> None:
	"""Advance one device's accounting cursor to `now`.

	Every state change updates the accounting cursor, so the store never double
	counts energy when the simulator toggles a device or when a caller repeats an
	update with the same state.
	"""

	device_id = device["id"]
	accounted_at = _ACCOUNTED_AT.get(device_id)
	if accounted_at is None:
		accounted_at = _to_datetime(device["last_changed"])
		if accounted_at is None:
			accounted_at = now

	_accrue_daily_energy(device, accounted_at, now)
	_accrue_after_hours_waste(device, accounted_at, now)
	_ACCOUNTED_AT[device_id] = now


def _to_datetime(value: str) -> datetime | None:
	try:
		return datetime.fromisoformat(value)
	except (TypeError, ValueError):
		return None


def _accrue_all(now: datetime | None = None) -> None:
	"""Advance accounting for every device in the store."""

	current_time = (now or datetime.now()).replace(microsecond=0)
	for device in _DEVICES:
		_accrue_device_until(device, current_time)


def _format_waste_day(day: date) -> dict:
	"""Serialize one day of after-hours waste into the response structure."""

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


def _format_total_day(day: date) -> dict:
	"""Serialize one day of total ON-time energy into the response structure."""

	day_key = _date_key(day)
	room_source = _DAILY_WATT_SECONDS.get(day_key, {})
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
	"""Return a copy of the current device list.

	Callers receive copies so they can render the data without risking accidental
	mutation of the shared in-memory source of truth.
	"""

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
	"""Compute alerts from the current device snapshot.

	Alert generation is stateless from the caller's perspective: every request
	re-evaluates the current snapshot so the API always reflects the live office.
	"""

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


def get_waste_summary(now: datetime | None = None, dashboard_loaded_at: datetime | None = None) -> dict:
	"""Return after-hours energy waste totals accumulated by the shared backend.

	The summary payload intentionally carries two related metrics:
	- `previous_day` / `today` for backend-tracked waste totals
	- `dashboard_estimate_kwh` for the session-based figure shown in the UI

	That lets the frontend show the numbers without doing any business logic of
	its own, while still preserving the "since dashboard opened" UX.
	"""

	current_time = (now or datetime.now()).replace(microsecond=0)
	with _STATE_LOCK:
		_accrue_all(current_time)
		yesterday = current_time.date() - timedelta(days=1)
		total_watts = sum(int(device["power_watts"]) for device in _DEVICES)
		estimated_kwh = 0.0
		if dashboard_loaded_at is not None:
			loaded_at = dashboard_loaded_at.replace(microsecond=0)
			elapsed_hours = max((current_time - loaded_at).total_seconds() / 3600, 0.0)
			estimated_kwh = round((total_watts / 1000) * elapsed_hours, 4)

		return {
			"office_hours": {
				"start_hour": OFFICE_START_HOUR,
				"end_hour": OFFICE_END_HOUR,
			},
			"previous_day": _format_waste_day(yesterday),
			"today": _format_waste_day(current_time.date()),
			"today_usage": _format_total_day(current_time.date()),
			"dashboard_estimate_kwh": estimated_kwh,
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
	"""Flip a device between on and off.

	The simulator uses this helper so all accounting rules stay in one place.
	"""

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

