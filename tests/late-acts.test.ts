import { describe, expect, it } from 'vitest';
import { lateActs, completeLateActStep, lateActComplete, type LateActNumber, type LateActDefinition } from '../src/game/late-acts';
import { chapterSpirit } from '../src/game/chapter-fruits';
import { worldInteractions } from '../src/game/world-data';

const chapters: LateActNumber[] = [4, 5, 6];

describe('late-act narrative integration contract', () => {
  it('connects the final three acts to the remaining species in chapter order', () => {
    const definitions: LateActDefinition[] = chapters.map(chapter => lateActs[chapter]);
    expect(definitions.map(act => act.chapter)).toEqual([4, 5, 6]);
    expect(definitions.map(act => act.title)).toEqual(['朋友價', '實習費', '沉默的申請']);
    expect(definitions.map(act => act.spirit)).toEqual(['qilin', 'xuanwu', 'qinglong']);
    for (const act of definitions) {
      expect(act.spirit).toBe(chapterSpirit[act.chapter]);
      expect(act.opening.trim()).not.toBe('');
      expect(act.closing.trim()).not.toBe('');
      expect(act.rules.length).toBeGreaterThan(0);
    }
  });

  it('offers five to six ordered records per act, using existing NPCs and two evidence-producing choices', () => {
    const npcIds = worldInteractions.map(npc => npc.id);
    const ids: string[] = [];
    for (const chapter of chapters) {
      const act = lateActs[chapter];
      expect(act.steps.length).toBeGreaterThanOrEqual(5);
      expect(act.steps.length).toBeLessThanOrEqual(6);
      for (const step of act.steps) {
        ids.push(step.id);
        expect(npcIds).toContain(step.npcId);
        expect(step.title.trim()).not.toBe('');
        expect(step.intro.trim()).not.toBe('');
        expect(step.choices).toHaveLength(2);
        expect(new Set(step.choices.map(choice => choice.label)).size).toBe(2);
        expect(new Set(step.choices.map(choice => choice.evidence)).size).toBe(2);
        for (const choice of step.choices) {
          expect(choice.label.trim()).not.toBe('');
          expect(choice.reply.trim()).not.toBe('');
          expect(choice.evidence.trim()).not.toBe('');
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(chapters)('act %i ordered completion', chapter => {
  it('rejects unknown, skipped, repeated and cross-act steps without mutating progress', () => {
    let progress: string[] = [];
    const act = lateActs[chapter];
    expect(lateActComplete(chapter, progress)).toBe(false);
    expect(completeLateActStep(chapter, progress, 'unknown')).toBe(progress);
    expect(completeLateActStep(chapter, progress, act.steps[1].id)).toBe(progress);
    expect(completeLateActStep(chapter, progress, lateActs[chapter === 4 ? 5 : 4].steps[0].id)).toBe(progress);
    for (const step of act.steps) {
      const previous = [...progress];
      const next = completeLateActStep(chapter, progress, step.id);
      expect(progress).toEqual(previous);
      expect(next).toEqual([...previous, step.id]);
      expect(completeLateActStep(chapter, next, step.id)).toBe(next);
      progress = next;
    }
    expect(lateActComplete(chapter, progress)).toBe(true);
    expect(completeLateActStep(chapter, progress, 'unknown')).toBe(progress);
    expect(lateActComplete(chapter, progress.slice().reverse())).toBe(false);
    expect(lateActComplete(chapter, [...progress, progress[0]])).toBe(false);
    expect(lateActComplete(chapter, ['unknown', ...progress.slice(1)])).toBe(false);
    expect(completeLateActStep(chapter, ['unknown'], act.steps[1].id)).toEqual(['unknown']);
  });
});
