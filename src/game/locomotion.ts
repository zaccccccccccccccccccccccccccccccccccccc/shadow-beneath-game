import type { PlayerFacing } from './player-animation';

export const WORLD_MOVEMENT_KEYS = 'W,A,S,D,UP,DOWN,LEFT,RIGHT';

export function facingFromMotion(dx: number, dy: number, previous: PlayerFacing): PlayerFacing {
  if (Math.hypot(dx, dy) < 0.001) return previous;
  const ax=Math.abs(dx), ay=Math.abs(dy);
  if (Math.abs(ax-ay) < Math.max(ax,ay)*.12) {
    if ((previous==='right'&&dx>0)||(previous==='left'&&dx<0)||
        (previous==='front'&&dy>0)||(previous==='back'&&dy<0)) return previous;
  }
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}

export function nextPathIndex(position: { x: number; y: number }, path: readonly { x: number; y: number }[], index: number): number {
  while (index < path.length && Math.hypot(path[index].x - position.x, path[index].y - position.y) <= 2) index++;
  return index;
}
