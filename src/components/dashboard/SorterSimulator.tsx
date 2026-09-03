import { useEffect, useRef, useState } from "react";
import { ArrowBigRight, Ban, Cog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Detection } from "@/lib/dashboard-data";
import { getLatestDetections, formatTimestamp } from "@/lib/dashboard-data";

type Action = "divert_ripe" | "divert_unripe" | "reject_blight";

const ACTION_META: Record<Action, { label: string; tone: string; lane: string }> = {
  divert_ripe: { label: "divert_ripe", tone: "text-leaf border-leaf/40 bg-leaf/10", lane: "Lane A · Ripe" },
  divert_unripe: { label: "divert_unripe", tone: "text-info border-info/40 bg-info/10", lane: "Lane B · Unripe" },
  reject_blight: { label: "reject_blight", tone: "text-danger border-danger/40 bg-danger/10", lane: "Reject bin" },
};

function actionFor(detection: Detection): Action {
  if (detection.label !== "Healthy") return "reject_blight";
  return detection.ripeness === "Unripe" ? "divert_unripe" : "divert_ripe";
}

/** Visual simulator of the pneumatic diverter reacting to the newest detection. */
export function SorterSimulator({ detections }: { detections: Record<string, Detection> }) {
  const recent = getLatestDetections(detections, 6);
  const latest = recent[0];
  const [firing, setFiring] = useState(false);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!latest || latest.id === lastId.current) return;
    lastId.current = latest.id;
    setFiring(true);
    const t = setTimeout(() => setFiring(false), 700);
    return () => clearTimeout(t);
  }, [latest]);

  const action = latest ? actionFor(latest) : null;
  const meta = action ? ACTION_META[action] : null;

  return (
    <Card className="border border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Cog className={`h-5 w-5 text-primary ${firing ? "animate-spin" : ""}`} />
          <div>
            <CardTitle className="text-base font-semibold">Pneumatic Sorter</CardTitle>
            <CardDescription>Diverter actions triggered per detection</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current action</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {meta ? meta.lane : "Idle — awaiting fruit"}
              </p>
            </div>
            {meta ? (
              <Badge variant="outline" className={meta.tone}>
                {meta.label}
              </Badge>
            ) : (
              <Ban className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`absolute top-0 h-full w-10 rounded-full bg-primary transition-transform duration-700 ${
                  firing ? "translate-x-[calc(100%*8)]" : "translate-x-0"
                }`}
              />
            </div>
            <ArrowBigRight
              className={`h-5 w-5 transition-colors ${firing ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sorter activity yet.</p>
          ) : (
            recent.map((detection) => {
              const m = ACTION_META[actionFor(detection)];
              return (
                <div
                  key={detection.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <Badge variant="outline" className={m.tone}>
                      {m.label}
                    </Badge>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTimestamp(detection.timestamp)} · {detection.diameterMm} mm · {detection.label}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {detection.confidence}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
