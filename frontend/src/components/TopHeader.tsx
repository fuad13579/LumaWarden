import { Zap, Activity, Sparkles, AlertTriangle, Database, Radio } from "lucide-react";
import type { Alert, ConnectionState, Usage, Device } from "../types/device";

type TopHeaderProps = {
  connectionState: ConnectionState;
  devices: Device[];
  usage: Usage | null;
  alerts: Alert[];
  appLoadedAt: number;
};

export function TopHeader({ connectionState, devices, usage, alerts, appLoadedAt }: TopHeaderProps) {
  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.status === "on").length;
  const totalWatts = usage?.total_watts ?? 0;
  const estimatedKwh = ((totalWatts / 1000) * (Math.max(Date.now() - appLoadedAt, 0) / 3_600_000)).toFixed(2);

  const kpiCards = [
    {
      label: "Total Power",
      value: `${totalWatts.toLocaleString()} W`,
      icon: Zap,
      accent: "text-accent-light",
      tone: "from-accent-light/12 to-transparent",
    },
    {
      label: "Devices ON",
      value: `${activeDevices}`,
      icon: Activity,
      accent: "text-accent-power",
      tone: "from-accent-power/10 to-transparent",
    },
    {
      label: "Today's kWh",
      value: `${estimatedKwh}`,
      icon: Sparkles,
      accent: "text-text-primary",
      tone: "from-white/10 to-transparent",
    },
    {
      label: "Alerts",
      value: `${alerts.length}`,
      icon: AlertTriangle,
      accent: "text-danger",
      tone: "from-danger/10 to-transparent",
    },
  ];

  return (
    <div className="glass-card relative flex w-full min-w-0 flex-col gap-6 overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_45%)]" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative min-w-0">
          <p className="panel-label">Smart Building Control</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-[1.75rem] font-semibold tracking-[0.01em] text-text-primary sm:text-[2.1rem] lg:text-[2.35rem]">
              <span className="font-[700] tracking-[0.02em]">Luma</span><span className="ml-1 bg-gradient-to-r from-accent-light via-[#fbbf24] to-accent-light bg-clip-text font-[700] tracking-[0.02em] text-transparent">Warden</span>
            </h1>
            <span className="brand-mark h-9 w-9 shrink-0 rounded-2xl text-accent-light sm:h-10 sm:w-10">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-[0.96rem]">Operations center for occupancy, power, and device health.</p>
        </div>

      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap gap-3">
          <div className="badge-premium min-w-0 gap-2 px-3 py-2 text-text-secondary">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent-power" />
            <span className="truncate">Stream: {connectionState}</span>
          </div>
          <div className="badge-premium min-w-0 gap-2 px-3 py-2 text-text-secondary">
            <Database className="h-4 w-4 text-accent-light" />
            <span className="truncate">FastAPI backend source of truth</span>
          </div>
          <div className="badge-premium min-w-0 gap-2 px-3 py-2 text-text-secondary">
            <Radio className="h-4 w-4 text-accent-power" />
            <span className="truncate">Live WebSocket updates</span>
          </div>
          <div className="badge-premium min-w-0 gap-2 px-3 py-2 text-text-secondary">
            <Sparkles className="h-4 w-4 text-text-primary" />
            <span className="truncate">{totalDevices} controllable devices</span>
          </div>
        </div>

        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-0 xl:grid-cols-4">
          {kpiCards.map(({ label, value, icon: Icon, accent, tone }) => (
            <div key={label} className={`kpi-card relative min-w-0 overflow-hidden bg-gradient-to-br ${tone}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)]" />
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-[0.67rem] uppercase tracking-[0.16em] text-text-secondary">{label}</p>
                <div className={`icon-shell rounded-2xl p-2.5 ${accent}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="relative kpi-large mt-1.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TopHeader;
