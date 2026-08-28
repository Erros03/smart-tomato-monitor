import {
  Camera,
  Microchip,
  Contrast,
  Settings,
  MoveHorizontal,
  Zap,
  Activity,
  WifiOff,
  AlertTriangle,
  PauseCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HardwareItem, HardwareState } from "@/lib/dashboard-data";
import { getStateColor } from "@/lib/dashboard-data";

const hardwareIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  arduino: Microchip,
  conveyor: MoveHorizontal,
  servo: Settings,
  sensors: Contrast,
  power: Zap,
};

function stateIcon(state: HardwareState) {
  if (state === "online") return Activity;
  if (state === "offline") return WifiOff;
  if (state === "warning") return AlertTriangle;
  return PauseCircle;
}

export function HardwareStatus({ hardware }: { hardware: Record<string, HardwareItem> }) {
  const items = Object.entries(hardware);

  return (
    <Card className="border border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Microchip className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Hardware Status</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {items.filter(([, h]) => h.state === "online").length}/{items.length} online
          </Badge>
        </div>
        <CardDescription>Real-time IoT device health and status</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([key, item]) => {
          const Icon = hardwareIcons[key] || Microchip;
          const StateIcon = stateIcon(item.state);
          return (
            <div
              key={key}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                  <Badge variant="outline" className={`shrink-0 gap-1 text-xs ${getStateColor(item.state)}`}>
                    <StateIcon className="h-3 w-3" />
                    {item.state}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
