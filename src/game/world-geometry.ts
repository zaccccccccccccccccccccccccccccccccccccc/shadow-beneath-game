import { convexHull, polygonsOverlap, rectPolygon, rectsOverlap, shapeOverlapsRect } from './polygon-geometry';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Absolute world coordinates. The rectangle is its broad-phase bounding box. */
  polygon?: readonly WorldPoint[];
}

export interface WorldPoint { x: number; y: number }

const FEET_HALF_WIDTH = 16;
const FEET_HALF_HEIGHT = 9;
const WORLD_MARGIN = 44;

export function canOccupyWorldPosition(
  x: number,
  y: number,
  blockers: readonly WorldRect[],
  worldWidth: number,
  worldHeight: number,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < WORLD_MARGIN || y < WORLD_MARGIN || x > worldWidth - WORLD_MARGIN || y > worldHeight - WORLD_MARGIN) return false;
  return !blockers.some(block => shapeOverlapsRect(block, feetRect(x, y)));
}

function feetRect(x: number, y: number): WorldRect {
  return { x: x - FEET_HALF_WIDTH, y: y - FEET_HALF_HEIGHT, width: FEET_HALF_WIDTH * 2, height: FEET_HALF_HEIGHT * 2 };
}

/** Exact continuous feet sweep, including polygon tips thinner than a sampling step. */
export function isWorldSegmentClear(from: WorldPoint, to: WorldPoint, blockers: readonly WorldRect[], worldWidth: number, worldHeight: number): boolean {
  if (!canOccupyWorldPosition(from.x, from.y, blockers, worldWidth, worldHeight) ||
      !canOccupyWorldPosition(to.x, to.y, blockers, worldWidth, worldHeight)) return false;
  const swept = { x: Math.min(from.x, to.x) - 16, y: Math.min(from.y, to.y) - 9,
    width: Math.abs(to.x - from.x) + 32, height: Math.abs(to.y - from.y) + 18 };
  if (from.x === to.x || from.y === to.y) return !blockers.some(block => shapeOverlapsRect(block, swept));
  const hull = convexHull([...rectPolygon(feetRect(from.x, from.y)), ...rectPolygon(feetRect(to.x, to.y))]);
  return !blockers.some(block => rectsOverlap(block, swept) && polygonsOverlap(block.polygon ?? rectPolygon(block), hull));
}

export function moveAlongWalkableAxes(
  x: number,
  y: number,
  nextX: number,
  nextY: number,
  canStand: (x: number, y: number) => boolean,
  canTraverse?: (from: WorldPoint, to: WorldPoint) => boolean,
): WorldPoint & { moved: boolean } {
  const clearSegment = (fromX: number, fromY: number, toX: number, toY: number): boolean => {
    if (canTraverse) return canTraverse({ x: fromX, y: fromY }, { x: toX, y: toY });
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / 8));
    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      if (!canStand(fromX + (toX - fromX) * ratio, fromY + (toY - fromY) * ratio)) return false;
    }
    return true;
  };
  let moved = false;
  if (Math.abs(nextX - x) > 0.001 && clearSegment(x, y, nextX, y)) { x = nextX; moved = true; }
  if (Math.abs(nextY - y) > 0.001 && clearSegment(x, y, x, nextY)) { y = nextY; moved = true; }
  return { x, y, moved };
}

export function getAtlasCellScale(cellSize: number, displaySize: number): number {
  return displaySize / cellSize;
}

export function getWallOcclusionAlpha(
  x: number,
  y: number,
  blockers: readonly WorldRect[],
  worldWidth = 2400,
  worldHeight = 1600,
): number {
  const behindWallEdge = blockers.some((block) => {
    // Polygon AABBs are broad-phase bounds, not drawable facade edges.
    // Polygon maps use getOcclusion with their separate visual masks instead.
    if (block.polygon || isMapBoundary(block, worldWidth, worldHeight)) return false;
    // The feet stay on the road; only the upper body projects across a side edge.
    const besideSideEdge = (x < block.x && x + 52 > block.x) ||
      (x > block.x + block.width && x - 52 < block.x + block.width);
    return besideSideEdge && y >= block.y && y <= block.y + block.height;
  });
  return behindWallEdge ? 0.52 : 1;
}

export interface WorldOcclusion {
  occluderIndices: number[];
  occluderAlpha: number;
  playerAlpha: 1;
}

/** For the renderer: fade intersecting ROOF overlays, never feet collision or the actor.
 * Defaults match the current 180px actor height; pass actual sprite bounds if changed.
 * Occluder indices refer to DistrictMap.occluders in stable array order.
 */
export function getOcclusion(x: number, y: number, occluders: readonly WorldRect[], actorHeight = 180, actorHalfWidth = 52): WorldOcclusion {
  const body = { x: x - actorHalfWidth, y: y - actorHeight, width: actorHalfWidth * 2, height: actorHeight };
  const occluderIndices = occluders.flatMap((shape, index) => shapeOverlapsRect(shape, body) ? [index] : []);
  return { occluderIndices, occluderAlpha: occluderIndices.length ? .35 : 1, playerAlpha: 1 };
}

export function findWorldPath(
  startPoint: WorldPoint,
  goalPoint: WorldPoint,
  blockers: readonly WorldRect[],
  worldWidth: number,
  worldHeight: number,
  cellSize = 48,
): WorldPoint[] | null {
  if (!(cellSize > 0) || !Number.isFinite(cellSize) || !Number.isFinite(goalPoint.x) || !Number.isFinite(goalPoint.y) ||
      !canOccupyWorldPosition(startPoint.x, startPoint.y, blockers, worldWidth, worldHeight)) return null;
  const mesh = navigationMesh(blockers, worldWidth, worldHeight, cellSize);
  const ordered = (point: WorldPoint): number[] => mesh.free.slice().sort((a, b) =>
    Math.hypot(mesh.points[a].x - point.x, mesh.points[a].y - point.y) - Math.hypot(mesh.points[b].x - point.x, mesh.points[b].y - point.y));
  // Explicit axis corners agree with the scene's X-then-Y collision movement.
  const connector = (from: WorldPoint, to: WorldPoint): WorldPoint[] | null => {
    for (const corner of [{ x: to.x, y: from.y }, { x: from.x, y: to.y }]) {
      if (isWorldSegmentClear(from, corner, blockers, worldWidth, worldHeight) &&
          isWorldSegmentClear(corner, to, blockers, worldWidth, worldHeight)) {
        return [corner, to].filter((p, index, all) => p.x !== (index ? all[index - 1] : from).x || p.y !== (index ? all[index - 1] : from).y);
      }
    }
    return null;
  };
  if (Math.hypot(goalPoint.x - startPoint.x, goalPoint.y - startPoint.y) <= cellSize * 1.5) {
    const direct = connector(startPoint, goalPoint);
    if (direct) return direct.map(point => ({ ...point }));
  }
  let start = -1;
  let entry: WorldPoint[] = [];
  for (const candidate of ordered(startPoint)) {
    const leg = connector(startPoint, mesh.points[candidate]);
    if (leg) { start = candidate; entry = leg; break; }
  }
  if (start < 0) return null;
  const parents = new Int32Array(mesh.points.length).fill(-2);
  const queue = new Int32Array(mesh.points.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  parents[start] = -1;
  while (head < tail) {
    const current = queue[head++];
    for (const next of mesh.links[current]) {
      if (parents[next] !== -2) continue;
      parents[next] = current;
      queue[tail++] = next;
    }
  }

  const exactGoal = canOccupyWorldPosition(goalPoint.x, goalPoint.y, blockers, worldWidth, worldHeight);
  let goal = -1;
  let exit: WorldPoint[] = [];
  for (const candidate of ordered(goalPoint)) {
    if (parents[candidate] === -2) continue;
    const leg = exactGoal ? connector(mesh.points[candidate], goalPoint) : [];
    if (leg) { goal = candidate; exit = leg; break; }
  }
  if (goal < 0) return null;
  const reversed: WorldPoint[] = [];
  for (let current = goal; current !== start && current >= 0; current = parents[current]) reversed.push(mesh.points[current]);
  // Callers may mutate waypoints; never expose mesh points or input target objects.
  return [...entry, ...reversed.reverse(), ...exit].map(point => ({ ...point }));
}

interface NavigationMesh { signature: string; points: WorldPoint[]; free: number[]; links: number[][] }
const meshes = new WeakMap<readonly WorldRect[], NavigationMesh>();

function navigationMesh(blockers: readonly WorldRect[], width: number, height: number, cell: number): NavigationMesh {
  // Include values, not just identity: editing polygons in place must invalidate the mesh.
  const signature = JSON.stringify([width, height, cell, blockers]);
  const cached = meshes.get(blockers);
  if (cached?.signature === signature) return cached;
  const columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const points = Array.from({ length: columns * rows }, (_, i) => ({ x: (i % columns + .5) * cell, y: (Math.floor(i / columns) + .5) * cell }));
  const free = points.flatMap((p, i) => canOccupyWorldPosition(p.x, p.y, blockers, width, height) ? [i] : []);
  const legal = new Set(free);
  const links: number[][] = points.map(() => []);
  for (const i of free) for (const j of [i % columns + 1 < columns ? i + 1 : -1, i + columns < points.length ? i + columns : -1]) {
    if (legal.has(j) && isWorldSegmentClear(points[i], points[j], blockers, width, height)) { links[i].push(j); links[j].push(i); }
  }
  const result = { signature, points, free, links };
  meshes.set(blockers, result);
  return result;
}

export function getFeetDepth(feetY: number): number {
  return feetY / 100;
}

export function sortWorldObjectsByDepth<T>(objects: T[], getDepth: (object: T) => number): T[] {
  return objects.sort((a, b) => getDepth(a) - getDepth(b));
}

export function getWallFrontDepth(block: WorldRect): number {
  return (block.y + block.height) / 100 + 0.001;
}

export function isMapBoundary(block: WorldRect, worldWidth: number, worldHeight: number): boolean {
  return (block.x <= 0 && block.width >= worldWidth && block.height <= 48) ||
    (block.y <= 0 && block.height >= worldHeight && block.width <= 48) ||
    (block.x + block.width >= worldWidth && block.width <= 48) ||
    (block.y + block.height >= worldHeight && block.height <= 48);
}
