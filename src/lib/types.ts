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
  // Total goals scored in the Final (regulation + ET, not counting penalty
  // shootout goals). Used as the leaderboard tiebreaker. Same field holds
  // the user's prediction in their picks and the actual count in results.
  finalGoalsGuess?: number | null;
}

// Persisted documents (Firestore)

export interface Pool {
  id: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
  // Pool format. Absent / 'full' = the original challenge (predict groups,
  // 3rd-place, and the whole knockout). 'knockout' = a knockout-only pool
  // opened once the group stage is decided: the group + 3rd-place sections
  // are locked to the actual results and members only pick the bracket.
  mode?: 'full' | 'knockout';
  // Per-pool submission deadline (epoch ms). Absent = the global
  // SUBMIT_DEADLINE. Knockout pools carry their own (later) deadline.
  submitDeadline?: number;
}

export interface Bracket {
  id: string; // Firestore doc ID — equals ownerUid (one bracket per user per pool).
  poolId: string;
  ownerUid: string; // Google account that owns/edits this bracket.
  nickname: string;
  // Denormalized pool name (pools are immutable, so it can't go stale). Lets
  // the "your brackets" list show pool names from a single collection-group
  // query without an extra read per pool.
  poolName: string;
  picks: BracketPicks;
  updatedAt: number;
  finalizedAt: number | null;
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
