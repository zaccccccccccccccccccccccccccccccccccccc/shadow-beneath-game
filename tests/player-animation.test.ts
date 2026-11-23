import { describe, expect, it } from 'vitest';
import { getSideWalkSprite, getVerticalWalkRow } from '../src/game/player-animation';

describe('world renderer walking poses', () => {
  it('holds vertical steps for the same 192px full cycle as side steps', () => {
    expect([0,48,95,96,144,191,192].map(getVerticalWalkRow)).toEqual([1,1,1,2,2,2,1]);
  });
  it('uses all four approved side poses and mirrors only left', () => {
    expect([0,48,96,144,192].map(d => getSideWalkSprite('right', d).frame)).toEqual([0,1,2,3,0]);
    for (const d of [0,48,96,144]) {
      expect(getSideWalkSprite('right',d).flipX).toBe(false);
      expect(getSideWalkSprite('left',d).flipX).toBe(true);
    }
  });
  it('aligns measured head anchors without changing the foot baseline', () => {
    for (const [frame, center] of [332.5,275.5,333.5,278.5].entries()) {
      const right=getSideWalkSprite('right',frame*48), left=getSideWalkSprite('left',frame*48);
      expect((center-313.5)*123/627+right.offsetX).toBeCloseTo(0,8);
      expect(left.offsetX).toBeCloseTo(-right.offsetX,8);
    }
  });
});
