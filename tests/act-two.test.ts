import { describe, expect, it } from 'vitest';
import { canCompleteActTwoStep, canTravelActTwoRegion, completeActTwoStep, createActTwoState, getActTwoNextStep, isActTwoComplete, claimActTwoReward } from '../src/game/act-two';
import { getActTwoWorldPortals, readChapterOneCompanion } from '../src/game/act-two-world';
import { districtMaps } from '../src/game/world-data';

describe('act two progression', () => {
  it('opens the investigation in order and leaves later evidence locked', () => {
    let state = createActTwoState();
    expect(getActTwoNextStep(state)).toBe('ledger');
    expect(canCompleteActTwoStep(state, 'yongqi')).toBe(false);
    expect(completeActTwoStep(state, 'tea-house').completed).toEqual([]);
    state = completeActTwoStep(state, 'ledger');
    expect(getActTwoNextStep(state)).toBe('yongqi');
    expect(canCompleteActTwoStep(state, 'yongqi')).toBe(true);
    expect(canCompleteActTwoStep(state, 'register')).toBe(false);
  });

  it('unlocks the old town after Yongqi and the harbor after Hui-ge', () => {
    let state = createActTwoState();
    expect(canTravelActTwoRegion(state, 'oldTown', [])).toBe(false);
    expect(canTravelActTwoRegion(state, 'campus', [])).toBe(true);
    expect(canTravelActTwoRegion(state, 'hq', [])).toBe(false);
    expect(canTravelActTwoRegion(state, 'hill', [])).toBe(true);
    state = completeActTwoStep(state, 'ledger');
    state = completeActTwoStep(state, 'yongqi');
    expect(canTravelActTwoRegion(state, 'oldTown', [])).toBe(true);
    expect(canTravelActTwoRegion(state, 'hq', [])).toBe(true);
    expect(canTravelActTwoRegion(state, 'harbor', [])).toBe(false);
    state = completeActTwoStep(state, 'tea-house');
    expect(canTravelActTwoRegion(state, 'harbor', [])).toBe(true);
    expect(canTravelActTwoRegion(state, 'oldTown', ['oldTown'])).toBe(true);
  });

  it('requires all evidence steps before the case can conclude', () => {
    let state = createActTwoState();
    state = completeActTwoStep(state, 'ledger');
    state = completeActTwoStep(state, 'yongqi');
    state = completeActTwoStep(state, 'tea-house');
    expect(isActTwoComplete(state)).toBe(false);
    expect(isActTwoComplete(completeActTwoStep(state, 'register'))).toBe(true);
  });

  it('allows the Bai Ze reward to be claimed only once after completion', () => {
    const complete = ['ledger', 'yongqi', 'tea-house', 'register'].reduce((state, step) => completeActTwoStep(state, step as 'ledger' | 'yongqi' | 'tea-house' | 'register'), createActTwoState());
    expect(claimActTwoReward(complete)).toMatchObject({ rewardClaimed: true });
    expect(claimActTwoReward({ ...complete, rewardClaimed: true })).toBeNull();
  });

  it('reuses every first-act district map and portal in Act Two', () => {
    const expected = Object.values(districtMaps).flatMap((district) =>
      district.portals.map((portal) => ({
        from: district.id,
        to: portal.target,
        x: portal.x + portal.width / 2,
        y: portal.y + portal.height / 2,
        spawn: portal.spawn,
        width: portal.width,
        height: portal.height,
      })),
    );
    expect(getActTwoWorldPortals()).toEqual(expected);
  });

  it('carries the claimed Xiezhi reward and its feeding progress from Act One', () => {
    expect(readChapterOneCompanion('true', JSON.stringify({ claimedSnackIds: ['mint'], snacks: 2, fed: 4 }))).toEqual({
      unlocked: true,
      progress: { claimedSnackIds: ['mint'], snacks: 2, fed: 4 },
    });
    expect(readChapterOneCompanion(null, null)).toEqual({
      unlocked: false,
      progress: { claimedSnackIds: [], snacks: 0, fed: 0 },
    });
  });
});
