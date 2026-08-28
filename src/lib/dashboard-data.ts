export type TomatoSize = "Small" | "Medium" | "Large";
export type TomatoRipeness = "Ripe" | "Unripe";
export type TomatoLabel =
  | "Healthy"
  | "Early Blight"
  | "Late Blight"
  | "Bacterial Spot"
  | "Leaf Mold"
  | "Septoria Leaf Spot"
  | "Spider Mites"
  | "Target Spot"
  | "Mosaic Virus"
  | "Yellow Leaf Curl Virus";

export type HardwareState = "online" | "offline" | "standby" | "warning";

export interface Detection {
  id: string;
  label: TomatoLabel;
  confidence: number;
  diameterMm: number;
  size: TomatoSize;
  ripeness: TomatoRipeness;
  timestamp: number;
}

export interface HardwareItem {
  name: string;
  detail: string;
  state: HardwareState;
}

export interface DashboardData {
  detections: Record<string, Detection>;
  hardware: Record<string, HardwareItem>;
}

/**
 * Aggregate metrics for the dashboard. Exposed as a single object so pages can
 * read values like `metrics.size.avgDiameter`.
 */
export interface DashboardMetrics {
  total: number;
  healthy: number;
  diseased: number;
  /** Mean model confidence (0-100). */
  avgConfidence: number;
  size: {
    /** Mean diameter in millimetres across all detections. */
    avgDiameter: number;
    counts: Record<TomatoSize, number>;
  };
  ripeness: Record<TomatoRipeness, number>;
}

export const DEMO_DATA: DashboardData = {
  detections: {
    "healthy-01": {
      id: "healthy-01",
      label: "Healthy",
      confidence: 94,
      diameterMm: 61,
      size: "Medium",
      ripeness: "Ripe",
      timestamp: 1756000000000,
    },
    "healthy-02": {
      id: "healthy-02",
      label: "Healthy",
      confidence: 91,
      diameterMm: 58,
      size: "Medium",
      ripeness: "Ripe",
      timestamp: 1756000002600,
    },
    "early-blight-01": {
      id: "early-blight-01",
      label: "Early Blight",
      confidence: 89,
      diameterMm: 45,
      size: "Small",
      ripeness: "Unripe",
      timestamp: 1756000005200,
    },
    "healthy-03": {
      id: "healthy-03",
      label: "Healthy",
      confidence: 96,
      diameterMm: 72,
      size: "Large",
      ripeness: "Ripe",
      timestamp: 1756000007800,
    },
    "late-blight-01": {
      id: "late-blight-01",
      label: "Late Blight",
      confidence: 87,
      diameterMm: 49,
      size: "Small",
      ripeness: "Ripe",
      timestamp: 1756000010400,
    },
    "healthy-04": {
      id: "healthy-04",
      label: "Healthy",
      confidence: 92,
      diameterMm: 64,
      size: "Medium",
      ripeness: "Unripe",
      timestamp: 1756000013000,
    },
    "early-blight-02": {
      id: "early-blight-02",
      label: "Early Blight",
      confidence: 85,
      diameterMm: 55,
      size: "Medium",
      ripeness: "Ripe",
      timestamp: 1756000015600,
    },
    "healthy-05": {
      id: "healthy-05",
      label: "Healthy",
      confidence: 93,
      diameterMm: 67,
      size: "Medium",
      ripeness: "Ripe",
      timestamp: 1756000018200,
    },
  },
  hardware: {
    camera: {
      name: "YOLO Vision Camera",
      detail: "Laptop webcam · 30 FPS inference",
      state: "online",
    },
    arduino: {
      name: "Arduino Uno",
      detail: "Serial COM3 · 9600 baud",
      state: "online",
    },
    conveyor: {
      name: "Conveyor Belt",
      detail: "Motor driver · 0.4 m/s",
      state: "online",
    },
    servo: {
      name: "Servo Motor (Sorter)",
      detail: "Sorting gate · 0°/90°",
      state: "standby",
    },
    sensors: {
      name: "Proximity Sensors",
      detail: "IR pair · entry & exit",
      state: "online",
    },
    power: {
      name: "Power Supply",
      detail: "12V 5A regulated",
      state: "online",
    },
  },
};

export function computeMetrics(detections: Record<string, Detection>): DashboardMetrics {
  const values = Object.values(detections);
  const total = values.length;
  const healthy = values.filter((d) => d.label === "Healthy").length;
  const diseased = total - healthy;

  const sizeCounts: Record<TomatoSize, number> = { Small: 0, Medium: 0, Large: 0 };
  const ripeness: Record<TomatoRipeness, number> = { Ripe: 0, Unripe: 0 };
  let diameterSum = 0;
  let confidenceSum = 0;

  for (const d of values) {
    sizeCounts[d.size] = (sizeCounts[d.size] || 0) + 1;
    ripeness[d.ripeness] = (ripeness[d.ripeness] || 0) + 1;
    diameterSum += d.diameterMm;
    confidenceSum += d.confidence;
  }

  return {
    total,
    healthy,
    diseased,
    avgConfidence: total > 0 ? Math.round(confidenceSum / total) : 0,
    size: {
      avgDiameter: total > 0 ? Math.round(diameterSum / total) : 0,
      counts: sizeCounts,
    },
    ripeness,
  };
}

export function getLatestDetections(
  detections: Record<string, Detection>,
  limit = 8
): Detection[] {
  return Object.values(detections)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getAllDetections(detections: Record<string, Detection>): Detection[] {
  return Object.values(detections).sort((a, b) => b.timestamp - a.timestamp);
}

export function getDiseaseDetections(detections: Record<string, Detection>): Detection[] {
  return Object.values(detections)
    .filter((d) => d.label !== "Healthy")
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function computeDiseaseCounts(detections: Record<string, Detection>) {
  return Object.values(detections).reduce(
    (acc, detection) => {
      const key = detection.label;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

export function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

export function getStateColor(state: HardwareState): string {
  switch (state) {
    case "online":
      return "bg-success/15 text-success border-success/20";
    case "offline":
      return "bg-danger/15 text-danger border-danger/20";
    case "warning":
      return "bg-warning/15 text-warning-foreground border-warning/20";
    case "standby":
      return "bg-info/15 text-info border-info/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getLabelColor(label: TomatoLabel): string {
  if (label === "Healthy") return "bg-success/15 text-success border-success/20";
  if (label.includes("Blight") || label.includes("Spot") || label.includes("Mold")) {
    return "bg-danger/15 text-danger border-danger/20";
  }
  return "bg-warning/15 text-warning-foreground border-warning/20";
}

export function computeRipenessCounts(detections: Record<string, Detection>) {
  return Object.values(detections).reduce(
    (acc, detection) => {
      acc[detection.ripeness] = (acc[detection.ripeness] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}
