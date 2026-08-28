import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase-config";
import {
  DEMO_DATA,
  type DashboardData,
  type Detection,
  type HardwareItem,
} from "@/lib/dashboard-data";

export interface DashboardState {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  /** True when live Firestore subscriptions are active. */
  live: boolean;
}

/**
 * Subscribes to the `detections` and `hardware` Firestore collections in real
 * time. Falls back to bundled demo data when Firebase env vars are missing so
 * the UI is always reviewable.
 */
export function useDashboardData(): DashboardState {
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setData(DEMO_DATA);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const unsubscribes: Array<() => void> = [];
    const next: DashboardData = { detections: DEMO_DATA.detections, hardware: DEMO_DATA.hardware };

    const start = async () => {
      const [{ collection, onSnapshot, query, orderBy }, { getFirebaseFirestore }] =
        await Promise.all([import("firebase/firestore"), import("@/lib/firebase")]);

      const db = await getFirebaseFirestore();
      if (!db || cancelled) {
        setLoading(false);
        return;
      }

      setLive(true);

      unsubscribes.push(
        onSnapshot(
          query(collection(db, "detections"), orderBy("timestamp", "desc")),
          (snapshot) => {
            const detections: Record<string, Detection> = {};
            snapshot.forEach((doc) => {
              detections[doc.id] = { id: doc.id, ...(doc.data() as Omit<Detection, "id">) };
            });
            next.detections = detections;
            if (!cancelled) {
              setData({ ...next });
              setError(null);
              setLoading(false);
            }
          },
          (err) => {
            if (!cancelled) {
              setError(err instanceof Error ? err : new Error(String(err)));
              setLoading(false);
            }
          }
        )
      );

      unsubscribes.push(
        onSnapshot(
          collection(db, "hardware"),
          (snapshot) => {
            const hardware: Record<string, HardwareItem> = {};
            snapshot.forEach((doc) => {
              hardware[doc.id] = doc.data() as HardwareItem;
            });
            next.hardware = hardware;
            if (!cancelled) setData({ ...next });
          },
          (err) => {
            if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
          }
        )
      );
    };

    start().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return { data, loading, error, live };
}
