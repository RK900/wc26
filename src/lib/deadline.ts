// World Cup 2026 first match: Mexico, Thursday June 11 at Estadio Azteca,
// kicking off 12:00 PM Pacific. Submission deadline is 11:59 PM Pacific on
// Wednesday June 10 (PDT in June, UTC-7) — the night before kickoff.
// 11:59 PM PDT = 06:59 UTC on 2026-06-11.
export const SUBMIT_DEADLINE = Date.parse('2026-06-10T23:59:00-07:00');

// Knockout-only pools open after the group stage and lock 1 hour before the
// first Round-of-32 match: 11:00 AM Pacific on Sunday June 28, 2026 (PDT,
// UTC-7) = 18:00 UTC. Kept in sync with the cap/fallback in firestore.rules.
export const KNOCKOUT_SUBMIT_DEADLINE = Date.parse('2026-06-28T11:00:00-07:00');

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

// The deadline isPastDeadline / formatDeadline should consult for a given
// pool. Equals the passed deadline in prod; in dev, the localStorage override
// (when set) wins so you can simulate any deadline crossing for testing.
function effectiveDeadline(deadline: number): number {
  return devDeadlineOverride() ?? deadline;
}

// `deadline` defaults to the full-tournament SUBMIT_DEADLINE; knockout pools
// pass their own (later) Pool.submitDeadline.
export function isPastDeadline(
  deadline: number = SUBMIT_DEADLINE,
  now: number = Date.now(),
): boolean {
  return now >= effectiveDeadline(deadline);
}

export function formatDeadline(deadline: number = SUBMIT_DEADLINE): string {
  return new Date(effectiveDeadline(deadline)).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
