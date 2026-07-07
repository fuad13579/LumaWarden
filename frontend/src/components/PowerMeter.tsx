import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Usage, WasteSummary } from "../types/device";

type PowerMeterProps = {
  usage: Usage | null;
  wasteSummary: WasteSummary | null;
  isLoading: boolean;
};

const roomNames = ["Drawing Room", "Work Room 1", "Work Room 2"] as const;

const compactRoomLabels: Record<(typeof roomNames)[number], string> = {
  "Drawing Room": "Drawing",
  "Work Room 1": "Work 1",
  "Work Room 2": "Work 2",
};

type ChartRow = {
  room: string;
  watts: number;
};

type TooltipPayload = {
  value: number;
  payload: ChartRow;
};

function PowerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0];

  return (
    <div className="rounded-xl border border-white/10 bg-bg-card px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-text-secondary">{entry.payload.room}</p>
      <p className="font-data mt-1 text-lg font-semibold text-accent-power">
        {entry.value.toLocaleString()} W
      </p>
    </div>
  );
}

export function PowerMeter({ usage, wasteSummary, isLoading }: PowerMeterProps) {
  // This panel combines three related ideas:
  // - current office wattage
  // - a per-room bar chart
  // - backend-backed energy summaries
  const totalWatts = usage?.total_watts ?? 0;
  const [nowMs, setNowMs] = useState(Date.now());
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const previousDayWasteKwh = wasteSummary?.previous_day.kwh ?? 0;
  const estimatedKwh = wasteSummary?.dashboard_estimate_kwh ?? 0;

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    const resizeHandler = () => setViewportWidth(window.innerWidth);

    resizeHandler();
    window.addEventListener("resize", resizeHandler);

    return () => {
      window.clearInterval(timerId);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  const chartData = useMemo(
    () =>
      roomNames.map((room) => ({
        room,
        watts: usage?.rooms[room] ?? 0,
      })),
    [usage],
  );

  const formatRoomLabel = (room: string): string => {
    if (viewportWidth < 640 && room in compactRoomLabels) {
      return compactRoomLabels[room as keyof typeof compactRoomLabels];
    }

    return room;
  };

  return (
    <section aria-label="Power meter" className="glass-card min-w-0 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {/* The heading explains that this is live power, not a historical
              report, so judges understand the distinction immediately. */}
          <p className="panel-label">Energy Monitor</p>
          <h2 className="panel-title mt-1">Power</h2>
          <p className="mt-1.5 text-sm text-text-secondary">Live whole-office draw</p>
        </div>
        {isLoading ? (
          <div className="skeleton-shimmer h-16 w-40 rounded-xl bg-bg-surface/80" />
        ) : (
          <div className="text-right">
            <p className="font-data glow-power text-5xl font-bold leading-none tracking-tight text-accent-power sm:text-6xl">
              {totalWatts.toLocaleString()}
            </p>
            <p className="font-data mt-1.5 text-sm font-medium text-text-secondary">
              watts
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 h-44 sm:h-52">
        {isLoading ? (
          // Skeleton bars preserve the panel layout while the first snapshot is
          // loading from the backend.
          <div className="surface-nested flex h-full items-end gap-4 px-5 py-5">
            {[44, 68, 52].map((height) => (
              <div
                key={height}
                className={`skeleton-shimmer flex-1 rounded-t-lg bg-bg-surface ${
                  height === 44 ? "h-[44%]" : height === 68 ? "h-[68%]" : "h-[52%]"
                }`}
              />
            ))}
          </div>
        ) : (
          // The chart is intentionally small and uncluttered: it should support
          // the dashboard, not dominate the screen.
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="room"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8B95A5", fontSize: 10, fontFamily: "Inter, sans-serif" }}
                tickFormatter={formatRoomLabel}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#8B95A5",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                width={42}
              />
              <Tooltip content={<PowerTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="watts"
                fill="#52f2d5"
                radius={[8, 8, 3, 3]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-5 alert-card border-accent-light/20 bg-accent-light/6 px-4 py-4 sm:px-5">
        {/* This summary is backend-backed. The frontend simply renders the
            numbers returned by the summary endpoint. */}
        <p className="panel-label text-accent-light/80">After-Hours Waste</p>
        {isLoading ? (
          <div className="mt-2.5 h-8 w-52 animate-pulse rounded-lg bg-accent-light/10" />
        ) : (
          <div className="mt-1.5 space-y-1">
            <p className="font-data glow-light-text text-xl font-semibold text-accent-light">
              {previousDayWasteKwh.toFixed(4)} kWh yesterday
            </p>
            <p className="text-xs text-text-secondary">
              {estimatedKwh.toFixed(4)} kWh estimated since dashboard opened
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
