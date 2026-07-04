import { motion } from "framer-motion";
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
  if (room === "Drawing Room") {
    return (
      <>
        <div className="absolute bottom-[20%] left-[13%] h-[22%] w-[36%] rounded-md border border-slate-600/40 bg-slate-800/65" />
        <div className="absolute bottom-[28%] left-[55%] h-[13%] w-[28%] rounded-md border border-slate-600/40 bg-slate-700/55" />
        <div className="absolute bottom-[16%] left-[55%] h-[7%] w-[28%] rounded-full bg-slate-700/50" />
      </>
    );
  }

  return (
    <>
      <div className="absolute bottom-[18%] left-[14%] h-[20%] w-[32%] rounded-md border border-slate-600/40 bg-slate-800/65" />
      <div className="absolute bottom-[18%] right-[14%] h-[20%] w-[32%] rounded-md border border-slate-600/40 bg-slate-800/65" />
      <div className="absolute bottom-[40%] left-[21%] h-[7%] w-[18%] rounded-sm bg-slate-700/60" />
      <div className="absolute bottom-[40%] right-[21%] h-[7%] w-[18%] rounded-sm bg-slate-700/60" />
    </>
  );
}

function DeviceMarker({ device, marker }: { device: Device | null; marker: Marker }) {
  const isOn = device?.status === "on";
  const isFan = marker.type === "fan";
  const Icon = isFan ? Fan : Lightbulb;
  const onClasses = isFan
    ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.34)]"
    : "border-amber-300/70 bg-amber-300/20 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.42)]";
  const offClasses = "border-slate-700/80 bg-slate-950/70 text-slate-600";

  return (
    <motion.div
      className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border backdrop-blur ${
        isOn ? onClasses : offClasses
      }`}
      style={{ top: marker.top, left: marker.left }}
      animate={{ scale: isOn ? 1.06 : 1, opacity: isOn ? 1 : 0.72 }}
      transition={{ duration: 0.25 }}
      aria-label={`${device?.name ?? marker.type} ${device?.status ?? "off"}`}
    >
      <Icon
        className={`h-5 w-5 ${isFan && isOn ? "motion-safe:animate-spin" : ""}`}
        aria-hidden="true"
      />
    </motion.div>
  );
}

export function OfficeLayout({ devices }: OfficeLayoutProps) {
  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices],
  );

  return (
    <section className="glass-card p-4 sm:p-5" aria-label="Office floor plan">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Office Layout</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live visual state of fans and lights
          </p>
        </div>
        <div className="hidden gap-3 text-xs sm:flex">
          <span className="inline-flex items-center gap-1 text-amber-200">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            lights
          </span>
          <span className="inline-flex items-center gap-1 text-cyan-200">
            <Fan className="h-3.5 w-3.5" aria-hidden="true" />
            fans
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3" role="img">
        {rooms.map((room) => (
          <div
            key={room.name}
            className="relative min-h-72 overflow-hidden rounded-md border border-slate-700/60 bg-slate-950/55"
            aria-label={`${room.name} visual status`}
          >
            <div className="absolute inset-x-0 top-0 border-b border-slate-700/70 bg-slate-900/70 px-3 py-2">
              <h3 className="truncate text-sm font-semibold text-slate-200">
                {room.name}
              </h3>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
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
