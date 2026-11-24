import type { WorldPoint, WorldRect } from './world-geometry';

export function rectPolygon(rect: WorldRect): WorldPoint[] {
  return [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }];
}

const cross = (a: WorldPoint, b: WorldPoint, c: WorldPoint): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** A concave subject may clip into separate pieces; boundary joins have zero area.
 * Positive area, rather than edge contact, preserves the legacy feet contract.
 * The clip must be convex and counterclockwise in numeric XY coordinates.
 */
export function polygonsOverlap(subject: readonly WorldPoint[], clip: readonly WorldPoint[]): boolean {
  let output = [...subject];
  for (let i = 0; i < clip.length && output.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = output; output = [];
    let previous = input[input.length - 1];
    let previousSide = cross(a, b, previous);
    for (const point of input) {
      const side = cross(a, b, point);
      if ((side >= 0) !== (previousSide >= 0)) {
        const t = previousSide / (previousSide - side);
        output.push({ x: previous.x + t * (point.x - previous.x), y: previous.y + t * (point.y - previous.y) });
      }
      if (side >= 0) output.push(point);
      previous = point; previousSide = side;
    }
  }
  if (output.length < 3) return false;
  let twiceArea = 0;
  for (let i = 1; i + 1 < output.length; i++) twiceArea += cross(output[0], output[i], output[i + 1]);
  return Math.abs(twiceArea) > 1e-8;
}

export function rectsOverlap(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

export function shapeOverlapsRect(shape: WorldRect, rect: WorldRect): boolean {
  return rectsOverlap(shape, rect) && (!shape.polygon || polygonsOverlap(shape.polygon, rectPolygon(rect)));
}

/** Convex hull of endpoint feet rectangles = exact translational sweep. */
export function convexHull(points: readonly WorldPoint[]): WorldPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (input: WorldPoint[]): WorldPoint[] => {
    const result: WorldPoint[] = [];
    for (const point of input) {
      while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], point) <= 0) result.pop();
      result.push(point);
    }
    return result;
  };
  const lower = half(sorted), upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
