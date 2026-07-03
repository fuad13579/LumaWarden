"""Shared data models for devices, usage, alerts, and snapshots."""

from __future__ import annotations

from typing import Literal, TypedDict

# These aliases keep the rest of the backend type-safe while still using plain JSON-friendly dictionaries.
DeviceStatus = Literal["on", "off"]
DeviceType = Literal["fan", "light"]


class Device(TypedDict):
	# A single device record in the shared in-memory store and API responses.
	id: str
	name: str
	room: str
	type: DeviceType
	status: DeviceStatus
	power_watts: int
	last_changed: str


class Usage(TypedDict):
	# Aggregated wattage for the full office and each room.
	total_watts: int
	rooms: dict[str, int]


class Alert(TypedDict):
	# Alert payloads are also plain dictionaries so they can be serialized directly.
	id: str
	type: str
	severity: str
	message: str
	room: str
	device_id: str | None
	created_at: str


class Snapshot(TypedDict):
	# The backend returns this combined snapshot to the dashboard and Discord bot.
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

