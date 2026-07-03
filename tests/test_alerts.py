import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.alerts import calculate_alerts


class CalculateAlertsTests(unittest.TestCase):
    def _room_devices(self, room: str, base_time: str = "2026-07-03T14:30:00", status: str = "on"):
        room_prefix_map = {
            "Drawing Room": "drawing",
            "Work Room 1": "work1",
            "Work Room 2": "work2",
        }
        device_prefix = room_prefix_map[room]
        return [
            {
                "id": f"{device_prefix}_fan_1",
                "name": "Fan 1",
                "room": room,
                "type": "fan",
                "status": status,
                "power_watts": 60,
                "last_changed": base_time,
            },
            {
                "id": f"{device_prefix}_fan_2",
                "name": "Fan 2",
                "room": room,
                "type": "fan",
                "status": status,
                "power_watts": 60,
                "last_changed": base_time,
            },
            {
                "id": f"{device_prefix}_light_1",
                "name": "Light 1",
                "room": room,
                "type": "light",
                "status": status,
                "power_watts": 15,
                "last_changed": base_time,
            },
            {
                "id": f"{device_prefix}_light_2",
                "name": "Light 2",
                "room": room,
                "type": "light",
                "status": status,
                "power_watts": 15,
                "last_changed": base_time,
            },
            {
                "id": f"{device_prefix}_light_3",
                "name": "Light 3",
                "room": room,
                "type": "light",
                "status": status,
                "power_watts": 15,
                "last_changed": base_time,
            },
        ]

    def test_empty_input_returns_empty_list(self):
        self.assertEqual(calculate_alerts([]), [])

    def test_after_hours_creates_one_alert_per_on_device(self):
        devices = self._room_devices("Work Room 1", base_time="2026-07-03T16:30:00")
        alerts = calculate_alerts(devices, now=datetime(2026, 7, 3, 18, 0, 0))

        self.assertEqual(len(alerts), 5)
        self.assertTrue(all(alert["type"] == "after_hours" for alert in alerts))
        self.assertEqual(alerts[0]["id"], "after_hours_work1_fan_1")
        self.assertEqual(alerts[0]["device_id"], "work1_fan_1")
        self.assertEqual(alerts[0]["created_at"], "2026-07-03T18:00:00")

    def test_long_running_room_creates_single_room_alert(self):
        devices = self._room_devices("Work Room 1", base_time="2026-07-03T14:30:00")
        alerts = calculate_alerts(devices, now=datetime(2026, 7, 3, 16, 31, 0))

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["type"], "long_running_room")
        self.assertEqual(alerts[0]["room"], "Work Room 1")
        self.assertIsNone(alerts[0]["device_id"])
        self.assertEqual(alerts[0]["id"], "long_running_room_work_room_1")

    def test_invalid_timestamp_is_ignored_for_room_alerts(self):
        devices = self._room_devices("Work Room 1")
        devices[0]["last_changed"] = "not-a-timestamp"
        alerts = calculate_alerts(devices, now=datetime(2026, 7, 3, 16, 31, 0))

        self.assertEqual(alerts, [])

    def test_only_three_room_layout_is_supported_without_hardcoded_ids(self):
        devices = []
        devices.extend(self._room_devices("Drawing Room", base_time="2026-07-03T16:30:00"))
        devices.extend(self._room_devices("Work Room 1", base_time="2026-07-03T16:30:00"))
        devices.extend(self._room_devices("Work Room 2", base_time="2026-07-03T16:30:00"))

        alerts = calculate_alerts(devices, now=datetime(2026, 7, 3, 18, 0, 0))

        self.assertEqual(len(alerts), 15)
        self.assertTrue(any(alert["id"] == "after_hours_drawing_fan_1" for alert in alerts))
        self.assertTrue(any(alert["id"] == "after_hours_work1_fan_1" for alert in alerts))
        self.assertTrue(any(alert["id"] == "after_hours_work2_fan_1" for alert in alerts))


if __name__ == "__main__":
    unittest.main()
