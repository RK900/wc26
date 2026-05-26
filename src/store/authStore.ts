import { create } from 'zustand';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getFirebase, isFirebaseConfigured } from '@/lib/firebase';

interface AuthState {
  // Current Firebase user. May be anonymous (browsing session), a Google
  // user (signed in), or null before the first auth state resolves.
  user: User | null;
  // True once Firebase has reported the initial auth state. Lets the UI
  // avoid flashing a "signed out" view while a persisted session restores.
  ready: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  ready: false,
}));

// A "real" (non-anonymous) user — i.e. signed in with Google. Anonymous
// sessions exist only so browsing/reads work; they never own brackets.
export function isSignedIn(user: User | null): user is User {
  return !!user && !user.isAnonymous;
}

let started = false;

// Subscribe to Firebase auth state exactly once. Safe to call repeatedly
// (e.g. from React StrictMode double-invocation). No-ops until Firebase is
// configured.
export function initAuth(): void {
  if (started || !isFirebaseConfigured()) return;
  started = true;
  const { auth } = getFirebase();
  onAuthStateChanged(auth, (user) => {
    useAuthStore.setState({ user, ready: true });
  });
}

export async function signInWithGoogle(): Promise<User> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

// Sign out of Google, then immediately drop back to an anonymous session so
// browsing and reads keep working (Firestore rules require an authed user).
export async function signOutUser(): Promise<void> {
  const { auth } = getFirebase();
  await fbSignOut(auth);
  await signInAnonymously(auth);
}
