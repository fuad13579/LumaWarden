import { Home, Activity, Bell, Settings, Layers, Sparkles } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="h-full min-h-screen w-72 border-r border-white/10 bg-[linear-gradient(180deg,rgba(23,27,34,0.95),rgba(13,16,21,0.95))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.34)]">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_30px_rgba(0,0,0,0.2)]">
            <div className="brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-accent-light">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Building Suite</p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-text-primary">LumaWarden</h3>
            </div>
          </div>

          <nav className="space-y-2">
            <a className="button-premium flex items-center gap-3 rounded-2xl border border-transparent bg-white/5 px-3 py-2.5 text-sm font-medium text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" href="#">
              <Home className="h-4 w-4 text-accent-light" />
              Overview
            </a>
            <a className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Activity className="h-4 w-4 text-text-secondary" />
              Analytics
            </a>
            <a className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Bell className="h-4 w-4 text-text-secondary" />
              Alerts
            </a>
            <a className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Layers className="h-4 w-4 text-text-secondary" />
              Devices
            </a>
            <a className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-bg-surface/70 hover:text-text-primary" href="#">
              <Settings className="h-4 w-4 text-text-secondary" />
              Settings
            </a>
          </nav>
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.18)]">
          <button className="button-premium w-full rounded-xl border border-white/10 bg-bg-card/70 px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-card">Log out</button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
