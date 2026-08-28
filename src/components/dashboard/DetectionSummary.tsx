import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Detection } from "@/lib/dashboard-data";
import { computeDiseaseCounts, computeRipenessCounts } from "@/lib/dashboard-data";

const DISEASE_COLORS = ["#22c55e", "#ef4444", "#f97316", "#eab308", "#3b82f6", "#a855f7"];
const RIPENESS_COLORS = ["#f97316", "#84cc16"];

export function DetectionSummary({ detections }: { detections: Record<string, Detection> }) {
  const diseaseCounts = computeDiseaseCounts(detections);
  const diseaseData = Object.entries(diseaseCounts).map(([name, value]) => ({ name, value }));

  const ripenessCounts = computeRipenessCounts(detections);
  const ripenessData = Object.entries(ripenessCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Detection Labels</CardTitle>
          <CardDescription>Distribution of detected tomato conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={diseaseData.length ? diseaseData : [{ name: "No data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(diseaseData.length ? diseaseData : [{ name: "No data" }]).map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={DISEASE_COLORS[index % DISEASE_COLORS.length]}
                      stroke="var(--color-card)"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "var(--color-card-foreground)" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Ripeness Overview</CardTitle>
          <CardDescription>Ripe vs unripe tomato counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ripenessData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "var(--color-card-foreground)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ripenessData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={RIPENESS_COLORS[index % RIPENESS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
