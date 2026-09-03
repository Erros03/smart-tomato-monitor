import { createFileRoute } from "@tanstack/react-router";
import { Sprout, Ruler, Gauge, AlertTriangle } from "lucide-react";
import { StatCardGrid, type StatCardItem } from "@/components/dashboard/StatCards";
import { SizeRipenessPanel } from "@/components/dashboard/SizeRipenessPanel";
import { ThroughputPanel, computeThroughput } from "@/components/dashboard/ThroughputPanel";
import { SorterSimulator } from "@/components/dashboard/SorterSimulator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { computeMetrics, type TomatoSize } from "@/lib/dashboard-data";

export const Route = createFileRoute("/yield-monitoring")({
  head: () => ({
    meta: [
      { title: "Yield Monitoring | Sprout Savvy Connect" },
      {
        name: "description",
        content:
          "Track yield volume, average diameter, and size-class distribution of sorted tomatoes.",
      },
      { property: "og:title", content: "Yield Monitoring | Sprout Savvy Connect" },
      {
        property: "og:description",
        content:
          "Track yield volume, average diameter, and size-class distribution of sorted tomatoes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YieldMonitoringPage,
});

const SIZE_ORDER: TomatoSize[] = ["Small", "Medium", "Large"];

function YieldMonitoringPage() {
  const { data, loading, error } = useDashboardData();
  const metrics = computeMetrics(data.detections);
  const throughput = computeThroughput(data.detections);

  const items: StatCardItem[] = [
    {
      label: "Total Detections",
      value: metrics.total,
      icon: Sprout,
      color: "text-leaf",
      bg: "bg-leaf/10",
    },
    {
      label: "Average Diameter",
      value: `${metrics.size.avgDiameter} mm`,
      icon: Ruler,
      color: "text-tomato",
      bg: "bg-tomato/10",
    },
    {
      label: "Throughput / hour",
      value: throughput.perHour,
      icon: Gauge,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Defect Rate",
      value: `${throughput.defectRate}%`,
      icon: AlertTriangle,
      color: "text-danger",
      bg: "bg-danger/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf/10 text-leaf">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Yield Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              Marketable output and grading quality of the sorting line
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            Failed to connect to Firebase: {error.message}
          </div>
        )}

        {loading && !error && (
          <div className="mt-4 text-sm text-muted-foreground">Loading live data…</div>
        )}

        <div className="mt-6 space-y-6">
          <StatCardGrid items={items} />

          <div className="grid gap-6 lg:grid-cols-3">
            <SizeRipenessPanel
              detections={data.detections}
              title="Marketable Size & Ripeness"
              description="Grading breakdown of all detected fruit"
            />

            <Card className="border border-border/60 bg-card shadow-sm lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Yield by Size Class</CardTitle>
                <CardDescription>
                  Detected fruit per size class, with share of total yield
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {SIZE_ORDER.map((size) => {
                  const count = metrics.size.counts[size] ?? 0;
                  const totalCount = Math.max(metrics.total, 1);
                  const pct = Math.round((count / totalCount) * 100);
                  return (
                    <div
                      key={size}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{size}</p>
                        <p className="text-xs text-muted-foreground">
                          {size === "Small" && "< 50 mm"}
                          {size === "Medium" && "50 – 65 mm"}
                          {size === "Large" && "≥ 66 mm"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted sm:w-48">
                          <div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-lg font-bold text-foreground">{count}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Detected fruit average {metrics.size.avgDiameter} mm in diameter across{" "}
                  {metrics.total} tomatoes.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ThroughputPanel detections={data.detections} />
            </div>
            <SorterSimulator detections={data.detections} />
          </div>
        </div>
      </main>
    </div>
  );
}
