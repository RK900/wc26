import { MATCHES } from '@/data/bracket';
import { resolveSlot } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import type { BracketPicks } from '@/lib/types';

// Single-pass topological cascade. Match IDs ascend with bracket depth, so
// iterating MATCHES in order is valid topo order: a match's winner only ever
// feeds higher-ID matches.
//
// Rule: if a match's currently-stored winner is non-null AND no longer matches
// either resolved side, clear that winner. Downstream matches that depended on
// it via {kind:'winner', matchId} will then resolve to null on this same pass,
// triggering the same rule for them. Total, idempotent, O(32).
//
// finalizedAt is intentionally NOT cleared by the cascade — once submitted, the
// bracket stays "submitted" and edits keep flowing in via auto-save until the
// deadline. The submitted state is one-way (no re-submit).
export function applyCascade(picks: BracketPicks): BracketPicks {
  const next = structuredClone(picks);
  const mapping = mapThirdPlaceAdvancers(next.thirdPlace.advancingGroups);

  for (const m of MATCHES) {
    const home = resolveSlot(m.home, next, mapping);
    const away = resolveSlot(m.away, next, mapping);
    const pick = next.knockout[m.id]?.winner ?? null;
    if (pick !== null && pick !== home && pick !== away) {
      next.knockout[m.id] = { winner: null };
    }
  }

  return next;
}
