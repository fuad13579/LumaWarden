import { Home, Activity, Bell, Settings, Layers } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="h-full min-h-screen w-72 border-r border-white/5 bg-bg-card/70 p-6 shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/5 bg-bg-surface/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-light/12 ring-1 ring-accent-light/20">
              <div className="h-4 w-4 rounded-full bg-accent-light" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Building Suite</p>
              <h3 className="mt-0.5 text-lg font-semibold text-text-primary">LumaWarden</h3>
            </div>
          </div>

          <nav className="space-y-2">
            <a className="flex items-center gap-3 rounded-xl border border-transparent bg-accent-light/8 px-3 py-2.5 text-sm font-medium text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" href="#">
              <Home className="h-4 w-4 text-accent-light" />
              Overview
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Activity className="h-4 w-4 text-text-secondary" />
              Analytics
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Bell className="h-4 w-4 text-text-secondary" />
              Alerts
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Layers className="h-4 w-4 text-text-secondary" />
              Devices
            </a>
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Settings className="h-4 w-4 text-text-secondary" />
              Settings
            </a>
          </nav>
        </div>

        <div className="mt-6 rounded-2xl border border-white/5 bg-bg-surface/65 p-3">
          <button className="w-full rounded-xl border border-white/5 bg-bg-card/70 px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-card">Log out</button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
