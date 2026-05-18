import { useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { MATCHES, MATCHES_BY_ROUND } from '@/data/bracket';
import { GROUPS, GROUP_LETTERS } from '@/data/groups';
import { TEAMS } from '@/data/teams';
import { RequireAdmin } from '@/components/admin/RequireAdmin';
import { BracketViewer } from '@/components/bracket/BracketViewer';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { applyCascade } from '@/lib/cascade';
import { resolveSlot } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import { MAX_SCORE, maxAttainable, scoreBracket } from '@/lib/scoring';
import type {
  BracketPicks,
  GroupLetter,
  GroupOrder,
  GroupPick,
  MatchSpec,
  Round,
  TeamCode,
} from '@/lib/types';

// Admin-only scoring sandbox. Renders the real BracketViewer for one of
// two seeded brackets (Alice / Bob) against an in-memory fake results
// state. Tweak the fake-admin controls at the bottom to watch every
// pick's correctness border update live — same component real users see
// on /pool/:id/bracket/:bracketId.

type Tab = 'alice' | 'bob';

export function Smoke() {
  return (
    <RequireAdmin>
      <SmokeContent />
    </RequireAdmin>
  );
}

function emptyPicks(): BracketPicks {
  const groups = {} as Record<GroupLetter, GroupPick>;
  for (const g of GROUPS) {
    groups[g.letter] = { order: [null, null, null, null], committed: true };
  }
  return {
    groups,
    thirdPlace: { advancingGroups: [] },
    knockout: {},
    finalizedAt: null,
    finalGoalsGuess: null,
  };
}

// Seeded bracket: always pick the higher-pot team to win each match. With
// `flipTopTwo=true` the group orders swap pot-1 and pot-2 teams.
function seedFilledBracket(
  flipTopTwo: boolean,
  advancingGroups: GroupLetter[],
  finalGoals: number,
): BracketPicks {
  const groups = {} as Record<GroupLetter, GroupPick>;
  for (const g of GROUPS) {
    const teams = [...g.teams];
    if (flipTopTwo) [teams[0], teams[1]] = [teams[1], teams[0]];
    groups[g.letter] = {
      order: [teams[0], teams[1], teams[2], teams[3]] as GroupOrder,
      committed: true,
    };
  }
  let picks: BracketPicks = {
    groups,
    thirdPlace: { advancingGroups: [...advancingGroups].sort() },
    knockout: {},
    finalizedAt: Date.now(),
    finalGoalsGuess: finalGoals,
  };
  const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
  for (const m of MATCHES) {
    const home = resolveSlot(m.home, picks, mapping);
    const away = resolveSlot(m.away, picks, mapping);
    const winner = home ?? away;
    if (winner) {
      picks = { ...picks, knockout: { ...picks.knockout, [m.id]: { winner } } };
    }
  }
  return picks;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomizedPicks(): BracketPicks {
  const groups = {} as Record<GroupLetter, GroupPick>;
  for (const g of GROUPS) {
    const s = shuffle(g.teams);
    groups[g.letter] = {
      order: [s[0], s[1], s[2], s[3]] as GroupOrder,
      committed: true,
    };
  }
  const advancingGroups = shuffle([...GROUP_LETTERS]).slice(0, 8).sort();
  let picks: BracketPicks = {
    groups,
    thirdPlace: { advancingGroups },
    knockout: {},
    finalizedAt: null,
    finalGoalsGuess: Math.floor(Math.random() * 6),
  };
  const mapping = mapThirdPlaceAdvancers(advancingGroups);
  for (const m of MATCHES) {
    const home = resolveSlot(m.home, picks, mapping);
    const away = resolveSlot(m.away, picks, mapping);
    if (!home && !away) continue;
    const winner = !home ? away : !away ? home : Math.random() < 0.5 ? home : away;
    if (winner) {
      picks = { ...picks, knockout: { ...picks.knockout, [m.id]: { winner } } };
    }
  }
  return picks;
}

const ROUND_ORDER: Round[] = ['R32', 'R16', 'QF', 'SF', '3rd', 'F'];

const INITIAL_ALICE = seedFilledBracket(false, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 3);
const INITIAL_BOB = seedFilledBracket(true, ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], 2);

function SmokeContent() {
  const [results, setResults] = useState<BracketPicks>(emptyPicks);
  const [alicePicks, setAlicePicks] = useState<BracketPicks>(INITIAL_ALICE);
  const [bobPicks, setBobPicks] = useState<BracketPicks>(INITIAL_BOB);
  const [tab, setTab] = useState<Tab>('alice');

  const brackets = useMemo(
    () => [
      { id: 'alice' as Tab, nickname: 'Alice', picks: alicePicks },
      { id: 'bob' as Tab, nickname: 'Bob', picks: bobPicks },
    ],
    [alicePicks, bobPicks],
  );

  const leaderboard = useMemo(() => {
    const rows = brackets.map((b) => ({
      b,
      score: scoreBracket(b.picks, results).total,
      max: maxAttainable(b.picks, results),
    }));
    const actualGoals = results.finalGoalsGuess ?? null;
    const goalDiff = (guess: number | null | undefined): number => {
      if (actualGoals === null || guess === null || guess === undefined) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.abs(guess - actualGoals);
    };
    rows.sort((a, b) => {
      const s = b.score - a.score;
      if (s !== 0) return s;
      const g =
        goalDiff(a.b.picks.finalGoalsGuess) - goalDiff(b.b.picks.finalGoalsGuess);
      if (g !== 0) return g;
      return a.b.nickname.localeCompare(b.b.nickname);
    });
    return rows;
  }, [brackets, results]);

  const selected = brackets.find((b) => b.id === tab) ?? brackets[0];

  return (
    <div className="space-y-8">
      <header className="rounded-lg border border-accent/30 bg-surface p-6">
        <h1 className="text-2xl font-semibold">
          <span className="text-accent">/smoke</span> — Admin sandbox
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Renders the real <code className="text-text">BracketViewer</code> for Alice
          or Bob against an in-memory results state. Tweak the fake-admin controls
          below to watch every pick's correctness border update live — the same
          view real users see on{' '}
          <code className="text-text">/pool/:id/bracket/:bracketId</code>. Nothing
          is written to Firestore.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Leaderboard (live)
        </h2>
        <ul className="space-y-2">
          {leaderboard.map((row, i) => {
            const winnerCode = row.b.picks.knockout[104]?.winner ?? null;
            return (
              <li
                key={row.b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-xs text-muted">
                    {i + 1}
                  </span>
                  <span className="font-semibold">{row.b.nickname}</span>
                  <span className="text-xs text-muted">
                    picks{' '}
                    {winnerCode
                      ? (TEAMS[winnerCode]?.name ?? winnerCode)
                      : '—'}{' '}
                    · final goals {row.b.picks.finalGoalsGuess ?? '—'}
                  </span>
                </span>
                <span className="font-mono">
                  <span className="text-base font-semibold">{row.score}</span>
                  <span className="text-xs text-muted"> / {row.max}</span>
                  <span className="ml-2 text-[10px] text-muted">
                    ceiling {MAX_SCORE}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Actual final goals:{' '}
          <span className="font-mono">{results.finalGoalsGuess ?? '—'}</span> (used
          for tiebreaker)
        </p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted">
              Viewing:
            </span>
            <TabButton
              active={tab === 'alice'}
              onClick={() => setTab('alice')}
              variant="accent-2"
            >
              Alice's bracket
            </TabButton>
            <TabButton
              active={tab === 'bob'}
              onClick={() => setTab('bob')}
              variant="warn"
            >
              Bob's bracket
            </TabButton>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                tab === 'alice'
                  ? setAlicePicks(randomizedPicks())
                  : setBobPicks(randomizedPicks())
              }
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:border-accent/40"
            >
              Randomize {selected.nickname}'s predictions
            </button>
            <button
              type="button"
              onClick={() =>
                tab === 'alice'
                  ? setAlicePicks(INITIAL_ALICE)
                  : setBobPicks(INITIAL_BOB)
              }
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:border-accent/40"
            >
              Re-seed
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <BracketViewer picks={selected.picks} results={results} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Fake admin: actual results
        </h2>
        <ResultsEditor results={results} onChange={setResults} />
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: 'accent' | 'accent-2' | 'warn';
  children: ReactNode;
}) {
  const activeBg = {
    accent: 'bg-accent text-bg',
    'accent-2': 'bg-accent-2 text-bg',
    warn: 'bg-warn text-bg',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-md border px-3 py-1.5 text-sm font-semibold transition',
        active
          ? `${activeBg} border-transparent`
          : 'border-border bg-surface-2 text-muted hover:border-accent/40',
      )}
    >
      {children}
    </button>
  );
}

function ResultsEditor({
  results,
  onChange,
}: {
  results: BracketPicks;
  onChange: (next: BracketPicks) => void;
}) {
  const mapping = useMemo(
    () => mapThirdPlaceAdvancers(results.thirdPlace.advancingGroups),
    [results.thirdPlace.advancingGroups],
  );

  const setGroupSlot = (
    letter: GroupLetter,
    slotIndex: 0 | 1 | 2 | 3,
    newTeam: TeamCode | null,
  ) => {
    const order = [...(results.groups[letter]?.order ?? [null, null, null, null])] as (
      | TeamCode
      | null
    )[];
    if (newTeam !== null) {
      const newTeamCurrentIdx = order.indexOf(newTeam);
      const currentTeamInSlot = order[slotIndex];
      order[slotIndex] = newTeam;
      if (newTeamCurrentIdx !== -1 && newTeamCurrentIdx !== slotIndex) {
        order[newTeamCurrentIdx] = currentTeamInSlot;
      }
    } else {
      order[slotIndex] = null;
    }
    onChange(
      applyCascade({
        ...results,
        groups: {
          ...results.groups,
          [letter]: { order: order as GroupOrder, committed: true },
        },
      }),
    );
  };

  const toggleThirdPlace = (letter: GroupLetter) => {
    const current = results.thirdPlace.advancingGroups;
    const isOn = current.includes(letter);
    let next: GroupLetter[];
    if (isOn) {
      next = current.filter((g) => g !== letter);
    } else {
      if (current.length >= 8) return;
      next = [...current, letter];
    }
    onChange(applyCascade({ ...results, thirdPlace: { advancingGroups: next.sort() } }));
  };

  const setKnockoutWinner = (matchId: number, winner: TeamCode | null) => {
    onChange(
      applyCascade({
        ...results,
        knockout: { ...results.knockout, [matchId]: { winner } },
      }),
    );
  };

  const setFinalGoals = (n: number | null) => {
    onChange({ ...results, finalGoalsGuess: n });
  };

  const totalBest3 = results.thirdPlace.advancingGroups.length;
  const koPicked = MATCHES.filter((m) => results.knockout[m.id]?.winner).length;
  const groupsScored = GROUP_LETTERS.filter((l) =>
    (results.groups[l]?.order ?? []).every((t) => t !== null),
  ).length;

  return (
    <div className="space-y-6 rounded-lg border border-border bg-surface/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {groupsScored}/12 groups · {totalBest3}/8 best-3 · {koPicked}/32 KO ·
          final goals {results.finalGoalsGuess ?? '—'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(randomizedPicks())}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90"
          >
            Randomize all results
          </button>
          <button
            type="button"
            onClick={() => onChange(emptyPicks())}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium hover:border-accent/40"
          >
            Clear all
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Group standings
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <GroupResultCard
              key={g.letter}
              letter={g.letter}
              teams={g.teams}
              order={results.groups[g.letter]?.order ?? [null, null, null, null]}
              setSlot={setGroupSlot}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Best-3 advancers ({totalBest3}/8)
        </h3>
        <div className="flex flex-wrap gap-2">
          {GROUP_LETTERS.map((letter) => {
            const on = results.thirdPlace.advancingGroups.includes(letter);
            const atCap = totalBest3 >= 8;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => toggleThirdPlace(letter)}
                disabled={!on && atCap}
                className={clsx(
                  'rounded-md border px-3 py-1.5 text-sm font-semibold transition',
                  on
                    ? 'border-accent bg-accent text-bg'
                    : 'border-border bg-surface-2 text-muted hover:border-accent/40',
                  !on && atCap && 'cursor-not-allowed opacity-40',
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Knockout winners ({koPicked}/32)
        </h3>
        <div className="space-y-4">
          {ROUND_ORDER.map((round) => (
            <div key={round}>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {round} · {MATCHES_BY_ROUND[round].length}
              </h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {MATCHES_BY_ROUND[round].map((m) => (
                  <MatchResultRow
                    key={m.id}
                    match={m}
                    picks={results}
                    mapping={mapping}
                    setWinner={setKnockoutWinner}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Final goals (tiebreaker)
        </h3>
        <input
          type="number"
          min={0}
          max={99}
          step={1}
          value={results.finalGoalsGuess ?? ''}
          placeholder="—"
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') {
              setFinalGoals(null);
              return;
            }
            const n = Number(v);
            if (Number.isInteger(n) && n >= 0 && n <= 99) {
              setFinalGoals(n);
            }
          }}
          className="w-24 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}

function GroupResultCard({
  letter,
  teams,
  order,
  setSlot,
}: {
  letter: GroupLetter;
  teams: TeamCode[];
  order: (TeamCode | null)[];
  setSlot: (
    letter: GroupLetter,
    slotIndex: 0 | 1 | 2 | 3,
    newTeam: TeamCode | null,
  ) => void;
}) {
  const filled = order.every((t) => t !== null);
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Group {letter}
        </h4>
        {filled && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            set
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {([0, 1, 2, 3] as const).map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={clsx(
                'w-5 text-center text-xs font-bold',
                i === 0 && 'text-accent',
                i === 1 && 'text-accent-2',
                i >= 2 && 'text-muted',
              )}
            >
              {i + 1}
            </span>
            <select
              value={order[i] ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setSlot(letter, i, v === '' ? null : v);
              }}
              className="flex-1 rounded border border-border bg-surface-2 px-2 py-1 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">— pick —</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {TEAMS[t]?.name ?? t}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchResultRow({
  match,
  picks,
  mapping,
  setWinner,
}: {
  match: MatchSpec;
  picks: BracketPicks;
  mapping: ReturnType<typeof mapThirdPlaceAdvancers>;
  setWinner: (matchId: number, winner: TeamCode | null) => void;
}) {
  const home = resolveSlot(match.home, picks, mapping);
  const away = resolveSlot(match.away, picks, mapping);
  const winner = picks.knockout[match.id]?.winner ?? null;
  const blocked = !home || !away;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>M{match.id}</span>
        {winner && (
          <button
            type="button"
            onClick={() => setWinner(match.id, null)}
            className="text-muted hover:text-text"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SideButton
          team={home}
          isWinner={!!home && winner === home}
          onClick={() => home && setWinner(match.id, winner === home ? null : home)}
        />
        <span className="text-[10px] text-muted">vs</span>
        <SideButton
          team={away}
          isWinner={!!away && winner === away}
          onClick={() => away && setWinner(match.id, winner === away ? null : away)}
        />
      </div>
      {blocked && (
        <div className="mt-1 text-[10px] text-muted">Waiting on upstream picks</div>
      )}
    </div>
  );
}

function SideButton({
  team,
  isWinner,
  onClick,
}: {
  team: TeamCode | null;
  isWinner: boolean;
  onClick: () => void;
}) {
  const disabled = !team;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition',
        disabled
          ? 'cursor-not-allowed bg-surface-2 text-muted opacity-50'
          : isWinner
            ? 'bg-accent text-bg'
            : 'bg-surface-2 text-text hover:bg-surface-2/70',
      )}
    >
      {team && <TeamFlag code={team} size="sm" />}
      <span>{team ? (TEAMS[team]?.name ?? team) : '—'}</span>
    </button>
  );
}
