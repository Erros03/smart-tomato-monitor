import {
  Leaf,
  AlertTriangle,
  Timer,
  TrendingUp,
  Ruler,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Detection } from "@/lib/dashboard-data";
import { computeMetrics } from "@/lib/dashboard-data";

export interface StatCardItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}

export function StatCardGrid({
  items,
  className = "grid-cols-2 sm:grid-cols-4",
}: {
  items: StatCardItem[];
  className?: string;
}) {
  return (
    <div className={`grid gap-4 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{item.label}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{item.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function StatCards({ detections }: { detections: Record<string, Detection> }) {
  const metrics = computeMetrics(detections);

  const items: StatCardItem[] = [
    {
      label: "Total Detections",
      value: metrics.total,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Healthy",
      value: metrics.healthy,
      icon: Leaf,
      color: "text-leaf",
      bg: "bg-leaf/10",
    },
    {
      label: "Diseased",
      value: metrics.diseased,
      icon: AlertTriangle,
      color: "text-danger",
      bg: "bg-danger/10",
    },
    {
      label: "Avg Confidence",
      value: `${metrics.avgConfidence}%`,
      icon: Timer,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Average Diameter",
      value: `${metrics.size.avgDiameter} mm`,
      icon: Ruler,
      color: "text-tomato",
      bg: "bg-tomato/10",
    },
  ];

  return <StatCardGrid items={items} />;
}
