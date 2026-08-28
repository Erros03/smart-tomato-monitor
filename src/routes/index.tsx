import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { HardwareStatus } from "@/components/dashboard/HardwareStatus";
import { RecentDetectionsTable } from "@/components/dashboard/RecentDetectionsTable";
import { DiseaseAlerts } from "@/components/dashboard/DiseaseAlerts";
import { DetectionSummary } from "@/components/dashboard/DetectionSummary";
import { SizeRipenessPanel } from "@/components/dashboard/SizeRipenessPanel";
import { useDashboardData } from "@/hooks/useDashboardData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Sprout Savvy Connect" },
      {
        name: "description",
        content:
          "Real-time tomato disease detection, ripeness classification, and IoT hardware monitoring for the Sprout Savvy Connect sorting system.",
      },
      { property: "og:title", content: "Dashboard | Sprout Savvy Connect" },
      {
        property: "og:description",
        content:
          "Real-time tomato disease detection, ripeness classification, and IoT hardware monitoring for the Sprout Savvy Connect sorting system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data, loading, error } = useDashboardData();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader />

        {error && (
          <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            Failed to connect to Firebase: {error.message}
          </div>
        )}

        {loading && !error && (
          <div className="mt-4 text-sm text-muted-foreground">Loading live data…</div>
        )}

        <div className="mt-6 space-y-6">
          <StatCards detections={data.detections} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <HardwareStatus hardware={data.hardware} />
            </div>
            <div>
              <DiseaseAlerts detections={data.detections} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SizeRipenessPanel detections={data.detections} />
            <div className="lg:col-span-2">
              <DetectionSummary detections={data.detections} />
            </div>
          </div>

          <RecentDetectionsTable detections={data.detections} />
        </div>
      </main>
    </div>
  );
}
