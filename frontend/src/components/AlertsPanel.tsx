import { AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { Alert } from "../types/device";

type AlertsPanelProps = {
  alerts: Alert[];
  isLoading: boolean;
};

const severityConfig: Record<
  Alert["severity"],
  { accent: string; badge: string; surface: string }
> = {
  medium: {
    accent: "alert-accent-medium",
    badge: "severity-badge-medium",
    surface: "border-accent-light/15 bg-accent-light/5",
  },
  high: {
    accent: "alert-accent-high",
    badge: "severity-badge-high",
    surface: "border-danger/20 bg-danger/5",
  },
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
    <section aria-label="Alerts" className="glass-card min-w-0 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="panel-label">System Events</p>
          <h2 className="panel-title mt-1">Alerts</h2>
        </div>
        {!isLoading && alerts.length > 0 ? (
          <span className="font-data rounded-lg border border-white/10 bg-bg-surface px-3 py-1 text-sm font-semibold text-text-secondary">
            {alerts.length} active
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="skeleton-shimmer h-[4.5rem] rounded-[0.95rem] border border-white/5 bg-bg-surface/60"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-[1rem] border border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CheckCircle className="h-5 w-5 shrink-0 text-accent-power" aria-hidden="true" />
          <p className="text-sm font-medium text-text-primary">No active alerts — all clear</p>
        </div>
      ) : (
        <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1 xl:max-h-[32rem]">
          {sortedAlerts.map((alert) => {
            const config = severityConfig[alert.severity];

            return (
              <article
                key={alert.id}
                className={`alert-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.24)] ${config.accent} ${config.surface}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 rounded-xl border border-white/10 bg-bg-card/70 p-2 text-accent-light shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-relaxed text-text-primary">
                        {alert.message}
                      </p>
                      <p className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-text-secondary">
                        <span className="text-text-primary/80">{alert.room}</span>
                        <span className="mx-1.5 text-white/20">·</span>
                        <span className="font-data">{formatCreatedAt(alert.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-data shrink-0 rounded-md px-2 py-0.5 text-[0.675rem] font-semibold uppercase tracking-wider ${config.badge}`}
                  >
                    {alert.severity}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
