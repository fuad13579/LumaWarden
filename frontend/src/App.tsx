import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { DeviceStatusPanel } from "./components/DeviceStatusPanel";
import { OfficeLayout } from "./components/OfficeLayout";
import { PowerMeter } from "./components/PowerMeter";
import { useDeviceStream } from "./hooks/useDeviceStream";

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

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <section
        className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:py-8"
        aria-label="LumaWarden dashboard"
      >
        {showFailureBanner ? (
          <div
            className="flex items-center justify-between gap-4 rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-100"
            role="status"
          >
            <p className="text-sm font-medium">
              Having trouble reaching the server - retrying...
            </p>
            <button
              type="button"
              onClick={() => setIsErrorDismissed(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-amber-100 hover:bg-amber-400/15"
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

        <OfficeLayout devices={stream.devices} />

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.35fr)_minmax(280px,0.8fr)]">
          <PowerMeter
            usage={stream.usage}
            appLoadedAt={appLoadedAtRef.current}
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
