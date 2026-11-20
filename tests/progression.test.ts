import { describe, expect, it } from 'vitest';
import { canFastTravelTo, isChapterComplete } from '../src/game/progression';

describe('chapter progression', () => {
  it('marks a chapter complete only when every listed objective is complete', () => {
    expect(isChapterComplete([true, true, true])).toBe(true);
    expect(isChapterComplete([true, false, true])).toBe(false);
    expect(isChapterComplete([])).toBe(false);
  });

  it('allows fast travel only to a different region already visited', () => {
    const visited = ['hq', 'oldTown'] as const;
    expect(canFastTravelTo('harbor', 'hq', visited)).toBe(false);
    expect(canFastTravelTo('oldTown', 'hq', visited)).toBe(true);
    expect(canFastTravelTo('hq', 'hq', visited)).toBe(false);
  });
});
