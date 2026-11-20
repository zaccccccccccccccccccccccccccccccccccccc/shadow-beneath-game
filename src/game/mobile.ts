export interface ViewportInfo {
  width: number;
  height: number;
  coarsePointer: boolean;
}

export function requiresLandscapePrompt(viewport: ViewportInfo): boolean {
  return viewport.coarsePointer && viewport.height > viewport.width;
}

export function getJoystickVector(dx: number, dy: number, radius: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  const deadZone = Math.min(8, radius * 0.25);
  if (distance <= deadZone || radius <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (distance - deadZone) / (radius - deadZone));
  return { x: dx / distance * strength, y: dy / distance * strength };
}
