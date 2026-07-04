import { useMemo } from "react";
import type { ConnectionState, Device } from "../types/device";

type ConnectionStatusProps = {
  connectionState: ConnectionState;
  devices: Device[];
  snapshotArrivedAt: number | null;
};

const stateStyles: Record<ConnectionState, string> = {
  connected: "bg-emerald-400 text-emerald-200",
  reconnecting: "bg-amber-400 text-amber-200",
  polling: "bg-slate-400 text-slate-300",
};

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null) {
    return "Waiting for first snapshot";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function ConnectionStatus({
  connectionState,
  devices,
  snapshotArrivedAt,
}: ConnectionStatusProps) {
  const lastUpdatedAt = useMemo(() => {
    const latestDeviceChange = devices.reduce<number | null>((latest, device) => {
      const changedAt = Date.parse(device.last_changed);

      if (Number.isNaN(changedAt)) {
        return latest;
      }

      return latest === null ? changedAt : Math.max(latest, changedAt);
    }, null);

    return latestDeviceChange ?? snapshotArrivedAt;
  }, [devices, snapshotArrivedAt]);

  return (
    <header className="glass-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-50">
          LumaWarden
        </h1>
        <p
          className={`mt-1 text-sm text-slate-400 ${
            lastUpdatedAt === null ? "animate-pulse" : ""
          }`}
        >
          Last updated {formatTimestamp(lastUpdatedAt)}
        </p>
      </div>

      <div
        className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700/70 bg-slate-950/55 px-3 py-2 text-sm backdrop-blur"
        aria-label={`Connection status: ${connectionState}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${stateStyles[connectionState]}`}
          aria-hidden="true"
        />
        <span className={stateStyles[connectionState]}>{connectionState}</span>
      </div>
    </header>
  );
}
