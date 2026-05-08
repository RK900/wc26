import clsx from 'clsx';
import { TEAMS } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { useEditing } from '@/components/bracket/EditingContext';
import { useBracketStore } from '@/store/bracketStore';
import type { ResolvedMatch } from '@/lib/resolveBracket';
import type { MatchId, SlotSpec, TeamCode } from '@/lib/types';

interface Props {
  match: ResolvedMatch;
}

export function KnockoutMatch({ match }: Props) {
  const { spec, home, away, winner } = match;
  const { editable } = useEditing();
  const setKnockoutWinner = useBracketStore((s) => s.setKnockoutWinner);

  const togglePick = (matchId: MatchId, team: TeamCode | null) => {
    if (!editable || !team) return;
    setKnockoutWinner(matchId, winner === team ? null : team);
  };

  return (
    <div className="rounded-md border border-border bg-surface text-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
        <span>Match {spec.id}</span>
      </div>
      <Side
        slotSpec={spec.home}
        teamCode={home}
        picked={winner !== null && winner === home}
        editable={editable}
        onPick={() => togglePick(spec.id, home)}
      />
      <div className="border-t border-border/30" />
      <Side
        slotSpec={spec.away}
        teamCode={away}
        picked={winner !== null && winner === away}
        editable={editable}
        onPick={() => togglePick(spec.id, away)}
      />
    </div>
  );
}

interface SideProps {
  slotSpec: SlotSpec;
  teamCode: TeamCode | null;
  picked: boolean;
  editable: boolean;
  onPick: () => void;
}

function Side({ slotSpec, teamCode, picked, editable, onPick }: SideProps) {
  const team = teamCode ? TEAMS[teamCode] : null;
  const canPick = editable && team !== null;
  const content = (
    <>
      <span
        aria-hidden
        className={clsx(
          'h-3 w-3 shrink-0 rounded-full border transition',
          picked ? 'border-accent bg-accent' : 'border-border',
        )}
      />
      <TeamFlag code={teamCode} size="sm" />
      <span className={clsx('flex-1 truncate', !team && 'text-xs italic text-muted/70')}>
        {team ? team.name : describeSlot(slotSpec)}
      </span>
    </>
  );

  if (!editable) {
    return (
      <div
        className={clsx(
          'flex w-full items-center gap-2 px-2 py-1.5',
          picked && 'bg-accent/15 font-medium',
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={canPick ? onPick : undefined}
      disabled={!canPick}
      aria-pressed={picked}
      className={clsx(
        'flex w-full items-center gap-2 px-2 py-1.5 text-left transition',
        picked && 'bg-accent/15 font-medium',
        canPick && !picked && 'hover:bg-surface-2',
        !canPick && 'cursor-not-allowed',
      )}
    >
      {content}
    </button>
  );
}

function describeSlot(spec: SlotSpec): string {
  switch (spec.kind) {
    case 'group':
      return `${spec.rank === 1 ? '1st' : '2nd'} of ${spec.group}`;
    case 'best3':
      return `3rd of ${spec.eligibleGroups.join('/')}`;
    case 'winner':
      return `Winner of M${spec.matchId}`;
    case 'loser':
      return `Loser of M${spec.matchId}`;
  }
}
