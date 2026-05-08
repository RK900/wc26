import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import { createPool } from '@/lib/poolApi';
import { createBracket } from '@/lib/bracketApi';
import { saveOwnedBracket } from '@/lib/localStore';
import { useBracketStore } from '@/store/bracketStore';

export function PoolNew() {
  const navigate = useNavigate();
  const [poolName, setPoolName] = useState('');
  const [password, setPassword] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorNick, setCreatorNick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. See README.');
      return;
    }
    if (!poolName.trim() || !password || !creatorName.trim() || !creatorNick.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const pool = await createPool(poolName.trim(), password);
      const picks = useBracketStore.getState().picks;
      const { bracket, editToken } = await createBracket({
        poolId: pool.id,
        name: creatorName.trim(),
        nickname: creatorNick.trim(),
        picks,
      });
      saveOwnedBracket(pool.id, {
        bracketId: bracket.id,
        editToken,
        poolName: pool.name,
        nickname: bracket.nickname,
      });
      useBracketStore.setState({
        poolId: pool.id,
        bracketId: bracket.id,
        editToken,
      });
      navigate(`/pool/${pool.id}/bracket/${bracket.id}?token=${editToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

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

        <Field
          label="Pool password"
          hint="Casual gate only — share with people you want in the pool. Don't reuse a real password."
        >
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

        <Field label="Your name">
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            required
            maxLength={60}
            className={inputClass}
          />
        </Field>

        <Field label="Nickname" hint="Shown to other pool members.">
          <input
            type="text"
            value={creatorNick}
            onChange={(e) => setCreatorNick(e.target.value)}
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
