import { describe, expect, it } from 'vitest';
import { stepFollower } from '../src/game/follower-motion';

describe('actual companion movement', () => {
  const initial = { x: 100, y: 100, facing: 'left' as const, distance: 42 };
  it('stops position and gait immediately when the player stops, even with a distant target', () => {
    expect(stepFollower(initial, {x:400,y:100},false,16,()=>true)).toMatchObject({...initial,moving:false});
  });
  it('faces actual upward and downward movement and advances a distance-based cycle', () => {
    const up=stepFollower(initial,{x:100,y:0},true,16,()=>true);
    expect(up.facing).toBe('back');expect(up.y).toBeLessThan(100);expect(up.distance).toBeGreaterThan(42);
    expect(stepFollower(initial,{x:100,y:200},true,16,()=>true).facing).toBe('front');
  });
  it('keeps its previous direction and freezes legs when a wall blocks both axes', () => {
    expect(stepFollower(initial,{x:150,y:50},true,16,()=>false)).toMatchObject({...initial,moving:false});
  });
});
