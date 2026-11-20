import { describe, expect, it } from 'vitest';
import { getChapterFruitSpots, spiritQuestions } from '../src/game/chapter-fruits';
import { claimSnack, feedCompanion, getCompanionGrowthStage, type CompanionProgress } from '../src/game/companion';
import { thirdActSteps, completeThirdActStep, thirdActComplete } from '../src/game/act-three';

describe('chapter-specific fruit and questions', () => {
  it('opens six new, unique questions and fruit rewards per chapter', () => {
    expect(getChapterFruitSpots(1)).toHaveLength(6);
    expect(getChapterFruitSpots(2)).toHaveLength(12);
    expect(getChapterFruitSpots(3)).toHaveLength(18);
    const all = getChapterFruitSpots(3);
    expect(new Set(all.map(spot => spot.id)).size).toBe(18);
    for (const id of ['xiezhi', 'baize', 'pixiu'] as const) {
      const fruit = all.filter(spot => spot.spiritId === id);
      expect(fruit).toHaveLength(6);
      expect(new Set(fruit.map(spot => spiritQuestions[id][spot.questionIndex][0])).size).toBe(6);
      expect(fruit.every(spot => spiritQuestions[id][spot.questionIndex][0].includes(id === 'xiezhi' ? '獬豸' : id === 'baize' ? '白澤' : '貔貅'))).toBe(true);
    }
  });

  it('evolves Bai Ze using its six rewards while Xiezhi remains unchanged', () => {
    const empty = (): CompanionProgress => ({ claimedSnackIds: [], snacks: 0, fed: 0 });
    const progress = { xiezhi: empty(), baize: empty() };
    for (const spot of getChapterFruitSpots(2).filter(spot => spot.spiritId === 'baize')) {
      progress.baize = claimSnack(progress.baize, spot.id, true);
    }
    const restored = JSON.parse(JSON.stringify(progress)) as typeof progress;
    expect(restored.baize.snacks).toBe(6);
    for (let i = 0; i < 6; i++) restored.baize = feedCompanion(restored.baize)!;
    expect(getCompanionGrowthStage(restored.baize.fed).id).toBe('guardian');
    expect(restored.xiezhi).toEqual(empty());
  });
});

describe('third-act investigation', () => {
  it('requires all four records in order and rejects repeats and skipped steps', () => {
    let completed: string[] = [];
    expect(completeThirdActStep(completed, 'mentor')).toEqual([]);
    for (const step of thirdActSteps) {
      expect(thirdActComplete(completed)).toBe(false);
      completed = completeThirdActStep(completed, step.id);
      expect(completeThirdActStep(completed, step.id)).toEqual(completed);
    }
    expect(thirdActComplete(completed)).toBe(true);
    expect(completed).toEqual(['developer', 'hill-guard', 'supervisor', 'mentor']);
  });
});
