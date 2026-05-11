import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';

export async function signInAsAdmin(): Promise<User> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutAdmin(): Promise<void> {
  const { auth } = getFirebase();
  await fbSignOut(auth);
}

export function subscribeAuth(cb: (user: User | null) => void): Unsubscribe {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, cb);
}

// Async admin check. Looks up /admin/config in Firestore for the authorized
// UID. The expected UID is NOT in this source file or anywhere else in the
// repo — it lives only in Firestore, created once via the Firebase Console
// (Console writes bypass rules). UI uses this for messaging; firestore.rules
// enforces the same check server-side.
export async function isAdminUser(user: User | null | undefined): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  const { db } = getFirebase();
  try {
    const snap = await getDoc(doc(db, 'admin', 'config'));
    if (!snap.exists()) return false;
    const data = snap.data();
    return typeof data?.uid === 'string' && user.uid === data.uid;
  } catch {
    return false;
  }
}
