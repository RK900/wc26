// Tournament reference (compile-time constants)

export type TeamCode = string;
export type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
export type Round = 'R32' | 'R16' | 'QF' | 'SF' | '3rd' | 'F';
export type MatchId = number;

export interface Team {
  code: TeamCode;
  name: string;
  group: GroupLetter;
  flag: string;
}

export interface GroupDef {
  letter: GroupLetter;
  teams: TeamCode[];
}

export type SlotSpec =
  | { kind: 'group'; group: GroupLetter; rank: 1 | 2 }
  | { kind: 'best3'; eligibleGroups: GroupLetter[]; slotIndex: number }
  | { kind: 'winner'; matchId: MatchId }
  | { kind: 'loser'; matchId: MatchId };

export interface MatchSpec {
  id: MatchId;
  round: Round;
  home: SlotSpec;
  away: SlotSpec;
}

// User picks (mutable state)

export type GroupOrder = [TeamCode | null, TeamCode | null, TeamCode | null, TeamCode | null];

export interface GroupPick {
  order: GroupOrder;
  committed: boolean;
}

export interface ThirdPlacePicks {
  advancingGroups: GroupLetter[];
}

export interface KnockoutPick {
  winner: TeamCode | null;
}

export interface BracketPicks {
  groups: Record<GroupLetter, GroupPick>;
  thirdPlace: ThirdPlacePicks;
  knockout: Record<MatchId, KnockoutPick>;
  finalizedAt: number | null;
}

// Persisted documents (Firestore)

export interface Pool {
  id: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
}

export interface Bracket {
  id: string;
  poolId: string;
  name: string;
  nickname: string;
  ownerTokenHash: string;
  ownerTokenSalt: string;
  picks: BracketPicks;
  updatedAt: number;
  finalizedAt: number | null;
}

export interface BracketSummary {
  id: string;
  nickname: string;
  finalizedAt: number | null;
  updatedAt: number;
}

// Canonical tournament results — same shape as a bracket, but represents
// ground truth instead of a user prediction.
export interface ResultsDoc {
  picks: BracketPicks;
  lastUpdated: number;
  lastUpdatedBy: 'admin' | 'espn-cron';
  // Reserved for ESPN automation: fields the admin overrode by hand and
  // the poller must not clobber. Keyed by '{section}.{key}' (e.g.,
  // 'groups.A', 'thirdPlace', 'knockout.89'). Optional for now.
  manualOverrides?: Record<string, true>;
}
