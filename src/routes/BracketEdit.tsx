import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ensureSignedIn, isFirebaseConfigured } from '@/lib/firebase';
import { getBracket, updateBracketPicks } from '@/lib/bracketApi';
import { getPool } from '@/lib/poolApi';
import { formatDeadline, isPastDeadline } from '@/lib/deadline';
import { subscribeResults } from '@/lib/resultsApi';
import { scoreBracket } from '@/lib/scoring';
import { isSignedIn, useAuthStore } from '@/store/authStore';
import { useBracketStore } from '@/store/bracketStore';
import { BracketEditor } from '@/components/bracket/BracketEditor';
import { BracketViewer } from '@/components/bracket/BracketViewer';
import { FinalizeBar } from '@/components/bracket/FinalizeBar';
import type { Bracket, BracketPicks, Pool, ResultsDoc } from '@/lib/types';

const SAVE_DEBOUNCE_MS = 1000;

export function BracketEdit() {
  const { id: poolId, bracketId } = useParams<{ id: string; bracketId: string }>();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);

  const [pool, setPool] = useState<Pool | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [results, setResults] = useState<ResultsDoc | null>(null);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const picks = useBracketStore((s) => s.picks);
  const initialLoadDone = useRef(false);
  // Which bracket id the store has been hydrated from THIS mount. Gates
  // autosave so we never write a stale/persisted store over the server copy
  // before pulling the server's picks in. Reset on every fresh load.
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribeResults(setResults);
  }, []);

  useEffect(() => {
    if (!poolId || !bracketId) return;
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured.');
      setLoading(false);
      return;
    }
    initialLoadDone.current = false;
    hydratedFor.current = null;
    setLoading(true);
    (async () => {
      try {
        await ensureSignedIn(); // anonymous session is enough to read a bracket
        const [p, b] = await Promise.all([getPool(poolId), getBracket(poolId, bracketId)]);
        if (!p || !b) {
          setError('Pool or bracket not found.');
          setLoading(false);
          return;
        }
        setPool(p);
        setBracket(b);
        initialLoadDone.current = true;
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();
  }, [poolId, bracketId]);

  // Editable iff the signed-in Google user owns this bracket and the deadline
  // hasn't passed. Recomputed when the bracket loads or the user signs in/out.
  useEffect(() => {
    if (!bracket) {
      setEditable(false);
      return;
    }
    const canEdit = isSignedIn(user) && bracket.ownerUid === user.uid && !isPastDeadline();
    setEditable(canEdit);
    // Hydrate the store from the freshly-loaded server bracket exactly once
    // per load. Keying on a per-mount ref (not the persisted store's
    // bracketId) means a fresh open ALWAYS pulls server truth in before any
    // autosave — a stale or reset store can never overwrite the server. The
    // once-guard prevents a mid-edit re-run (e.g. token refresh firing this
    // effect) from reverting in-progress edits to the loaded snapshot.
    if (canEdit && hydratedFor.current !== bracket.id) {
      useBracketStore.setState({
        picks: bracket.picks,
        poolId: bracket.poolId,
        bracketId: bracket.id,
      });
      hydratedFor.current = bracket.id;
    }
  }, [bracket, user]);

  // Debounced auto-save when picks change in editable mode.
  useEffect(() => {
    if (!editable || !bracket || !initialLoadDone.current) return;
    // Never autosave until the store has been hydrated from the server copy
    // of THIS bracket — otherwise a stale store could overwrite real picks.
    if (hydratedFor.current !== bracket.id) return;
    // Defensive re-check: if the deadline passed mid-session, lock the
    // editor and skip this save. The polling effect below flips editable
    // to false within ~30s but a save could otherwise race past it.
    if (isPastDeadline()) {
      setEditable(false);
      return;
    }
    setSaveStatus('saving');
    const t = setTimeout(() => {
      // Re-check at fire time too: a pick made <1s before the deadline
      // would otherwise reach the server, which would correctly reject the
      // write — but the UI would flash "Save failed". Locking client-side
      // means the locked-viewer state is the only thing the user sees.
      if (isPastDeadline()) {
        setEditable(false);
        return;
      }
      updateBracketPicks({ bracket, picks })
        .then(() => setSaveStatus('saved'))
        .catch((err) => {
          console.error('Failed to save bracket', err);
          setSaveStatus('error');
        });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [picks, editable, bracket]);

  // Flip out of editable mode when the deadline passes while the tab is
  // open. Polling beats setTimeout because browsers cap long timeouts
  // and throttle background tabs — we want to lock the editor regardless.
  useEffect(() => {
    if (!editable) return;
    if (isPastDeadline()) {
      setEditable(false);
      return;
    }
    const id = setInterval(() => {
      if (isPastDeadline()) {
        setEditable(false);
        clearInterval(id);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [editable]);

  // Picks to score against — the live in-progress picks if editing, the
  // saved bracket picks if read-only.
  const livePicks: BracketPicks | null = editable ? picks : bracket?.picks ?? null;
  const score = useMemo(() => {
    if (!livePicks) return null;
    if (!results) return { current: 0 };
    return { current: scoreBracket(livePicks, results.picks).total };
  }, [livePicks, results]);

  if (error)
    return <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>;
  if (loading || !authReady) return <div className="text-muted">Loading bracket…</div>;
  if (!pool || !bracket || !poolId) return null;

  if (!editable) {
    const submittedDate = bracket.finalizedAt
      ? new Date(bracket.finalizedAt).toLocaleString()
      : null;
    const locked = isPastDeadline();
    return (
      <BracketViewer
        picks={bracket.picks}
        results={results?.picks ?? null}
        header={
          <header className="space-y-2">
            <PoolChip poolId={pool.id} poolName={pool.name} />
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="text-2xl font-semibold">{bracket.nickname}&rsquo;s bracket</h1>
              {score && <ScoreBadge current={score.current} />}
            </div>
            <p className="text-sm text-muted">
              {submittedDate ? (
                <span className="text-accent">submitted {submittedDate}</span>
              ) : (
                'not submitted'
              )}
            </p>
            {locked && (
              <p className="text-xs text-muted">
                Bracket locked at {formatDeadline()} (24h before the first WC 2026 game).
              </p>
            )}
          </header>
        }
      />
    );
  }

  return (
    <>
      <BracketEditor
        results={results?.picks ?? null}
        header={
          <header className="space-y-3">
            <PoolChip poolId={pool.id} poolName={pool.name} />
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="text-xl font-semibold">{bracket.nickname}&rsquo;s bracket</h1>
              <div className="flex items-center gap-3">
                {score && <ScoreBadge current={score.current} />}
                <SaveIndicator status={saveStatus} />
              </div>
            </div>
          </header>
        }
      />
      <FinalizeBar />
    </>
  );
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  const text =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save failed';
  const colorClass =
    status === 'error' ? 'text-danger' : status === 'saved' ? 'text-accent' : 'text-muted';
  return <span className={`text-xs ${colorClass}`}>{text}</span>;
}

function ScoreBadge({ current }: { current: number }) {
  return (
    <div
      className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5"
      title={`${current} points earned so far`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Points</span>
      <span className="font-mono text-base font-semibold text-text">{current}</span>
    </div>
  );
}

function PoolChip({ poolId, poolName }: { poolId: string; poolName: string }) {
  return (
    <Link
      to={`/pool/${poolId}`}
      className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/20"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">
        Pool
      </span>
      <span>{poolName}</span>
      <span aria-hidden className="text-accent/60">&rarr;</span>
    </Link>
  );
}
