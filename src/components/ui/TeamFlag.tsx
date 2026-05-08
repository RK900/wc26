import clsx from 'clsx';
import { TEAMS } from '@/data/teams';
import type { TeamCode } from '@/lib/types';

interface Props {
  code: TeamCode | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function TeamFlag({ code, size = 'md', className }: Props) {
  if (!code) {
    return <span className={clsx(sizeClass[size], 'opacity-30', className)} aria-hidden>·</span>;
  }
  const team = TEAMS[code];
  if (!team) return null;
  return (
    <span className={clsx(sizeClass[size], className)} aria-hidden>
      {team.flag}
    </span>
  );
}
