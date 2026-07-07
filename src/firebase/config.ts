import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// ─── Env validation ───────────────────────────────────────────────────────────
// All values MUST come from environment variables. No inline fallbacks —
// a missing var will surface immediately in CI rather than silently ship a
// broken or mispointed configuration to production.

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[Firebase] Missing required environment variable: ${key}. ` +
      `Copy .env.example to .env and fill in the values.`,
    );
  }
  return value as string;
}

const firebaseConfig = {
  apiKey:            requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain:        requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             requireEnv('VITE_FIREBASE_APP_ID'),
  measurementId:     import.meta.env['VITE_FIREBASE_MEASUREMENT_ID'] as string | undefined,
};

// ─── Singleton initialisation ─────────────────────────────────────────────────
// Guard against double-init in HMR / test environments.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Auth ─────────────────────────────────────────────────────────────────────
const auth = getAuth(app);

// ─── Firestore — multi-tab offline persistence ────────────────────────────────
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ─── Storage (chat attachments / avatars) ─────────────────────────────────────
const storage = getStorage(app);

// ─── Cloud Functions ──────────────────────────────────────────────────────────
const functions = getFunctions(app, 'us-central1');

// ─── Local emulator wiring ────────────────────────────────────────────────────
// Only active when VITE_USE_EMULATORS=true, never in production.
if (import.meta.env['VITE_USE_EMULATORS'] === 'true') {
  connectAuthEmulator(auth,        'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db,     'localhost', 8088);
  connectStorageEmulator(storage,  'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.info('[EMF] Running with Firebase Emulators');
}

export { app, auth, db, storage, functions };
