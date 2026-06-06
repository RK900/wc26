import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireAdmin } from '@/components/admin/RequireAdmin';
import { GROUPS } from '@/data/groups';
import { TEAMS } from '@/data/teams';
import { deleteAIBracket, listAIBrackets, setAIBracket } from '@/lib/bracketApi';
import { listPools } from '@/lib/poolApi';
import {
  AI_BRACKET_TEMPLATE_JSON,
  parseAIBracketJson,
  type AIParseResult,
} from '@/lib/aiBracket';
import type { Bracket, Pool } from '@/lib/types';

export function AdminAIBrackets() {
  return (
    <RequireAdmin>
      <Dashboard />
    </RequireAdmin>
  );
}

function Dashboard() {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Bracket[] | null>(null);
  const [existingError, setExistingError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [parse, setParse] = useState<AIParseResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [applying, setApplying] = useState(false);
  const [applyLog, setApplyLog] = useState<{ ok: boolean; msg: string }[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const [showTemplate, setShowTemplate] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listPools()
      .then(setPools)
      .catch((e) => setPoolsError(e instanceof Error ? e.message : String(e)));
    refreshExisting();
  }, []);

  const refreshExisting = () => {
    setExistingError(null);
    listAIBrackets()
      .then(setExisting)
      .catch((e) => setExistingError(e instanceof Error ? e.message : String(e)));
  };

  const validBrackets = useMemo(
    () => (parse?.items ?? []).filter((i) => i.ok && i.bracket).map((i) => i.bracket!),
    [parse],
  );

  const groupedExisting = useMemo(() => {
    const map = new Map<string, { name: string; brackets: Bracket[] }>();
    for (const b of existing ?? []) {
      const entry = map.get(b.poolId) ?? { name: b.poolName || b.poolId, brackets: [] };
      entry.brackets.push(b);
      map.set(b.poolId, entry);
    }
    return [...map.entries()];
  }, [existing]);

  const togglePool = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = async () => {
    if (!pools) return;
    setApplying(true);
    setApplyLog(null);
    const log: { ok: boolean; msg: string }[] = [];
    for (const poolId of selected) {
      const pool = pools.find((p) => p.id === poolId);
      if (!pool) continue;
      for (const b of validBrackets) {
        try {
          await setAIBracket({
            poolId,
            poolName: pool.name,
            docId: b.docId,
            nickname: b.nickname,
            picks: b.picks,
          });
          log.push({ ok: true, msg: `${b.nickname} → ${pool.name}` });
        } catch (e) {
          log.push({
            ok: false,
            msg: `${b.nickname} → ${pool.name}: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    }
    setApplyLog(log);
    setApplying(false);
    refreshExisting();
  };

  const remove = async (b: Bracket) => {
    if (!window.confirm(`Remove "${b.nickname}" from ${b.poolName || b.poolId}?`)) return;
    const key = `${b.poolId}/${b.id}`;
    setRemoving(key);
    try {
      await deleteAIBracket(b.poolId, b.id);
      refreshExisting();
    } catch (e) {
      setExistingError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(null);
    }
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(AI_BRACKET_TEMPLATE_JSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const canApply = validBrackets.length > 0 && selected.size > 0 && !applying;

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin · AI brackets</h1>
          <p className="mt-1 text-sm text-muted">
            Paste a picks file, choose pools, and it appears as a normal bracket on those
            leaderboards.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent/40"
        >
          ← Results
        </Link>
      </header>

      {/* Step 1 — paste */}
      <section>
        <h2 className="text-lg font-semibold">1. Paste picks file(s)</h2>
        <p className="mt-1 text-sm text-muted">
          One JSON object, or an array of them.{' '}
          <button
            type="button"
            onClick={() => setShowTemplate((v) => !v)}
            className="text-accent hover:underline"
          >
            {showTemplate ? 'Hide' : 'Show'} example format
          </button>
          {' · '}
          <button
            type="button"
            onClick={() => setShowCodes((v) => !v)}
            className="text-accent hover:underline"
          >
            {showCodes ? 'Hide' : 'Show'} team codes
          </button>
        </p>

        {showTemplate && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={copyTemplate}
                className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-semibold hover:border-accent/40"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setText(AI_BRACKET_TEMPLATE_JSON);
                  setParse(null);
                }}
                className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-semibold hover:border-accent/40"
              >
                Load into editor
              </button>
              <span className="text-xs text-muted">
                Lists are &ldquo;who reaches each round&rdquo;; team codes or full names both
                work.
              </span>
            </div>
            <pre className="max-h-72 overflow-auto rounded bg-bg p-3 text-xs leading-relaxed text-muted">
              {AI_BRACKET_TEMPLATE_JSON}
            </pre>
          </div>
        )}

        {showCodes && <TeamCodes />}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={12}
          placeholder='{ "nickname": "🤖 GPT-5", "groups": { ... }, ... }'
          className="mt-3 w-full rounded-md border border-border bg-surface-2 p-3 font-mono text-xs focus:border-accent focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParse(parseAIBracketJson(text))}
            disabled={!text.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Validate
          </button>
          <button
            type="button"
            onClick={() => {
              setText('');
              setParse(null);
              setApplyLog(null);
            }}
            className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            Clear
          </button>
        </div>

        {parse && <ParseResults parse={parse} />}
      </section>

      {/* Step 2 — pools */}
      <section>
        <h2 className="text-lg font-semibold">2. Choose pools</h2>
        {poolsError && (
          <p className="mt-2 text-sm text-danger">Couldn&rsquo;t load pools: {poolsError}</p>
        )}
        {!pools && !poolsError && <p className="mt-2 text-sm text-muted">Loading pools…</p>}
        {pools && pools.length === 0 && (
          <p className="mt-2 text-sm text-muted">No pools exist yet.</p>
        )}
        {pools && pools.length > 0 && (
          <>
            <div className="mt-2 mb-3 flex items-center gap-3 text-xs">
              <span className="text-muted">{selected.size} selected</span>
              <button
                type="button"
                onClick={() => setSelected(new Set(pools.map((p) => p.id)))}
                className="text-accent hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-accent hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pools.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    selected.has(p.id)
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-border bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => togglePool(p.id)}
                    className="accent-accent"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Apply */}
      <section>
        <button
          type="button"
          onClick={apply}
          disabled={!canApply}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applying
            ? 'Adding…'
            : canApply
              ? `Add ${validBrackets.length} bracket${validBrackets.length === 1 ? '' : 's'} to ${selected.size} pool${selected.size === 1 ? '' : 's'}`
              : 'Add to pools'}
        </button>
        {applyLog && (
          <ul className="mt-3 space-y-1 text-sm">
            {applyLog.map((r, i) => (
              <li key={i} className={r.ok ? 'text-accent' : 'text-danger'}>
                {r.ok ? '✓' : '✗'} {r.msg}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Current AI brackets */}
      <section>
        <h2 className="text-lg font-semibold">Current AI brackets</h2>
        {existingError && <p className="mt-2 text-sm text-danger">{existingError}</p>}
        {!existing && !existingError && (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        )}
        {existing && existing.length === 0 && (
          <p className="mt-2 text-sm text-muted">None yet.</p>
        )}
        {groupedExisting.length > 0 && (
          <div className="mt-3 space-y-4">
            {groupedExisting.map(([poolId, { name, brackets }]) => (
              <div key={poolId}>
                <h3 className="mb-2 text-sm font-semibold text-muted">{name}</h3>
                <ul className="space-y-2">
                  {brackets.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden>🤖</span>
                        <span className="font-semibold">{b.nickname}</span>
                        <span className="font-mono text-xs text-muted">{b.id}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(b)}
                        disabled={removing === `${b.poolId}/${b.id}`}
                        className="rounded-md border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-danger hover:border-danger/50 disabled:opacity-50"
                      >
                        {removing === `${b.poolId}/${b.id}` ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ParseResults({ parse }: { parse: AIParseResult }) {
  if (parse.jsonError) {
    return (
      <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
        Invalid JSON: {parse.jsonError}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {parse.items.map((item) => (
        <div
          key={item.index}
          className={`rounded-md border px-3 py-2 text-sm ${
            item.ok ? 'border-accent/40 bg-accent/10' : 'border-danger/40 bg-danger/10'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span>{item.ok ? '✓' : '✗'}</span>
            <span>{item.label}</span>
            {item.ok && item.bracket && (
              <span className="font-mono text-xs font-normal text-muted">
                {item.bracket.docId}
              </span>
            )}
          </div>
          {item.ok && item.bracket && (
            <p className="mt-1 text-xs text-muted">
              Champion {item.bracket.summary.champion} · final{' '}
              {item.bracket.summary.finalists.join(' vs ')} · 3rd{' '}
              {item.bracket.summary.thirdPlaceWinner}
            </p>
          )}
          {!item.ok && (
            <ul className="mt-1 list-inside list-disc text-xs text-danger">
              {item.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function TeamCodes() {
  return (
    <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.letter}>
            <div className="text-xs font-semibold text-muted">Group {g.letter}</div>
            <ul className="mt-1 space-y-0.5 text-xs">
              {g.teams.map((code) => (
                <li key={code}>
                  <span className="font-mono text-accent">{code}</span>{' '}
                  <span className="text-muted">{TEAMS[code]?.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
