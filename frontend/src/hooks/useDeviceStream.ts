import { useEffect, useRef, useState } from "react";
import { getApiBaseUrl, getSnapshot } from "../services/api";
import type { Alert, ConnectionState, Device, Snapshot, Usage } from "../types/device";

type DeviceStreamState = {
  devices: Device[];
  usage: Usage | null;
  alerts: Alert[];
  connectionState: ConnectionState;
  error: string | null;
};

// The stream starts with WebSocket, then falls back to polling if the socket
// closes. These values keep the UI responsive without hammering the backend.
const POLL_INTERVAL_MS = 5_000;
const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 15_000;

function getWebSocketUrl(baseUrl: string): string {
  // Convert the configured HTTP(S) backend URL into its WebSocket equivalent.
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseSnapshot(payload: string): Snapshot | null {
  // The backend always sends JSON snapshots; invalid payloads are rejected.
  try {
    return JSON.parse(payload) as Snapshot;
  } catch {
    return null;
  }
}

export function useDeviceStream(): DeviceStreamState {
  const [state, setState] = useState<DeviceStreamState>({
    devices: [],
    usage: null,
    alerts: [],
    connectionState: "reconnecting",
    error: null,
  });

  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const clearReconnectTimer = () => {
      // Prevent stale reconnect attempts after the component unmounts.
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const stopPolling = () => {
      // Polling is only a fallback. Once the socket is healthy, we stop it.
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const applySnapshot = (snapshot: Snapshot) => {
      // Every snapshot replaces the visible dashboard state in one shot so the
      // UI remains internally consistent across devices, usage, and alerts.
      setState((current) => ({
        ...current,
        devices: snapshot.devices,
        usage: snapshot.usage,
        alerts: snapshot.alerts,
        error: null,
      }));
    };

    const pollSnapshot = async () => {
      // Fallback fetch path used while reconnecting or when the socket closes.
      const result = await getSnapshot();

      if (unmountedRef.current) {
        return;
      }

      if (result.ok) {
        applySnapshot(result.data);
        return;
      }

      setState((current) => ({ ...current, error: result.error }));
    };

    const startPolling = () => {
      // Polling keeps the UI warm while the reconnect timer is trying again.
      setState((current) => ({
        ...current,
        connectionState: "polling",
      }));

      void pollSnapshot();

      if (pollTimerRef.current === null) {
        pollTimerRef.current = window.setInterval(pollSnapshot, POLL_INTERVAL_MS);
      }
    };

    const connect = () => {
      // WebSocket is the preferred live channel because it pushes updates as
      // soon as the backend simulator changes state.
      clearReconnectTimer();
      setState((current) => ({ ...current, connectionState: "reconnecting" }));

      const socket = new WebSocket(getWebSocketUrl(getApiBaseUrl()));
      socketRef.current = socket;

      socket.onopen = () => {
        // A live socket means we can stop polling and reset the backoff timer.
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        stopPolling();
        setState((current) => ({
          ...current,
          connectionState: "connected",
          error: null,
        }));
      };

      socket.onmessage = (event) => {
        // The backend sends the same snapshot shape as the REST endpoint.
        const snapshot = parseSnapshot(event.data);

        if (snapshot === null) {
          setState((current) => ({
            ...current,
            error: "Received an invalid snapshot from the device stream.",
          }));
          return;
        }

        applySnapshot(snapshot);
      };

      socket.onerror = () => {
        // The UI exposes a small error banner when live transport fails.
        setState((current) => ({
          ...current,
          error: "Device stream connection failed.",
        }));
      };

      socket.onclose = () => {
        if (unmountedRef.current) {
          return;
        }

        // After a disconnect we keep the dashboard alive by switching to
        // polling and scheduling reconnect attempts with exponential backoff.
        startPolling();

        // When the read-only WebSocket drops, keep the dashboard fresh through
        // polling while scheduling reconnect attempts with exponential backoff.
        // The delay starts at 2s and doubles up to 15s so a down backend is not
        // hammered, but a recovered backend is picked up without a full reload.
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      // Clean shutdown prevents memory leaks and stale sockets during hot reload.
      unmountedRef.current = true;
      clearReconnectTimer();
      stopPolling();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  return state;
}
