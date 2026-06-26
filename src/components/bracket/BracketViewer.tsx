import { GROUPS } from '@/data/groups';
import { GroupCard } from '@/components/groups/GroupCard';
import { ThirdPlaceTable } from '@/components/thirdplace/ThirdPlaceTable';
import { KnockoutBoard } from '@/components/knockout/KnockoutBoard';
import { ReadOnlyProvider } from '@/components/bracket/EditingContext';
import type { BracketPicks } from '@/lib/types';

interface Props {
  picks: BracketPicks;
  header?: React.ReactNode;
  results?: BracketPicks | null;
  // Knockout-only pool: the group + 3rd-place sections are the decided actual
  // results, so the viewer shows just the bracket the member predicted.
  knockoutOnly?: boolean;
}

export function BracketViewer({ picks, header, results = null, knockoutOnly = false }: Props) {
  return (
    <ReadOnlyProvider picks={picks} results={results}>
      <div className="space-y-12">
        {header}
        {!knockoutOnly && (
          <>
            <section>
              <h2 className="mb-4 text-lg font-semibold">Group Predictions</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GROUPS.map((g) => (
                  <GroupCard key={g.letter} group={g} />
                ))}
              </div>
            </section>
            <section>
              <ThirdPlaceTable />
            </section>
          </>
        )}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Knockout Bracket</h2>
          <KnockoutBoard />
        </section>
      </div>
    </ReadOnlyProvider>
  );
}
