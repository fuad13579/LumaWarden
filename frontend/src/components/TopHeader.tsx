import { Zap, Activity, Sparkles, AlertTriangle } from "lucide-react";
import type { Alert, ConnectionState, Usage, Device } from "../types/device";

type TopHeaderProps = {
  connectionState: ConnectionState;
  devices: Device[];
  usage: Usage | null;
  alerts: Alert[];
  appLoadedAt: number;
};

export function TopHeader({ connectionState, devices, usage, alerts, appLoadedAt }: TopHeaderProps) {
  const activeDevices = devices.filter((d) => d.status === "on").length;
  const totalWatts = usage?.total_watts ?? 0;
  const estimatedKwh = ((totalWatts / 1000) * (Math.max(Date.now() - appLoadedAt, 0) / 3_600_000)).toFixed(2);

  const kpiCards = [
    {
      label: "Total Power",
      value: `${totalWatts.toLocaleString()} W`,
      icon: Zap,
      accent: "text-accent-light",
    },
    {
      label: "Devices ON",
      value: `${activeDevices}`,
      icon: Activity,
      accent: "text-accent-power",
    },
    {
      label: "Today's kWh",
      value: `${estimatedKwh}`,
      icon: Sparkles,
      accent: "text-text-primary",
    },
    {
      label: "Alerts",
      value: `${alerts.length}`,
      icon: AlertTriangle,
      accent: "text-danger",
    },
  ];

  return (
    <div className="glass-card relative flex w-full min-w-0 flex-col gap-6 overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative min-w-0">
          <p className="panel-label">Smart Building Control</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-[1.75rem] font-semibold tracking-[0.01em] text-text-primary sm:text-[2.1rem] lg:text-[2.35rem]">
              <span className="font-[700] tracking-[0.02em]">Luma</span><span className="ml-1 font-[700] tracking-[0.02em] text-accent-light">Warden</span>
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
        </div>

        <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-0 xl:grid-cols-4">
          {kpiCards.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="kpi-card relative min-w-0 overflow-hidden">
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
