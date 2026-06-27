import { describe, expect, it } from 'vitest';
import { groupOrdersEqual, mergeGroupStandings } from './pollGroups';
import { GROUP_LETTERS } from '../src/data/groups';
import type { BracketPicks, GroupLetter, GroupOrder } from '../src/lib/types';

function emptyPicks(): BracketPicks {
  const groups = Object.fromEntries(
    GROUP_LETTERS.map((l) => [l, { order: [null, null, null, null] as GroupOrder, committed: false }]),
  ) as BracketPicks['groups'];
  return { groups, thirdPlace: { advancingGroups: [] }, knockout: {}, finalizedAt: null };
}

function emptyComputed(): Record<GroupLetter, GroupOrder> {
  return Object.fromEntries(
    GROUP_LETTERS.map((l) => [l, [null, null, null, null] as GroupOrder]),
  ) as Record<GroupLetter, GroupOrder>;
}

describe('mergeGroupStandings', () => {
  it('re-ranks a group when standings change (the freeze-bug scenario)', () => {
    const picks = emptyPicks();
    // Stored from an earlier partial poll: KOR/CZE in alphabetical (wrong) order.
    picks.groups.A = { order: ['MEX', 'CZE', 'KOR', 'RSA'], committed: true };
    const computed = emptyComputed();
    computed.A = ['MEX', 'KOR', 'CZE', 'RSA']; // correct order after both matches

    const res = mergeGroupStandings(picks, computed, { A: true }, {});

    expect(res.groupsUpdated).toContain('A');
    expect(picks.groups.A.order).toEqual(['MEX', 'KOR', 'CZE', 'RSA']);
  });

  it('writes a group that had no data yet', () => {
    const picks = emptyPicks();
    const computed = emptyComputed();
    computed.B = ['SUI', 'CAN', 'BIH', 'QAT'];

    const res = mergeGroupStandings(picks, computed, { B: true }, {});

    expect(res.groupsUpdated).toEqual(['B']);
    expect(picks.groups.B).toEqual({ order: ['SUI', 'CAN', 'BIH', 'QAT'], committed: true });
  });

  it('leaves a group alone when it is pinned via manualOverrides', () => {
    const picks = emptyPicks();
    picks.groups.A = { order: ['RSA', 'MEX', 'KOR', 'CZE'], committed: true }; // admin's call
    const computed = emptyComputed();
    computed.A = ['MEX', 'KOR', 'CZE', 'RSA'];

    const res = mergeGroupStandings(picks, computed, { A: true }, { 'groups.A': true });

    expect(res.groupsSkipped).toContain('A');
    expect(res.groupsUpdated).not.toContain('A');
    expect(picks.groups.A.order).toEqual(['RSA', 'MEX', 'KOR', 'CZE']); // untouched
  });

  it('does not write when the computed order already matches (no-op)', () => {
    const picks = emptyPicks();
    picks.groups.C = { order: ['BRA', 'MAR', 'SCO', 'HAI'], committed: true };
    const computed = emptyComputed();
    computed.C = ['BRA', 'MAR', 'SCO', 'HAI'];

    const res = mergeGroupStandings(picks, computed, { C: true }, {});

    expect(res.groupsUpdated).not.toContain('C');
  });

  it('skips groups with no computed data', () => {
    const res = mergeGroupStandings(emptyPicks(), emptyComputed(), {}, {});
    expect(res.groupsUpdated).toEqual([]);
  });

  it('stores a group uncommitted until it is complete', () => {
    const picks = emptyPicks();
    const computed = emptyComputed();
    computed.D = ['USA', 'AUS', 'PAR', 'TUR'];

    // Group still in progress -> uncommitted (its KO slots show a placeholder).
    mergeGroupStandings(picks, computed, { D: false }, {});
    expect(picks.groups.D.committed).toBe(false);
    expect(picks.groups.D.order).toEqual(['USA', 'AUS', 'PAR', 'TUR']);

    // Group finishes -> committed flips even though the order is unchanged.
    const res = mergeGroupStandings(picks, computed, { D: true }, {});
    expect(res.groupsUpdated).toContain('D');
    expect(picks.groups.D.committed).toBe(true);
  });
});

describe('groupOrdersEqual', () => {
  it('compares element-wise', () => {
    expect(groupOrdersEqual(['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'])).toBe(true);
    expect(groupOrdersEqual(['A', 'B', 'C', 'D'], ['A', 'B', 'D', 'C'])).toBe(false);
    expect(groupOrdersEqual([null, null, null, null], [null, null, null, null])).toBe(true);
  });
});
