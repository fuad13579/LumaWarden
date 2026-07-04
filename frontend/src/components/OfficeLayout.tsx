import { motion, useReducedMotion } from "framer-motion";
import { Fan, Lightbulb } from "lucide-react";
import { useMemo } from "react";
import type { Device } from "../types/device";

type OfficeLayoutProps = {
  devices: Device[];
};

type RoomName = Device["room"];
type DeviceKind = Device["type"];

type Marker = {
  type: DeviceKind;
  index: number;
  top: string;
  left: string;
};

const rooms: Array<{ name: RoomName; prefix: string }> = [
  { name: "Drawing Room", prefix: "drawing" },
  { name: "Work Room 1", prefix: "work1" },
  { name: "Work Room 2", prefix: "work2" },
];

const markers: Marker[] = [
  { type: "fan", index: 1, top: "13%", left: "32%" },
  { type: "fan", index: 2, top: "13%", left: "68%" },
  { type: "light", index: 1, top: "36%", left: "20%" },
  { type: "light", index: 2, top: "54%", left: "50%" },
  { type: "light", index: 3, top: "36%", left: "80%" },
];

function getDeviceId(prefix: string, type: DeviceKind, index: number): string {
  return `${prefix}_${type}_${index}`;
}

function RoomFurniture({ room }: { room: RoomName }) {
  const isDrawing = room === "Drawing Room";

  return (
    <>
      <div className="absolute left-[8%] top-[22%] h-[24%] w-[32%] rounded-[1rem] border border-white/10 bg-[#202633] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.18)]" />
      <div className="absolute right-[8%] top-[22%] h-[24%] w-[32%] rounded-[1rem] border border-white/10 bg-[#202633] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.18)]" />
      <div className="absolute bottom-[11%] left-[14%] h-[20%] w-[32%] rounded-[1rem] border border-white/10 bg-[#232a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.18)]" />
      <div className="absolute bottom-[11%] right-[14%] h-[20%] w-[32%] rounded-[1rem] border border-white/10 bg-[#232a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.18)]" />
      <div className="absolute bottom-[18%] left-[49%] h-[14%] w-[12%] -translate-x-1/2 rounded-[0.75rem] border border-white/10 bg-[#1c212a] shadow-[0_8px_18px_rgba(0,0,0,0.24)]" />
      <div className="absolute bottom-[31%] left-[20%] h-[5%] w-[15%] rounded-full border border-white/5 bg-[#1b2028]" />
      <div className="absolute bottom-[31%] right-[20%] h-[5%] w-[15%] rounded-full border border-white/5 bg-[#1b2028]" />
      {isDrawing ? (
        <>
          <div className="absolute bottom-[38%] left-[22%] h-[9%] w-[18%] rounded-[0.8rem] border border-white/10 bg-[#1e2430]" />
          <div className="absolute bottom-[38%] right-[22%] h-[9%] w-[18%] rounded-[0.8rem] border border-white/10 bg-[#1e2430]" />
        </>
      ) : null}
      <div className="absolute bottom-[8%] left-[44%] h-[5%] w-[12%] -translate-x-1/2 rounded-full border border-white/8 bg-[#151922]" />
    </>
  );
}

function DeviceMarker({ device, marker }: { device: Device | null; marker: Marker }) {
  const prefersReducedMotion = useReducedMotion();
  const isOn = device?.status === "on";
  const isFan = marker.type === "fan";
  const Icon = isFan ? Fan : Lightbulb;

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200"
      style={{ top: marker.top, left: marker.left }}
      animate={{ scale: isOn ? 1.05 : 1, opacity: isOn ? 1 : 0.65 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" }}
      aria-label={`${device?.name ?? marker.type} ${device?.status ?? "off"}`}
    >
      {isOn && !isFan ? <span className="light-bloom" aria-hidden="true" /> : null}

      <div
        className={`relative grid h-11 w-11 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 ${
          isOn
            ? isFan
              ? "device-on-fan"
              : "device-on-light"
            : "device-off"
        }`}
      >
        <Icon
          className={`h-5 w-5 ${isFan && isOn && !prefersReducedMotion ? "fan-spin" : ""}`}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
}

export function OfficeLayout({ devices }: OfficeLayoutProps) {
  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices],
  );

  return (
    <section className="glass-card p-6 sm:p-7" aria-label="Office floor plan">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="panel-label">Floor Visualization</p>
          <h2 className="panel-title mt-1">Office Layout</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Top-view visual state of lights and fans across the floor
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-bg-surface/50 px-3 py-1.5 text-accent-light badge-premium">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            lights
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-bg-surface/50 px-3 py-1.5 text-accent-power badge-premium">
            <Fan className="h-3.5 w-3.5" aria-hidden="true" />
            fans
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 sm:gap-6 lg:grid-cols-3" role="img">
        {rooms.map((room) => (
          <div
            key={room.name}
            className="room-floor min-h-[19rem]"
            aria-label={`${room.name} visual status`}
          >
            <div className="absolute inset-x-0 top-0 z-10 border-b border-white/10 bg-[linear-gradient(180deg,rgba(23,27,34,0.92),rgba(17,20,27,0.86))] px-5 py-3 backdrop-blur-sm">
              <h3 className="truncate text-center text-sm font-semibold tracking-[0.02em] text-text-primary">
                {room.name}
              </h3>
            </div>

            <div className="room-floor-grid absolute inset-0 opacity-80" aria-hidden="true" />
            <div className="absolute inset-[7%] rounded-[1.25rem] border-[8px] border-[#2f3742] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.18)]" aria-hidden="true" />
            <div className="absolute inset-x-[14%] top-[15%] h-[10%] rounded-[0.75rem] border border-white/8 bg-[#1a2028]/70" aria-hidden="true" />
            <div className="absolute left-[10%] top-[24%] h-[10%] w-[10%] rounded-[0.6rem] border border-white/8 bg-[#1a2028]/70" aria-hidden="true" />
            <div className="absolute right-[10%] top-[24%] h-[10%] w-[10%] rounded-[0.6rem] border border-white/8 bg-[#1a2028]/70" aria-hidden="true" />
            <div className="absolute bottom-[9%] left-[14%] h-[7%] w-[10%] rounded-[0.6rem] border border-white/8 bg-[#1a2028]/70" aria-hidden="true" />
            <div className="absolute bottom-[9%] right-[14%] h-[7%] w-[10%] rounded-[0.6rem] border border-white/8 bg-[#1a2028]/70" aria-hidden="true" />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_80%,rgba(245,158,11,0.08),transparent)]"
              aria-hidden="true"
            />

            <RoomFurniture room={room.name} />

            {markers.map((marker) => (
              <DeviceMarker
                key={`${room.name}-${marker.type}-${marker.index}`}
                marker={marker}
                device={
                  devicesById.get(getDeviceId(room.prefix, marker.type, marker.index)) ??
                  null
                }
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
