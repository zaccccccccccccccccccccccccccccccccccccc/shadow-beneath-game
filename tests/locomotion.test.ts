import {describe,it,expect} from 'vitest';
import { facingFromMotion, nextPathIndex, WORLD_MOVEMENT_KEYS } from '../src/game/locomotion';
describe('actual world locomotion',()=>{
  it('keeps diagonal headings stable through floating-point axis ties',()=>{
    expect(facingFromMotion(5,5,'right')).toBe('right');
    expect(facingFromMotion(5,5.00001,'right')).toBe('right');
    expect(facingFromMotion(-5,-5,'right')).toBe('back');
    expect(facingFromMotion(5,0,'back')).toBe('right');
  });
  it('registers arrows as well as WASD',()=>{for(const key of ['W','A','S','D','UP','DOWN','LEFT','RIGHT'])expect(WORLD_MOVEMENT_KEYS.split(',')).toContain(key);});
  it('keeps the last heading at zero displacement and faces actual sliding motion',()=>{
    expect(facingFromMotion(0,0,'left')).toBe('left');expect(facingFromMotion(5,0,'back')).toBe('right');
    expect(facingFromMotion(0,-5,'right')).toBe('back');expect(facingFromMotion(0,5,'left')).toBe('front');
  });
  it('does not discard the final 24px of a click route or advance a corner early',()=>{
    const path=[{x:100,y:100},{x:200,y:100}];
    expect(nextPathIndex({x:79,y:100},path,0)).toBe(0);
    expect(nextPathIndex({x:100,y:100},path,0)).toBe(1);
    expect(nextPathIndex({x:181,y:100},path,1)).toBe(1);
    expect(nextPathIndex({x:200,y:100},path,1)).toBe(2);
  });
});
