import { Activity, Leaf, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isFirebaseConfigured } from "@/lib/firebase-config";

export function DashboardHeader() {
  const connected = isFirebaseConfigured();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Leaf className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sprout Savvy Connect</h1>
          <p className="text-sm text-muted-foreground">AI & IoT tomato monitoring and sorting dashboard</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="gap-1.5 border-border bg-card px-3 py-1.5 text-xs font-medium"
        >
          <span className={`relative flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-warning"}`}>
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${connected ? "bg-success" : "bg-warning"}`}
            />
          </span>
          {connected ? "Live Firebase" : "Demo data"}
        </Badge>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cpu className="h-4 w-4" />
          <span>System active</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardSectionTitle({
  title,
  icon: Icon,
  description,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      <Activity className="h-3 w-3" />
      Live
    </span>
  );
}
