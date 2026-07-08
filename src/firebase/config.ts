import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDs0ib700UsoUlt8zHJcc5PyL7GBpfJnI8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "emf-group-web.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "emf-group-web",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "emf-group-web.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "506946138267",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:506946138267:web:21ebfeb9d1a5087c59963e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H10KDK8L08"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);

// Initialize Firestore with local persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Connect to Emulators if running on localhost
if (window.location.hostname === 'localhost') {
  console.log("🛠️ Running on localhost! Connecting to Firebase Emulators...");
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { app, auth, db, analytics };
