// World Cup 2026 first match: Mexico, Thursday June 11 at Estadio Azteca,
// kicking off 12:00 PM Pacific. Submission deadline is 24 hours before —
// 12:00 PM Pacific on Wednesday June 10 (PDT in June, UTC-7).
export const SUBMIT_DEADLINE = Date.parse('2026-06-10T12:00:00-07:00');

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
