import { GROUPS } from '@/data/groups';
import { GroupCard } from '@/components/groups/GroupCard';
import { ThirdPlaceTable } from '@/components/thirdplace/ThirdPlaceTable';
import { KnockoutBoard } from '@/components/knockout/KnockoutBoard';
import { EditableProvider } from '@/components/bracket/EditingContext';

interface Props {
  header?: React.ReactNode;
}

export function BracketEditor({ header }: Props) {
  return (
    <EditableProvider>
      <div className="space-y-12">
        {header}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Group Stage</h2>
            <span className="text-xs text-muted">12 groups · 48 teams</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((g) => (
              <GroupCard key={g.letter} group={g} />
            ))}
          </div>
        </section>
        <section>
          <ThirdPlaceTable />
        </section>
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Knockout Bracket</h2>
            <p className="text-xs text-muted">
              Commit groups above to populate this bracket. Best-3rd-place slots fill once
              you select 8 of 12 third-place teams. Click a team to pick the winner.
            </p>
          </div>
          <KnockoutBoard />
        </section>
      </div>
    </EditableProvider>
  );
}
