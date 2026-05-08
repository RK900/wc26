import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import { subscribeToPoolBrackets } from '@/lib/bracketApi';
import { getPool } from '@/lib/poolApi';
import { getOwnedBracket } from '@/lib/localStore';
import type { BracketSummary, Pool } from '@/lib/types';

export function PoolView() {
  const { id: poolId } = useParams<{ id: string }>();
  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<BracketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId) return;
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.');
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
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
        unsub = subscribeToPoolBrackets(poolId, (next) => {
          setMembers(
            next
              .slice()
              .sort((a, b) => a.nickname.localeCompare(b.nickname)),
          );
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();
    return () => unsub?.();
  }, [poolId]);

  if (loading) return <div className="text-muted">Loading…</div>;
  if (error) return <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>;
  if (!pool || !poolId) return null;

  const owned = getOwnedBracket(poolId);
  const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}pool/${poolId}/join`;

  return (
    <div className="space-y-8">
      <header className="rounded-lg border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">{pool.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {members.length} {members.length === 1 ? 'bracket' : 'brackets'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {owned ? (
            <Link
              to={`/pool/${poolId}/bracket/${owned.bracketId}?token=${owned.editToken}`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
            >
              Edit your bracket
            </Link>
          ) : (
            <Link
              to={`/pool/${poolId}/join`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
            >
              Join this pool
            </Link>
          )}
          <CopyJoinLink url={joinUrl} />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted">No brackets submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => {
              const isMine = owned?.bracketId === m.id;
              const url = isMine
                ? `/pool/${poolId}/bracket/${m.id}?token=${owned!.editToken}`
                : `/pool/${poolId}/bracket/${m.id}`;
              return (
                <li key={m.id}>
                  <Link
                    to={url}
                    className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm transition hover:border-accent/50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{m.nickname}</span>
                      {isMine && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          you
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted">
                      {m.finalizedAt ? (
                        <span className="text-accent">finalized</span>
                      ) : (
                        'in progress'
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CopyJoinLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium hover:border-accent/40"
    >
      {copied ? 'Copied!' : 'Copy join link'}
    </button>
  );
}
