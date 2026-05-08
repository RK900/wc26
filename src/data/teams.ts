import type { Team, TeamCode } from '@/lib/types';

export const TEAMS: Record<TeamCode, Team> = {
  // Group A
  MEX: { code: 'MEX', name: 'Mexico', group: 'A', flag: '🇲🇽' },
  RSA: { code: 'RSA', name: 'South Africa', group: 'A', flag: '🇿🇦' },
  KOR: { code: 'KOR', name: 'Korea Republic', group: 'A', flag: '🇰🇷' },
  CZE: { code: 'CZE', name: 'Czechia', group: 'A', flag: '🇨🇿' },
  // Group B
  CAN: { code: 'CAN', name: 'Canada', group: 'B', flag: '🇨🇦' },
  BIH: { code: 'BIH', name: 'Bosnia & Herzegovina', group: 'B', flag: '🇧🇦' },
  QAT: { code: 'QAT', name: 'Qatar', group: 'B', flag: '🇶🇦' },
  SUI: { code: 'SUI', name: 'Switzerland', group: 'B', flag: '🇨🇭' },
  // Group C
  BRA: { code: 'BRA', name: 'Brazil', group: 'C', flag: '🇧🇷' },
  MAR: { code: 'MAR', name: 'Morocco', group: 'C', flag: '🇲🇦' },
  HAI: { code: 'HAI', name: 'Haiti', group: 'C', flag: '🇭🇹' },
  SCO: { code: 'SCO', name: 'Scotland', group: 'C', flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' },
  // Group D
  USA: { code: 'USA', name: 'United States', group: 'D', flag: '🇺🇸' },
  PAR: { code: 'PAR', name: 'Paraguay', group: 'D', flag: '🇵🇾' },
  AUS: { code: 'AUS', name: 'Australia', group: 'D', flag: '🇦🇺' },
  TUR: { code: 'TUR', name: 'Türkiye', group: 'D', flag: '🇹🇷' },
  // Group E
  GER: { code: 'GER', name: 'Germany', group: 'E', flag: '🇩🇪' },
  CUW: { code: 'CUW', name: 'Curaçao', group: 'E', flag: '🇨🇼' },
  CIV: { code: 'CIV', name: 'Ivory Coast', group: 'E', flag: '🇨🇮' },
  ECU: { code: 'ECU', name: 'Ecuador', group: 'E', flag: '🇪🇨' },
  // Group F
  NED: { code: 'NED', name: 'Netherlands', group: 'F', flag: '🇳🇱' },
  JPN: { code: 'JPN', name: 'Japan', group: 'F', flag: '🇯🇵' },
  SWE: { code: 'SWE', name: 'Sweden', group: 'F', flag: '🇸🇪' },
  TUN: { code: 'TUN', name: 'Tunisia', group: 'F', flag: '🇹🇳' },
  // Group G
  BEL: { code: 'BEL', name: 'Belgium', group: 'G', flag: '🇧🇪' },
  EGY: { code: 'EGY', name: 'Egypt', group: 'G', flag: '🇪🇬' },
  IRN: { code: 'IRN', name: 'Iran', group: 'G', flag: '🇮🇷' },
  NZL: { code: 'NZL', name: 'New Zealand', group: 'G', flag: '🇳🇿' },
  // Group H
  ESP: { code: 'ESP', name: 'Spain', group: 'H', flag: '🇪🇸' },
  CPV: { code: 'CPV', name: 'Cape Verde', group: 'H', flag: '🇨🇻' },
  KSA: { code: 'KSA', name: 'Saudi Arabia', group: 'H', flag: '🇸🇦' },
  URU: { code: 'URU', name: 'Uruguay', group: 'H', flag: '🇺🇾' },
  // Group I
  FRA: { code: 'FRA', name: 'France', group: 'I', flag: '🇫🇷' },
  SEN: { code: 'SEN', name: 'Senegal', group: 'I', flag: '🇸🇳' },
  IRQ: { code: 'IRQ', name: 'Iraq', group: 'I', flag: '🇮🇶' },
  NOR: { code: 'NOR', name: 'Norway', group: 'I', flag: '🇳🇴' },
  // Group J
  ARG: { code: 'ARG', name: 'Argentina', group: 'J', flag: '🇦🇷' },
  ALG: { code: 'ALG', name: 'Algeria', group: 'J', flag: '🇩🇿' },
  AUT: { code: 'AUT', name: 'Austria', group: 'J', flag: '🇦🇹' },
  JOR: { code: 'JOR', name: 'Jordan', group: 'J', flag: '🇯🇴' },
  // Group K
  POR: { code: 'POR', name: 'Portugal', group: 'K', flag: '🇵🇹' },
  COD: { code: 'COD', name: 'DR Congo', group: 'K', flag: '🇨🇩' },
  UZB: { code: 'UZB', name: 'Uzbekistan', group: 'K', flag: '🇺🇿' },
  COL: { code: 'COL', name: 'Colombia', group: 'K', flag: '🇨🇴' },
  // Group L
  ENG: { code: 'ENG', name: 'England', group: 'L', flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  CRO: { code: 'CRO', name: 'Croatia', group: 'L', flag: '🇭🇷' },
  GHA: { code: 'GHA', name: 'Ghana', group: 'L', flag: '🇬🇭' },
  PAN: { code: 'PAN', name: 'Panama', group: 'L', flag: '🇵🇦' },
};

export const TEAM_CODES: TeamCode[] = Object.keys(TEAMS);
