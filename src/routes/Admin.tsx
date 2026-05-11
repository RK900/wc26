import { useEffect, useMemo, useState } from 'react';
import { type User } from 'firebase/auth';
import { BEST3_SLOT_MATCH_IDS, MATCHES_BY_ROUND } from '@/data/bracket';
import { GROUPS, GROUP_BY_LETTER, GROUP_LETTERS } from '@/data/groups';
import { TEAMS } from '@/data/teams';
import {
  isAdminUser,
  signInAsAdmin,
  signOutAdmin,
  subscribeAuth,
} from '@/lib/adminAuth';
import { applyCascade } from '@/lib/cascade';
import { isFirebaseConfigured } from '@/lib/firebaseConfigured';
import { resolveSlot } from '@/lib/resolveBracket';
import { emptyResultsPicks, readResults, writeResults } from '@/lib/resultsApi';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import type {
  BracketPicks,
  GroupLetter,
  GroupOrder,
  MatchSpec,
  TeamCode,
} from '@/lib/types';

export function Admin() {
  if (!isFirebaseConfigured()) {
    return (
      <NotConfigured />
    );
  }

  return <AdminGate />;
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-md rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
      <p className="font-semibold">Firebase isn't configured.</p>
      <p className="mt-1 text-warn/80">
        Admin features need Firebase. Set the VITE_FIREBASE_* environment variables and rebuild.
      </p>
    </div>
  );
}

function AdminGate() {
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

  if (!user || user.isAnonymous) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Admin Sign In</h1>
        <p className="mb-6 text-sm text-muted">
          Only the authorized admin account can write to this site.
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
        {signInError && (
          <p className="mt-3 text-xs text-danger">{signInError}</p>
        )}
      </div>
    );
  }

  if (adminCheck === 'pending') {
    return <div className="text-muted">Checking admin status…</div>;
  }

  if (adminCheck === 'denied') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Not authorized</h1>
        <p className="mb-2 text-sm text-muted">
          This account isn't the admin. Your Firebase UID is:
        </p>
        <code className="mb-4 block break-all rounded bg-surface-2 px-3 py-2 text-xs">
          {user.uid}
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

  return <AdminDashboard user={user} />;
}

interface DashboardProps {
  user: User;
}

function AdminDashboard({ user }: DashboardProps) {
  const [picks, setPicks] = useState<BracketPicks | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readResults()
      .then((doc) => {
        if (cancelled) return;
        setPicks(doc?.picks ?? emptyResultsPicks());
        setLastUpdated(doc?.lastUpdated ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (next: BracketPicks) => {
    setPicks(applyCascade(next));
    setDirty(true);
  };

  const save = async () => {
    if (!picks) return;
    setSaving(true);
    setSaveError(null);
    try {
      await writeResults(picks);
      setLastUpdated(Date.now());
      setDirty(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        Failed to load results: {loadError}
      </div>
    );
  }

  if (!picks) return <div className="text-muted">Loading results…</div>;

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Results</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user.email}
            {lastUpdated && (
              <>
                {' · last saved '}
                {new Date(lastUpdated).toLocaleString()}
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => signOutAdmin()}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent/40"
        >
          Sign out
        </button>
      </header>

      <Section title="Group standings" subtitle="Set the final 1st–4th in each group.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <GroupStandingsCard
              key={g.letter}
              letter={g.letter}
              order={picks.groups[g.letter].order}
              onChange={(order) =>
                update({
                  ...picks,
                  groups: {
                    ...picks.groups,
                    [g.letter]: { order, committed: true },
                  },
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section
        title="Best 3rd-place teams"
        subtitle="Tick the 8 of 12 third-place teams that advanced."
      >
        <ThirdPlaceSelector
          selected={picks.thirdPlace.advancingGroups}
          onChange={(advancingGroups) =>
            update({ ...picks, thirdPlace: { advancingGroups } })
          }
        />
      </Section>

      <Section title="Knockout winners">
        <KnockoutWinners picks={picks} onChange={update} />
      </Section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saveError={saveError}
        onSave={save}
      />
    </div>
  );
}

function Section(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{props.title}</h2>
      {props.subtitle && (
        <p className="mt-1 text-sm text-muted">{props.subtitle}</p>
      )}
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function GroupStandingsCard({
  letter,
  order,
  onChange,
}: {
  letter: GroupLetter;
  order: GroupOrder;
  onChange: (order: GroupOrder) => void;
}) {
  const teams = GROUP_BY_LETTER[letter].teams;
  const setRank = (rankIdx: 0 | 1 | 2 | 3, code: TeamCode | null) => {
    const next: GroupOrder = [order[0], order[1], order[2], order[3]];
    next[rankIdx] = code;
    onChange(next);
  };

  const dupCodes = duplicates(order);
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Group {letter}</span>
        {dupCodes.length > 0 && (
          <span className="text-xs text-danger">duplicate team</span>
        )}
      </div>
      <div className="space-y-2">
        {([0, 1, 2, 3] as const).map((i) => {
          const isDup = order[i] && dupCodes.includes(order[i]!);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted">{i + 1}st</span>
              <select
                value={order[i] ?? ''}
                onChange={(e) => setRank(i, e.target.value || null)}
                className={`flex-1 rounded-md border bg-surface-2 px-2 py-1.5 text-sm ${
                  isDup ? 'border-danger/60' : 'border-border'
                }`}
              >
                <option value="">—</option>
                {teams.map((code) => (
                  <option key={code} value={code}>
                    {teamLabel(code)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThirdPlaceSelector({
  selected,
  onChange,
}: {
  selected: GroupLetter[];
  onChange: (next: GroupLetter[]) => void;
}) {
  const set = new Set(selected);
  const toggle = (letter: GroupLetter) => {
    const next = new Set(set);
    if (next.has(letter)) next.delete(letter);
    else next.add(letter);
    onChange([...next].sort() as GroupLetter[]);
  };

  return (
    <>
      <p className="mb-3 text-xs text-muted">
        Selected: {selected.length} / 8
        {selected.length > 8 && (
          <span className="ml-2 text-danger">too many — pick exactly 8</span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {GROUP_LETTERS.map((letter) => (
          <label
            key={letter}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              set.has(letter)
                ? 'border-accent/60 bg-accent/10'
                : 'border-border bg-surface'
            }`}
          >
            <input
              type="checkbox"
              checked={set.has(letter)}
              onChange={() => toggle(letter)}
              className="accent-accent"
            />
            Group {letter}
          </label>
        ))}
      </div>
    </>
  );
}

function KnockoutWinners({
  picks,
  onChange,
}: {
  picks: BracketPicks;
  onChange: (picks: BracketPicks) => void;
}) {
  const mapping = useMemo(
    () => mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups),
    [picks.thirdPlace.advancingGroups],
  );

  const rounds: { label: string; round: MatchSpec['round'] }[] = [
    { label: 'Round of 32', round: 'R32' },
    { label: 'Round of 16', round: 'R16' },
    { label: 'Quarter-finals', round: 'QF' },
    { label: 'Semi-finals', round: 'SF' },
    { label: '3rd-place playoff', round: '3rd' },
    { label: 'Final', round: 'F' },
  ];

  return (
    <div className="space-y-6">
      {rounds.map(({ label, round }) => {
        const matches = MATCHES_BY_ROUND[round] ?? [];
        return (
          <div key={round}>
            <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map((m) => {
                const home = resolveSlot(m.home, picks, mapping);
                const away = resolveSlot(m.away, picks, mapping);
                const winner = picks.knockout[m.id]?.winner ?? null;
                const setWinner = (w: TeamCode | null) => {
                  onChange({
                    ...picks,
                    knockout: {
                      ...picks.knockout,
                      [m.id]: { winner: w },
                    },
                  });
                };
                return (
                  <MatchRow
                    key={m.id}
                    matchId={m.id}
                    home={home}
                    away={away}
                    winner={winner}
                    onChange={setWinner}
                    bestSlotHint={
                      m.away.kind === 'best3'
                        ? `Best3 slot ${BEST3_SLOT_MATCH_IDS.indexOf(m.id) + 1}`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchRow({
  matchId,
  home,
  away,
  winner,
  onChange,
  bestSlotHint,
}: {
  matchId: number;
  home: TeamCode | null;
  away: TeamCode | null;
  winner: TeamCode | null;
  onChange: (winner: TeamCode | null) => void;
  bestSlotHint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>M{matchId}</span>
        {bestSlotHint && <span>{bestSlotHint}</span>}
      </div>
      <SideButton
        team={home}
        selected={winner !== null && winner === home}
        onClick={() => home && onChange(home)}
      />
      <SideButton
        team={away}
        selected={winner !== null && winner === away}
        onClick={() => away && onChange(away)}
      />
      {winner !== null && (
        <button
          className="mt-1 w-full rounded-md px-2 py-1 text-[10px] uppercase tracking-wider text-muted hover:text-text"
          onClick={() => onChange(null)}
        >
          clear
        </button>
      )}
    </div>
  );
}

function SideButton({
  team,
  selected,
  onClick,
}: {
  team: TeamCode | null;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = !team;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mb-1 flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm transition ${
        selected
          ? 'border-accent bg-accent/10 text-text'
          : 'border-border bg-surface-2 text-text hover:border-accent/40'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span>{team ? teamLabel(team) : '—'}</span>
      {selected && <span className="text-accent">✓</span>}
    </button>
  );
}

function SaveBar({
  dirty,
  saving,
  saveError,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <p className="text-xs text-muted">
          {saveError ? (
            <span className="text-danger">{saveError}</span>
          ) : dirty ? (
            'Unsaved changes'
          ) : (
            'All changes saved'
          )}
        </p>
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save results'}
        </button>
      </div>
    </div>
  );
}

function teamLabel(code: TeamCode): string {
  const t = TEAMS[code];
  if (!t) return code;
  return `${t.flag} ${t.name}`;
}

function duplicates(order: GroupOrder): TeamCode[] {
  const seen = new Set<TeamCode>();
  const dup = new Set<TeamCode>();
  for (const c of order) {
    if (!c) continue;
    if (seen.has(c)) dup.add(c);
    seen.add(c);
  }
  return [...dup];
}
