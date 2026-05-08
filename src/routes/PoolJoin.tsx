import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import { getPool, verifyPoolPassword } from '@/lib/poolApi';
import { createBracket } from '@/lib/bracketApi';
import { getOwnedBracket, saveOwnedBracket } from '@/lib/localStore';
import { useBracketStore } from '@/store/bracketStore';
import type { Pool } from '@/lib/types';

export function PoolJoin() {
  const { id: poolId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'password' | 'profile'>('password');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
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
        await ensureSignedIn();
        const p = await getPool(poolId);
        if (!p) {
          setError('Pool not found.');
          setLoading(false);
          return;
        }
        setPool(p);
        const existing = getOwnedBracket(poolId);
        if (existing) {
          navigate(
            `/pool/${poolId}/bracket/${existing.bracketId}?token=${existing.editToken}`,
            { replace: true },
          );
          return;
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();
  }, [poolId, navigate]);

  if (loading) return <div className="text-muted">Loading pool…</div>;
  if (error) return <ErrorBox message={error} />;
  if (!pool || !poolId) return null;

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

  const onProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nickname.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const picks = useBracketStore.getState().picks;
      const { bracket, editToken } = await createBracket({
        poolId,
        name: name.trim(),
        nickname: nickname.trim(),
        picks,
      });
      saveOwnedBracket(poolId, {
        bracketId: bracket.id,
        editToken,
        poolName: pool.name,
        nickname: bracket.nickname,
      });
      useBracketStore.setState({
        poolId,
        bracketId: bracket.id,
        editToken,
      });
      navigate(`/pool/${poolId}/bracket/${bracket.id}?token=${editToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold">Join &ldquo;{pool.name}&rdquo;</h1>

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
          <p className="mb-6 text-sm text-muted">Enter your name and a nickname for the pool.</p>
          <form onSubmit={onProfileSubmit} className="space-y-4">
            <Field label="Your name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <Field label="Nickname" hint="Shown to other pool members.">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={24}
                className={inputClass}
              />
            </Field>
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              disabled={busy || !name.trim() || !nickname.trim()}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
            >
              {busy ? 'Creating…' : 'Create my bracket'}
            </button>
          </form>
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
