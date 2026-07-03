import asyncio
import importlib
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import backend.main as main_module
import backend.store as store_module


class MainAppTests(unittest.TestCase):
    def setUp(self):
        self.store = importlib.reload(store_module)
        self.main = importlib.reload(main_module)

    def test_rest_endpoints_return_store_data(self):
        with patch.object(self.main, "run_simulator", new=AsyncMock(return_value=None)):
            with TestClient(self.main.app) as client:
                self.assertEqual(client.get("/api/snapshot").status_code, 200)
                self.assertEqual(len(client.get("/api/devices").json()), 15)
                self.assertEqual(client.get("/api/usage").json()["total_watts"], 0)
                self.assertEqual(client.get("/api/alerts").json(), [])
                self.assertEqual(client.get("/health").json(), {"status": "ok"})

    def test_websocket_receives_initial_snapshot(self):
        with patch.object(self.main, "run_simulator", new=AsyncMock(return_value=None)):
            with TestClient(self.main.app) as client:
                with client.websocket_connect("/ws") as websocket:
                    snapshot = websocket.receive_json()

        self.assertEqual(set(snapshot.keys()), {"devices", "usage", "alerts"})
        self.assertEqual(len(snapshot["devices"]), 15)

    def test_broadcast_snapshot_removes_failed_clients(self):
        class GoodClient:
            def __init__(self):
                self.payloads = []

            async def send_json(self, payload):
                self.payloads.append(payload)

        class BadClient:
            async def send_json(self, payload):
                raise RuntimeError("client failed")

        good_client = GoodClient()
        bad_client = BadClient()
        self.main.app.state.connected_clients = {good_client, bad_client}

        asyncio.run(self.main.broadcast_snapshot({"hello": "world"}))

        self.assertEqual(good_client.payloads, [{"hello": "world"}])
        self.assertEqual(self.main.app.state.connected_clients, {good_client})

    def test_ensure_simulator_task_does_not_duplicate_active_task(self):
        class ActiveTask:
            def done(self):
                return False

        async def exercise_guard():
            self.main.app.state.simulator_task = ActiveTask()
            with patch.object(self.main.asyncio, "create_task") as create_task:
                self.main._ensure_simulator_task(self.main.app)
                create_task.assert_not_called()

        asyncio.run(exercise_guard())


if __name__ == "__main__":
    unittest.main()