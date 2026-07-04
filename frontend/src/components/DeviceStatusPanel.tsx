import { Fan, Lightbulb } from "lucide-react";
import { useMemo } from "react";
import type { Device } from "../types/device";

type DeviceStatusPanelProps = {
  devices: Device[];
};

const rooms = ["Drawing Room", "Work Room 1", "Work Room 2"] as const;

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {rooms.map((room) => (
        <section key={room} aria-label={`${room} devices loading`} className="glass-card p-4">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-800/80" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-md bg-slate-800/60"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function DeviceStatusPanel({ devices }: DeviceStatusPanelProps) {
  const devicesByRoom = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        devices: devices.filter((device) => device.room === room),
      })),
    [devices],
  );

  if (devices.length === 0) {
    return (
      <section aria-label="Device status panel">
        <LoadingSkeleton />
      </section>
    );
  }

  return (
    <section aria-label="Device status panel" className="grid gap-4 lg:grid-cols-3">
      {devicesByRoom.map(({ room, devices: roomDevices }) => (
        <section key={room} aria-label={`${room} device status`} className="glass-card p-4">
          <h2 className="text-base font-semibold text-slate-100">{room}</h2>
          <div className="mt-4 space-y-3">
            {roomDevices.map((device) => {
              const Icon = device.type === "fan" ? Fan : Lightbulb;
              const isOn = device.status === "on";
              const activeClasses =
                device.type === "fan"
                  ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.22)]"
                  : "border-amber-300/60 bg-amber-400/15 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.24)]";

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-md border border-slate-700/60 bg-slate-950/55 px-3 py-3 backdrop-blur"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
                        isOn
                          ? activeClasses
                          : "border-slate-700 bg-slate-900/80 text-slate-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-200">
                      {device.name}
                    </span>
                  </div>
                  <span
                    className={`ml-3 text-xs font-semibold uppercase ${
                      isOn && device.type === "fan"
                        ? "text-cyan-300"
                        : isOn
                          ? "text-amber-300"
                          : "text-slate-500"
                    }`}
                  >
                    {device.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
