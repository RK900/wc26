import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebaseConfigured';

export { isFirebaseConfigured };

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'fake-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fake-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'fake-app-id',
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
    if (!isFirebaseConfigured() && !import.meta.env.DEV) {
      throw new Error(
        'Firebase is not configured. Copy .env.example to .env.local and fill in VITE_FIREBASE_* values from your Firebase project.',
      );
    }
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    
    if (import.meta.env.DEV) {
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
