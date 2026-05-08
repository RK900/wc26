import { useMemo } from 'react';
import { MATCHES_BY_ROUND } from '@/data/bracket';
import { resolveAll } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import { useEditing } from '@/components/bracket/EditingContext';
import { KnockoutColumn } from './KnockoutColumn';
import { KnockoutMatch } from './KnockoutMatch';

export function KnockoutBoard() {
  const { picks } = useEditing();

  const resolved = useMemo(() => {
    const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
    return resolveAll(picks, mapping);
  }, [picks]);

  const finalMatch = MATCHES_BY_ROUND.F[0];
  const thirdPlaceMatch = MATCHES_BY_ROUND['3rd'][0];

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
