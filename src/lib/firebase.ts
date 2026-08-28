import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import { getPublicFirebaseConfig } from "./firebase-config";

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getPublicFirebaseConfig();
  if (!config) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  }
  return app;
}

export async function getFirebaseFirestore(): Promise<Firestore | null> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!firestore) {
    const { getFirestore } = await import("firebase/firestore");
    firestore = getFirestore(firebaseApp);
  }
  return firestore;
}
