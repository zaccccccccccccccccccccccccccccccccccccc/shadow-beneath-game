import { describe, expect, it } from 'vitest';
import { getSideWalkPose, getSideWalkSprite, getWalkFrameForDistance, getWalkFrameSequence, isMirroredWalkDirection } from '../src/game/player-animation';

describe('player walk-cycle direction mapping', () => {
  it('alternates the left and right leg frames for all facing directions', () => {
    expect(getWalkFrameSequence('front')).toEqual([0, 3]);
    expect(getWalkFrameSequence('left')).toEqual([1, 4]);
    expect(getWalkFrameSequence('right')).toEqual([1, 4]);
    expect(getWalkFrameSequence('back')).toEqual([2, 5]);
  });

  it('mirrors the side walk cycle only when facing right', () => {
    expect(isMirroredWalkDirection('left')).toBe(false);
    expect(isMirroredWalkDirection('right')).toBe(true);
    expect(isMirroredWalkDirection('front')).toBe(false);
    expect(isMirroredWalkDirection('back')).toBe(false);
  });

  it('changes the leading foot after each traveled stride, including after a pause', () => {
    expect(getWalkFrameForDistance('left', 0)).toBe(1);
    expect(getWalkFrameForDistance('left', 35)).toBe(1);
    expect(getWalkFrameForDistance('left', 36)).toBe(4);
    expect(getWalkFrameForDistance('left', 72)).toBe(1);
    expect(getWalkFrameForDistance('front', 36)).toBe(3);
  });

  it('uses both raised-leg poses in each full side-walk cycle', () => {
    expect([0, 24, 48, 72, 96].map(getSideWalkPose)).toEqual([
      'wide', 'rear-lift', 'passing', 'front-lift', 'wide',
    ]);
  });

  it('uses the approved right-side source frames and mirrors them for left movement', () => {
    expect([0, 48, 96, 144].map(d => getSideWalkSprite('right', d).frame)).toEqual([0, 1, 2, 3]);
    expect([0, 48, 96, 144].map(d => getSideWalkSprite('left', d).flipX)).toEqual([true, true, true, true]);
  });
});
