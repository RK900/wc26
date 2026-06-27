// Group-standings merge for the ESPN poller. Extracted from poll-espn.ts so
// it can be unit-tested without pulling in firebase-admin or network I/O.

import { GROUP_LETTERS } from '../src/data/groups';
import type { BracketPicks, GroupLetter, GroupOrder } from '../src/lib/types';

export function groupOrdersEqual(a: GroupOrder, b: GroupOrder): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// Overwrite each group's stored standings with the freshly computed ones, so
// the leaderboard keeps re-ranking live through matchdays 2 and 3. A group is
// left alone only if the admin has pinned it via manualOverrides ('groups.A').
// Groups with no ESPN data yet, or whose standings AND committed flag are
// unchanged, are skipped.
//
// `complete[letter]` is whether that group has played all its matches. It
// becomes the group's `committed` flag: a not-yet-complete group is stored
// uncommitted, so its knockout slots render as a placeholder ("1st of H")
// instead of a provisional standing. The order still updates live (the
// leaderboard re-ranks off the order, not the flag).
//
// This previously skipped any group whose stored order was already non-null —
// which also caught the poller's OWN earlier writes, freezing every group at
// its first computed standings. manualOverrides is the intended, explicit way
// to protect a hand-entered group from being overwritten.
export function mergeGroupStandings(
  picks: BracketPicks,
  computed: Record<GroupLetter, GroupOrder>,
  complete: Record<GroupLetter, boolean>,
  overrides: Record<string, true>,
): { groupsUpdated: GroupLetter[]; groupsSkipped: GroupLetter[] } {
  const updated: GroupLetter[] = [];
  const skipped: GroupLetter[] = [];
  for (const letter of GROUP_LETTERS) {
    if (overrides[`groups.${letter}`]) {
      skipped.push(letter); // admin pinned this group; never auto-overwrite
      continue;
    }
    const computedOrder = computed[letter];
    if (computedOrder.every((c) => c === null)) {
      continue; // no group-stage data yet
    }
    const committed = complete[letter] ?? false;
    if (
      groupOrdersEqual(picks.groups[letter].order, computedOrder) &&
      picks.groups[letter].committed === committed
    ) {
      continue; // already current — avoid a no-op write
    }
    picks.groups[letter] = { order: computedOrder, committed };
    updated.push(letter);
  }
  return { groupsUpdated: updated, groupsSkipped: skipped };
}
