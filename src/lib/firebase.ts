import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import type { Database } from "firebase/database";
import { getPublicFirebaseConfig } from "./firebase-config";

let app: FirebaseApp | null = null;
let database: Database | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getPublicFirebaseConfig();
  if (!config) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  }
  return app;
}

/** Firebase Realtime Database instance, or null when env vars are missing. */
export async function getFirebaseDatabase(): Promise<Database | null> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!database) {
    const { getDatabase } = await import("firebase/database");
    database = getDatabase(firebaseApp);
  }
  return database;
}
