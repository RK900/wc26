import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GROUPS } from '@/data/groups';
import { applyCascade } from '@/lib/cascade';
import { isComplete } from '@/lib/completeness';
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

const initialPicks = (): BracketPicks => ({
  groups: initialGroups(),
  thirdPlace: { advancingGroups: [] },
  knockout: {},
  finalizedAt: null,
  finalGoalsGuess: null,
});

interface BracketState {
  picks: BracketPicks;
  poolId: string | null;
  bracketId: string | null;
  editToken: string | null;

  setGroupOrder: (g: GroupLetter, order: GroupOrder) => void;
  commitGroup: (g: GroupLetter) => void;
  setThirdPlaceAdvancers: (groups: GroupLetter[]) => void;
  setKnockoutWinner: (matchId: MatchId, team: TeamCode | null) => void;
  setFinalGoalsGuess: (goals: number | null) => void;
  finalize: () => void;
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
      editToken: null,

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

      finalize: () =>
        set((state) => {
          if (!isComplete(state.picks)) return {};
          return {
            picks: { ...state.picks, finalizedAt: Date.now() },
          };
        }),

      resetAll: () =>
        set({
          picks: initialPicks(),
          poolId: null,
          bracketId: null,
          editToken: null,
        }),

      clearGroups: () =>
        set((state) => ({
          picks: applyCascade({
            groups: initialGroups(),
            thirdPlace: { advancingGroups: [] },
            knockout: {},
            finalizedAt: state.picks.finalizedAt,
          }),
        })),

      clearThirdPlace: () =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            thirdPlace: { advancingGroups: [] },
          }),
        })),

      clearKnockout: () =>
        set((state) => ({
          picks: applyCascade({
            ...state.picks,
            knockout: {},
          }),
        })),
    }),
    {
      name: 'dleuworldcup:state',
      version: 1,
    },
  ),
);
