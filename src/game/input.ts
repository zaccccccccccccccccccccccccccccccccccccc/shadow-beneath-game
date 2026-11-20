export interface KeyState {
  W: boolean;
  A: boolean;
  S: boolean;
  D: boolean;
}

export type PlayerFacing = 'left' | 'right' | 'back';

export function keyboardDirection(keys: KeyState): { x: number; y: number } {
  return {
    x: Number(keys.D) - Number(keys.A),
    y: Number(keys.S) - Number(keys.W),
  };
}

export function chooseFacing(direction: { x: number; y: number }, current: PlayerFacing): PlayerFacing {
  if (direction.x < 0) return 'left';
  if (direction.x > 0) return 'right';
  return current;
}

export function pointerFacing(from: { x: number; y: number }, pointer: { x: number; y: number }, current: PlayerFacing): PlayerFacing {
  return chooseFacing({ x: pointer.x - from.x, y: pointer.y - from.y }, current);
}

export function resolveFacing(keyboard: { x: number; y: number }, pointer: { x: number; y: number }, current: PlayerFacing): PlayerFacing {
  return keyboard.x !== 0 || keyboard.y !== 0 ? chooseFacing(keyboard, current) : chooseFacing(pointer, current);
}

export function hoverKeepsTarget(target: { x: number; y: number }): { x: number; y: number } {
  return { ...target };
}
