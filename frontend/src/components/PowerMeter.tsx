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
import type { Usage } from "../types/device";

type PowerMeterProps = {
  usage: Usage | null;
  appLoadedAt: number;
  isLoading: boolean;
};

const roomNames = ["Drawing Room", "Work Room 1", "Work Room 2"] as const;

export function PowerMeter({ usage, appLoadedAt, isLoading }: PowerMeterProps) {
  const totalWatts = usage?.total_watts ?? 0;
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  const chartData = useMemo(
    () =>
      roomNames.map((room) => ({
        room,
        watts: usage?.rooms[room] ?? 0,
      })),
    [usage],
  );

  const estimatedKwh = useMemo(() => {
    const hoursSinceLoaded = (nowMs - appLoadedAt) / 3_600_000;
    return (totalWatts / 1000) * hoursSinceLoaded;
  }, [appLoadedAt, nowMs, totalWatts]);

  return (
    <section aria-label="Power meter" className="glass-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Power</h2>
          <p className="mt-1 text-sm text-slate-400">Live whole-office draw</p>
        </div>
        {isLoading ? (
          <div className="h-11 w-32 animate-pulse rounded bg-slate-800/70" />
        ) : (
          <div className="font-mono text-4xl font-semibold text-cyan-200">
            {totalWatts.toLocaleString()}W
          </div>
        )}
      </div>

      <div className="mt-5 h-56">
        {isLoading ? (
          <div className="flex h-full items-end gap-4 rounded-md border border-slate-700/50 bg-slate-950/45 px-5 py-4">
            {[44, 68, 52].map((height) => (
              <div
                key={height}
                className="flex-1 animate-pulse rounded-t bg-slate-800/75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="room" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#0f172a" }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#e2e8f0",
                }}
              />
              <Bar dataKey="watts" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-amber-200">estimate</p>
        {isLoading ? (
          <div className="mt-2 h-7 w-48 animate-pulse rounded bg-amber-200/15" />
        ) : (
          <p className="mt-1 font-mono text-xl text-amber-100">
            {estimatedKwh.toFixed(4)} kWh used today
          </p>
        )}
      </div>
    </section>
  );
}
