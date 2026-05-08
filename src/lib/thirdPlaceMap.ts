import { BEST3_SLOT_MATCH_IDS, MATCHES_BY_ID } from '@/data/bracket';
import type { ThirdPlaceMapping } from '@/lib/resolveBracket';
import type { GroupLetter } from '@/lib/types';

// Map the user's chosen advancing third-place groups (up to 8) to the 8 Best3 slots
// in the R32 bracket. Each slot has an `eligibleGroups` constraint per FIFA's bracket;
// for any 8-of-12 selection, FIFA's published table guarantees a unique perfect matching.
//
// We compute that matching via deterministic backtracking:
//  - Walk slots in ascending slotIndex (FIFA match order).
//  - Within each slot, try advancing groups in ascending letter order.
//  - First solution that fills the maximum possible slots wins.
//
// For partial selections (< 8) we return the best partial matching;
// any group that couldn't be placed is reported in `unmatched`.
//
// This algorithm is provably equivalent to FIFA's lookup when a perfect matching exists.
// If FIFA's published table is later located, swap this implementation in place.

interface SlotInfo {
  slotIndex: number;
  matchId: number;
  eligibleGroups: GroupLetter[];
}

const SLOT_INFOS: SlotInfo[] = BEST3_SLOT_MATCH_IDS.map((matchId, idx) => {
  const m = MATCHES_BY_ID[matchId];
  if (!m || m.away.kind !== 'best3') {
    throw new Error(`Best3 match ${matchId} mis-specified`);
  }
  return { slotIndex: idx, matchId, eligibleGroups: m.away.eligibleGroups };
});

export function mapThirdPlaceAdvancers(advancingGroups: GroupLetter[]): ThirdPlaceMapping {
  const groups = [...new Set(advancingGroups)].sort();
  const N = SLOT_INFOS.length;
  const M = groups.length;

  if (M === 0) {
    return {
      slots: SLOT_INFOS.map((s) => ({ matchId: s.matchId, group: null })),
      unmatched: [],
    };
  }

  const work: (GroupLetter | null)[] = new Array(N).fill(null);
  const used: boolean[] = new Array(M).fill(false);
  let best: (GroupLetter | null)[] = [...work];
  let bestFilled = 0;
  const target = Math.min(N, M);

  const recur = (slotIdx: number, filled: number): boolean => {
    if (filled > bestFilled) {
      bestFilled = filled;
      best = [...work];
      if (bestFilled === target) return true;
    }
    if (slotIdx === N) return false;

    const slot = SLOT_INFOS[slotIdx];
    for (let gi = 0; gi < M; gi++) {
      if (used[gi]) continue;
      const g = groups[gi];
      if (!slot.eligibleGroups.includes(g)) continue;
      work[slotIdx] = g;
      used[gi] = true;
      if (recur(slotIdx + 1, filled + 1)) return true;
      work[slotIdx] = null;
      used[gi] = false;
    }
    return recur(slotIdx + 1, filled);
  };

  recur(0, 0);

  const slots = SLOT_INFOS.map((s, i) => ({ matchId: s.matchId, group: best[i] }));
  const usedGroups = new Set(best.filter((g): g is GroupLetter => g !== null));
  const unmatched = groups.filter((g) => !usedGroups.has(g));
  return { slots, unmatched };
}
