import { describe, expect, it } from 'vitest';
import { MATCHES, MATCHES_BY_ROUND } from '@/data/bracket';
import { GROUP_LETTERS, GROUPS } from '@/data/groups';
import { emptyResultsPicks } from '@/lib/resultsApi';
import { MAX_SCORE, ROUND_POINTS, scoreBracket } from '@/lib/scoring';
import type { BracketPicks, GroupLetter, Round } from '@/lib/types';

function blankPicks(): BracketPicks {
  return emptyResultsPicks();
}

describe('scoreBracket', () => {
  it('returns 0 for empty picks vs empty results', () => {
    expect(scoreBracket(blankPicks(), blankPicks()).total).toBe(0);
  });

  it('awards 4 group points for a perfectly-predicted group', () => {
    const picks = blankPicks();
    const results = blankPicks();
    picks.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    results.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    const score = scoreBracket(picks, results);
    expect(score.groupPoints).toBe(4);
    expect(score.total).toBe(4);
  });

  it('awards only matching positions when group order partially right', () => {
    const picks = blankPicks();
    const results = blankPicks();
    picks.groups.A.order = ['MEX', 'KOR', 'RSA', 'CZE'];
    results.groups.A.order = ['MEX', 'RSA', 'KOR', 'CZE'];
    expect(scoreBracket(picks, results).groupPoints).toBe(2); // 1st + 4th
  });

  it('awards points for each correctly identified third-place advancer', () => {
    const picks = blankPicks();
    const results = blankPicks();
    picks.thirdPlace.advancingGroups = ['A', 'B', 'C', 'D'];
    results.thirdPlace.advancingGroups = ['A', 'B', 'E', 'F'] as GroupLetter[];
    expect(scoreBracket(picks, results).thirdPlacePoints).toBe(2);
  });

  it('awards round-weighted points for correct knockout winners', () => {
    const picks = blankPicks();
    const results = blankPicks();
    // R32 (1pt): match 73
    picks.knockout[73] = { winner: 'MEX' };
    results.knockout[73] = { winner: 'MEX' };
    // Final (16pt): match 104
    picks.knockout[104] = { winner: 'BRA' };
    results.knockout[104] = { winner: 'BRA' };
    const score = scoreBracket(picks, results);
    expect(score.knockoutPointsByRound.R32).toBe(1);
    expect(score.knockoutPointsByRound.F).toBe(16);
    expect(score.knockoutTotal).toBe(17);
    expect(score.total).toBe(17);
  });

  it('gives 0 for a knockout pick when results have no winner yet', () => {
    const picks = blankPicks();
    const results = blankPicks();
    picks.knockout[104] = { winner: 'BRA' };
    expect(scoreBracket(picks, results).knockoutTotal).toBe(0);
  });

  it('gives 0 for a wrong knockout pick', () => {
    const picks = blankPicks();
    const results = blankPicks();
    picks.knockout[104] = { winner: 'BRA' };
    results.knockout[104] = { winner: 'ARG' };
    expect(scoreBracket(picks, results).knockoutTotal).toBe(0);
  });

  it('a perfect bracket scores MAX_SCORE', () => {
    const results = blankPicks();
    for (const g of GROUPS) {
      results.groups[g.letter].order = [g.teams[0], g.teams[1], g.teams[2], g.teams[3]];
    }
    results.thirdPlace.advancingGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (const m of MATCHES) {
      results.knockout[m.id] = { winner: 'WINNER_' + m.id };
    }
    const score = scoreBracket(results, results);
    expect(score.total).toBe(MAX_SCORE);
  });

  it('MAX_SCORE matches manual calculation', () => {
    let expected = 0;
    for (const round of Object.keys(ROUND_POINTS) as Round[]) {
      expected += (MATCHES_BY_ROUND[round]?.length ?? 0) * ROUND_POINTS[round];
    }
    expected += GROUP_LETTERS.length * 4; // group points
    expected += 8; // third-place points
    expect(MAX_SCORE).toBe(expected);
  });
});
