import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Detection } from "@/lib/dashboard-data";
import { getDiseaseDetections, getLabelColor, formatTimestamp } from "@/lib/dashboard-data";

export function DiseaseAlerts({ detections }: { detections: Record<string, Detection> }) {
  const alerts = getDiseaseDetections(detections).slice(0, 5);

  return (
    <Card className="border border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Disease Alerts</CardTitle>
            <CardDescription>Recent rejected or diseased tomatoes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No disease alerts detected.</p>
        ) : (
          alerts.map((detection) => (
            <div
              key={detection.id}
              className="flex items-center justify-between rounded-lg border border-danger/10 bg-danger/5 p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getLabelColor(detection.label)}>
                    {detection.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(detection.timestamp)}</span>
                </div>
                <p className="text-sm text-foreground">
                  {detection.size} · {detection.diameterMm} mm · {detection.ripeness}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-danger">{detection.confidence}%</span>
                <p className="text-xs text-muted-foreground">confidence</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
