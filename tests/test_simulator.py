import asyncio
import importlib
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import backend.simulator as simulator_module
import backend.store as store_module


class SimulatorTests(unittest.TestCase):
    def setUp(self):
        self.store = importlib.reload(store_module)
        self.simulator = importlib.reload(simulator_module)

    def test_run_tick_toggles_devices_and_broadcasts_snapshot(self):
        broadcast_snapshot = AsyncMock()
        devices = self.store.get_devices()
        selected_devices = devices[:2]

        with patch.object(self.simulator.random, "randint", return_value=2), patch.object(
            self.simulator.random, "sample", return_value=selected_devices
        ):
            asyncio.run(self.simulator._run_tick(broadcast_snapshot))

        self.assertEqual(broadcast_snapshot.await_count, 1)
        snapshot = broadcast_snapshot.await_args.args[0]
        self.assertEqual(snapshot["usage"]["rooms"]["Drawing Room"], 120)
        changed_ids = {device["id"] for device in snapshot["devices"] if device["status"] == "on"}
        self.assertEqual(changed_ids, {"drawing_fan_1", "drawing_fan_2"})

    def test_run_simulator_re_raises_cancelled_error(self):
        broadcast_snapshot = AsyncMock()

        async def cancel_sleep(*args, **kwargs):
            raise asyncio.CancelledError()

        with patch.object(self.simulator.asyncio, "sleep", side_effect=cancel_sleep):
            with self.assertRaises(asyncio.CancelledError):
                asyncio.run(self.simulator.run_simulator(broadcast_snapshot))


if __name__ == "__main__":
    unittest.main()