// World Cup 2026 first match: Mexico vs ?, Thursday June 11 at Estadio Azteca,
// kicking off 12:00 PM Pacific. Submission deadline is one hour before — 11:00 AM
// Pacific (PDT in June, UTC-7).
export const SUBMIT_DEADLINE = Date.parse('2026-06-11T11:00:00-07:00');

export function isPastDeadline(now: number = Date.now()): boolean {
  return now >= SUBMIT_DEADLINE;
}

export function formatDeadline(): string {
  return new Date(SUBMIT_DEADLINE).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
