import type { ResolvedMatch } from '@/lib/resolveBracket';
import type { MatchId, MatchSpec, Round } from '@/lib/types';
import { KnockoutMatch } from './KnockoutMatch';

const ROUND_LABEL: Record<Round, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

interface Props {
  round: Round;
  matches: MatchSpec[];
  resolved: Record<MatchId, ResolvedMatch>;
}

export function KnockoutColumn({ round, matches, resolved }: Props) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {ROUND_LABEL[round]}
      </h3>
      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <KnockoutMatch key={m.id} match={resolved[m.id]} />
        ))}
      </div>
    </div>
  );
}
