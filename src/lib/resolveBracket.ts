import { MATCHES, MATCHES_BY_ID } from '@/data/bracket';
import type {
  BracketPicks,
  GroupLetter,
  MatchId,
  MatchSpec,
  SlotSpec,
  TeamCode,
} from '@/lib/types';

export interface ThirdPlaceMapping {
  // Length 8, indexed by Best3 slotIndex (0..7).
  slots: { matchId: MatchId; group: GroupLetter | null }[];
  // Groups the user advanced that didn't get assigned to any slot.
  unmatched: GroupLetter[];
}

export function resolveSlot(
  spec: SlotSpec,
  picks: BracketPicks,
  mapping: ThirdPlaceMapping,
): TeamCode | null {
  switch (spec.kind) {
    case 'group': {
      const pick = picks.groups[spec.group];
      if (!pick.committed) return null;
      return pick.order[spec.rank - 1] ?? null;
    }
    case 'best3': {
      const slot = mapping.slots[spec.slotIndex];
      if (!slot || !slot.group) return null;
      const groupPick = picks.groups[slot.group];
      if (!groupPick.committed) return null;
      return groupPick.order[2] ?? null;
    }
    case 'winner': {
      return picks.knockout[spec.matchId]?.winner ?? null;
    }
    case 'loser': {
      const sourceMatch = MATCHES_BY_ID[spec.matchId];
      if (!sourceMatch) return null;
      const sourceWinner = picks.knockout[spec.matchId]?.winner ?? null;
      if (!sourceWinner) return null;
      const sourceHome = resolveSlot(sourceMatch.home, picks, mapping);
      const sourceAway = resolveSlot(sourceMatch.away, picks, mapping);
      if (sourceWinner === sourceHome) return sourceAway;
      if (sourceWinner === sourceAway) return sourceHome;
      // Picked winner doesn't match either side (cascade about to clear it).
      return null;
    }
  }
}

// Resolve a match's two sides, honoring an optional admin R32 override
// (picks.r32[matchId]) before falling back to the slot-derived team. Use this
// everywhere a match's home/away is needed — editor, scoring, cascade,
// completeness, the poller — so the override is applied consistently. Matches
// with no override (the common case, and every non-R32 match) behave exactly
// as resolveSlot did.
export function resolveMatchSides(
  m: MatchSpec,
  picks: BracketPicks,
  mapping: ThirdPlaceMapping,
): { home: TeamCode | null; away: TeamCode | null } {
  const ov = picks.r32?.[m.id];
  return {
    home: ov?.home ?? resolveSlot(m.home, picks, mapping),
    away: ov?.away ?? resolveSlot(m.away, picks, mapping),
  };
}

export interface ResolvedMatch {
  spec: MatchSpec;
  home: TeamCode | null;
  away: TeamCode | null;
  winner: TeamCode | null;
}

export function resolveAll(
  picks: BracketPicks,
  mapping: ThirdPlaceMapping,
): Record<MatchId, ResolvedMatch> {
  const out: Record<MatchId, ResolvedMatch> = {};
  for (const m of MATCHES) {
    const { home, away } = resolveMatchSides(m, picks, mapping);
    const winner = picks.knockout[m.id]?.winner ?? null;
    out[m.id] = { spec: m, home, away, winner };
  }
  return out;
}
