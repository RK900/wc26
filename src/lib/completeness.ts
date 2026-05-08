import { MATCHES } from '@/data/bracket';
import { GROUP_LETTERS } from '@/data/groups';
import { resolveSlot } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import type { BracketPicks } from '@/lib/types';

export function isComplete(picks: BracketPicks): boolean {
  for (const g of GROUP_LETTERS) {
    if (!picks.groups[g].committed) return false;
    if (picks.groups[g].order.some((t) => t === null)) return false;
  }
  if (picks.thirdPlace.advancingGroups.length !== 8) return false;

  const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
  for (const m of MATCHES) {
    const winner = picks.knockout[m.id]?.winner;
    if (!winner) return false;
    const home = resolveSlot(m.home, picks, mapping);
    const away = resolveSlot(m.away, picks, mapping);
    if (winner !== home && winner !== away) return false;
  }
  return true;
}

export interface CompletionProgress {
  groupsCommitted: number;
  groupsOrdered: number;
  thirdPlacePicks: number;
  knockoutPicks: number;
  knockoutTotal: number;
  done: number;
  total: number;
  isComplete: boolean;
}

export function progress(picks: BracketPicks): CompletionProgress {
  let groupsCommitted = 0;
  let groupsOrdered = 0;
  for (const g of GROUP_LETTERS) {
    if (picks.groups[g].committed) groupsCommitted++;
    if (picks.groups[g].order.every((t) => t !== null)) groupsOrdered++;
  }
  const thirdPlacePicks = picks.thirdPlace.advancingGroups.length;

  const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
  let knockoutPicks = 0;
  for (const m of MATCHES) {
    const winner = picks.knockout[m.id]?.winner;
    if (!winner) continue;
    const home = resolveSlot(m.home, picks, mapping);
    const away = resolveSlot(m.away, picks, mapping);
    if (winner === home || winner === away) knockoutPicks++;
  }

  const knockoutTotal = MATCHES.length;
  const total = 12 + 8 + knockoutTotal;
  const done = groupsCommitted + thirdPlacePicks + knockoutPicks;
  return {
    groupsCommitted,
    groupsOrdered,
    thirdPlacePicks,
    knockoutPicks,
    knockoutTotal,
    done,
    total,
    isComplete:
      groupsCommitted === 12 &&
      groupsOrdered === 12 &&
      thirdPlacePicks === 8 &&
      knockoutPicks === knockoutTotal,
  };
}
