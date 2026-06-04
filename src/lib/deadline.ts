// World Cup 2026 first match: Mexico, Thursday June 11 at Estadio Azteca,
// kicking off 12:00 PM Pacific. Submission deadline is 5:00 PM Pacific on
// Wednesday June 10 (PDT in June, UTC-7) — the day before kickoff.
// 5:00 PDT = 00:00 UTC on 2026-06-11.
export const SUBMIT_DEADLINE = Date.parse('2026-06-10T17:00:00-07:00');

const DEV_OVERRIDE_KEY = 'dleuworldcup:dev-deadline';

// In dev builds only, an optional localStorage override lets you simulate
// the deadline crossing without waiting until June 10. Examples (run in
// the browser console):
//
//   // Lock right now:
//   localStorage.setItem('dleuworldcup:dev-deadline', 'now');
//
//   // Lock 60 seconds from now (good for watching the 30s polling fire):
//   localStorage.setItem('dleuworldcup:dev-deadline',
//     new Date(Date.now() + 60_000).toISOString());
//
//   // Back to the real deadline:
//   localStorage.removeItem('dleuworldcup:dev-deadline');
//
// Production builds (import.meta.env.DEV === false) ignore the override
// entirely so an end user can't trigger an early lock.
function devDeadlineOverride(): number | null {
  if (!import.meta.env.DEV) return null;
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
    if (!raw) return null;
    if (raw === 'now') return Date.now() - 1;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

// The deadline isPastDeadline / formatDeadline should consult. Equals
// SUBMIT_DEADLINE in prod; in dev, may be overridden via localStorage.
function effectiveDeadline(): number {
  return devDeadlineOverride() ?? SUBMIT_DEADLINE;
}

export function isPastDeadline(now: number = Date.now()): boolean {
  return now >= effectiveDeadline();
}

export function formatDeadline(): string {
  return new Date(effectiveDeadline()).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
