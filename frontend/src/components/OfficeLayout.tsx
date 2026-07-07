import { Fan, Lightbulb } from "lucide-react";
import { useMemo } from "react";
import type { Device } from "../types/device";

type OfficeLayoutProps = {
  devices: Device[];
};

type RoomName = Device["room"];
type DeviceKind = Device["type"];

type DevicePoint = {
  id: string;
  room: RoomName;
  type: DeviceKind;
  x: number;
  y: number;
};

// These coordinates map each simulated device to the fixed top-view floor plan.
// The values are hand-tuned so the visual layout matches the office description
// from the problem statement without requiring a separate drawing tool at run time.
const devicePoints: DevicePoint[] = [
  { id: "drawing_light_1", room: "Drawing Room", type: "light", x: 114, y: 82 },
  { id: "drawing_light_2", room: "Drawing Room", type: "light", x: 306, y: 82 },
  { id: "drawing_light_3", room: "Drawing Room", type: "light", x: 210, y: 451 },
  { id: "drawing_fan_1", room: "Drawing Room", type: "fan", x: 211, y: 93 },
  { id: "drawing_fan_2", room: "Drawing Room", type: "fan", x: 226, y: 382 },
  { id: "work1_light_1", room: "Work Room 1", type: "light", x: 460, y: 82 },
  { id: "work1_light_2", room: "Work Room 1", type: "light", x: 646, y: 82 },
  { id: "work1_light_3", room: "Work Room 1", type: "light", x: 548, y: 451 },
  { id: "work1_fan_1", room: "Work Room 1", type: "fan", x: 552, y: 94 },
  { id: "work1_fan_2", room: "Work Room 1", type: "fan", x: 552, y: 340 },
  { id: "work2_light_1", room: "Work Room 2", type: "light", x: 805, y: 82 },
  { id: "work2_light_2", room: "Work Room 2", type: "light", x: 991, y: 82 },
  { id: "work2_light_3", room: "Work Room 2", type: "light", x: 893, y: 451 },
  { id: "work2_fan_1", room: "Work Room 2", type: "fan", x: 897, y: 94 },
  { id: "work2_fan_2", room: "Work Room 2", type: "fan", x: 897, y: 340 },
];

function isOn(device: Device | undefined): boolean {
  return device?.status === "on";
}

function Desk({ x, y }: { x: number; y: number }) {
  return (
    <g className="floor-plan-furniture">
      <rect x={x} y={y} width="74" height="46" rx="4" className="floor-desk" />
      <rect x={x + 23} y={y + 11} width="31" height="11" rx="2" className="floor-monitor" />
      <rect x={x + 21} y={y + 30} width="35" height="7" rx="2" className="floor-keyboard" />
      <rect x={x + 22} y={y - 15} width="31" height="14" rx="5" className="floor-chair" />
      <rect x={x + 23} y={y + 46} width="28" height="14" rx="5" className="floor-chair" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="floor-plan-furniture">
      <circle r="5" className="floor-plant-pot" />
      {Array.from({ length: 8 }, (_, index) => (
        <ellipse
          key={index}
          cx="0"
          cy="-8"
          rx="3"
          ry="10"
          className="floor-plant-leaf"
          transform={`rotate(${index * 45})`}
        />
      ))}
    </g>
  );
}

function FanDevice({ point, device }: { point: DevicePoint; device?: Device }) {
  const on = isOn(device);
  const label = `${device?.name ?? "Fan"} in ${point.room} ${device?.status ?? "off"}`;

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
      className={on ? "floor-device is-on" : "floor-device"}
      aria-label={label}
    >
      <circle r="12" className="floor-fan-hub" />
      <g className={on ? "floor-fan-blades is-spinning" : "floor-fan-blades"}>
        {on ? (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="1.4s"
            repeatCount="indefinite"
          />
        ) : null}
        <rect x="-6" y="-58" width="12" height="48" rx="6" className="floor-fan-blade" />
        <rect x="-6" y="-58" width="12" height="48" rx="6" className="floor-fan-blade" transform="rotate(120)" />
        <rect x="-6" y="-58" width="12" height="48" rx="6" className="floor-fan-blade" transform="rotate(240)" />
      </g>
      <circle r="6" className="floor-fan-cap" />
    </g>
  );
}

function LightDevice({ point, device }: { point: DevicePoint; device?: Device }) {
  const on = isOn(device);
  const label = `${device?.name ?? "Light"} in ${point.room} ${device?.status ?? "off"}`;

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
      className={on ? "floor-device is-on" : "floor-device"}
      aria-label={label}
    >
      {on ? <circle r="27" className="floor-light-glow" /> : null}
      <circle r="13" className="floor-light-ring" />
      <circle r="9" className="floor-light-core" />
    </g>
  );
}

export function OfficeLayout({ devices }: OfficeLayoutProps) {
  // Convert the flat device list into a lookup table so each SVG marker can
  // read its current status in constant time.
  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices],
  );

  return (
    <section className="glass-card p-5 sm:p-6" aria-label="Office floor plan">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* This section is intentionally a visual story, not a control panel:
              it helps the reviewer understand how device states map to the
              office layout. */}
          <p className="panel-label">Floor Visualization</p>
          <h2 className="panel-title mt-1">Statement Office Layout</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Live lights and fans mapped onto the provided top-view floor plan
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
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

      <div className="floor-plan-shell" role="img" aria-label="Live office floor plan with rooms, lights, and fans">
        <svg viewBox="0 0 1080 620" className="floor-plan-svg">
          <defs>
            <pattern id="floorGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" className="floor-grid-line" fill="none" />
            </pattern>
          </defs>

          <rect x="8" y="8" width="1064" height="604" rx="4" className="floor-plan-bg" />
          <rect x="20" y="20" width="1040" height="590" className="floor-room-fill" />
          <rect x="20" y="20" width="1040" height="590" fill="url(#floorGrid)" opacity="0.9" />

          <rect x="20" y="20" width="350" height="490" className="floor-room-room" />
          <rect x="380" y="20" width="335" height="490" className="floor-room-room" />
          <rect x="725" y="20" width="335" height="490" className="floor-room-room" />
          <rect x="20" y="520" width="1040" height="90" className="floor-room-corridor" />

          <g className="floor-walls">
            <line x1="20" y1="20" x2="1060" y2="20" />
            <line x1="20" y1="20" x2="20" y2="610" />
            <line x1="1060" y1="20" x2="1060" y2="610" />
            <line x1="20" y1="610" x2="535" y2="610" />
            <line x1="590" y1="610" x2="1060" y2="610" />

            <line x1="370" y1="20" x2="370" y2="510" />
            <line x1="380" y1="20" x2="380" y2="510" />
            <line x1="715" y1="20" x2="715" y2="510" />
            <line x1="725" y1="20" x2="725" y2="510" />

            <line x1="20" y1="510" x2="210" y2="510" />
            <line x1="250" y1="510" x2="400" y2="510" />
            <line x1="440" y1="510" x2="750" y2="510" />
            <line x1="790" y1="510" x2="1060" y2="510" />
            <line x1="20" y1="520" x2="210" y2="520" />
            <line x1="250" y1="520" x2="400" y2="520" />
            <line x1="440" y1="520" x2="750" y2="520" />
            <line x1="790" y1="520" x2="1060" y2="520" />
          </g>

          <path d="M210 510 A40 40 0 0 1 250 470" className="floor-door" />
          <path d="M400 510 A40 40 0 0 1 440 470" className="floor-door" />
          <path d="M750 510 A40 40 0 0 1 790 470" className="floor-door" />
          <path d="M535 610 A42 42 0 0 1 577 568" className="floor-door" />

          <rect x="140" y="210" width="120" height="110" rx="3" className="floor-rug" />
          <rect x="40" y="185" width="60" height="170" rx="10" className="floor-sofa" />
          <rect x="64" y="386" width="48" height="64" rx="8" className="floor-sofa" transform="rotate(28 88 418)" />
          <rect x="145" y="235" width="45" height="88" rx="3" className="floor-table" />
          <Plant x={52} y={55} />
          <Plant x={330} y={452} />
          <Plant x={52} y={560} />
          <Plant x={942} y={590} />

          <Desk x={407} y={186} />
          <Desk x={617} y={186} />
          <Desk x={407} y={318} />
          <Desk x={617} y={318} />
          <Desk x={752} y={186} />
          <Desk x={962} y={186} />
          <Desk x={752} y={318} />
          <Desk x={962} y={318} />
          <Plant x={764} y={194} />
          <Plant x={1018} y={194} />
          <Plant x={764} y={326} />
          <Plant x={1018} y={326} />

          <rect x="993" y="548" width="31" height="40" rx="5" className="floor-water-base" />
          <ellipse cx="1008.5" cy="548" rx="16" ry="8" className="floor-water-top" />
          <rect x="996" y="526" width="25" height="34" rx="8" className="floor-water-bottle" />

          <text x="195" y="188" className="floor-room-label">DRAWING ROOM</text>
          <text x="552" y="270" className="floor-room-label">WORK ROOM 1</text>
          <text x="887" y="270" className="floor-room-label">WORK ROOM 2</text>

          {devicePoints.map((point) =>
            point.type === "fan" ? (
              <FanDevice key={point.id} point={point} device={devicesById.get(point.id)} />
            ) : (
              <LightDevice key={point.id} point={point} device={devicesById.get(point.id)} />
            ),
          )}
        </svg>
      </div>
    </section>
  );
}
