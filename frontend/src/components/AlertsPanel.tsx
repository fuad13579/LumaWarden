import { CheckCircle } from "lucide-react";
import { useMemo } from "react";
import type { Alert } from "../types/device";

type AlertsPanelProps = {
  alerts: Alert[];
  isLoading: boolean;
};

const severityStyles: Record<Alert["severity"], string> = {
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  high: "border-red-400/40 bg-red-400/10 text-red-100",
};

function formatCreatedAt(createdAt: string): string {
  const timestamp = Date.parse(createdAt);

  if (Number.isNaN(timestamp)) {
    return createdAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function AlertsPanel({ alerts, isLoading }: AlertsPanelProps) {
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort(
        (left, right) =>
          Date.parse(right.created_at) - Date.parse(left.created_at),
      ),
    [alerts],
  );

  return (
    <section aria-label="Alerts" className="glass-card p-5">
      <h2 className="text-base font-semibold text-slate-100">Alerts</h2>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-md border border-slate-700/50 bg-slate-800/45"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-5 text-emerald-100">
          <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">No active alerts - all clear</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-md border px-4 py-3 ${severityStyles[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{alert.message}</p>
                <span className="shrink-0 font-mono text-xs uppercase">
                  {alert.severity}
                </span>
              </div>
              <p className="mt-2 text-xs opacity-80">
                {alert.room} / {formatCreatedAt(alert.created_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
