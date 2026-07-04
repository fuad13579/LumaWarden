import { Search, User, Bell, Zap, Activity, Sparkles, AlertTriangle } from "lucide-react";
import type { Alert, ConnectionState, Usage, Device } from "../types/device";

type TopHeaderProps = {
  connectionState: ConnectionState;
  devices: Device[];
  usage: Usage | null;
  alerts: Alert[];
  appLoadedAt: number;
};

export function TopHeader({ devices, usage, alerts, appLoadedAt }: TopHeaderProps) {
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
    <div className="glass-card relative flex w-full flex-col gap-6 overflow-hidden p-6 sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_45%)]" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative min-w-0">
          <p className="panel-label">Smart Building Control</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-[1.95rem] font-semibold tracking-[0.01em] text-text-primary sm:text-[2.25rem]">
              <span className="font-[700] tracking-[0.02em]">Luma</span><span className="ml-1 bg-gradient-to-r from-accent-light via-[#fbbf24] to-accent-light bg-clip-text font-[700] tracking-[0.02em] text-transparent">Warden</span>
            </h1>
            <span className="brand-mark h-10 w-10 rounded-2xl text-accent-light">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Operations center for occupancy, power, and device health.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <button className="rounded-2xl border border-white/10 bg-bg-card/70 px-3 py-2.5 text-sm text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 hover:text-text-primary">
              <Bell className="h-4 w-4" />
            </button>
            <button className="rounded-full border border-white/10 bg-bg-card/70 p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5">
              <User className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="premium-search relative flex w-full max-w-xl items-center">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
          <input
            aria-label="Search"
            placeholder="Search devices, rooms, alerts"
            className="w-full rounded-[1.05rem] border-0 bg-transparent py-3.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none"
          />
        </div>

        <div className="grid w-full gap-3 md:grid-cols-2 xl:w-auto xl:min-w-[44rem] xl:grid-cols-4">
          {kpiCards.map(({ label, value, icon: Icon, accent, tone }) => (
            <div key={label} className={`kpi-card relative overflow-hidden bg-gradient-to-br ${tone}`}>
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
