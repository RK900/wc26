import { BEST3_SLOT_MATCH_IDS, MATCHES_BY_ID } from '@/data/bracket';
import { THIRD_PLACE_TABLE } from '@/data/thirdPlaceTable';
import type { ThirdPlaceMapping } from '@/lib/resolveBracket';
import type { GroupLetter } from '@/lib/types';

// Map the user's chosen advancing third-place groups to the 8 Best3 slots
// in the R32 bracket using FIFA's official Annex C lookup table
// (mirrored at src/data/thirdPlaceTable.ts from the Wikipedia template).
//
// The assignment depends on the FULL set of 8 advancing groups — picking
// one group in isolation doesn't determine its slot, because slot
// assignments differ across combinations. So:
//   - With exactly 8 groups → look up the official assignment, fill all 8 slots.
//   - With anything else (0..7, or >8 from bad input) → all slots null.
//     The R32 Best3 slots stay blank in the UI until the user picks all 8,
//     and the bracket-page hint already tells them so.

interface SlotInfo {
  slotIndex: number;
  matchId: number;
}

const SLOT_INFOS: SlotInfo[] = BEST3_SLOT_MATCH_IDS.map((matchId, idx) => {
  const m = MATCHES_BY_ID[matchId];
  if (!m || m.away.kind !== 'best3') {
    throw new Error(`Best3 match ${matchId} mis-specified`);
  }
  return { slotIndex: idx, matchId };
});

function emptyMapping(unmatched: GroupLetter[]): ThirdPlaceMapping {
  return {
    slots: SLOT_INFOS.map((s) => ({ matchId: s.matchId, group: null })),
    unmatched,
  };
}

export function mapThirdPlaceAdvancers(advancingGroups: GroupLetter[]): ThirdPlaceMapping {
  const groups = [...new Set(advancingGroups)].sort() as GroupLetter[];

  // Only 8 groups → official FIFA Annex C assignment. Anything else
  // leaves all slots blank.
  if (groups.length !== 8) {
    return emptyMapping(groups);
  }

  const assignment = THIRD_PLACE_TABLE[groups.join('')];
  if (!assignment) {
    // Should never happen: every C(12,8) combo is in the table.
    return emptyMapping(groups);
  }

  return {
    slots: SLOT_INFOS.map((s, i) => ({
      matchId: s.matchId,
      group: assignment[i] ?? null,
    })),
    unmatched: [],
  };
}
