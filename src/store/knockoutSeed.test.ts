import { describe, expect, it } from 'vitest';
import { knockoutSeedPicks } from './bracketStore';
import { GROUP_LETTERS } from '@/data/groups';
import type { BracketPicks, GroupLetter, GroupOrder, GroupPick } from '@/lib/types';

// A results-doc-shaped picks: final group standings + the 8 third-place
// advancers, plus a knockout winner and an actual final-goals count that a
// knockout-only seed must NOT leak into the member's fresh bracket.
function resultsLike(): BracketPicks {
  const groups = {} as Record<GroupLetter, GroupPick>;
  for (const l of GROUP_LETTERS) {
    groups[l] = { order: [null, null, null, null] as GroupOrder, committed: true };
  }
  groups.A = { order: ['MEX', 'KOR', 'CZE', 'RSA'], committed: true };
  return {
    groups,
    thirdPlace: { advancingGroups: ['A', 'B', 'C', 'D', 'F', 'G', 'J', 'L'] },
    knockout: { 73: { winner: 'KOR' } },
    finalizedAt: 123,
    finalGoalsGuess: 4,
  };
}

describe('knockoutSeedPicks', () => {
  it('locks in the actual group standings (committed)', () => {
    const seed = knockoutSeedPicks(resultsLike());
    expect(seed.groups.A.order).toEqual(['MEX', 'KOR', 'CZE', 'RSA']);
    expect(seed.groups.A.committed).toBe(true);
  });

  it('copies the 8 third-place advancers into a fresh array', () => {
    const results = resultsLike();
    const seed = knockoutSeedPicks(results);
    expect(seed.thirdPlace.advancingGroups).toEqual(['A', 'B', 'C', 'D', 'F', 'G', 'J', 'L']);
    // Not the same reference — editing one must not mutate the results doc.
    expect(seed.thirdPlace.advancingGroups).not.toBe(results.thirdPlace.advancingGroups);
  });

  it('starts the knockout empty and never leaks the results knockout/tiebreaker', () => {
    const seed = knockoutSeedPicks(resultsLike());
    expect(seed.knockout).toEqual({});
    expect(seed.finalGoalsGuess).toBeNull();
    expect(seed.finalizedAt).toBeNull();
  });
});
