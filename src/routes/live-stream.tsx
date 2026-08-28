import { createFileRoute } from "@tanstack/react-router";
import { Video, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RoboflowDetector } from "@/components/dashboard/RoboflowDetector";
import { Badge } from "@/components/ui/badge";
import { LivePill } from "@/components/dashboard/DashboardHeader";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getLatestDetections, getLabelColor, formatTimestamp } from "@/lib/dashboard-data";

export const Route = createFileRoute("/live-stream")({
  head: () => ({
    meta: [
      { title: "Live Stream | Sprout Savvy Connect" },
      {
        name: "description",
        content:
          "Watch the YOLO vision camera feed and live detection events from the tomato sorting line.",
      },
      { property: "og:title", content: "Live Stream | Sprout Savvy Connect" },
      {
        property: "og:description",
        content:
          "Watch the YOLO vision camera feed and live detection events from the tomato sorting line.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveStreamPage,
});

function LiveStreamPage() {
  const { data, live, error } = useDashboardData();
  const events = getLatestDetections(data.detections, 12);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Stream</h1>
              <p className="text-sm text-muted-foreground">
                Annotated camera feed and detection events
              </p>
            </div>
          </div>
          <LivePill />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            Failed to connect to Firebase: {error.message}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border border-border/60 bg-card shadow-sm lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">AI Detection Camera</CardTitle>
              </div>
              <CardDescription>
                Run your trained Roboflow model on camera frames or uploaded images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoboflowDetector />
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Detection Events</CardTitle>
              <CardDescription>Latest classifications from the stream</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No detection events yet.</p>
              ) : (
                events.map((detection) => (
                  <div
                    key={detection.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background p-2.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <Badge variant="outline" className={getLabelColor(detection.label)}>
                        {detection.label}
                      </Badge>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatTimestamp(detection.timestamp)} · {detection.diameterMm} mm ·{" "}
                        {detection.ripeness}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-foreground">
                      {detection.confidence}%
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
