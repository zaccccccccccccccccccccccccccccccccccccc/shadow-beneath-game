import { describe, expect, it } from 'vitest';
import { createWalkLabCases, getStageCropMetrics, getWalkFrameMetrics, getWalkLabSpriteHeight, nextWalkLabFrame } from '../src/game/spirit-walk-lab';

describe('spirit walk lab', () => {
  it('creates a walking check for every spirit and every evolution form', () => {
    const cases = createWalkLabCases();
    expect(cases).toHaveLength(18);
    expect(new Set(cases.map((item) => `${item.spirit}:${item.stage}`)).size).toBe(18);
    expect(cases.every((item) => item.speed > 0 && item.lane >= 0 && item.lane < 6)).toBe(true);
  });

  it('shows each growth stage at the same increasing size used by the in-game companion', () => {
    expect((['young', 'growing', 'guardian'] as const).map(getWalkLabSpriteHeight)).toEqual([88, 108, 128]);
  });

  it('alternates between two walk frames while moving and returns to idle when stopped', () => {
    expect(nextWalkLabFrame(true, 0, 4)).toBe(1);
    expect(nextWalkLabFrame(true, 1, 4)).toBe(2);
    expect(nextWalkLabFrame(true, 2, 4)).toBe(3);
    expect(nextWalkLabFrame(true, 3, 4)).toBe(0);
    expect(nextWalkLabFrame(false, 2, 4)).toBe(0);
  });

  it('scales a cropped evolution stage by the square stage cell rather than the full strip width', () => {
    expect(getStageCropMetrics(2172, 724, 134)).toEqual({ cropWidth: 724, cropHeight: 724, scale: 134 / 724 });
  });

  it('splits a two-frame sprite strip into undistorted equal frame cells', () => {
    expect(getWalkFrameMetrics(1774, 887, 160)).toEqual({ frameWidth: 887, frameHeight: 887, scale: 160 / 887 });
  });
});
