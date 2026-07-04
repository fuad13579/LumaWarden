"""Rule-based response personalities for the LumaWarden Discord bot."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any

ROOM_ALIASES = {
	"drawing": "Drawing Room",
	"drawing room": "Drawing Room",
	"guest": "Drawing Room",
	"guest zone": "Drawing Room",
	"work1": "Work Room 1",
	"work 1": "Work Room 1",
	"work room 1": "Work Room 1",
	"focus": "Work Room 1",
	"focus bay": "Work Room 1",
	"work2": "Work Room 2",
	"work 2": "Work Room 2",
	"work room 2": "Work Room 2",
	"night": "Work Room 2",
	"night owl": "Work Room 2",
}


@dataclass(frozen=True)
class Personality:
	name: str
	status_intro: str
	room_intro: str
	usage_intro: str
	summary_intro: str
	alarm_intro: str
	no_alarm: str


PERSONALITIES = {
	"warden": Personality(
		name="warden",
		status_intro="LumaWarden sweep complete.",
		room_intro="Room check complete.",
		usage_intro="Power reading is in.",
		summary_intro="Yesterday's after-hours waste report is ready.",
		alarm_intro="After-hours alarm: these devices are still ON.",
		no_alarm="No after-hours devices are ON right now.",
	),
	"boss": Personality(
		name="boss",
		status_intro="Boss-view snapshot, minus the spreadsheet headache.",
		room_intro="I checked the room like the bill depends on it.",
		usage_intro="Current bill pressure reading.",
		summary_intro="Yesterday's energy leak report.",
		alarm_intro="Office lights-out audit failed. These devices are still ON.",
		no_alarm="Clean exit. Nothing is burning power after hours.",
	),
	"minimal": Personality(
		name="minimal",
		status_intro="Office status.",
		room_intro="Room status.",
		usage_intro="Usage.",
		summary_intro="Previous day summary.",
		alarm_intro="After-hours devices ON.",
		no_alarm="No after-hours alerts.",
	),
}


def normalize_room_name(value: str) -> str | None:
	normalized = " ".join(value.strip().lower().split())
	return ROOM_ALIASES.get(normalized)


def get_personality(name: str | None) -> Personality:
	if not name:
		return PERSONALITIES["warden"]
	return PERSONALITIES.get(name.strip().lower(), PERSONALITIES["warden"])


def _devices_by_room(devices: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
	grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
	for device in devices:
		grouped[str(device.get("room", "Unknown"))].append(device)
	return dict(grouped)


def _on_devices(devices: list[dict[str, Any]]) -> list[dict[str, Any]]:
	return [device for device in devices if str(device.get("status", "")).lower() == "on"]


def _room_line(room: str, devices: list[dict[str, Any]]) -> str:
	on_devices = _on_devices(devices)
	counts = Counter(str(device.get("type", "device")) for device in on_devices)
	total_watts = sum(int(device.get("power_watts", 0)) for device in devices)

	if not on_devices:
		return f"{room}: all off, 0W"

	parts = []
	if counts["fan"]:
		parts.append(f"{counts['fan']} fan{'s' if counts['fan'] != 1 else ''} ON")
	if counts["light"]:
		parts.append(f"{counts['light']} light{'s' if counts['light'] != 1 else ''} ON")

	return f"{room}: {', '.join(parts)}, {total_watts}W"


def _device_list(devices: list[dict[str, Any]]) -> str:
	if not devices:
		return "No devices are ON."
	return ", ".join(str(device.get("name", device.get("id", "Device"))) for device in devices)


def format_status(snapshot: dict[str, Any], personality: Personality) -> str:
	devices = list(snapshot.get("devices", []))
	usage = snapshot.get("usage", {})
	grouped = _devices_by_room(devices)
	on_count = len(_on_devices(devices))
	total_count = len(devices)
	total_watts = int(usage.get("total_watts", 0))

	lines = [
		personality.status_intro,
		f"{on_count}/{total_count} devices ON, drawing {total_watts}W.",
	]
	for room in sorted(grouped):
		lines.append(_room_line(room, grouped[room]))

	alerts = snapshot.get("alerts", [])
	if alerts:
		lines.append(f"Active alerts: {len(alerts)}")

	return "\n".join(lines)


def format_room(snapshot: dict[str, Any], room: str, personality: Personality) -> str:
	devices = [device for device in snapshot.get("devices", []) if device.get("room") == room]
	if not devices:
		return f"I could not find `{room}` in the office map."

	on_devices = _on_devices(devices)
	lines = [
		personality.room_intro,
		_room_line(room, devices),
		f"Currently ON: {_device_list(on_devices)}",
	]
	return "\n".join(lines)


def format_usage(snapshot: dict[str, Any], summary: dict[str, Any], personality: Personality) -> str:
	usage = snapshot.get("usage", {})
	rooms = usage.get("rooms", {})
	today = summary.get("today", {})

	lines = [
		personality.usage_intro,
		f"Current total: {int(usage.get('total_watts', 0))}W",
	]
	for room in sorted(rooms):
		lines.append(f"{room}: {int(rooms[room])}W")
	lines.append(f"After-hours waste tracked today: {float(today.get('kwh', 0)):0.4f} kWh")

	return "\n".join(lines)


def format_summary(summary: dict[str, Any], personality: Personality) -> str:
	previous_day = summary.get("previous_day", {})
	rooms = previous_day.get("rooms", {})
	room_rows = []

	for room, data in rooms.items():
		watt_hours = float(data.get("watt_hours", 0))
		if watt_hours > 0:
			room_rows.append((room, watt_hours))

	lines = [
		personality.summary_intro,
		f"Date: {previous_day.get('date', 'unknown')}",
		f"Energy wasted after work hours: {float(previous_day.get('kwh', 0)):0.4f} kWh ({float(previous_day.get('watt_hours', 0)):0.1f} Wh)",
	]

	if room_rows:
		room_rows.sort(key=lambda item: item[1], reverse=True)
		lines.append(f"Top waste room: {room_rows[0][0]} at {room_rows[0][1]:0.1f} Wh")
		for room, watt_hours in room_rows:
			lines.append(f"{room}: {watt_hours:0.1f} Wh")
	else:
		lines.append("No after-hours waste was recorded for the previous day.")

	return "\n".join(lines)


def format_alarm(snapshot: dict[str, Any], personality: Personality) -> tuple[str | None, str]:
	alert_device_ids = {
		alert.get("device_id")
		for alert in snapshot.get("alerts", [])
		if alert.get("type") == "after_hours" and alert.get("device_id")
	}
	if not alert_device_ids:
		return None, personality.no_alarm

	devices = [
		device
		for device in snapshot.get("devices", [])
		if device.get("id") in alert_device_ids and str(device.get("status", "")).lower() == "on"
	]
	grouped = _devices_by_room(devices)
	signature = ",".join(sorted(str(device.get("id")) for device in devices))

	lines = [personality.alarm_intro]
	for room in sorted(grouped):
		room_devices = grouped[room]
		watts = sum(int(device.get("power_watts", 0)) for device in room_devices)
		lines.append(f"{room}: {_device_list(room_devices)} ({watts}W)")

	return signature, "\n".join(lines)
