import { useEffect, useMemo, useState } from "react";
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
  // This is the absolute UTC companion to the relative "updated X ago" label.
  if (timestamp === null) {
    return "Waiting for first snapshot";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatRelativeTime(timestamp: number | null, now: number): string {
  // Relative time is easier to parse during a demo than a raw clock value.
  if (timestamp === null) {
    return "Waiting for first snapshot";
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (elapsedSeconds < 60) {
    return "Updated just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Updated ${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Updated ${elapsedDays}d ago`;
}

export function ConnectionStatus({
  connectionState,
  devices,
  snapshotArrivedAt,
}: ConnectionStatusProps) {
  // The status card updates its relative time every 30 seconds so "just now"
  // naturally ages into minutes/hours without needing backend pushes.
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const lastUpdatedAt = useMemo(() => {
    // Device timestamps are the most precise signal available. If none are
    // valid, fall back to the time when the snapshot itself arrived.
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
  const hasTimestamp = lastUpdatedAt !== null;

  return (
    <header className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="panel-label">Live telemetry</p>
        {/* Two-line timestamp: human-friendly relative time first, exact UTC
            underneath for precision when someone needs it. */}
        <p
          className={`mt-2 text-sm text-text-secondary ${
            lastUpdatedAt === null ? "animate-pulse" : ""
          }`}
        >
          <span className="block">{formatRelativeTime(lastUpdatedAt, now)}</span>
          {hasTimestamp ? (
            <span className="mt-0.5 block text-[0.7rem] text-text-secondary/80">
              {formatTimestamp(lastUpdatedAt)} UTC
            </span>
          ) : null}
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
