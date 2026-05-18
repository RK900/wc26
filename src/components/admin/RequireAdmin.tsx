import { useEffect, useState, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { isAdminUser, signInAsAdmin, signOutAdmin, subscribeAuth } from '@/lib/adminAuth';
import { isFirebaseConfigured } from '@/lib/firebaseConfigured';

// Renders `children` only if the current Firebase user is the configured
// admin (matched against /admin/config in Firestore). Shows sign-in,
// pending, or denied UI otherwise. In dev mode, bypasses the check and
// always renders `children` so /smoke and /admin work without Google auth.
export function RequireAdmin({ children }: { children: ReactNode }) {
  if (!isFirebaseConfigured()) {
    return (
      <div className="mx-auto max-w-md rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        <p className="font-semibold">Firebase isn't configured.</p>
        <p className="mt-1 text-warn/80">
          Admin features need Firebase. Set the VITE_FIREBASE_* environment variables
          and rebuild.
        </p>
      </div>
    );
  }
  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [adminCheck, setAdminCheck] = useState<'pending' | 'admin' | 'denied'>('pending');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => subscribeAuth(setUser), []);

  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.isAnonymous) {
      setAdminCheck('pending');
      return;
    }
    setAdminCheck('pending');
    let cancelled = false;
    isAdminUser(user).then((ok) => {
      if (!cancelled) setAdminCheck(ok ? 'admin' : 'denied');
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user === undefined) {
    return <div className="text-muted">Loading…</div>;
  }

  const isDev = import.meta.env.DEV;

  if (!isDev && (!user || user.isAnonymous)) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Admin Sign In</h1>
        <p className="mb-6 text-sm text-muted">
          Only the authorized admin account can access this page.
        </p>
        <button
          disabled={signingIn}
          onClick={async () => {
            setSignInError(null);
            setSigningIn(true);
            try {
              await signInAsAdmin();
            } catch (e) {
              setSignInError(e instanceof Error ? e.message : String(e));
            } finally {
              setSigningIn(false);
            }
          }}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {signInError && <p className="mt-3 text-xs text-danger">{signInError}</p>}
      </div>
    );
  }

  if (!isDev && adminCheck === 'pending') {
    return <div className="text-muted">Checking admin status…</div>;
  }

  if (!isDev && adminCheck === 'denied') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Not authorized</h1>
        <p className="mb-2 text-sm text-muted">
          This account isn't the admin. Your Firebase UID is:
        </p>
        <code className="mb-4 block break-all rounded bg-surface-2 px-3 py-2 text-xs">
          {user!.uid}
        </code>
        <p className="mb-6 text-xs text-muted">
          If you're bootstrapping admin access, paste this UID into the{' '}
          <code>/admin/config</code> doc in Firestore (field <code>uid</code>).
        </p>
        <button
          onClick={() => signOutAdmin()}
          className="rounded-md border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold hover:border-accent/40"
        >
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
