import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebaseConfigured';

export { isFirebaseConfigured };

// Emulator is opt-in via VITE_USE_EMULATOR=1 in .env.local. Without the
// flag, even dev builds hit real Firebase using VITE_FIREBASE_* envs —
// otherwise saves silently fail when nobody has run `firebase emulators:
// start` in another terminal.
const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1';

const config = useEmulator
  ? {
      apiKey: 'fake-api-key',
      authDomain: 'fake-auth-domain',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
      appId: 'fake-app-id',
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export function getFirebase(): FirebaseHandles {
  if (!app) {
    if (!isFirebaseConfigured() && !useEmulator) {
      throw new Error(
        'Firebase is not configured. Copy .env.example to .env.local and fill in VITE_FIREBASE_* values from your Firebase project.',
      );
    }
    // Vite HMR can re-execute this module while the underlying Firebase
    // JS instance survives — re-using the existing app avoids double-init
    // errors when only firebase.ts (or one of its callers) changed.
    const existing = getApps();
    app = existing.length > 0 ? existing[0] : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);

    if (useEmulator) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
  }
  return { app, auth: auth!, db: db! };
}

let signInPromise: Promise<void> | null = null;

export async function ensureSignedIn(): Promise<void> {
  const { auth } = getFirebase();
  if (auth.currentUser) return;
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}
