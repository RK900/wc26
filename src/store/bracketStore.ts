import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GROUP_LETTERS, GROUPS } from '@/data/groups';
import { applyCascade } from '@/lib/cascade';
import { isComplete } from '@/lib/completeness';
import { isPastDeadline } from '@/lib/deadline';
import type {
  BracketPicks,
  GroupLetter,
  GroupOrder,
  GroupPick,
  MatchId,
  TeamCode,
} from '@/lib/types';

const initialGroups = (): Record<GroupLetter, GroupPick> => {
  const out = {} as Record<GroupLetter, GroupPick>;
  for (const g of GROUPS) {
    out[g.letter] = {
      order: [...g.teams] as GroupOrder,
      committed: false,
    };
  }
  return out;
};

// Exported so the create-pool / join-pool flows can seed a brand-new
// bracket with a fresh default instead of whatever picks happen to be
// sitting in the persisted store from another pool.
export const initialPicks = (): BracketPicks => ({
  groups: initialGroups(),
  thirdPlace: { advancingGroups: [] },
  knockout: {},
  finalizedAt: null,
  finalGoalsGuess: null,
});

// Copy the group standings out of a results doc into a fresh picks.groups.
// Preserve each group's `committed` flag — a group that isn't final yet
// (committed === false) resolves its R32 slots to a placeholder ("1st of H")
// instead of a provisional team, so members don't see half-decided groups.
function groupsFromResults(resultsPicks: BracketPicks): Record<GroupLetter, GroupPick> {
  const out = {} as Record<GroupLetter, GroupPick>;
  for (const letter of GROUP_LETTERS) {
    const gp = resultsPicks.groups[letter];
    out[letter] = {
      order: (gp ? [...gp.order] : [null, null, null, null]) as GroupOrder,
      committed: gp?.committed ?? false,
    };
  }
  return out;
}

// A fresh knockout-only bracket: the group + 3rd-place sections are copied
// (locked) from the live results, and the member only fills the knockout.
// finalGoalsGuess is reset to null — that's the user's OWN tiebreaker guess,
// not the actual final-goals count that also lives in the results doc.
export const knockoutSeedPicks = (resultsPicks: BracketPicks): BracketPicks => ({
  groups: groupsFromResults(resultsPicks),
  thirdPlace: { advancingGroups: [...resultsPicks.thirdPlace.advancingGroups] },
  knockout: {},
  finalizedAt: null,
  finalGoalsGuess: null,
  // Carry any admin R32 override so the seeded bracket resolves to the exact
  // teams the admin set. Omit the key entirely when absent (Firestore rejects
  // undefined fields).
  ...(resultsPicks.r32 ? { r32: structuredClone(resultsPicks.r32) } : {}),
});

interface BracketState {
  picks: BracketPicks;
  poolId: string | null;
  bracketId: string | null;

  setGroupOrder: (g: GroupLetter, order: GroupOrder) => void;
  commitGroup: (g: GroupLetter) => void;
  setThirdPlaceAdvancers: (groups: GroupLetter[]) => void;
  setKnockoutWinner: (matchId: MatchId, team: TeamCode | null) => void;
  setFinalGoalsGuess: (goals: number | null) => void;
  // Knockout-only pools: overwrite the (locked) group + 3rd-place sections
  // with the actual results, then cascade so any knockout pick that no longer
  // resolves to a real team is cleared. Preserves the user's knockout picks
  // and finalGoalsGuess.
  syncKnockoutResults: (resultsPicks: BracketPicks) => void;
  finalize: (deadline?: number) => void;
  resetAll: () => void;

  // Bulk-clear helpers. None of them touch finalizedAt — once submitted,
  // the bracket stays submitted (matches the "submit is one-way" rule).
  clearGroups: () => void;
  clearThirdPlace: () => void;
  clearKnockout: () => void;
}

export const useBracketStore = create<BracketState>()(
  persist(
    (set) => ({
      picks: initialPicks(),
      poolId: null,
      bracketId: null,

      setGroupOrder: (g, order) =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            groups: {
              ...state.picks.groups,
              [g]: { ...state.picks.groups[g], order },
            },
          }),
        })),

      commitGroup: (g) =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            groups: {
              ...state.picks.groups,
              [g]: { ...state.picks.groups[g], committed: true },
            },
          }),
        })),

      setThirdPlaceAdvancers: (groups) =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            thirdPlace: { advancingGroups: groups },
          }),
        })),

      setKnockoutWinner: (matchId, team) =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            knockout: {
              ...state.picks.knockout,
              [matchId]: { winner: team },
            },
          }),
        })),

      setFinalGoalsGuess: (goals) =>
        set((state) => ({
          picks: { ...state.picks, finalGoalsGuess: goals },
        })),

      syncKnockoutResults: (resultsPicks) =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            groups: groupsFromResults(resultsPicks),
            thirdPlace: { advancingGroups: [...resultsPicks.thirdPlace.advancingGroups] },
            // Mirror the admin R32 override (or {} when none — never undefined,
            // which Firestore would reject on the next autosave).
            r32: resultsPicks.r32 ?? {},
          }),
        })),

      finalize: (deadline) =>
        set((state) => {
          if (!isComplete(state.picks)) return {};
          // Submitting is a write — refuse it past the deadline so a click
          // in the gap between the deadline crossing and the 30s poll firing
          // doesn't flash "Submitted" before the editor locks. `deadline` is
          // the pool's deadline (knockout pools pass their own later one).
          if (isPastDeadline(deadline)) return {};
          return {
            picks: { ...state.picks, finalizedAt: Date.now() },
          };
        }),

      resetAll: () =>
        set({
          picks: initialPicks(),
          poolId: null,
          bracketId: null,
        }),

      // Clearing predictions un-submits the bracket. Submit was "one-way"
      // from a forward-only perspective, but an explicit Clear action (with
      // its confirm dialog) is a deliberate reset — the user can re-submit
      // after re-filling.
      clearGroups: () =>
        set(() => ({
          picks: applyCascade({
            groups: initialGroups(),
            thirdPlace: { advancingGroups: [] },
            knockout: {},
            finalizedAt: null,
          }),
        })),

      clearThirdPlace: () =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            thirdPlace: { advancingGroups: [] },
            finalizedAt: null,
          }),
        })),

      clearKnockout: () =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            knockout: {},
            finalizedAt: null,
          }),
        })),
    }),
    {
      name: 'dleuworldcup:state',
      version: 1,
    },
  ),
);
