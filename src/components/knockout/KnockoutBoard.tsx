import { useMemo } from 'react';
import { MATCHES_BY_ROUND } from '@/data/bracket';
import { resolveAll } from '@/lib/resolveBracket';
import { mapThirdPlaceAdvancers } from '@/lib/thirdPlaceMap';
import { useEditing } from '@/components/bracket/EditingContext';
import { KnockoutColumn } from './KnockoutColumn';

export function KnockoutBoard() {
  const { picks } = useEditing();

  const resolved = useMemo(() => {
    const mapping = mapThirdPlaceAdvancers(picks.thirdPlace.advancingGroups);
    return resolveAll(picks, mapping);
  }, [picks]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-fit gap-6">
        <KnockoutColumn round="R32" matches={MATCHES_BY_ROUND.R32} resolved={resolved} />
        <KnockoutColumn round="R16" matches={MATCHES_BY_ROUND.R16} resolved={resolved} />
        <KnockoutColumn round="QF" matches={MATCHES_BY_ROUND.QF} resolved={resolved} />
        <KnockoutColumn round="SF" matches={MATCHES_BY_ROUND.SF} resolved={resolved} />
        <KnockoutColumn round="F" matches={MATCHES_BY_ROUND.F} resolved={resolved} />
      </div>
    </div>
  );
}
