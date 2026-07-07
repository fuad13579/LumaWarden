"""Shared data models for devices, usage, alerts, and snapshots.

These TypedDicts document the JSON contract used throughout the project. They
do not add runtime behavior; they exist so backend functions, frontend types,
and bot payload handling all speak the same shape of data.
"""

from __future__ import annotations

from typing import Literal, TypedDict

# These aliases keep the rest of the backend type-safe while still using plain
# JSON-friendly dictionaries. The project intentionally stays on simple dict
# payloads because the API surface is small and easy to serialize.
DeviceStatus = Literal["on", "off"]
DeviceType = Literal["fan", "light"]


class Device(TypedDict):
	# A single device record in the shared in-memory store and API responses.
	# Example:
	# {
	#   "id": "work1_fan_1",
	#   "name": "Fan 1",
	#   "room": "Work Room 1",
	#   "type": "fan",
	#   "status": "on",
	#   "power_watts": 60,
	#   "last_changed": "2026-07-03T14:30:00"
	# }
	id: str
	name: str
	room: str
	type: DeviceType
	status: DeviceStatus
	power_watts: int
	last_changed: str


class Usage(TypedDict):
	# Aggregated wattage for the full office and each room.
	# This is the compact structure consumed by the header and power meter.
	total_watts: int
	rooms: dict[str, int]


class Alert(TypedDict):
	# Alert payloads are also plain dictionaries so they can be serialized directly.
	# The frontend and bot only need the alert metadata and message text.
	id: str
	type: str
	severity: str
	message: str
	room: str
	device_id: str | None
	created_at: str


class Snapshot(TypedDict):
	# The backend returns this combined snapshot to the dashboard and Discord bot.
	# This is the primary read model used by the whole project.
	devices: list[Device]
	usage: Usage
	alerts: list[Alert]


__all__ = [
	"DeviceStatus",
	"DeviceType",
	"Device",
	"Usage",
	"Alert",
	"Snapshot",
]
