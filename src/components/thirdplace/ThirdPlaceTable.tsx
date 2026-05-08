import clsx from 'clsx';
import { GROUP_LETTERS } from '@/data/groups';
import { TEAMS } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { useEditing } from '@/components/bracket/EditingContext';
import { useBracketStore } from '@/store/bracketStore';
import type { GroupLetter } from '@/lib/types';

const MAX_THIRD_PLACE = 8;

export function ThirdPlaceTable() {
  const { picks, editable } = useEditing();
  const groupsState = picks.groups;
  const advancing = picks.thirdPlace.advancingGroups;
  const setAdvancers = useBracketStore((s) => s.setThirdPlaceAdvancers);

  const advancingSet = new Set(advancing);
  const atCap = advancing.length >= MAX_THIRD_PLACE;

  const toggle = (g: GroupLetter) => {
    if (!editable) return;
    if (advancingSet.has(g)) {
      setAdvancers(advancing.filter((x) => x !== g));
    } else if (!atCap) {
      setAdvancers([...advancing, g]);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Best 3rd-Place Teams
        </h3>
        <span
          className={clsx(
            'text-xs',
            advancing.length === MAX_THIRD_PLACE ? 'text-accent' : 'text-muted',
          )}
        >
          {advancing.length} / {MAX_THIRD_PLACE} selected
        </span>
      </div>
      {editable && (
        <p className="mb-3 text-xs text-muted">
          Pick the 8 third-place finishers (out of 12) you think will advance to the Round of 32.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_LETTERS.map((g) => {
          const grp = groupsState[g];
          const thirdCode = grp.committed ? grp.order[2] : null;
          const team = thirdCode ? TEAMS[thirdCode] : null;
          const checked = advancingSet.has(g);
          const disabled = !editable || !grp.committed || (atCap && !checked);
          return (
            <li key={g}>
              <label
                className={clsx(
                  'flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition',
                  checked
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-surface-2',
                  disabled && !checked && 'opacity-50',
                  editable && !disabled && 'cursor-pointer hover:border-border/80',
                  !editable && 'cursor-default',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(g)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                <span className="font-mono text-xs text-muted">{g}3</span>
                <TeamFlag code={thirdCode} size="sm" />
                <span className={clsx('truncate', !team && 'text-xs italic text-muted/70')}>
                  {team ? team.name : 'commit group first'}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
