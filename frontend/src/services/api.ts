import type { Alert, Device, Snapshot, Usage } from "../types/device";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getJson<T>(path: string): Promise<Result<T>> {
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
  return getJson<Snapshot>("/api/snapshot");
}

export function getDevices(): Promise<Result<Device[]>> {
  return getJson<Device[]>("/api/devices");
}

export function getUsage(): Promise<Result<Usage>> {
  return getJson<Usage>("/api/usage");
}

export function getAlerts(): Promise<Result<Alert[]>> {
  return getJson<Alert[]>("/api/alerts");
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
