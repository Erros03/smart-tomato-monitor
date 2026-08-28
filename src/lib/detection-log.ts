import type { Detection, TomatoLabel, TomatoRipeness, TomatoSize } from "./dashboard-data";
import type { RoboflowPrediction } from "./roboflow.server";
import { isFirebaseConfigured } from "./firebase-config";

/**
 * Approximate camera field of view across the full frame width, in millimetres.
 * Used to convert a bounding-box width in pixels into a tomato diameter.
 */
const FRAME_WIDTH_MM = 300;

export function estimateDiameterMm(widthPx: number, imageWidthPx: number): number {
  if (!imageWidthPx) return 0;
  return Math.round((widthPx / imageWidthPx) * FRAME_WIDTH_MM);
}

export function sizeFromDiameter(diameterMm: number): TomatoSize {
  if (diameterMm >= 66) return "Large";
  if (diameterMm >= 50) return "Medium";
  return "Small";
}

export function labelFromClass(className: string): TomatoLabel {
  const name = className.toLowerCase();
  if (name.includes("late")) return "Late Blight";
  if (name.includes("blight")) return "Early Blight";
  if (name.includes("spot")) return "Bacterial Spot";
  if (name.includes("mold")) return "Leaf Mold";
  return "Healthy";
}

export function ripenessFromClass(className: string): TomatoRipeness {
  return className.toLowerCase().includes("unripe") ? "Unripe" : "Ripe";
}

/** Maps a Roboflow prediction to the app's Detection shape. */
export function predictionToDetection(
  prediction: RoboflowPrediction,
  imageWidth: number,
  timestamp: number,
): Omit<Detection, "id"> & { className: string } {
  const diameterMm = estimateDiameterMm(prediction.width, imageWidth);
  return {
    label: labelFromClass(prediction.className),
    className: prediction.className,
    confidence: Math.round(prediction.confidence * 100),
    diameterMm,
    size: sizeFromDiameter(diameterMm),
    ripeness: ripenessFromClass(prediction.className),
    timestamp,
  };
}

/**
 * Pushes each detected tomato to the Realtime Database under `/detections`.
 * No-ops (returns 0) when Firebase env vars are not configured.
 */
export async function saveDetections(
  predictions: RoboflowPrediction[],
  imageWidth: number,
): Promise<number> {
  if (predictions.length === 0) return 0;
  if (!isFirebaseConfigured()) return 0;

  const [{ ref, push, set, serverTimestamp }, { getFirebaseDatabase }] = await Promise.all([
    import("firebase/database"),
    import("./firebase"),
  ]);

  const db = await getFirebaseDatabase();
  if (!db) return 0;

  const now = Date.now();
  const detectionsRef = ref(db, "detections");

  await Promise.all(
    predictions.map((prediction) => {
      const entry = predictionToDetection(prediction, imageWidth, now);
      const newRef = push(detectionsRef);
      return set(newRef, { ...entry, id: newRef.key, createdAt: serverTimestamp() });
    }),
  );

  return predictions.length;
}
