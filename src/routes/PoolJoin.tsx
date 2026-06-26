import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import { formatDeadline, isPastDeadline, SUBMIT_DEADLINE } from '@/lib/deadline';
import { getPool, verifyPoolPassword } from '@/lib/poolApi';
import { createBracket, getBracket } from '@/lib/bracketApi';
import { emptyResultsPicks, readResults } from '@/lib/resultsApi';
import { isSignedIn, signInWithGoogle, useAuthStore } from '@/store/authStore';
import { initialPicks, knockoutSeedPicks, useBracketStore } from '@/store/bracketStore';
import type { BracketPicks, Pool } from '@/lib/types';

export function PoolJoin() {
  const { id: poolId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const signedIn = isSignedIn(user);

  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'password' | 'profile'>('password');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!poolId) return;
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await ensureSignedIn(); // anonymous session is enough to read the pool
        const p = await getPool(poolId);
        if (!p) {
          setError('Pool not found.');
          setLoading(false);
          return;
        }
        setPool(p);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();
  }, [poolId]);

  // If the signed-in user already has a bracket in this pool, skip straight
  // to it (no need to re-enter the password). Runs on mount if already
  // signed in, and again right after they sign in during the flow.
  useEffect(() => {
    if (!poolId || !signedIn || !user) return;
    let cancelled = false;
    (async () => {
      const existing = await getBracket(poolId, user.uid);
      if (!cancelled && existing) {
        navigate(`/pool/${poolId}/bracket/${user.uid}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poolId, signedIn, user, navigate]);

  // Prefill the display name from Google once, then leave it editable.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefilled.current && signedIn && user?.displayName) {
      setName(user.displayName);
      prefilled.current = true;
    }
  }, [signedIn, user]);

  if (loading) return <div className="text-muted">Loading pool…</div>;
  if (error) return <ErrorBox message={error} />;
  if (!pool || !poolId) return null;

  const knockoutMode = pool.mode === 'knockout';
  const deadline = pool.submitDeadline ?? SUBMIT_DEADLINE;

  if (isPastDeadline(deadline)) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-2xl font-semibold">Join &ldquo;{pool.name}&rdquo;</h1>
        <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          <p className="font-semibold">Bracket submissions are closed.</p>
          <p className="mt-1 text-warn/80">
            The deadline was {formatDeadline(deadline)}. You can still view this pool's
            leaderboard.
          </p>
          <Link
            to={`/pool/${poolId}`}
            className="mt-3 inline-block rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-semibold hover:bg-warn/20"
          >
            View pool
          </Link>
        </div>
      </div>
    );
  }

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    const ok = await verifyPoolPassword(pool, password);
    setBusy(false);
    if (!ok) {
      setError('Wrong password.');
      return;
    }
    setError(null);
    setStep('profile');
  };

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

  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!signedIn || !user) {
      setError('Please sign in with Google first.');
      return;
    }
    if (!name.trim()) return;
    if (isPastDeadline(deadline)) {
      setError(`Bracket submissions closed at ${formatDeadline(deadline)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Guard against the async "already joined" redirect not having fired
      // yet — never overwrite an existing bracket; open it instead.
      const existing = await getBracket(poolId, user.uid);
      if (existing) {
        navigate(`/pool/${poolId}/bracket/${user.uid}`);
        return;
      }
      // A freshly joined pool starts with a fresh bracket — don't seed it with
      // picks the user happened to have in the store from another pool. A
      // knockout pool seeds the (locked) group + 3rd-place sections from the
      // live results so the bracket resolves to the real qualified teams.
      let picks: BracketPicks;
      if (knockoutMode) {
        const res = await readResults();
        picks = knockoutSeedPicks(res?.picks ?? emptyResultsPicks());
      } else {
        picks = initialPicks();
      }
      const bracket = await createBracket({
        poolId,
        poolName: pool.name,
        ownerUid: user.uid,
        nickname: name.trim(),
        picks,
      });
      useBracketStore.setState({ picks, poolId, bracketId: bracket.id });
      navigate(`/pool/${poolId}/bracket/${bracket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold">Join &ldquo;{pool.name}&rdquo;</h1>

      {knockoutMode && (
        <div className="mb-5 mt-3 rounded-md border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
          <p className="font-semibold">🏆 Knockout-only pool</p>
          <p className="mt-1 text-accent-2/80">
            Predict just the bracket (Round of 32 → Final) — the group stage is
            already decided. Picks lock {formatDeadline(deadline)}.
          </p>
        </div>
      )}

      {step === 'password' && (
        <>
          <p className="mb-6 text-sm text-muted">Enter the pool password to continue.</p>
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <Field label="Pool password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className={inputClass}
              />
            </Field>
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
            >
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </>
      )}

      {step === 'profile' && (
        <>
          {!authReady ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : signedIn ? (
            <>
              <p className="mb-6 text-sm text-muted">
                Signed in as {user?.email ?? user?.displayName}. Your bracket saves to this
                account, so you can edit it from any device.
              </p>
              <form onSubmit={onProfileSubmit} className="space-y-4">
                <Field label="Name" hint="Shown to other pool members.">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    maxLength={24}
                    className={inputClass}
                  />
                </Field>
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                >
                  {busy ? 'Creating…' : 'Create my bracket'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted">
                Sign in with Google to join. Your bracket saves to your account so you can edit
                it from any device.
              </p>
              {error && <ErrorBox message={error} />}
              <button
                type="button"
                onClick={onSignIn}
                disabled={busy}
                className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
              >
                {busy ? 'Signing in…' : 'Sign in with Google'}
              </button>
            </>
          )}
        </>
      )}
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

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{message}</div>;
}
