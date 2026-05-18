import { describe, expect, it } from 'vitest';
import { emptyResultsPicks } from '@/lib/resultsApi';
import {
  groupRowCorrectness,
  knockoutCorrectness,
  thirdPlaceCorrectness,
} from '@/lib/correctness';

describe('groupRowCorrectness', () => {
  it('returns unknown when predicted is null', () => {
    const r = emptyResultsPicks();
    r.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    expect(groupRowCorrectness('A', null, 0, r)).toBe('unknown');
  });

  it('returns unknown when results is null', () => {
    expect(groupRowCorrectness('A', 'MEX', 0, null)).toBe('unknown');
  });

  it('returns unknown when group has no results yet', () => {
    const r = emptyResultsPicks();
    expect(groupRowCorrectness('A', 'MEX', 0, r)).toBe('unknown');
  });

  it('returns unknown when team is not in actual order (partial entry)', () => {
    const r = emptyResultsPicks();
    r.groups.A.order = ['MEX', null, null, null];
    expect(groupRowCorrectness('A', 'RSA', 1, r)).toBe('unknown');
  });

  it('returns correct on exact slot match', () => {
    const r = emptyResultsPicks();
    r.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    expect(groupRowCorrectness('A', 'MEX', 0, r)).toBe('correct');
    expect(groupRowCorrectness('A', 'CZE', 3, r)).toBe('correct');
  });

  it('returns near when off by 1 slot', () => {
    const r = emptyResultsPicks();
    r.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    expect(groupRowCorrectness('A', 'MEX', 1, r)).toBe('near');
    expect(groupRowCorrectness('A', 'KOR', 1, r)).toBe('near');
  });

  it('returns wrong when off by 2 or more slots', () => {
    const r = emptyResultsPicks();
    r.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    expect(groupRowCorrectness('A', 'MEX', 2, r)).toBe('wrong');
    expect(groupRowCorrectness('A', 'MEX', 3, r)).toBe('wrong');
    expect(groupRowCorrectness('A', 'CZE', 0, r)).toBe('wrong');
  });
});

describe('thirdPlaceCorrectness', () => {
  it('returns unknown when row is not picked', () => {
    const r = emptyResultsPicks();
    r.thirdPlace.advancingGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    expect(thirdPlaceCorrectness('A', false, r)).toBe('unknown');
  });

  it('returns unknown when results is null', () => {
    expect(thirdPlaceCorrectness('A', true, null)).toBe('unknown');
  });

  it('returns unknown when best-3 not entered yet', () => {
    const r = emptyResultsPicks();
    expect(thirdPlaceCorrectness('A', true, r)).toBe('unknown');
  });

  it('returns correct when picked group actually advanced', () => {
    const r = emptyResultsPicks();
    r.thirdPlace.advancingGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    expect(thirdPlaceCorrectness('A', true, r)).toBe('correct');
    expect(thirdPlaceCorrectness('H', true, r)).toBe('correct');
  });

  it('returns wrong when picked group did not advance', () => {
    const r = emptyResultsPicks();
    r.thirdPlace.advancingGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    expect(thirdPlaceCorrectness('I', true, r)).toBe('wrong');
    expect(thirdPlaceCorrectness('L', true, r)).toBe('wrong');
  });
});

describe('knockoutCorrectness', () => {
  it('returns unknown when no pick', () => {
    const r = emptyResultsPicks();
    r.knockout[73] = { winner: 'MEX' };
    expect(knockoutCorrectness(73, null, r)).toBe('unknown');
  });

  it('returns unknown when results is null', () => {
    expect(knockoutCorrectness(73, 'MEX', null)).toBe('unknown');
  });

  it('returns unknown when match has no actual winner', () => {
    const r = emptyResultsPicks();
    expect(knockoutCorrectness(73, 'MEX', r)).toBe('unknown');
  });

  it('returns correct when picked winner matches', () => {
    const r = emptyResultsPicks();
    r.knockout[73] = { winner: 'MEX' };
    expect(knockoutCorrectness(73, 'MEX', r)).toBe('correct');
  });

  it('returns wrong when picked winner differs', () => {
    const r = emptyResultsPicks();
    r.knockout[73] = { winner: 'MEX' };
    expect(knockoutCorrectness(73, 'RSA', r)).toBe('wrong');
  });
});
