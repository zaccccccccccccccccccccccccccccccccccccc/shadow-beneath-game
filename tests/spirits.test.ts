import { describe, expect, it } from 'vitest';
import { getSpiritGrowthStage, migrateSpiritProgress, spirits } from '../src/game/spirits';

describe('six spirit collection', () => {
  it('assigns a unique fruit and three growth forms to every spirit', () => {
    expect(spirits).toHaveLength(6);
    expect(new Set(spirits.map((spirit) => spirit.fruit.id)).size).toBe(6);
    expect(spirits.every((spirit) => spirit.forms.length === 3)).toBe(true);
    expect(spirits.map((spirit) => spirit.unlockAct)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('maps feed totals to the documented three growth forms', () => {
    expect(getSpiritGrowthStage(0).id).toBe('young');
    expect(getSpiritGrowthStage(3).id).toBe('growing');
    expect(getSpiritGrowthStage(6).id).toBe('guardian');
  });

  it('migrates old snack totals into xiezhi fruit progress', () => {
    const progress = migrateSpiritProgress({ claimedSnackIds: ['hq-mint'], snacks: 2, fed: 4 });
    expect(progress.fruits.xiezhi).toBe(2);
    expect(progress.fed.xiezhi).toBe(4);
    expect(progress.claimedFruitIds).toEqual(['hq-mint']);
  });
});
