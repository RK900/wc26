import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isFirebaseConfigured } from '@/lib/firebaseConfigured';
import { listBracketsForUser } from '@/lib/bracketApi';
import { isSignedIn, useAuthStore } from '@/store/authStore';
import type { Bracket } from '@/lib/types';

export function Home() {
  const user = useAuthStore((s) => s.user);
  const signedIn = isSignedIn(user);
  const [owned, setOwned] = useState<Bracket[]>([]);

  useEffect(() => {
    if (!signedIn || !user) {
      setOwned([]);
      return;
    }
    let cancelled = false;
    listBracketsForUser(user.uid)
      .then((bs) => {
        if (!cancelled) setOwned(bs);
      })
      .catch(() => {
        if (!cancelled) setOwned([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, user]);

  const configured = isFirebaseConfigured();

  return (
    <div className="space-y-12">
      {configured ? (
        <section className="rounded-lg border border-border bg-surface p-8">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="mb-2 text-3xl font-semibold">World Cup 2026 Bracket Challenge</h1>
            <p className="text-muted">Predict all 48 teams. Beat your friends.</p>
          </div>

          {/* Primary action: join a pool you were invited to. */}
          <div className="mx-auto mt-8 max-w-md">
            <JoinExistingPool />
          </div>

          <div className="mx-auto mt-7 flex max-w-md items-center gap-3 text-xs uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Secondary actions. */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/pool/new"
              className="rounded-md border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold hover:border-accent/40"
            >
              Create a pool
            </Link>
            <Link to="/preview" className="text-sm font-medium text-muted hover:text-text">
              Preview the bracket
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="mb-3 text-3xl font-semibold">World Cup 2026 Bracket Challenge</h1>
          <div className="mx-auto max-w-md space-y-3">
            <div className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-left text-sm text-warn">
              <p className="font-semibold">Firebase isn't configured yet.</p>
              <p className="mt-1 text-warn/80">
                Pool features need a Firebase project. Copy <code>.env.example</code> to{' '}
                <code>.env.local</code> and fill in the four <code>VITE_FIREBASE_*</code> values
                from your project's Web app settings, then restart the dev server.
              </p>
            </div>
            <Link
              to="/preview"
              className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
            >
              Preview the bracket (browser-only)
            </Link>
          </div>
        </section>
      )}

      {signedIn && owned.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your brackets</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((b) => (
              <Link
                key={`${b.poolId}/${b.id}`}
                to={`/pool/${b.poolId}/bracket/${b.id}`}
                className="rounded-md border border-border bg-surface p-4 transition hover:border-accent/50"
              >
                <div className="text-sm font-semibold">{b.poolName || 'Pool'}</div>
                <div className="mt-1 text-xs text-muted">as {b.nickname}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function JoinExistingPool() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = extractPoolId(input.trim());
    if (!id) {
      setError('Paste a join link or pool ID.');
      return;
    }
    setError(null);
    navigate(`/pool/${id}/join`);
  };

  return (
    <form onSubmit={onSubmit} className="text-left">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        Join a pool
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste join link or pool ID"
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        Someone shared a pool with you? Paste the link or ID to join.
      </p>
    </form>
  );
}

// Accepts either a raw pool ID or a full URL like
// "https://www.koodli.com/wc26/pool/abc123/join" or ".../pool/abc123".
function extractPoolId(input: string): string | null {
  if (!input) return null;
  const match = input.match(/\/pool\/([^/?#]+)/);
  if (match) return match[1];
  // No URL path — accept as raw pool ID if it looks reasonable (no slashes/spaces).
  if (/^[A-Za-z0-9_-]+$/.test(input)) return input;
  return null;
}
