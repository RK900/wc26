import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';

// Authorized admin account. Firestore rules also check this server-side
// (request.auth.token.email == ADMIN_EMAIL), so changing this constant
// alone does not grant admin powers — the rules file is the source of truth.
export const ADMIN_EMAIL = 'rovik05@gmail.com';

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

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.email === ADMIN_EMAIL && user.emailVerified;
}

export function subscribeAuth(cb: (user: User | null) => void): Unsubscribe {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, cb);
}
