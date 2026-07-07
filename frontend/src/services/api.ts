import type { Alert, Device, Snapshot, Usage, WasteSummary } from "../types/device";

// The frontend never hardcodes live data. This module is the narrow bridge to
// the shared backend and is the only place where HTTP endpoint paths are kept.
const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getJson<T>(path: string): Promise<Result<T>> {
  // A tiny result wrapper keeps UI code clean: callers can branch on `ok`
  // instead of repeating try/catch logic in every component.
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
      return {
        ok: false,
        error: `Request failed with ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network request failed",
    };
  }
}

export function getSnapshot(): Promise<Result<Snapshot>> {
  // Snapshot is the dashboard's "everything at once" payload.
  return getJson<Snapshot>("/api/snapshot");
}

export function getDevices(): Promise<Result<Device[]>> {
  // Useful for panels that want the raw inventory only.
  return getJson<Device[]>("/api/devices");
}

export function getUsage(): Promise<Result<Usage>> {
  // Used by KPI cards and the power meter.
  return getJson<Usage>("/api/usage");
}

export function getAlerts(): Promise<Result<Alert[]>> {
  // Alerts are a dedicated endpoint so the dashboard and bot can inspect them
  // without needing to reprocess the device list themselves.
  return getJson<Alert[]>("/api/alerts");
}

export function getSummary(appLoadedAt?: number): Promise<Result<WasteSummary>> {
  // The backend calculates both after-hours waste and the session estimate so
  // the frontend does not need to own any energy-accounting logic.
  const query = appLoadedAt === undefined ? "" : `?dashboard_loaded_at_ms=${appLoadedAt}`;
  return getJson<WasteSummary>(`/api/summary${query}`);
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
