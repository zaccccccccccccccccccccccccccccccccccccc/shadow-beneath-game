export function toGamePoint(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }, width: number, height: number): { x: number; y: number } {
  return { x: (clientX - bounds.left) * width / bounds.width, y: (clientY - bounds.top) * height / bounds.height };
}

export function hitsButton(x: number, y: number, centerX: number, centerY: number, width: number, height: number): boolean {
  return Math.abs(x - centerX) <= width / 2 && Math.abs(y - centerY) <= height / 2;
}

export interface UiHitTarget<T> { centerX: number; centerY: number; width: number; height: number; action: T }

export function findUiHitTarget<T>(x: number, y: number, targets: readonly UiHitTarget<T>[]): T | null {
  for (let index = targets.length - 1; index >= 0; index -= 1) {
    const target = targets[index];
    if (hitsButton(x, y, target.centerX, target.centerY, target.width, target.height)) return target.action;
  }
  return null;
}

