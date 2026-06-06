import { describe, expect, it } from 'vitest';
import {
  AI_BRACKET_TEMPLATE,
  aiBracketDocId,
  isAIBracketId,
  normalizeTeam,
  parseAIBracketJson,
  picksToAIFile,
  slugify,
} from './aiBracket';
import { isComplete } from './completeness';

const json = (o: unknown) => JSON.stringify(o);

describe('parseAIBracketJson', () => {
  it('accepts the built-in template as a complete bracket', () => {
    const r = parseAIBracketJson(json(AI_BRACKET_TEMPLATE));
    expect(r.jsonError).toBeUndefined();
    expect(r.items).toHaveLength(1);
    const item = r.items[0];
    expect(item.ok, item.errors.join('; ')).toBe(true);
    expect(item.bracket!.docId).toMatch(/^ai-/);
    expect(isComplete(item.bracket!.picks)).toBe(true);
    expect(item.bracket!.summary.champion).toBe(AI_BRACKET_TEMPLATE.advancers.champion);
  });

  it('round-trips picks → file → picks', () => {
    const picks = parseAIBracketJson(json(AI_BRACKET_TEMPLATE)).items[0].bracket!.picks;
    const file2 = picksToAIFile('Round Trip', picks);
    const reparsed = parseAIBracketJson(json(file2)).items[0];
    expect(reparsed.ok, reparsed.errors.join('; ')).toBe(true);
    expect(reparsed.bracket!.picks.knockout).toEqual(picks.knockout);
    expect(reparsed.bracket!.picks.thirdPlace).toEqual(picks.thirdPlace);
  });

  it('reports JSON syntax errors without throwing', () => {
    const r = parseAIBracketJson('{ not valid json');
    expect(r.jsonError).toBeTruthy();
    expect(r.items).toHaveLength(0);
  });

  it('rejects a group that is not a permutation of its teams', () => {
    const bad = structuredClone(AI_BRACKET_TEMPLATE);
    bad.groups.A = ['BRA', 'KOR', 'RSA', 'CZE']; // BRA belongs to group C
    const item = parseAIBracketJson(json(bad)).items[0];
    expect(item.ok).toBe(false);
    expect(item.errors.join(' ')).toMatch(/Group A/);
  });

  it('requires exactly 8 third-place advancers', () => {
    const bad = structuredClone(AI_BRACKET_TEMPLATE);
    bad.thirdPlaceAdvancers = ['A', 'B', 'C'];
    const item = parseAIBracketJson(json(bad)).items[0];
    expect(item.ok).toBe(false);
    expect(item.errors.join(' ')).toMatch(/thirdPlaceAdvancers/);
  });

  it('rejects a champion who is not one of the finalists', () => {
    const bad = structuredClone(AI_BRACKET_TEMPLATE);
    bad.advancers.champion = bad.groups.A[3]; // a 4th-placed team can't be champion
    const item = parseAIBracketJson(json(bad)).items[0];
    expect(item.ok).toBe(false);
  });

  it('rejects an inconsistent advancer list (a non-winner listed in a later round)', () => {
    const bad = structuredClone(AI_BRACKET_TEMPLATE);
    // Swap one quarterfinalist for a team that didn't reach the round of 16.
    const notInR16 = bad.groups.A[3];
    bad.advancers.quarterfinals[0] = notInR16;
    const item = parseAIBracketJson(json(bad)).items[0];
    expect(item.ok).toBe(false);
  });

  it('normalizes team codes, full names, and aliases', () => {
    expect(normalizeTeam('MEX')).toBe('MEX');
    expect(normalizeTeam('mex')).toBe('MEX');
    expect(normalizeTeam('Mexico')).toBe('MEX');
    expect(normalizeTeam('South Korea')).toBe('KOR');
    expect(normalizeTeam('United States of America')).toBe('USA');
    expect(normalizeTeam('  Türkiye ')).toBe('TUR');
    expect(normalizeTeam('Atlantis')).toBeNull();
    expect(normalizeTeam(42)).toBeNull();
  });

  it('parses an array and flags duplicate ids', () => {
    const r = parseAIBracketJson(json([AI_BRACKET_TEMPLATE, AI_BRACKET_TEMPLATE]));
    expect(r.items).toHaveLength(2);
    expect(r.items[0].ok).toBe(true);
    expect(r.items[1].ok).toBe(false);
    expect(r.items[1].errors.join(' ')).toMatch(/Duplicate id/);
  });

  it('derives a doc id from the nickname when no id is given', () => {
    const file = structuredClone(AI_BRACKET_TEMPLATE);
    file.nickname = '🤖 GPT-5';
    delete file.id;
    const item = parseAIBracketJson(json(file)).items[0];
    expect(item.ok, item.errors.join('; ')).toBe(true);
    expect(item.bracket!.docId).toBe('ai-gpt-5');
  });
});

describe('id helpers', () => {
  it('slugify strips emoji and punctuation', () => {
    expect(slugify('🤖 GPT-5')).toBe('gpt-5');
    expect(slugify('Claude!!!')).toBe('claude');
  });

  it('aiBracketDocId / isAIBracketId agree', () => {
    expect(aiBracketDocId('claude')).toBe('ai-claude');
    expect(isAIBracketId('ai-claude')).toBe(true);
    expect(isAIBracketId('abc123realuid')).toBe(false);
  });
});
