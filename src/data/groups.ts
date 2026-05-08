import type { GroupDef, GroupLetter } from '@/lib/types';

// Confirmed FIFA World Cup 2026 group draw (December 5, 2025).
// Order within each group reflects the drawn pots (1, 2, 3, 4).
export const GROUPS: GroupDef[] = [
  { letter: 'A', teams: ['MEX', 'RSA', 'KOR', 'CZE'] },
  { letter: 'B', teams: ['CAN', 'BIH', 'QAT', 'SUI'] },
  { letter: 'C', teams: ['BRA', 'MAR', 'HAI', 'SCO'] },
  { letter: 'D', teams: ['USA', 'PAR', 'AUS', 'TUR'] },
  { letter: 'E', teams: ['GER', 'CUW', 'CIV', 'ECU'] },
  { letter: 'F', teams: ['NED', 'JPN', 'SWE', 'TUN'] },
  { letter: 'G', teams: ['BEL', 'EGY', 'IRN', 'NZL'] },
  { letter: 'H', teams: ['ESP', 'CPV', 'KSA', 'URU'] },
  { letter: 'I', teams: ['FRA', 'SEN', 'IRQ', 'NOR'] },
  { letter: 'J', teams: ['ARG', 'ALG', 'AUT', 'JOR'] },
  { letter: 'K', teams: ['POR', 'COD', 'UZB', 'COL'] },
  { letter: 'L', teams: ['ENG', 'CRO', 'GHA', 'PAN'] },
];

export const GROUP_LETTERS: GroupLetter[] = GROUPS.map((g) => g.letter);

export const GROUP_BY_LETTER: Record<GroupLetter, GroupDef> = Object.fromEntries(
  GROUPS.map((g) => [g.letter, g]),
) as Record<GroupLetter, GroupDef>;
