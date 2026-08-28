export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getPublicFirebaseConfig(): FirebaseConfig | null {
  const config = {
    apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined,
    authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] as string | undefined,
    databaseURL: import.meta.env["VITE_FIREBASE_DATABASE_URL"] as string | undefined,
    projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] as string | undefined,
    storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] as string | undefined,
    messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] as string | undefined,
    appId: import.meta.env["VITE_FIREBASE_APP_ID"] as string | undefined,
  };

  const hasAllValues = Object.values(config).every((v) => typeof v === "string" && v.length > 0);
  return hasAllValues ? (config as FirebaseConfig) : null;
}

export function isFirebaseConfigured(): boolean {
  return getPublicFirebaseConfig() !== null;
}
