import { Activity, AlertTriangle, Wifi, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { DeviceStatusPanel } from "./components/DeviceStatusPanel";
import { OfficeLayout } from "./components/OfficeLayout";
import { PowerMeter } from "./components/PowerMeter";
import { useDeviceStream } from "./hooks/useDeviceStream";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";

function App() {
  const stream = useDeviceStream();
  const appLoadedAtRef = useRef(Date.now());
  const [snapshotArrivedAt, setSnapshotArrivedAt] = useState<number | null>(null);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  const snapshotSignature = useMemo(
    () =>
      JSON.stringify({
        devices: stream.devices.map((device) => [
          device.id,
          device.status,
          device.last_changed,
        ]),
        usage: stream.usage,
        alerts: stream.alerts.map((alert) => [alert.id, alert.created_at]),
      }),
    [stream.alerts, stream.devices, stream.usage],
  );

  useEffect(() => {
    if (stream.devices.length > 0 || stream.usage !== null || stream.alerts.length > 0) {
      setSnapshotArrivedAt(Date.now());
    }
  }, [snapshotSignature, stream.alerts.length, stream.devices.length, stream.usage]);

  const showFailureBanner =
    stream.connectionState === "polling" &&
    stream.error !== null &&
    !isErrorDismissed;
  const isLoadingSnapshot = stream.devices.length === 0 && stream.usage === null;

  const summaryCards = [
    {
      label: "Total Power",
      value: `${(stream.usage?.total_watts ?? 0).toLocaleString()} W`,
      icon: Zap,
      accent: "text-accent-light",
      tone: "from-accent-light/10 to-transparent",
    },
    {
      label: "Devices ON",
      value: `${stream.devices.filter((device) => device.status === "on").length} / ${stream.devices.length}`,
      icon: Activity,
      accent: "text-accent-power",
      tone: "from-accent-power/10 to-transparent",
    },
    {
      label: "Active Alerts",
      value: `${stream.alerts.length}`,
      icon: AlertTriangle,
      accent: "text-danger",
      tone: "from-danger/10 to-transparent",
    },
    {
      label: "Connection",
      value: stream.connectionState === "connected" ? "Live" : stream.connectionState === "reconnecting" ? "Reconnecting" : "Polling",
      icon: Wifi,
      accent: "text-text-primary",
      tone: "from-white/10 to-transparent",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(82,242,213,0.08),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(245,158,11,0.06),transparent)]"
        aria-hidden="true"
      />

      <div className="flex w-full">
        <aside className="hidden lg:block lg:flex-shrink-0">
          <Sidebar />
        </aside>

        <section
          className="premium-shell fade-in-up relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-7 px-4 py-4 sm:gap-8 sm:px-6 lg:px-8 lg:py-8"
          aria-label="LumaWarden dashboard"
        >
          <TopHeader
            connectionState={stream.connectionState}
            devices={stream.devices}
            usage={stream.usage}
            alerts={stream.alerts}
            appLoadedAt={appLoadedAtRef.current}
          />
          {showFailureBanner ? (
          <div
            className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-accent-light/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(245,158,11,0.08))] px-5 py-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-sm"
            role="status"
          >
            <p className="text-sm font-medium text-text-primary">
              Having trouble reaching the server — retrying...
            </p>
            <button
              type="button"
              onClick={() => setIsErrorDismissed(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/5 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              aria-label="Dismiss server connection warning"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <ConnectionStatus
          connectionState={stream.connectionState}
          devices={stream.devices}
          snapshotArrivedAt={snapshotArrivedAt}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, accent, tone }) => (
            <div key={label} className={`summary-card relative overflow-hidden rounded-[1.3rem] bg-gradient-to-br ${tone}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_55%)]" />
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  {label}
                </p>
                <span className={`icon-shell rounded-2xl p-2.5 ${accent}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="relative mt-5 text-2xl font-semibold tracking-tight text-text-primary sm:text-[1.7rem]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-2 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
          <OfficeLayout devices={stream.devices} />
        </div>

        <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)_minmax(280px,0.8fr)]">
          <PowerMeter
            usage={stream.usage}
            appLoadedAt={appLoadedAtRef.current}
            isLoading={isLoadingSnapshot}
          />
          <DeviceStatusPanel devices={stream.devices} />
          <AlertsPanel alerts={stream.alerts} isLoading={isLoadingSnapshot} />
        </div>
        </section>
      </div>
    </main>
  );
}

export default App;
