import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Detection } from "@/lib/dashboard-data";
import { getLatestDetections, getLabelColor, formatTimestamp } from "@/lib/dashboard-data";

export function RecentDetectionsTable({ detections }: { detections: Record<string, Detection> }) {
  const rows = getLatestDetections(detections, 10);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">Recent Detections</h2>
        <span className="text-xs text-muted-foreground">Last {rows.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Ripeness</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No detections yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((detection) => (
                <TableRow key={detection.id}>
                  <TableCell className="font-medium text-foreground">
                    {formatTimestamp(detection.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getLabelColor(detection.label)}>
                      {detection.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {detection.size} <span className="text-muted-foreground">({detection.diameterMm} mm)</span>
                  </TableCell>
                  <TableCell>{detection.ripeness}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{detection.confidence}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
