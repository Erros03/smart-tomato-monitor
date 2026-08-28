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
  /** True when live Realtime Database subscriptions are active. */
  live: boolean;
}

/**
 * Subscribes to the `detections` and `hardware` nodes of the Firebase Realtime
 * Database. Falls back to bundled demo data when Firebase env vars are missing
 * so the UI is always reviewable.
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
    const next: DashboardData = { detections: {}, hardware: DEMO_DATA.hardware };

    const start = async () => {
      const [{ ref, onValue }, { getFirebaseDatabase }] = await Promise.all([
        import("firebase/database"),
        import("@/lib/firebase"),
      ]);

      const db = await getFirebaseDatabase();
      if (!db || cancelled) {
        setLoading(false);
        return;
      }

      setLive(true);

      unsubscribes.push(
        onValue(
          ref(db, "detections"),
          (snapshot) => {
            const detections: Record<string, Detection> = {};
            snapshot.forEach((child) => {
              const value = child.val() as Omit<Detection, "id">;
              detections[child.key!] = { ...value, id: child.key! };
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
          },
        ),
      );

      unsubscribes.push(
        onValue(
          ref(db, "hardware"),
          (snapshot) => {
            const value = snapshot.val() as Record<string, HardwareItem> | null;
            next.hardware = value ?? DEMO_DATA.hardware;
            if (!cancelled) setData({ ...next });
          },
          (err) => {
            if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
          },
        ),
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
