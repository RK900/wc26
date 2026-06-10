import { describe, expect, it } from 'vitest';
import { isPastDeadline, SUBMIT_DEADLINE } from './deadline';

describe('SUBMIT_DEADLINE', () => {
  // Hard-coded equivalence against the same instant the Firestore rule
  // (firestore.rules:beforeSubmitDeadline) compares against. If either side
  // moves, this test breaks and a human has to confirm both moved.
  it('is 2026-06-11 06:59 UTC (11:59 PM PDT on Jun 10) — matches firestore.rules', () => {
    expect(SUBMIT_DEADLINE).toBe(Date.parse('2026-06-11T06:59:00Z'));
  });
});

describe('isPastDeadline', () => {
  it('is false one millisecond before the deadline', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE - 1)).toBe(false);
  });

  it('is true at the deadline instant', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE)).toBe(true);
  });

  it('is true one millisecond after the deadline', () => {
    expect(isPastDeadline(SUBMIT_DEADLINE + 1)).toBe(true);
  });
});
