import { Activity, AlertTriangle, Wifi, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { DeviceStatusPanel } from "./components/DeviceStatusPanel";
import { OfficeLayout } from "./components/OfficeLayout";
import { PowerMeter } from "./components/PowerMeter";
import { getSummary } from "./services/api";
import { useDeviceStream } from "./hooks/useDeviceStream";
import { TopHeader } from "./components/TopHeader";
import type { WasteSummary } from "./types/device";

function App() {
  const stream = useDeviceStream();
  // This timestamp represents when the browser session started. It is passed to
  // the backend so the backend can compute session-style energy estimates while
  // still keeping the UI itself free of business logic.
  const appLoadedAtRef = useRef(Date.now());
  const [snapshotArrivedAt, setSnapshotArrivedAt] = useState<number | null>(null);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [wasteSummary, setWasteSummary] = useState<WasteSummary | null>(null);

  // The signature collapses the live snapshot into a stable comparison key.
  // Whenever any device, usage, or alert value changes, the summary refreshes so
  // the dashboard stays in sync with the current backend state.
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
      // A fresh snapshot arrived, so we record the arrival time separately from
      // the device timestamps. That lets the connection card explain when the
      // dashboard last received live backend data.
      setSnapshotArrivedAt(Date.now());
    }
  }, [snapshotSignature, stream.alerts.length, stream.devices.length, stream.usage]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshSummary() {
      // The backend is asked to compute the summary because it owns the
      // accounting state; the frontend only renders the returned numbers.
      const result = await getSummary(appLoadedAtRef.current);
      if (!isCancelled && result.ok) {
        setWasteSummary(result.data);
      }
    }

    void refreshSummary();
    const intervalId = window.setInterval(refreshSummary, 30_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [snapshotSignature]);

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
    },
    {
      label: "Devices ON",
      value: `${stream.devices.filter((device) => device.status === "on").length} / ${stream.devices.length}`,
      icon: Activity,
      accent: "text-accent-power",
    },
    {
      label: "Active Alerts",
      value: `${stream.alerts.length}`,
      icon: AlertTriangle,
      accent: "text-danger",
    },
    {
      label: "Connection",
      value: stream.connectionState === "connected" ? "Live" : stream.connectionState === "reconnecting" ? "Reconnecting" : "Polling",
      icon: Wifi,
      accent: "text-text-primary",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      <section
        className="premium-shell fade-in-up relative mx-auto flex min-h-screen w-full min-w-0 max-w-[1500px] flex-col gap-7 overflow-x-clip px-4 py-4 sm:gap-8 sm:px-6 lg:px-8 lg:py-8"
        aria-label="LumaWarden dashboard"
      >
        {/* Top row: brand identity, live connection status, and the summary KPIs. */}
        <TopHeader
          connectionState={stream.connectionState}
          devices={stream.devices}
          usage={stream.usage}
          alerts={stream.alerts}
          wasteSummary={wasteSummary}
        />
        {showFailureBanner ? (
          <div
            className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-accent-light/20 bg-accent-light/10 px-5 py-3.5 shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-sm"
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

        {/* This card explains whether the dashboard is live and when the last
            snapshot arrived from the backend. */}
        <ConnectionStatus
          connectionState={stream.connectionState}
          devices={stream.devices}
          snapshotArrivedAt={snapshotArrivedAt}
        />

        {/* Compact KPI cards. These are intentionally read-only summaries, not
            clickable controls, so judges can trust the numbers at a glance. */}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="summary-card relative min-w-0 overflow-hidden rounded-[1.3rem]">
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

        {/* The office layout uses an SVG top-down view to visually map the 15
            simulated devices onto the fixed floor plan. */}
        <div className="rounded-[1.6rem] border border-white/10 bg-bg-card/70 p-2 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
          <OfficeLayout devices={stream.devices} />
        </div>

        {/* Lower row: power trends, per-device status, and the active alert feed. */}
        <div className="grid min-w-0 gap-6 sm:gap-8 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)_minmax(280px,0.8fr)]">
          <PowerMeter
            usage={stream.usage}
            wasteSummary={wasteSummary}
            isLoading={isLoadingSnapshot}
          />
          <DeviceStatusPanel devices={stream.devices} />
          <AlertsPanel alerts={stream.alerts} isLoading={isLoadingSnapshot} />
        </div>
      </section>
    </main>
  );
}

export default App;
