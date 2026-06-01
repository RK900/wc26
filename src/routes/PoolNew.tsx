import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isFirebaseConfigured } from '@/lib/firebase';
import { formatDeadline, isPastDeadline } from '@/lib/deadline';
import { createPool } from '@/lib/poolApi';
import { createBracket } from '@/lib/bracketApi';
import { isSignedIn, signInWithGoogle, useAuthStore } from '@/store/authStore';
import { initialPicks, useBracketStore } from '@/store/bracketStore';

export function PoolNew() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const signedIn = isSignedIn(user);

  const [poolName, setPoolName] = useState('');
  const [password, setPassword] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the display name from the Google account once, then leave it
  // editable (people may want a different name in the pool).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefilled.current && signedIn && user?.displayName) {
      setCreatorName(user.displayName);
      prefilled.current = true;
    }
  }, [signedIn, user]);

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      // Benign (popup closed/blocked) — the button just resets.
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. See README.');
      return;
    }
    if (isPastDeadline()) {
      setError(`Bracket submissions closed at ${formatDeadline()}.`);
      return;
    }
    if (!signedIn || !user) {
      setError('Please sign in with Google first.');
      return;
    }
    if (!poolName.trim() || !password || !creatorName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const pool = await createPool(poolName.trim(), password);
      // A new pool starts with a fresh bracket — don't seed it with picks
      // that happen to be in the persisted store from another pool.
      const picks = initialPicks();
      const bracket = await createBracket({
        poolId: pool.id,
        poolName: pool.name,
        ownerUid: user.uid,
        nickname: creatorName.trim(),
        picks,
      });
      useBracketStore.setState({ picks, poolId: pool.id, bracketId: bracket.id });
      navigate(`/pool/${pool.id}/bracket/${bracket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  if (isPastDeadline()) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-2xl font-semibold">Create a pool</h1>
        <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          <p className="font-semibold">Bracket submissions are closed.</p>
          <p className="mt-1 text-warn/80">
            The deadline was {formatDeadline()}. New pools can't be created until
            the next tournament.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-semibold hover:bg-warn/20"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold">Create a pool</h1>
      <p className="mb-6 text-sm text-muted">
        You'll get a shareable link. Anyone with the link + password can submit a bracket.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Pool name">
          <input
            type="text"
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            required
            maxLength={60}
            className={inputClass}
            placeholder="e.g. Friends 2026"
          />
        </Field>

        <Field label="Pool password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <hr className="border-border" />

        <p className="text-sm font-semibold">Your bracket</p>

        {!authReady ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : signedIn ? (
          <>
            <p className="text-xs text-muted">
              Signed in as {user?.email ?? user?.displayName}. Your bracket saves to this
              account, so you can edit it from any device.
            </p>
            <Field label="Name" hint="Shown to other pool members.">
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required
                maxLength={24}
                className={inputClass}
              />
            </Field>
            {error && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create pool & start bracket'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Sign in with Google to create your bracket. It saves to your account so you
              never lose it and can edit from any device.
            </p>
            {error && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
            )}
            <button
              type="button"
              onClick={onSignIn}
              disabled={busy}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in with Google'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
