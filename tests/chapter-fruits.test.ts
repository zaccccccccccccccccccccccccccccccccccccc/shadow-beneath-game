import { describe, expect, it } from 'vitest';
import { chapterSpirit, fruitNames, getChapterFruitSpots, migrateChapterFruitIds, spiritNames, spiritQuestions, type AvailableSpirit } from '../src/game/chapter-fruits';
import { spirits, type SpiritId } from '../src/game/spirits';
import { companionSnackSpots } from '../src/game/world-data';
import { claimSnack, feedCompanion, getCompanionGrowthStage, type CompanionProgress } from '../src/game/companion';
import { thirdActSteps, completeThirdActStep, thirdActComplete } from '../src/game/act-three';
import { restoreThirdActProgress } from '../src/game/act-three';

it('repairs a skipped or malformed third-act save instead of deadlocking the investigation', () => {
  expect(restoreThirdActProgress({ completed: ['mentor'], rewardClaimed: true })).toEqual({ completed: [], rewardClaimed: false });
  expect(restoreThirdActProgress({ completed: ['developer', 'supervisor'], rewardClaimed: true })).toEqual({ completed: ['developer'], rewardClaimed: false });
  expect(restoreThirdActProgress({ completed: thirdActSteps.map(s => s.id), rewardClaimed: true }).rewardClaimed).toBe(true);
});

describe('chapter-specific fruit and questions', () => {
  const order: AvailableSpirit[] = ['xiezhi', 'baize', 'pixiu', 'qilin', 'xuanwu', 'qinglong'] satisfies SpiritId[];

  it('unlocks all six species in order with six dedicated questions apiece', () => {
    expect(order.map((_, index) => chapterSpirit[index + 1])).toEqual(order);
    for (const [index, id] of order.entries()) {
      const definition = spirits.find(spirit => spirit.id === id)!;
      expect(fruitNames[id]).toBe(definition.fruit.hant);
      expect(spiritNames[id]).toBe(definition.name.hant);
      expect(spiritQuestions[id]).toHaveLength(6);
      expect(new Set(spiritQuestions[id].map(question => question[0])).size).toBe(6);
      expect(new Set(spiritQuestions[id].map(question => question[2])).size).toBe(6);
      for (const [prompt, correct, wrong] of spiritQuestions[id]) {
        expect(prompt).toContain(definition.name.hant);
        expect(correct.trim()).not.toBe('');
        expect(wrong.trim()).not.toBe('');
        expect(correct).not.toBe(wrong);
      }
      const spots = getChapterFruitSpots(index + 1);
      expect(spots).toHaveLength((index + 1) * 6);
      expect(new Set(spots.map(spot => spot.id)).size).toBe(spots.length);
      expect(spots.filter(spot => spot.spiritId === id).map(spot => spot.questionIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('retains every legacy anchor and earlier fruit ID when later chapters open', () => {
    const all = getChapterFruitSpots(6);
    expect(all.filter(spot => spot.spiritId === 'xiezhi').map(spot => spot.id)).toEqual([
      'xiezhi:hq-mint', 'xiezhi:hq-plum', 'xiezhi:oldtown-pear',
      'xiezhi:harbor-cake', 'xiezhi:campus-bean', 'xiezhi:hill-tea',
    ]);
    for (const id of order) {
      expect(all.filter(spot => spot.spiritId === id).map(({ region, x, y }) => ({ region, x, y })))
        .toEqual(companionSnackSpots.map(({ region, x, y }) => ({ region, x, y })));
    }
    expect(all.filter(spot => spot.act <= 3)).toEqual(getChapterFruitSpots(3));
    expect(getChapterFruitSpots(0)).toEqual([]);
    expect(getChapterFruitSpots(7)).toEqual(all);
  });

  it('normalizes legacy claims without replay rewards, mutating saves, or losing unknown IDs', () => {
    const claims = ['hq-mint', 'xiezhi:hq-mint', 'xiezhi:fruit-1', 'xiezhi:hq-plum', 'future-id', 'baize:hq-mint'];
    expect(migrateChapterFruitIds('xiezhi', claims)).toEqual([
      'xiezhi:hq-mint', 'xiezhi:hq-plum', 'future-id', 'baize:hq-mint',
    ]);
    expect(claims).toHaveLength(6);
    for (const id of order) {
      const migrated = migrateChapterFruitIds(id, companionSnackSpots.map(spot => spot.id));
      expect(getChapterFruitSpots(6).filter(spot => spot.spiritId === id && !migrated.includes(spot.id))).toEqual([]);
      expect(migrateChapterFruitIds(id, migrated)).toEqual(migrated);
    }
  });
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
