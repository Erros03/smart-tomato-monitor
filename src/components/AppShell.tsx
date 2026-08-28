import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Sprout, Video, History, Leaf } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase-config";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/yield-monitoring", label: "Yield Monitoring", icon: Sprout, exact: false },
  { to: "/live-stream", label: "Live Stream", icon: Video, exact: false },
  { to: "/history", label: "History", icon: History, exact: false },
] as const;

const NAV_LINK_BASE =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const NAV_LINK_ACTIVE = "bg-sidebar-accent text-sidebar-accent-foreground";
const NAV_LINK_INACTIVE = "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";

function ConnectionBadge() {
  const connected = isFirebaseConfigured();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground/80">
      <span className={`relative flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-warning"}`}>
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${connected ? "bg-success" : "bg-warning"}`}
        />
      </span>
      {connected ? "Live Firestore" : "Demo data"}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Leaf className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-sidebar-foreground">Sprout Savvy</p>
        <p className="text-xs text-sidebar-foreground/60">Connect</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className={NAV_LINK_BASE}
                activeProps={{ className: `${NAV_LINK_BASE} ${NAV_LINK_ACTIVE}` }}
                inactiveProps={{ className: `${NAV_LINK_BASE} ${NAV_LINK_INACTIVE}` }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <ConnectionBadge />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-card lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <ConnectionBadge />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
