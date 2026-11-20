import { describe, expect, it } from 'vitest';
import { claimSnack, feedCompanion, getCompanionGrowthStage, getCompanionPose, getCompanionTrailPoint, type CompanionProgress } from '../src/game/companion';

describe('chapter reward companion', () => {
  it('follows the path around a corner instead of cutting across a building', () => {
    const trail = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(getCompanionTrailPoint({ x: 100, y: 100 }, trail, 140)).toEqual({ x: 60, y: 0 });
  });

  it('keeps a nearby resting position before the player moves', () => {
    expect(getCompanionTrailPoint({ x: 100, y: 100 }, [], 70)).toEqual({ x: 45, y: 112 });
  });

  it('faces in the direction it walks, matching the player movement direction', () => {
    expect(getCompanionPose(-10, 2, true, 0).facing).toBe('left');
    expect(getCompanionPose(0, -10, true, 0).facing).toBe('back');
    expect(getCompanionPose(0, 0, false, 0).moving).toBe(false);
  });

  it('awards one snack only when a new ground question is answered correctly', () => {
    const start: CompanionProgress = { claimedSnackIds: [], snacks: 0, fed: 0 };
    expect(claimSnack(start, 'harbor-pear', false)).toEqual(start);
    expect(claimSnack(start, 'harbor-pear', true)).toEqual({ claimedSnackIds: ['harbor-pear'], snacks: 1, fed: 0 });
    expect(claimSnack(claimSnack(start, 'harbor-pear', true), 'harbor-pear', true)).toEqual({ claimedSnackIds: ['harbor-pear'], snacks: 1, fed: 0 });
  });

  it('consumes a snack when feeding and reveals the three growth stages', () => {
    expect(feedCompanion({ claimedSnackIds: ['a'], snacks: 0, fed: 2 })).toBeNull();
    expect(feedCompanion({ claimedSnackIds: ['a'], snacks: 1, fed: 2 })).toEqual({ claimedSnackIds: ['a'], snacks: 0, fed: 3 });
    expect(getCompanionGrowthStage(0).id).toBe('young');
    expect(getCompanionGrowthStage(3).id).toBe('growing');
    expect(getCompanionGrowthStage(6).id).toBe('guardian');
  });
});
