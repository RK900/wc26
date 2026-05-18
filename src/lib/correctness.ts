import type { BracketPicks, GroupLetter, MatchId, TeamCode } from '@/lib/types';

// Group rows can be off-by-1 (partial credit) so they have an extra tier.
export type GroupRowCorrectness = 'correct' | 'near' | 'wrong' | 'unknown';

// Best-3 picks + KO winners are binary: either exact match or not.
export type BinaryCorrectness = 'correct' | 'wrong' | 'unknown';

// How close the user's predicted slot for `predicted` matches the actual
// finishing position in `results.groups[letter].order`.
//
// Returns 'unknown' when:
//   - The user hasn't filled this row (predicted is null), OR
//   - Results aren't set for this group at all (all four slots null), OR
//   - The predicted team isn't in the actual order (shouldn't happen for
//     a sanely-entered group result, but guard against partial entry).
export function groupRowCorrectness(
  letter: GroupLetter,
  predicted: TeamCode | null,
  predictedSlot: number,
  results: BracketPicks | null,
): GroupRowCorrectness {
  if (!predicted || !results) return 'unknown';
  const actual = results.groups[letter]?.order;
  if (!actual) return 'unknown';
  if (actual.every((t) => t === null)) return 'unknown';
  const actualPos = actual.indexOf(predicted);
  if (actualPos === -1) return 'unknown';
  const distance = Math.abs(actualPos - predictedSlot);
  if (distance === 0) return 'correct';
  if (distance === 1) return 'near';
  return 'wrong';
}

// Whether the user's prediction that `letter` would advance as a best-3rd
// matches the actual best-3 set. Returns 'unknown' before results are
// entered. Only meaningful for groups the user actually picked — callers
// should pass `isPicked=true` and ignore the result otherwise.
export function thirdPlaceCorrectness(
  letter: GroupLetter,
  isPicked: boolean,
  results: BracketPicks | null,
): BinaryCorrectness {
  if (!isPicked) return 'unknown';
  if (!results) return 'unknown';
  const advancing = results.thirdPlace.advancingGroups;
  if (advancing.length === 0) return 'unknown';
  return advancing.includes(letter) ? 'correct' : 'wrong';
}

// Whether the user's picked winner matches the actual winner. 'unknown'
// when results have no winner for this match, or when the user didn't
// pick one.
export function knockoutCorrectness(
  matchId: MatchId,
  pickedWinner: TeamCode | null,
  results: BracketPicks | null,
): BinaryCorrectness {
  if (!pickedWinner || !results) return 'unknown';
  const actual = results.knockout[matchId]?.winner ?? null;
  if (!actual) return 'unknown';
  return actual === pickedWinner ? 'correct' : 'wrong';
}
