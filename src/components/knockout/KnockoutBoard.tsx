import { useEffect, useMemo, useState } from 'react';
import { MATCHES_BY_ROUND } from '@/data/bracket';
import { resolveAll } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import { useEditing } from '@/components/bracket/EditingContext';
import { useBracketStore } from '@/store/bracketStore';
import { KnockoutColumn } from './KnockoutColumn';
import { KnockoutMatch } from './KnockoutMatch';

export function KnockoutBoard() {
  const { picks, editable } = useEditing();

  const resolved = useMemo(() => {
    const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
    return resolveAll(picks, mapping);
  }, [picks]);

  const finalMatch = MATCHES_BY_ROUND.F[0];
  const thirdPlaceMatch = MATCHES_BY_ROUND['3rd'][0];
  const finalWinner = finalMatch ? resolved[finalMatch.id].winner : null;
  const finalGoalsGuess = picks.finalGoalsGuess ?? null;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-fit gap-6">
        <KnockoutColumn round="R32" matches={MATCHES_BY_ROUND.R32} resolved={resolved} />
        <KnockoutColumn round="R16" matches={MATCHES_BY_ROUND.R16} resolved={resolved} />
        <KnockoutColumn round="QF" matches={MATCHES_BY_ROUND.QF} resolved={resolved} />
        <KnockoutColumn round="SF" matches={MATCHES_BY_ROUND.SF} resolved={resolved} />

        {/* Final column also hosts the 3rd-place playoff below the Final. */}
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Final</h3>
          {finalMatch && <KnockoutMatch match={resolved[finalMatch.id]} />}
          {finalMatch && (finalWinner !== null || finalGoalsGuess !== null) && (
            <FinalGoalsGuess editable={editable} value={finalGoalsGuess} />
          )}
          {thirdPlaceMatch && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                3rd-Place Playoff
              </h3>
              <KnockoutMatch match={resolved[thirdPlaceMatch.id]} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FinalGoalsGuess({ editable, value }: { editable: boolean; value: number | null }) {
  const setFinalGoalsGuess = useBracketStore((s) => s.setFinalGoalsGuess);
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));

  // Keep the local input in sync if the store value changes elsewhere
  // (e.g., a fresh bracket load, or after a cascade clears picks).
  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);

  if (!editable) {
    if (value === null) return null;
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
        <span className="block uppercase tracking-wider">Final goals guess</span>
        <span className="mt-0.5 block font-mono text-base text-text">{value}</span>
      </div>
    );
  }

  const commit = (raw: string) => {
    if (raw === '') {
      setFinalGoalsGuess(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 99) return;
    setFinalGoalsGuess(n);
  };

  return (
    <label className="block rounded-md border border-accent/30 bg-surface px-3 py-2 text-xs">
      <span className="block uppercase tracking-wider text-muted">
        Total goals in the Final
      </span>
      <span className="mt-0.5 block text-[10px] text-muted/80">
        Tiebreaker if you tie on points.
      </span>
      <input
        type="number"
        min={0}
        max={99}
        step={1}
        inputMode="numeric"
        value={draft}
        placeholder="0"
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        className="mt-1 w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}
