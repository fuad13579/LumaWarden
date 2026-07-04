import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "bot"))

from messages import format_alarm, format_summary, format_usage, get_personality, normalize_room_name


class BotMessagesTests(unittest.TestCase):
    def test_normalize_room_name_accepts_short_aliases(self):
        self.assertEqual(normalize_room_name("work1"), "Work Room 1")
        self.assertEqual(normalize_room_name("night owl"), "Work Room 2")
        self.assertEqual(normalize_room_name("missing"), None)

    def test_format_alarm_groups_after_hours_devices_by_room(self):
        snapshot = {
            "devices": [
                {
                    "id": "work1_fan_1",
                    "name": "Fan 1",
                    "room": "Work Room 1",
                    "type": "fan",
                    "status": "on",
                    "power_watts": 60,
                },
                {
                    "id": "work1_light_1",
                    "name": "Light 1",
                    "room": "Work Room 1",
                    "type": "light",
                    "status": "on",
                    "power_watts": 15,
                },
            ],
            "alerts": [
                {"type": "after_hours", "device_id": "work1_fan_1"},
                {"type": "after_hours", "device_id": "work1_light_1"},
            ],
        }

        signature, message = format_alarm(snapshot, get_personality("warden"))

        self.assertEqual(signature, "work1_fan_1,work1_light_1")
        self.assertIn("Work Room 1", message)
        self.assertIn("Fan 1, Light 1", message)

    def test_format_usage_includes_today_after_hours_waste(self):
        snapshot = {
            "usage": {
                "total_watts": 75,
                "rooms": {
                    "Drawing Room": 15,
                    "Work Room 1": 60,
                    "Work Room 2": 0,
                },
            }
        }
        summary = {"today": {"kwh": 0.125}}

        message = format_usage(snapshot, summary, get_personality("minimal"))

        self.assertIn("Current total: 75W", message)
        self.assertIn("0.1250 kWh", message)

    def test_format_summary_reports_previous_day_waste(self):
        summary = {
            "previous_day": {
                "date": "2026-07-03",
                "watt_hours": 360.0,
                "kwh": 0.36,
                "rooms": {
                    "Drawing Room": {"watt_hours": 360.0, "devices": {"drawing_fan_1": 360.0}},
                    "Work Room 1": {"watt_hours": 0.0, "devices": {}},
                    "Work Room 2": {"watt_hours": 0.0, "devices": {}},
                },
            }
        }

        message = format_summary(summary, get_personality("boss"))

        self.assertIn("2026-07-03", message)
        self.assertIn("0.3600 kWh", message)
        self.assertIn("Top waste room: Drawing Room", message)


if __name__ == "__main__":
    unittest.main()
