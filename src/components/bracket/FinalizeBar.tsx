import clsx from 'clsx';
import { progress } from '@/lib/completeness';
import { useBracketStore } from '@/store/bracketStore';

export function FinalizeBar() {
  const picks = useBracketStore((s) => s.picks);
  const finalize = useBracketStore((s) => s.finalize);

  const p = progress(picks);
  const finalized = picks.finalizedAt !== null;
  const ready = p.isComplete;

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div>
          <div className="text-sm font-semibold">
            {ready
              ? finalized
                ? 'Finalized — still editable'
                : 'All picks ready'
              : `${p.done} / ${p.total} picks made`}
          </div>
          <div className="text-xs text-muted">
            Groups {p.groupsCommitted}/12 · 3rd-place {p.thirdPlacePicks}/8 · Knockout{' '}
            {p.knockoutPicks}/32
          </div>
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => finalize()}
          className={clsx(
            'rounded-md px-5 py-2 text-sm font-semibold transition',
            !ready && 'cursor-not-allowed bg-surface-2 text-muted',
            ready && !finalized && 'bg-accent text-bg hover:opacity-90',
            ready && finalized && 'bg-accent/25 text-accent hover:bg-accent/35',
          )}
        >
          {finalized ? 'Re-finalize' : 'Finalize Predictions'}
        </button>
      </div>
    </div>
  );
}
