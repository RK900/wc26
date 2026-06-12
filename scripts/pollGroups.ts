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
// Groups with no ESPN data yet, or whose standings are unchanged, are skipped.
//
// This previously skipped any group whose stored order was already non-null —
// which also caught the poller's OWN earlier writes, freezing every group at
// its first computed standings (e.g. group A stuck with KOR/CZE in alphabetical
// order from after match 1). manualOverrides is the intended, explicit way to
// protect a hand-entered group from being overwritten.
export function mergeGroupStandings(
  picks: BracketPicks,
  computed: Record<GroupLetter, GroupOrder>,
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
    if (groupOrdersEqual(picks.groups[letter].order, computedOrder)) {
      continue; // already current — avoid a no-op write
    }
    picks.groups[letter] = { order: computedOrder, committed: true };
    updated.push(letter);
  }
  return { groupsUpdated: updated, groupsSkipped: skipped };
}
