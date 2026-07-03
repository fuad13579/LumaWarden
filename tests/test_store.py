import importlib
import os
import sys
import unittest
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import backend.store as store_module


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.store = importlib.reload(store_module)

    def test_get_devices_returns_exactly_15_devices(self):
        devices = self.store.get_devices()

        self.assertEqual(len(devices), 15)
        self.assertEqual(devices[0]["id"], "drawing_fan_1")
        self.assertEqual(devices[-1]["id"], "work2_light_3")

    def test_get_usage_returns_expected_initial_totals(self):
        usage = self.store.get_usage()

        self.assertEqual(usage["total_watts"], 0)
        self.assertEqual(
            usage["rooms"],
            {
                "Drawing Room": 0,
                "Work Room 1": 0,
                "Work Room 2": 0,
            },
        )

    def test_get_snapshot_includes_devices_usage_and_alerts(self):
        snapshot = self.store.get_snapshot()

        self.assertEqual(set(snapshot.keys()), {"devices", "usage", "alerts"})
        self.assertEqual(len(snapshot["devices"]), 15)
        self.assertEqual(snapshot["usage"]["total_watts"], 0)
        self.assertIsInstance(snapshot["alerts"], list)

    def test_set_device_status_updates_power_and_timestamp(self):
        before = self.store.get_devices()[0]["last_changed"]

        time.sleep(1.1)

        self.assertTrue(self.store.set_device_status("drawing_fan_1", "on"))

        devices = self.store.get_devices()
        updated = next(device for device in devices if device["id"] == "drawing_fan_1")

        self.assertEqual(updated["status"], "on")
        self.assertEqual(updated["power_watts"], 60)
        self.assertNotEqual(updated["last_changed"], before)
        self.assertEqual(self.store.get_usage()["rooms"]["Drawing Room"], 60)

    def test_set_device_status_does_not_change_timestamp_when_status_is_unchanged(self):
        self.store.set_device_status("drawing_fan_1", "on")
        before = next(device for device in self.store.get_devices() if device["id"] == "drawing_fan_1")["last_changed"]

        self.assertTrue(self.store.set_device_status("drawing_fan_1", "on"))

        after = next(device for device in self.store.get_devices() if device["id"] == "drawing_fan_1")["last_changed"]

        self.assertEqual(before, after)

    def test_set_device_status_rejects_invalid_inputs(self):
        self.assertFalse(self.store.set_device_status("missing_device", "on"))
        self.assertFalse(self.store.set_device_status("drawing_fan_1", "bad-status"))

    def test_toggle_device_flips_status_and_power(self):
        self.assertTrue(self.store.toggle_device("drawing_light_1"))

        toggled = next(device for device in self.store.get_devices() if device["id"] == "drawing_light_1")

        self.assertEqual(toggled["status"], "on")
        self.assertEqual(toggled["power_watts"], 15)
        self.assertEqual(self.store.get_usage()["rooms"]["Drawing Room"], 15)

    def test_get_alerts_and_snapshot_are_copy_out_results(self):
        devices = self.store.get_devices()
        devices[0]["status"] = "on"

        self.assertEqual(self.store.get_devices()[0]["status"], "off")
        self.assertIsInstance(self.store.get_alerts(), list)


if __name__ == "__main__":
    unittest.main()