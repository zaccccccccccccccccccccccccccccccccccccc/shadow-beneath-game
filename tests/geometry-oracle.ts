import type { WorldPoint, WorldRect } from '../src/game/world-geometry';

/** Independent oracle: boundary segments entering an OPEN rectangle, then ray casting.
 * Does not use production polygon clipping, hulls, collision or sweep predicates.
 */
export function oracleOverlap(rect: WorldRect, shape: WorldRect): boolean {
  if (Math.min(rect.x + rect.width, shape.x + shape.width) <= Math.max(rect.x, shape.x) ||
      Math.min(rect.y + rect.height, shape.y + shape.height) <= Math.max(rect.y, shape.y)) return false;
  if (!shape.polygon) return true;
  const vertices = shape.polygon;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    let lo = 0, hi = 1;
    for (const [origin, delta, min, max] of [
      [a.x, b.x - a.x, rect.x, rect.x + rect.width],
      [a.y, b.y - a.y, rect.y, rect.y + rect.height],
    ]) {
      if (delta === 0) { if (origin <= min || origin >= max) { hi = -1; break; } }
      else { const t1 = (min - origin) / delta, t2 = (max - origin) / delta;
        lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
    }
    if (hi > lo) return true;
  }
  const center: WorldPoint = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a.y > center.y) !== (b.y > center.y) &&
        center.x < (b.x - a.x) * (center.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
