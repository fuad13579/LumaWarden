import { useMemo } from "react";
import type { ConnectionState, Device } from "../types/device";

type ConnectionStatusProps = {
  connectionState: ConnectionState;
  devices: Device[];
  snapshotArrivedAt: number | null;
};

const stateConfig: Record<
  ConnectionState,
  { dot: string; label: string; badge: string }
> = {
  connected: {
    dot: "bg-accent-power",
    label: "text-accent-power",
    badge: "border-accent-power/25 bg-accent-power/8",
  },
  reconnecting: {
    dot: "bg-accent-light",
    label: "text-accent-light",
    badge: "border-accent-light/25 bg-accent-light/8",
  },
  polling: {
    dot: "bg-text-secondary",
    label: "text-text-secondary",
    badge: "border-white/10 bg-bg-surface/60",
  },
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

  const config = stateConfig[connectionState];
  const isLive = connectionState === "connected";

  return (
    <header className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="panel-label">Live telemetry</p>
        <p
          className={`mt-2 text-sm text-text-secondary ${
            lastUpdatedAt === null ? "animate-pulse" : ""
          }`}
        >
          Last updated <span className="font-data text-text-primary/90">{formatTimestamp(lastUpdatedAt)}</span>
        </p>
      </div>

      <div
        className={`inline-flex w-fit items-center gap-3 rounded-full border px-4 py-2.5 shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-sm ${config.badge}`}
        aria-label={`Connection status: ${connectionState}`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot} ${
              isLive ? "live-indicator" : ""
            }`}
            aria-hidden="true"
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`}
            aria-hidden="true"
          />
        </span>
        <span className={`text-sm font-semibold capitalize tracking-[0.02em] ${config.label}`}>
          {connectionState}
        </span>
      </div>
    </header>
  );
}
