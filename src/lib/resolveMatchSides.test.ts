import { describe, expect, it } from 'vitest';
import { MATCHES_BY_ID } from '@/data/bracket';
import { GROUP_LETTERS } from '@/data/groups';
import { applyCascade } from './cascade';
import { resolveMatchSides } from './resolveBracket';
import { mapThirdPlaceAdvancers } from './thirdPlaceMap';
import type { BracketPicks, GroupLetter, GroupOrder, GroupPick } from './types';

// Match 73 is "2nd of A vs 2nd of B" — a pure group-slot R32 match, so its
// derived sides are easy to reason about without the 3rd-place table.
const M73 = MATCHES_BY_ID[73];
const MAPPING = mapThirdPlaceAdvancers([]);

function picksWithGroups(): BracketPicks {
  const groups = {} as Record<GroupLetter, GroupPick>;
  for (const l of GROUP_LETTERS) {
    groups[l] = { order: [null, null, null, null] as GroupOrder, committed: true };
  }
  groups.A = { order: ['MEX', 'RSA', 'KOR', 'CZE'], committed: true };
  groups.B = { order: ['SUI', 'CAN', 'BIH', 'QAT'], committed: true };
  return { groups, thirdPlace: { advancingGroups: [] }, knockout: {}, finalizedAt: null };
}

describe('resolveMatchSides (R32 override)', () => {
  it('falls back to the slot-derived team when there is no override', () => {
    expect(resolveMatchSides(M73, picksWithGroups(), MAPPING)).toEqual({
      home: 'RSA', // 2nd of A
      away: 'CAN', // 2nd of B
    });
  });

  it('overrides per side — a null side still falls through to the derived team', () => {
    const p = picksWithGroups();
    p.r32 = { 73: { home: 'USA', away: null } };
    expect(resolveMatchSides(M73, p, MAPPING)).toEqual({ home: 'USA', away: 'CAN' });
  });

  it('overrides both sides', () => {
    const p = picksWithGroups();
    p.r32 = { 73: { home: 'BIH', away: 'QAT' } };
    expect(resolveMatchSides(M73, p, MAPPING)).toEqual({ home: 'BIH', away: 'QAT' });
  });

  it('cascade clears a knockout winner the override removed from the match', () => {
    const p = picksWithGroups();
    p.knockout = { 73: { winner: 'RSA' } }; // RSA was the derived home (2nd of A)
    p.r32 = { 73: { home: 'USA', away: 'CAN' } }; // override home -> RSA no longer in M73
    const next = applyCascade(p);
    expect(next.knockout[73]?.winner ?? null).toBeNull();
  });
});
