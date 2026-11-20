export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
  if (x < WORLD_MARGIN || y < WORLD_MARGIN || x > worldWidth - WORLD_MARGIN || y > worldHeight - WORLD_MARGIN) return false;
  return !blockers.some((block) =>
    x + FEET_HALF_WIDTH > block.x && x - FEET_HALF_WIDTH < block.x + block.width &&
    y + FEET_HALF_HEIGHT > block.y && y - FEET_HALF_HEIGHT < block.y + block.height,
  );
}

export function moveAlongWalkableAxes(
  x: number,
  y: number,
  nextX: number,
  nextY: number,
  canStand: (x: number, y: number) => boolean,
): WorldPoint & { moved: boolean } {
  const clearSegment = (fromX: number, fromY: number, toX: number, toY: number): boolean => {
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
    if (isMapBoundary(block, worldWidth, worldHeight)) return false;
    // The feet stay on the road; only the upper body projects across a side edge.
    const besideSideEdge = (x < block.x && x + 52 > block.x) ||
      (x > block.x + block.width && x - 52 < block.x + block.width);
    return besideSideEdge && y >= block.y && y <= block.y + block.height;
  });
  return behindWallEdge ? 0.52 : 1;
}

export function findWorldPath(
  startPoint: WorldPoint,
  goalPoint: WorldPoint,
  blockers: readonly WorldRect[],
  worldWidth: number,
  worldHeight: number,
  cellSize = 48,
): WorldPoint[] | null {
  const columns = Math.ceil(worldWidth / cellSize);
  const rows = Math.ceil(worldHeight / cellSize);
  const cellIndex = (column: number, row: number) => row * columns + column;
  const cellCenter = (index: number): WorldPoint => ({
    x: (index % columns + 0.5) * cellSize,
    y: (Math.floor(index / columns) + 0.5) * cellSize,
  });
  const nearestFreeCell = (point: WorldPoint): number => {
    let chosen = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
      const index = cellIndex(column, row);
      const center = cellCenter(index);
      const distance = (center.x - point.x) ** 2 + (center.y - point.y) ** 2;
      if (distance < bestDistance && canOccupyWorldPosition(center.x, center.y, blockers, worldWidth, worldHeight)) {
        chosen = index;
        bestDistance = distance;
      }
    }
    return chosen;
  };

  const start = nearestFreeCell(startPoint);
  const goal = nearestFreeCell({
    x: Math.min(worldWidth - 40, Math.max(40, goalPoint.x)),
    y: Math.min(worldHeight - 40, Math.max(40, goalPoint.y)),
  });
  if (start < 0 || goal < 0) return null;
  const parents = new Int32Array(columns * rows).fill(-2);
  const queue = new Int32Array(columns * rows);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  parents[start] = -1;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  while (head < tail && parents[goal] === -2) {
    const current = queue[head++];
    const column = current % columns;
    const row = Math.floor(current / columns);
    for (const [dx, dy] of directions) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < 0 || nextRow < 0 || nextColumn >= columns || nextRow >= rows) continue;
      const next = cellIndex(nextColumn, nextRow);
      if (parents[next] !== -2) continue;
      const center = cellCenter(next);
      if (!canOccupyWorldPosition(center.x, center.y, blockers, worldWidth, worldHeight)) continue;
      parents[next] = current;
      queue[tail++] = next;
      if (next === goal) break;
    }
  }

  if (parents[goal] === -2) return null;
  const reversed: WorldPoint[] = [];
  for (let current = goal; current !== start && current >= 0; current = parents[current]) reversed.push(cellCenter(current));
  return reversed.reverse();
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
