import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import backend.models as models


class ModelsTests(unittest.TestCase):
    def test_device_status_and_type_literals(self):
        self.assertEqual(models.DeviceStatus.__args__, ("on", "off"))
        self.assertEqual(models.DeviceType.__args__, ("fan", "light"))

    def test_shared_type_shapes(self):
        self.assertEqual(
            set(models.Device.__annotations__.keys()),
            {"id", "name", "room", "type", "status", "power_watts", "last_changed"},
        )
        self.assertEqual(set(models.Usage.__annotations__.keys()), {"total_watts", "rooms"})
        self.assertEqual(
            set(models.Alert.__annotations__.keys()),
            {"id", "type", "severity", "message", "room", "device_id", "created_at"},
        )
        self.assertEqual(set(models.Snapshot.__annotations__.keys()), {"devices", "usage", "alerts"})

    def test_models_module_import_has_no_side_effects(self):
        self.assertTrue(hasattr(models, "Device"))
        self.assertTrue(hasattr(models, "Snapshot"))


if __name__ == "__main__":
    unittest.main()