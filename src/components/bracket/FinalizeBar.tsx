import clsx from 'clsx';
import { progress } from '@/lib/completeness';
import { formatDeadline } from '@/lib/deadline';
import { useBracketStore } from '@/store/bracketStore';

export function FinalizeBar({
  knockoutOnly = false,
  deadline,
}: {
  knockoutOnly?: boolean;
  deadline?: number;
}) {
  const picks = useBracketStore((s) => s.picks);
  const finalize = useBracketStore((s) => s.finalize);

  const p = progress(picks);
  const submitted = picks.finalizedAt !== null;
  const ready = p.isComplete;
  const buttonDisabled = !ready || submitted;

  // Knockout pools have their group + 3rd-place sections pre-filled from the
  // results, so the only thing the member is "making" is the bracket.
  const counts = knockoutOnly
    ? `Knockout ${p.knockoutPicks}/${p.knockoutTotal}`
    : `Groups ${p.groupsCommitted}/12 · 3rd-place ${p.thirdPlacePicks}/8 · Knockout ${p.knockoutPicks}/${p.knockoutTotal}`;

  let leftHeading: string;
  let leftSub: string;
  if (submitted) {
    leftHeading = 'Submitted';
    leftSub = `Picks still update until ${formatDeadline(deadline)}`;
  } else if (ready) {
    leftHeading = 'All picks ready';
    leftSub = counts;
  } else {
    leftHeading = knockoutOnly
      ? `${p.knockoutPicks} / ${p.knockoutTotal} winners picked`
      : `${p.done} / ${p.total} picks made`;
    leftSub = counts;
  }

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div>
          <div className="text-sm font-semibold">{leftHeading}</div>
          <div className="text-xs text-muted">{leftSub}</div>
        </div>
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={() => finalize(deadline)}
          className={clsx(
            'rounded-md px-5 py-2 text-sm font-semibold transition',
            buttonDisabled && 'cursor-not-allowed bg-surface-2 text-muted',
            !buttonDisabled && 'bg-accent text-bg hover:opacity-90',
          )}
        >
          {submitted ? 'Submitted' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
