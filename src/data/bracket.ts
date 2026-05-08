import type { GroupLetter, MatchSpec, SlotSpec } from '@/lib/types';

const grp = (group: GroupLetter, rank: 1 | 2): SlotSpec => ({ kind: 'group', group, rank });
const best3 = (slotIndex: number, eligibleGroups: GroupLetter[]): SlotSpec => ({
  kind: 'best3',
  slotIndex,
  eligibleGroups,
});
const winner = (matchId: number): SlotSpec => ({ kind: 'winner', matchId });
const loser = (matchId: number): SlotSpec => ({ kind: 'loser', matchId });

// FIFA World Cup 2026 knockout structure.
// R32 matchups (matches 73-88) sourced from FIFA's published schedule.
// R16/QF/SF/F pairings sourced from Wikipedia 2026 FIFA World Cup knockout stage diagram —
// note these are NOT sequential (e.g., M89 = W74/W77, not W73/W74) per the published bracket.
export const MATCHES: MatchSpec[] = [
  // Round of 32 — Best3 slotIndex 0..7 in match-ID order (74, 77, 79, 80, 81, 82, 85, 87).
  { id: 73, round: 'R32', home: grp('A', 2), away: grp('B', 2) },
  { id: 74, round: 'R32', home: grp('E', 1), away: best3(0, ['A', 'B', 'C', 'D', 'F']) },
  { id: 75, round: 'R32', home: grp('F', 1), away: grp('C', 2) },
  { id: 76, round: 'R32', home: grp('C', 1), away: grp('F', 2) },
  { id: 77, round: 'R32', home: grp('I', 1), away: best3(1, ['C', 'D', 'F', 'G', 'H']) },
  { id: 78, round: 'R32', home: grp('E', 2), away: grp('I', 2) },
  { id: 79, round: 'R32', home: grp('A', 1), away: best3(2, ['C', 'E', 'F', 'H', 'I']) },
  { id: 80, round: 'R32', home: grp('L', 1), away: best3(3, ['E', 'H', 'I', 'J', 'K']) },
  { id: 81, round: 'R32', home: grp('D', 1), away: best3(4, ['B', 'E', 'F', 'I', 'J']) },
  { id: 82, round: 'R32', home: grp('G', 1), away: best3(5, ['A', 'E', 'H', 'I', 'J']) },
  { id: 83, round: 'R32', home: grp('K', 2), away: grp('L', 2) },
  { id: 84, round: 'R32', home: grp('H', 1), away: grp('J', 2) },
  { id: 85, round: 'R32', home: grp('B', 1), away: best3(6, ['E', 'F', 'G', 'I', 'J']) },
  { id: 86, round: 'R32', home: grp('J', 1), away: grp('H', 2) },
  { id: 87, round: 'R32', home: grp('K', 1), away: best3(7, ['D', 'E', 'I', 'J', 'L']) },
  { id: 88, round: 'R32', home: grp('D', 2), away: grp('G', 2) },

  // Round of 16 — non-sequential pairings per FIFA bracket diagram.
  { id: 89, round: 'R16', home: winner(74), away: winner(77) },
  { id: 90, round: 'R16', home: winner(73), away: winner(75) },
  { id: 91, round: 'R16', home: winner(76), away: winner(78) },
  { id: 92, round: 'R16', home: winner(79), away: winner(80) },
  { id: 93, round: 'R16', home: winner(83), away: winner(84) },
  { id: 94, round: 'R16', home: winner(81), away: winner(82) },
  { id: 95, round: 'R16', home: winner(86), away: winner(88) },
  { id: 96, round: 'R16', home: winner(85), away: winner(87) },

  // Quarter-finals.
  { id: 97, round: 'QF', home: winner(89), away: winner(90) },
  { id: 98, round: 'QF', home: winner(93), away: winner(94) },
  { id: 99, round: 'QF', home: winner(91), away: winner(92) },
  { id: 100, round: 'QF', home: winner(95), away: winner(96) },

  // Semi-finals.
  { id: 101, round: 'SF', home: winner(97), away: winner(98) },
  { id: 102, round: 'SF', home: winner(99), away: winner(100) },

  // 3rd-place playoff (losers of the SFs).
  { id: 103, round: '3rd', home: loser(101), away: loser(102) },

  // Final.
  { id: 104, round: 'F', home: winner(101), away: winner(102) },
];

export const MATCHES_BY_ID: Record<number, MatchSpec> = Object.fromEntries(
  MATCHES.map((m) => [m.id, m]),
);

export const MATCHES_BY_ROUND: Record<MatchSpec['round'], MatchSpec[]> = {
  R32: MATCHES.filter((m) => m.round === 'R32'),
  R16: MATCHES.filter((m) => m.round === 'R16'),
  QF: MATCHES.filter((m) => m.round === 'QF'),
  SF: MATCHES.filter((m) => m.round === 'SF'),
  '3rd': MATCHES.filter((m) => m.round === '3rd'),
  F: MATCHES.filter((m) => m.round === 'F'),
};

// Eight Best3 slots in order of appearance (R32 match IDs 74, 77, 79, 80, 81, 82, 85, 87).
export const BEST3_SLOT_MATCH_IDS: number[] = [74, 77, 79, 80, 81, 82, 85, 87];
