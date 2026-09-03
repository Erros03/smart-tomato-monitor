import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Detection } from "@/lib/dashboard-data";
import { getAllDetections } from "@/lib/dashboard-data";

export interface ThroughputStats {
  total: number;
  ripe: number;
  unripe: number;
  blight: number;
  defectRate: number;
  perHour: number;
}

export function computeThroughput(detections: Record<string, Detection>): ThroughputStats {
  const all = getAllDetections(detections);
  const total = all.length;
  const blight = all.filter((d) => d.label !== "Healthy").length;
  const ripe = all.filter((d) => d.label === "Healthy" && d.ripeness === "Ripe").length;
  const unripe = all.filter((d) => d.label === "Healthy" && d.ripeness === "Unripe").length;

  let perHour = 0;
  if (total > 1) {
    const times = all.map((d) => d.timestamp);
    const spanMs = Math.max(...times) - Math.min(...times);
    perHour = spanMs > 0 ? Math.round((total / spanMs) * 3_600_000) : total;
  }

  return {
    total,
    ripe,
    unripe,
    blight,
    defectRate: total ? Math.round((blight / total) * 100) : 0,
    perHour,
  };
}

/** Buckets detections into 5-minute slots for the trend chart. */
function buildTrend(detections: Record<string, Detection>) {
  const all = getAllDetections(detections);
  if (all.length === 0) return [];
  const BUCKET = 5 * 60 * 1000;
  const map = new Map<number, { time: number; total: number; defects: number }>();
  for (const d of all) {
    const key = Math.floor(d.timestamp / BUCKET) * BUCKET;
    const slot = map.get(key) ?? { time: key, total: 0, defects: 0 };
    slot.total++;
    if (d.label !== "Healthy") slot.defects++;
    map.set(key, slot);
  }
  return [...map.values()]
    .sort((a, b) => a.time - b.time)
    .slice(-24)
    .map((slot) => ({
      ...slot,
      label: new Date(slot.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));
}

export function ThroughputPanel({ detections }: { detections: Record<string, Detection> }) {
  const trend = buildTrend(detections);

  return (
    <Card className="border border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Throughput & Defect Trend</CardTitle>
        <CardDescription>Detections and defects per 5-minute window</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No detections recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "var(--color-card-foreground)" }}
                />
                <Area type="monotone" dataKey="total" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18} name="Detections" />
                <Area type="monotone" dataKey="defects" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} name="Defects" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
