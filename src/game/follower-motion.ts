import { facingFromMotion } from './locomotion';
import type { PlayerFacing } from './player-animation';
import { moveAlongWalkableAxes, type WorldPoint } from './world-geometry';

export interface FollowerMotion extends WorldPoint { facing: PlayerFacing; distance: number }

export function stepFollower(
  current: FollowerMotion, target: WorldPoint, playerWalking: boolean, delta: number,
  canStand: (x: number, y: number) => boolean,
  canTraverse?: (from: WorldPoint, to: WorldPoint) => boolean,
): FollowerMotion & { moving: boolean } {
  const length = Math.hypot(target.x-current.x, target.y-current.y);
  if (!playerWalking || length <= 2) return { ...current, moving: false };
  const step = Math.min(length, 360*Math.max(0,Math.min(50,delta))/1000);
  const next=moveAlongWalkableAxes(current.x,current.y,
    current.x+(target.x-current.x)/length*step,current.y+(target.y-current.y)/length*step,canStand,canTraverse);
  const dx=next.x-current.x,dy=next.y-current.y;
  return { x:next.x,y:next.y,moving:next.moved,facing:facingFromMotion(dx,dy,current.facing),distance:current.distance+Math.hypot(dx,dy) };
}
