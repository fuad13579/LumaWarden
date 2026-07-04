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

const POLL_INTERVAL_MS = 5_000;
const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 15_000;

function getWebSocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseSnapshot(payload: string): Snapshot | null {
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
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const stopPolling = () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const applySnapshot = (snapshot: Snapshot) => {
      setState((current) => ({
        ...current,
        devices: snapshot.devices,
        usage: snapshot.usage,
        alerts: snapshot.alerts,
        error: null,
      }));
    };

    const pollSnapshot = async () => {
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
      clearReconnectTimer();
      setState((current) => ({ ...current, connectionState: "reconnecting" }));

      const socket = new WebSocket(getWebSocketUrl(getApiBaseUrl()));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        stopPolling();
        setState((current) => ({
          ...current,
          connectionState: "connected",
          error: null,
        }));
      };

      socket.onmessage = (event) => {
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
        setState((current) => ({
          ...current,
          error: "Device stream connection failed.",
        }));
      };

      socket.onclose = () => {
        if (unmountedRef.current) {
          return;
        }

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
      unmountedRef.current = true;
      clearReconnectTimer();
      stopPolling();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  return state;
}
