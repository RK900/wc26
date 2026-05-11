import { MATCHES_BY_ROUND } from '@/data/bracket';
import { GROUP_LETTERS } from '@/data/groups';
import type { BracketPicks, GroupLetter, Round } from '@/lib/types';

// Round point weights. Doubling per knockout round; 3rd-place sits at SF
// value (consolation match, meaningful but not the Final).
export const ROUND_POINTS: Record<Round, number> = {
  R32: 1,
  R16: 2,
  QF: 4,
  SF: 8,
  '3rd': 8,
  F: 16,
};

// Per-position group point. 1 point for each exact rank match (1st in 1st,
// 2nd in 2nd, etc). 4 possible per group, 48 max across all 12 groups.
export const GROUP_POSITION_POINTS = 1;

// 1 point per correctly identified advancing third-place group. 8 max.
export const THIRD_PLACE_GROUP_POINTS = 1;

export interface BracketScore {
  total: number;
  groupPoints: number;
  thirdPlacePoints: number;
  knockoutPointsByRound: Record<Round, number>;
  knockoutTotal: number;
}

export function scoreBracket(picks: BracketPicks, results: BracketPicks): BracketScore {
  let groupPoints = 0;
  for (const letter of GROUP_LETTERS) {
    groupPoints += scoreGroup(letter, picks, results);
  }

  const thirdPlacePoints = scoreThirdPlace(picks, results);

  const knockoutPointsByRound: Record<Round, number> = {
    R32: 0,
    R16: 0,
    QF: 0,
    SF: 0,
    '3rd': 0,
    F: 0,
  };

  for (const round of Object.keys(ROUND_POINTS) as Round[]) {
    const matches = MATCHES_BY_ROUND[round] ?? [];
    let roundPts = 0;
    for (const m of matches) {
      const picked = picks.knockout[m.id]?.winner ?? null;
      const actual = results.knockout[m.id]?.winner ?? null;
      if (picked !== null && actual !== null && picked === actual) {
        roundPts += ROUND_POINTS[round];
      }
    }
    knockoutPointsByRound[round] = roundPts;
  }

  const knockoutTotal = Object.values(knockoutPointsByRound).reduce(
    (a, b) => a + b,
    0,
  );

  return {
    total: groupPoints + thirdPlacePoints + knockoutTotal,
    groupPoints,
    thirdPlacePoints,
    knockoutPointsByRound,
    knockoutTotal,
  };
}

function scoreGroup(
  letter: GroupLetter,
  picks: BracketPicks,
  results: BracketPicks,
): number {
  const p = picks.groups[letter]?.order;
  const r = results.groups[letter]?.order;
  if (!p || !r) return 0;
  let pts = 0;
  for (let i = 0; i < 4; i++) {
    if (p[i] !== null && r[i] !== null && p[i] === r[i]) {
      pts += GROUP_POSITION_POINTS;
    }
  }
  return pts;
}

function scoreThirdPlace(picks: BracketPicks, results: BracketPicks): number {
  const picked = new Set(picks.thirdPlace.advancingGroups);
  const actual = new Set(results.thirdPlace.advancingGroups);
  let pts = 0;
  for (const g of picked) {
    if (actual.has(g)) pts += THIRD_PLACE_GROUP_POINTS;
  }
  return pts;
}

// Theoretical maximum score (used to show "X / max" in the leaderboard).
export const MAX_SCORE: number = (() => {
  let knockout = 0;
  for (const round of Object.keys(ROUND_POINTS) as Round[]) {
    knockout += (MATCHES_BY_ROUND[round]?.length ?? 0) * ROUND_POINTS[round];
  }
  const groups = GROUP_LETTERS.length * 4 * GROUP_POSITION_POINTS;
  const thirds = 8 * THIRD_PLACE_GROUP_POINTS;
  return knockout + groups + thirds;
})();
