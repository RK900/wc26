import { describe, expect, it } from 'vitest';
import { isPastDeadline, KNOCKOUT_SUBMIT_DEADLINE, SUBMIT_DEADLINE } from './deadline';

describe('SUBMIT_DEADLINE', () => {
  // Hard-coded equivalence against the same instant the Firestore rule
  // (firestore.rules:fullSubmitDeadlineMs) compares against. If either side
  // moves, this test breaks and a human has to confirm both moved.
  it('is 2026-06-11 06:59 UTC (11:59 PM PDT on Jun 10) — matches firestore.rules', () => {
    expect(SUBMIT_DEADLINE).toBe(Date.parse('2026-06-11T06:59:00Z'));
  });
});

describe('KNOCKOUT_SUBMIT_DEADLINE', () => {
  // 11:00 AM PDT on Sun Jun 28, 2026 = 18:00 UTC, 1 hour before the first
  // Round-of-32 match. Knockout pools store this as Pool.submitDeadline.
  it('is 2026-06-28 18:00 UTC (11:00 AM PDT on Jun 28)', () => {
    expect(KNOCKOUT_SUBMIT_DEADLINE).toBe(Date.parse('2026-06-28T18:00:00Z'));
  });

  it('is after the full-tournament deadline', () => {
    expect(KNOCKOUT_SUBMIT_DEADLINE).toBeGreaterThan(SUBMIT_DEADLINE);
  });
});

describe('isPastDeadline', () => {
  it('is false one millisecond before the deadline', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE, SUBMIT_DEADLINE - 1)).toBe(false);
  });

  it('is true at the deadline instant', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE, SUBMIT_DEADLINE)).toBe(true);
  });

  it('is true one millisecond after the deadline', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE, SUBMIT_DEADLINE + 1)).toBe(true);
  });

  it('compares against the per-pool deadline it is given', () => {
    // A moment that is past the full deadline but before the knockout one is
    // "open" for a knockout pool and "closed" for a full pool.
    const between = SUBMIT_DEADLINE + 1;
    expect(isPastDeadline(SUBMIT_DEADLINE, between)).toBe(true);
    expect(isPastDeadline(KNOCKOUT_SUBMIT_DEADLINE, between)).toBe(false);
  });
});
