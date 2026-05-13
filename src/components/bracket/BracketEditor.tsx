import { GROUPS } from '@/data/groups';
import { GroupCard } from '@/components/groups/GroupCard';
import { ThirdPlaceTable } from '@/components/thirdplace/ThirdPlaceTable';
import { KnockoutBoard } from '@/components/knockout/KnockoutBoard';
import { EditableProvider } from '@/components/bracket/EditingContext';
import { useBracketStore } from '@/store/bracketStore';

interface Props {
  header?: React.ReactNode;
}

export function BracketEditor({ header }: Props) {
  const clearGroups = useBracketStore((s) => s.clearGroups);
  const clearThirdPlace = useBracketStore((s) => s.clearThirdPlace);
  const clearKnockout = useBracketStore((s) => s.clearKnockout);

  const onClearGroups = () => {
    if (
      window.confirm(
        "Clear all picks (groups, 3rd-place, and knockout)? This can't be undone.",
      )
    ) {
      clearGroups();
    }
  };
  const onClearThirdPlace = () => {
    if (
      window.confirm(
        'Clear 3rd-place picks? Any knockout picks that depend on Best-3 slots will also clear.',
      )
    ) {
      clearThirdPlace();
    }
  };
  const onClearKnockout = () => {
    if (window.confirm('Clear all knockout winner picks?')) {
      clearKnockout();
    }
  };

  return (
    <EditableProvider>
      <div className="space-y-12">
        {header}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Group Stage</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">12 groups · 48 teams</span>
              <ClearButton onClick={onClearGroups} label="Clear all" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((g) => (
              <GroupCard key={g.letter} group={g} />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Best 3rd-Place Teams</h2>
            <ClearButton onClick={onClearThirdPlace} label="Clear 3rd-place" />
          </div>
          <ThirdPlaceTable />
        </section>
        <section>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Knockout Bracket</h2>
              <p className="text-xs text-muted">
                Commit groups above to populate this bracket. Best-3rd-place slots fill once
                you select 8 of 12 third-place teams. Click a team to pick the winner.
              </p>
            </div>
            <ClearButton onClick={onClearKnockout} label="Clear knockout" />
          </div>
          <KnockoutBoard />
        </section>
      </div>
    </EditableProvider>
  );
}

function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition hover:border-danger/50 hover:text-danger"
    >
      {label}
    </button>
  );
}
