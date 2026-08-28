import { Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Detection, TomatoSize } from "@/lib/dashboard-data";
import { computeMetrics } from "@/lib/dashboard-data";

const SIZE_STYLES: Array<{ name: TomatoSize; text: string; bar: string }> = [
  { name: "Small", text: "text-info", bar: "bg-info" },
  { name: "Medium", text: "text-tomato", bar: "bg-tomato" },
  { name: "Large", text: "text-leaf", bar: "bg-leaf" },
];

/**
 * Size & ripeness grading panel. Shared by the dashboard and the dedicated
 * /yield-monitoring page so both reuse the exact same styling.
 */
export function SizeRipenessPanel({
  detections,
  title = "Size & Ripeness",
  description = "Grading breakdown of detected tomatoes",
}: {
  detections: Record<string, Detection>;
  title?: string;
  description?: string;
}) {
  const metrics = computeMetrics(detections);
  const total = Math.max(metrics.total, 1);
  const ripenessTotal = Math.max(metrics.ripeness.Ripe + metrics.ripeness.Unripe, 1);

  return (
    <Card className="border border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tomato/10">
            <Ruler className="h-5 w-5 text-tomato" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Average Diameter</p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {metrics.size.avgDiameter} mm
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Size classes
          </p>
          {SIZE_STYLES.map((size) => {
            const count = metrics.size.counts[size.name] ?? 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={size.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${size.text}`}>{size.name}</span>
                  <span className="text-muted-foreground">
                    {count} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${size.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-background p-3 text-center">
            <p className="text-2xl font-bold text-tomato">{metrics.ripeness.Ripe}</p>
            <p className="text-xs text-muted-foreground">
              Ripe · {Math.round((metrics.ripeness.Ripe / ripenessTotal) * 100)}%
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-3 text-center">
            <p className="text-2xl font-bold text-leaf">{metrics.ripeness.Unripe}</p>
            <p className="text-xs text-muted-foreground">
              Unripe · {Math.round((metrics.ripeness.Unripe / ripenessTotal) * 100)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
