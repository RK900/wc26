import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { isSignedIn, signInWithGoogle, signOutUser, useAuthStore } from '@/store/authStore';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            <span className="text-accent">World Cup 2026</span> Bracket Challenge
          </Link>
          <AuthControl />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 pb-24">
        <Outlet />
      </main>
    </div>
  );
}

function AuthControl() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [busy, setBusy] = useState(false);

  // Wait for the initial auth state so we don't flash "Sign in" while a
  // persisted Google session is restoring.
  if (!ready) return null;

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // Benign (popup closed/blocked) — the button just resets.
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  };

  if (isSignedIn(user)) {
    const label = user.displayName || user.email || 'Account';
    return (
      <div className="flex items-center gap-3 text-sm">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            className="h-7 w-7 rounded-full border border-border"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="hidden max-w-[12rem] truncate text-muted sm:inline">{label}</span>
        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 font-medium hover:border-accent/40 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignIn}
      disabled={busy}
      className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
    >
      {busy ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}
