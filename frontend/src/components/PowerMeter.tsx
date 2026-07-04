import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Usage } from "../types/device";

type PowerMeterProps = {
  usage: Usage | null;
  appLoadedAt: number;
};

const roomNames = ["Drawing Room", "Work Room 1", "Work Room 2"] as const;

export function PowerMeter({ usage, appLoadedAt }: PowerMeterProps) {
  const totalWatts = usage?.total_watts ?? 0;

  const chartData = useMemo(
    () =>
      roomNames.map((room) => ({
        room,
        watts: usage?.rooms[room] ?? 0,
      })),
    [usage],
  );

  const estimatedKwh = useMemo(() => {
    const hoursSinceLoaded = (Date.now() - appLoadedAt) / 3_600_000;
    return (totalWatts / 1000) * hoursSinceLoaded;
  }, [appLoadedAt, totalWatts]);

  return (
    <section
      aria-label="Power meter"
      className="rounded-md border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Power</h2>
          <p className="mt-1 text-sm text-slate-400">Live whole-office draw</p>
        </div>
        <div className="font-mono text-4xl font-semibold text-cyan-200">
          {totalWatts.toLocaleString()}W
        </div>
      </div>

      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="room" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "#0f172a" }}
              contentStyle={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: 6,
                color: "#e2e8f0",
              }}
            />
            <Bar dataKey="watts" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-amber-200">
          estimate
        </p>
        <p className="mt-1 font-mono text-xl text-amber-100">
          {estimatedKwh.toFixed(4)} kWh used today
        </p>
      </div>
    </section>
  );
}
