import { Fan, Lightbulb } from "lucide-react";
import { useMemo } from "react";
import type { Device } from "../types/device";

type DeviceStatusPanelProps = {
  devices: Device[];
};

const rooms = ["Drawing Room", "Work Room 1", "Work Room 2"] as const;

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {rooms.map((room) => (
        <section
          key={room}
          aria-label={`${room} devices loading`}
          className="glass-card p-5"
        >
          <div className="mb-5 h-5 w-36 animate-pulse rounded-lg bg-bg-surface" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="skeleton-shimmer h-14 rounded-xl bg-bg-surface/80"
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
    <section aria-label="Device status panel" className="grid min-w-0 gap-6 2xl:grid-cols-3">
      {devicesByRoom.map(({ room, devices: roomDevices }) => {
        const activeCount = roomDevices.filter((device) => device.status === "on").length;

        return (
          <section
            key={room}
            aria-label={`${room} device status`}
            className="glass-card min-w-0 p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="panel-title truncate">{room}</h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {roomDevices.length} devices
                </p>
              </div>
              <span className="font-data shrink-0 rounded-lg border border-white/10 bg-bg-surface px-2.5 py-1 text-xs font-semibold text-accent-power">
                {activeCount} active
              </span>
            </div>

            <div className="space-y-2.5">
              {roomDevices.map((device) => {
                const Icon = device.type === "fan" ? Fan : Lightbulb;
                const isOn = device.status === "on";

                return (
                  <div
                    key={device.id}
                    className="surface-nested flex min-w-0 items-center justify-between gap-3 px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                          isOn
                            ? device.type === "fan"
                              ? "device-on-fan"
                              : "device-on-light"
                            : "device-off"
                        }`}
                      >
                        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${isOn ? "text-text-primary" : "text-text-secondary/70"}`}>
                          {device.name}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.16em] text-text-secondary">
                          {device.type === "fan" ? "Fan" : "Light"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-data text-[0.72rem] font-semibold uppercase tracking-wide ${
                          isOn && device.type === "fan"
                            ? "text-accent-power"
                            : isOn
                              ? "text-accent-light"
                              : "text-text-secondary/50"
                        }`}
                      >
                        {isOn ? "ON" : "OFF"}
                      </p>
                      <p className="mt-0.5 font-data text-[0.72rem] text-text-secondary">
                        {device.power_watts}W
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
