// ESPN scoreboard → Firestore /results/wc2026 poller.
//
// Runs on a GitHub Actions cron every 30 min during the tournament window.
// On each run it:
//   1. Reads the current /results/wc2026 doc.
//   2. Pulls every WC 2026 event from ESPN's scoreboard.
//   3. Recomputes group standings, best-3 advancers, and KO winners from
//      the data available (partial during group stage; full once the round
//      completes).
//   4. Merges into /results/wc2026 with these rules:
//        - For each group: if admin has set ANY position manually, the
//          whole group is left alone. Otherwise the latest computed
//          standings overwrite — yes, even partial ones, so the
//          leaderboard re-ranks as matches complete during group stage.
//        - For best-3 advancers: only written once all 72 group matches
//          are complete (top-8-of-12 isn't determinate before then). And
//          only if admin hasn't set advancingGroups manually.
//        - For each KO match: only written if no winner yet (admin's
//          manual call always sticks).
//
// FIFA tiebreaker coverage: points → goal difference → goals scored →
// alphabetical (as deterministic stand-in for head-to-head + fair play
// + drawing of lots). The first three cover ~99% of cases. The rest is
// rare; admin can override if it ever comes up.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { MATCHES } from '../src/data/bracket';
import { GROUP_BY_LETTER, GROUP_LETTERS, GROUPS } from '../src/data/groups';
import { mapThirdPlaceAdvancers } from '../src/lib/thirdPlaceMap';
import { resolveSlot } from '../src/lib/resolveBracket';
import type {
  BracketPicks,
  GroupLetter,
  GroupOrder,
  Round,
  TeamCode,
} from '../src/lib/types';

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

const TOURNAMENT_START = Date.parse('2026-06-11T00:00:00Z');
const TOURNAMENT_END = Date.parse('2026-07-20T23:59:59Z');

const DRY_RUN = process.argv.includes('--dry-run');
// --smoke: bypass the tournament window check, exercise the whole pipeline
// (ESPN fetch, Firestore auth + read, poll logic) but never write. Use it
// to verify credentials and wiring before the tournament starts.
const SMOKE = process.argv.includes('--smoke');

// ESPN abbreviations that differ from our team codes. Add overrides as
// the poller logs warnings — most teams use identical FIFA codes.
const ESPN_ABBR_OVERRIDES: Record<string, TeamCode> = {
  // empty so far
};

interface EspnCompetitor {
  team: { abbreviation: string; displayName: string };
  homeAway: 'home' | 'away';
  score: string;
  winner: boolean;
}

interface EspnEvent {
  id: string;
  date: string;
  name: string;
  season?: { slug?: string };
  status?: { type?: { completed?: boolean } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

interface EspnScoreboard {
  events?: EspnEvent[];
}

function slugToRound(slug: string | undefined): Round | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s.includes('round-of-32') || s === 'r32') return 'R32';
  if (s.includes('round-of-16') || s === 'r16') return 'R16';
  if (s.includes('quarter')) return 'QF';
  if (s.includes('semi')) return 'SF';
  if (s.includes('third') || s.includes('3rd')) return '3rd';
  if (s === 'final' || s.endsWith('-final')) return 'F';
  return null;
}

function isGroupStageEvent(e: EspnEvent): boolean {
  return (e.season?.slug ?? '').toLowerCase() === 'group-stage';
}

function espnToOurCode(abbr: string): TeamCode {
  return ESPN_ABBR_OVERRIDES[abbr] ?? abbr;
}

async function fetchScoreboard(dateRange: string): Promise<EspnEvent[]> {
  const url = `${ESPN_BASE}?dates=${dateRange}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN responded ${res.status} ${res.statusText}`);
  const data = (await res.json()) as EspnScoreboard;
  return data.events ?? [];
}

function initFirestore(): Firestore {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
  let creds: Record<string, unknown>;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${(e as Error).message}`,
    );
  }
  initializeApp({ credential: cert(creds as Parameters<typeof cert>[0]) });
  return getFirestore();
}

// === Group stage standings ===

interface TeamStats {
  code: TeamCode;
  group: GroupLetter;
  played: number;
  w: number;
  d: number;
  l: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

function emptyStats(code: TeamCode, group: GroupLetter): TeamStats {
  return { code, group, played: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
}

function accumulateGroupStats(events: EspnEvent[]): Map<TeamCode, TeamStats> {
  const stats = new Map<TeamCode, TeamStats>();
  for (const g of GROUPS) {
    for (const code of g.teams) stats.set(code, emptyStats(code, g.letter));
  }

  for (const e of events) {
    if (!e.status?.type?.completed) continue;
    if (!isGroupStageEvent(e)) continue;
    const comps = e.competitions?.[0]?.competitors ?? [];
    if (comps.length !== 2) continue;
    const a = comps[0];
    const b = comps[1];
    const aCode = espnToOurCode(a.team.abbreviation);
    const bCode = espnToOurCode(b.team.abbreviation);
    const aScore = Number(a.score);
    const bScore = Number(b.score);
    if (!Number.isFinite(aScore) || !Number.isFinite(bScore)) continue;
    const aStat = stats.get(aCode);
    const bStat = stats.get(bCode);
    if (!aStat || !bStat) continue;

    aStat.played++; bStat.played++;
    aStat.gf += aScore; aStat.ga += bScore; aStat.gd += aScore - bScore;
    bStat.gf += bScore; bStat.ga += aScore; bStat.gd += bScore - aScore;
    if (aScore > bScore) {
      aStat.w++; aStat.pts += 3; bStat.l++;
    } else if (aScore < bScore) {
      bStat.w++; bStat.pts += 3; aStat.l++;
    } else {
      aStat.d++; aStat.pts++; bStat.d++; bStat.pts++;
    }
  }
  return stats;
}

function sortStandings(teams: TeamStats[]): TeamStats[] {
  return [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // FIFA's remaining tiebreakers (head-to-head, fair play, drawing of
    // lots) require data we don't compute here. Falling back to a stable
    // alphabetical sort so output is deterministic; admin can override.
    return a.code.localeCompare(b.code);
  });
}

function computeGroupStandings(events: EspnEvent[]): {
  byGroup: Record<GroupLetter, GroupOrder>;
  byGroupComplete: Record<GroupLetter, boolean>;
} {
  const stats = accumulateGroupStats(events);
  const byGroup = {} as Record<GroupLetter, GroupOrder>;
  const byGroupComplete = {} as Record<GroupLetter, boolean>;
  for (const letter of GROUP_LETTERS) {
    const groupTeams = GROUP_BY_LETTER[letter].teams
      .map((code) => stats.get(code))
      .filter((s): s is TeamStats => s !== undefined);
    const anyPlayed = groupTeams.some((t) => t.played > 0);
    byGroupComplete[letter] = groupTeams.every((t) => t.played >= 3);
    if (!anyPlayed) {
      byGroup[letter] = [null, null, null, null];
      continue;
    }
    const sorted = sortStandings(groupTeams);
    byGroup[letter] = [
      sorted[0]?.code ?? null,
      sorted[1]?.code ?? null,
      sorted[2]?.code ?? null,
      sorted[3]?.code ?? null,
    ];
  }
  return { byGroup, byGroupComplete };
}

function computeBest3Advancers(events: EspnEvent[]): GroupLetter[] {
  const stats = accumulateGroupStats(events);
  const thirds: { letter: GroupLetter; stat: TeamStats }[] = [];
  for (const letter of GROUP_LETTERS) {
    const groupTeams = GROUP_BY_LETTER[letter].teams
      .map((code) => stats.get(code))
      .filter((s): s is TeamStats => s !== undefined);
    if (groupTeams.some((t) => t.played < 3)) return []; // group incomplete
    const sorted = sortStandings(groupTeams);
    const third = sorted[2];
    if (third) thirds.push({ letter, stat: third });
  }
  thirds.sort((a, b) => {
    if (b.stat.pts !== a.stat.pts) return b.stat.pts - a.stat.pts;
    if (b.stat.gd !== a.stat.gd) return b.stat.gd - a.stat.gd;
    if (b.stat.gf !== a.stat.gf) return b.stat.gf - a.stat.gf;
    return a.letter.localeCompare(b.letter);
  });
  return thirds.slice(0, 8).map((t) => t.letter).sort();
}

// === Knockout winners ===

interface PollResult {
  groupsUpdated: GroupLetter[];
  groupsSkipped: GroupLetter[];
  thirdPlaceWritten: boolean;
  knockoutUpdates: { matchId: number; round: Round; winner: TeamCode }[];
  knockoutSkipped: { matchId: number; reason: string }[];
}

function mergeGroupStandings(
  picks: BracketPicks,
  computed: Record<GroupLetter, GroupOrder>,
): { groupsUpdated: GroupLetter[]; groupsSkipped: GroupLetter[] } {
  const updated: GroupLetter[] = [];
  const skipped: GroupLetter[] = [];
  for (const letter of GROUP_LETTERS) {
    const current = picks.groups[letter].order;
    if (current.some((c) => c !== null)) {
      skipped.push(letter); // admin has set something here; leave alone
      continue;
    }
    const computedOrder = computed[letter];
    if (computedOrder.every((c) => c === null)) {
      continue; // no group-stage data yet
    }
    picks.groups[letter] = { order: computedOrder, committed: true };
    updated.push(letter);
  }
  return { groupsUpdated: updated, groupsSkipped: skipped };
}

function pollKnockoutWinners(
  picks: BracketPicks,
  events: EspnEvent[],
): { updates: PollResult['knockoutUpdates']; skipped: PollResult['knockoutSkipped'] } {
  const updates: PollResult['knockoutUpdates'] = [];
  const skipped: PollResult['knockoutSkipped'] = [];

  for (const m of MATCHES) {
    if (picks.knockout[m.id]?.winner) continue;

    const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
    const expectedHome = resolveSlot(m.home, picks, mapping);
    const expectedAway = resolveSlot(m.away, picks, mapping);
    if (!expectedHome || !expectedAway) {
      skipped.push({
        matchId: m.id,
        reason: 'home/away not yet resolvable',
      });
      continue;
    }

    const pair = new Set([expectedHome, expectedAway]);
    const event = events.find((e) => {
      if (!e.status?.type?.completed) return false;
      if (slugToRound(e.season?.slug) !== m.round) return false;
      const competitors = e.competitions?.[0]?.competitors ?? [];
      if (competitors.length !== 2) return false;
      const codes = new Set(competitors.map((c) => espnToOurCode(c.team.abbreviation)));
      return codes.size === 2 && pair.size === 2 && [...pair].every((p) => codes.has(p));
    });

    if (!event) {
      skipped.push({
        matchId: m.id,
        reason: `no completed ESPN event matches ${expectedHome} vs ${expectedAway}`,
      });
      continue;
    }

    const winnerComp = event.competitions?.[0]?.competitors?.find((c) => c.winner);
    if (!winnerComp) {
      skipped.push({
        matchId: m.id,
        reason: `ESPN event ${event.id} marked completed but no winner flag`,
      });
      continue;
    }

    const winner = espnToOurCode(winnerComp.team.abbreviation);
    picks.knockout[m.id] = { winner };
    updates.push({ matchId: m.id, round: m.round, winner });
  }

  return { updates, skipped };
}

function poll(picks: BracketPicks, events: EspnEvent[]): {
  nextPicks: BracketPicks;
  result: PollResult;
} {
  const next = structuredClone(picks);

  // 1. Group standings (live partial during group stage).
  const { byGroup } = computeGroupStandings(events);
  const { groupsUpdated, groupsSkipped } = mergeGroupStandings(next, byGroup);

  // 2. Best-3 advancers (only when all 72 group matches done, and admin
  // hasn't set them).
  let thirdPlaceWritten = false;
  if (next.thirdPlace.advancingGroups.length === 0) {
    const computed = computeBest3Advancers(events);
    if (computed.length === 8) {
      next.thirdPlace.advancingGroups = computed;
      thirdPlaceWritten = true;
    }
  }

  // 3. Knockout winners — now that groups + best-3 might be set, KO
  // home/away can resolve.
  const { updates, skipped } = pollKnockoutWinners(next, events);

  return {
    nextPicks: next,
    result: {
      groupsUpdated,
      groupsSkipped,
      thirdPlaceWritten,
      knockoutUpdates: updates,
      knockoutSkipped: skipped,
    },
  };
}

function hasChanges(result: PollResult): boolean {
  return (
    result.groupsUpdated.length > 0 ||
    result.thirdPlaceWritten ||
    result.knockoutUpdates.length > 0
  );
}

function logResult(result: PollResult): void {
  if (result.groupsUpdated.length) {
    console.log(`Updated groups: ${result.groupsUpdated.join(', ')}`);
  }
  if (result.groupsSkipped.length) {
    console.log(`Groups locked by admin: ${result.groupsSkipped.join(', ')}`);
  }
  if (result.thirdPlaceWritten) {
    console.log('Wrote best-3 third-place advancers.');
  }
  if (result.knockoutUpdates.length) {
    console.log(`Knockout winners (${result.knockoutUpdates.length}):`);
    for (const u of result.knockoutUpdates) {
      console.log(`  + M${u.matchId} (${u.round}) ${u.winner}`);
    }
  }
  if (result.knockoutSkipped.length) {
    const sample = result.knockoutSkipped.slice(0, 3);
    console.log(`Knockout skipped (${result.knockoutSkipped.length} total, showing 3):`);
    for (const s of sample) console.log(`  - M${s.matchId}: ${s.reason}`);
  }
}

async function main() {
  if (SMOKE) {
    console.log('SMOKE TEST — bypassing tournament window; will not write.');
  }
  const now = Date.now();
  if (!SMOKE && (now < TOURNAMENT_START || now > TOURNAMENT_END)) {
    console.log(
      `Outside tournament window (${new Date(TOURNAMENT_START).toISOString()} → ${new Date(TOURNAMENT_END).toISOString()}); exiting.`,
    );
    return;
  }

  const dateRange = '20260611-20260720';
  let events: EspnEvent[];
  try {
    events = await fetchScoreboard(dateRange);
    console.log(`Fetched ${events.length} ESPN events for ${dateRange}.`);
  } catch (e) {
    console.error(`ESPN fetch failed: ${(e as Error).message}`);
    return; // soft fail
  }

  const db = initFirestore();
  const ref = db.collection('results').doc('wc2026');
  const snap = await ref.get();

  // Seed an empty results doc if none exists. Auto-seed so the poller
  // works end-to-end even before admin opens /admin.
  let picks: BracketPicks;
  if (!snap.exists) {
    picks = {
      groups: Object.fromEntries(
        GROUP_LETTERS.map((l) => [l, { order: [null, null, null, null], committed: true }]),
      ) as BracketPicks['groups'],
      thirdPlace: { advancingGroups: [] },
      knockout: Object.fromEntries(MATCHES.map((m) => [m.id, { winner: null }])),
      finalizedAt: null,
    };
    console.log('No /results/wc2026 doc; seeding empty.');
  } else {
    const data = snap.data() as { picks: BracketPicks } | undefined;
    if (!data?.picks) {
      console.log('/results/wc2026 exists but missing picks; skipping.');
      return;
    }
    picks = data.picks;
  }

  const { nextPicks, result } = poll(picks, events);
  logResult(result);

  if (SMOKE) {
    console.log(
      hasChanges(result)
        ? 'SMOKE TEST OK — pipeline works, would have written changes.'
        : 'SMOKE TEST OK — pipeline works, no changes to write yet.',
    );
    return;
  }
  if (!hasChanges(result)) {
    console.log('No changes.');
    return;
  }
  if (DRY_RUN) {
    console.log('DRY RUN — not writing.');
    return;
  }

  await ref.set({
    picks: nextPicks,
    lastUpdated: Date.now(),
    lastUpdatedBy: 'espn-cron',
  });
  console.log('Wrote /results/wc2026.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
