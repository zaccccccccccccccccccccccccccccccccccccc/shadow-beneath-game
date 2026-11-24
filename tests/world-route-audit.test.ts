import { afterAll, describe, expect, it } from 'vitest';
import {
  districtMaps, worldInteractions, DISTRICT_WIDTH, DISTRICT_HEIGHT,
  type DistrictMap, type Point,
} from '../src/game/world-data';
import {
  canOccupyWorldPosition, findWorldPath, moveAlongWalkableAxes,
  getFeetDepth, getWallFrontDepth, getWallOcclusionAlpha, isMapBoundary,
  type WorldRect,
} from '../src/game/world-geometry';
import { createWorldFruitLayout } from '../src/game/fruit-world';
import { oracleOverlap } from './geometry-oracle';

/** Read-only audit. No relocated targets, expanded interaction ranges or altered blockers.
 * Existing tests accept non-null snapped paths and clear waypoints, missing the endpoint
 * radius, spawn-to-first-node leg, between-node collisions and final fruit connector.
 * Collision is a 32x18 FEET rectangle, not the rendered body; map margin is exactly 44.
 * These tests cannot certify roof-art alignment or the scene's rendering/movement wiring.
 */
const maps = Object.values(districtMaps);
const immutableBefore = JSON.stringify(districtMaps);
const seeds = [...new Set([
  ...Array.from({ length: 256 }, (_, index) => index),
  500, 501, 93745, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff,
])];
const connectorWarnings: string[] = [];

afterAll(() => {
  if (connectorWarnings.length) console.info(`Exact-target connector caveats (not inaccessible fruit):\n${connectorWarnings.join('\n')}`);
});

// Independent positive-area intersection oracle: mere edge contact is legal.
function intersects(a: WorldRect, b: WorldRect): boolean {
  return oracleOverlap(a, b);
}

function exactFeetClear(point: Point, map: DistrictMap): boolean {
  return point.x >= 44 && point.x <= DISTRICT_WIDTH - 44 &&
    point.y >= 44 && point.y <= DISTRICT_HEIGHT - 44 &&
    !map.blockers.some(block => intersects({ x: point.x - 16, y: point.y - 9, width: 32, height: 18 }, block));
}

// For one axis-aligned leg the union of all feet rectangles is exactly this rectangle.
// This catches even subpixel walls, which endpoint checks and sampled movement can miss.
function sweptFeetClear(from: Point, to: Point, map: DistrictMap): boolean {
  const swept = {
    x: Math.min(from.x, to.x) - 16, y: Math.min(from.y, to.y) - 9,
    width: Math.abs(to.x - from.x) + 32, height: Math.abs(to.y - from.y) + 18,
  };
  return exactFeetClear(from, map) && exactFeetClear(to, map) && !map.blockers.some(block => intersects(swept, block));
}

function inspectRoute(map: DistrictMap, start: Point, route: readonly Point[]): string[] {
  const issues: string[] = [];
  let from = start;
  if (!exactFeetClear(start, map)) issues.push(`blocked start ${start.x},${start.y}`);
  for (const [index, to] of route.entries()) {
    const corner = { x: to.x, y: from.y }; // moveAlongWalkableAxes advances X, then Y.
    if (!sweptFeetClear(from, corner, map) || !sweptFeetClear(corner, to, map)) {
      issues.push(`leg ${index}: ${from.x},${from.y} -> ${to.x},${to.y} crosses feet exclusion`);
    }
    const actual = moveAlongWalkableAxes(from.x, from.y, to.x, to.y,
      (x, y) => canOccupyWorldPosition(x, y, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
    if (actual.x !== to.x || actual.y !== to.y) issues.push(`leg ${index}: movement stops at ${actual.x},${actual.y}`);
    from = to;
  }
  return issues;
}

function auditApproach(map: DistrictMap, target: Point, radius: number): string[] {
  const path = findWorldPath(map.spawn, target, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
  if (path === null) return ['no path from original map spawn'];
  const end = path.at(-1) ?? map.spawn; // [] means same snapped cell, not arrival at goal.
  const issues = inspectRoute(map, map.spawn, path);
  const distance = Math.hypot(end.x - target.x, end.y - target.y);
  if (distance > radius) issues.push(`snapped endpoint ${end.x},${end.y} is ${distance.toFixed(3)} away (limit ${radius})`);
  return issues;
}

/** Partition at every expanded collision edge and 48px grid line. Each open tile has
 * constant occupancy. Include degenerate edge/vertex tiles so exact-contact points count.
 */
function axisTiles(limit: number, edges: number[]): [number, number][] {
  const cuts = [...new Set([44, limit - 44, ...edges,
    ...Array.from({ length: Math.ceil(limit / 48) }, (_, index) => index * 48),
  ].filter(value => value >= 44 && value <= limit - 44))].sort((a, b) => a - b);
  return cuts.flatMap((value, index): [number, number][] => index + 1 < cuts.length
    ? [[value, value], [value, cuts[index + 1]]]
    : [[value, value]]);
}

describe('immutable world route audit', () => {
  it.each(worldInteractions)('reaches $region/$id within 120 from its original spawn', npc => {
    // Includes case-file, excluded by the older NPC test.
    expect(auditApproach(districtMaps[npc.region], npc, 120)).toEqual([]);
  });

  for (const map of maps) {
    for (const [index, portal] of map.portals.entries()) {
      it(`reaches ${map.id} portal ${index} -> ${portal.target} within 145`, () => {
        const center = { x: portal.x + portal.width / 2, y: portal.y + portal.height / 2 };
        expect(auditApproach(map, center, 145)).toEqual([]);
        // Lock state is intentionally separate from geometric accessibility.
        const destination = districtMaps[portal.target];
        const returnPath = findWorldPath(portal.spawn, destination.spawn, destination.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
        expect(exactFeetClear(portal.spawn, destination), 'exact portal arrival feet').toBe(true);
        expect(returnPath, 'arrival joins destination spawn component').not.toBeNull();
        if (returnPath) expect(inspectRoute(destination, portal.spawn, [...returnPath, destination.spawn])).toEqual([]);
      });
    }
  }

  it.each(maps)('checks every free 48px navigation cell and complete route in $id', map => {
    const issues: string[] = [];
    for (let y = 24; y < DISTRICT_HEIGHT; y += 48) {
      for (let x = 24; x < DISTRICT_WIDTH; x += 48) {
        if (!exactFeetClear({ x, y }, map)) continue;
        const path = findWorldPath(map.spawn, { x, y }, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
        if (path === null) issues.push(`disconnected free grid cell ${x},${y}`);
        else issues.push(...inspectRoute(map, map.spawn, [...path, { x, y }]));
      }
    }
    expect(issues).toEqual([]);
  });

  // This rectangular partition theorem only applies to axis-aligned blockers.
  // Polygon maps retain the complete grid/route audit and explicit contour samples below.
  it.each(maps.filter(map => !map.blockers.some(block => block.polygon)))('covers every legal feet position in $id independent of fruit seed', map => {
    const nodes: Point[] = [];
    for (let y = 24; y < DISTRICT_HEIGHT; y += 48) for (let x = 24; x < DISTRICT_WIDTH; x += 48) {
      if (exactFeetClear({ x, y }, map)) nodes.push({ x, y });
    }
    const xs = axisTiles(DISTRICT_WIDTH, map.blockers.flatMap(block => [block.x - 16, block.x + block.width + 16]));
    const ys = axisTiles(DISTRICT_HEIGHT, map.blockers.flatMap(block => [block.y - 9, block.y + block.height + 9]));
    const uncovered: string[] = [];
    for (const [left, right] of xs) for (const [top, bottom] of ys) {
      const middle = { x: (left + right) / 2, y: (top + bottom) / 2 };
      if (!exactFeetClear(middle, map)) continue;
      // A blocker-free bounding rectangle between a node and the WHOLE tile certifies
      // both axis legs to EVERY point of that tile, not merely its sampled midpoint.
      // Every free node's route from the original spawn is independently audited above.
      const covered = nodes.some(node => {
        if (Math.abs(node.x - middle.x) > 96 || Math.abs(node.y - middle.y) > 96) return false;
        const swept = {
          x: Math.min(left, node.x) - 16, y: Math.min(top, node.y) - 9,
          width: Math.max(right, node.x) - Math.min(left, node.x) + 32,
          height: Math.max(bottom, node.y) - Math.min(top, node.y) + 18,
        };
        return !map.blockers.some(block => intersects(swept, block));
      });
      if (!covered) uncovered.push(`legal tile [${left},${right}] x [${top},${bottom}] lacks clear mesh connector`);
    }
    expect(uncovered).toEqual([]);
    // Covers any standable output for all uint32 seeds, not the generator's 2500-attempt
    // termination or every possible 36-fruit layout. Those are only sampled below.
  });

  it.each(maps.filter(map => map.blockers.some(block => block.polygon)))(
    'checks sub-grid contour approach witnesses in $id (not a continuous coverage proof)', map => {
      const witnesses: Point[] = [];
      for (const block of map.blockers) for (const vertex of block.polygon ?? []) {
        for (const dx of [-32, 0, 32]) for (const dy of [-24, 0, 24]) {
          const point = { x: vertex.x + dx, y: vertex.y + dy };
          if (exactFeetClear(point, map)) witnesses.push(point);
        }
      }
      for (const point of witnesses) expect(auditApproach(map, point, 2), `${point.x},${point.y}`).toEqual([]);
    });

  it.each(seeds)('reaches all 36 original fruit coordinates with clear final axis legs for seed %i', seed => {
    const fruits = createWorldFruitLayout(seed);
    expect(fruits).toHaveLength(36);
    expect(new Set(fruits.map(fruit => fruit.id)).size).toBe(36);
    expect(fruits).toEqual(createWorldFruitLayout(seed));
    const issues: string[] = [];
    for (const fruit of fruits) {
      const map = districtMaps[fruit.region];
      const path = findWorldPath(map.spawn, fruit, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
      if (!exactFeetClear(fruit, map)) issues.push(`${fruit.id} ${fruit.region}: blocked fruit ${fruit.x},${fruit.y}`);
      if (path === null) issues.push(`${fruit.id} ${fruit.region}: no path`);
      else {
        // findWorldPath promises grid waypoints, not an exact-goal connector. Audit its
        // complete route first, then witness a clear final approach without moving fruit.
        for (const issue of inspectRoute(map, map.spawn, path)) issues.push(`${fruit.id}: ${issue}`);
        const end = path.at(-1) ?? map.spawn;
        const xFirst = inspectRoute(map, map.spawn, [...path, fruit]);
        const yFirst = inspectRoute(map, map.spawn, [...path, { x: end.x, y: fruit.y }, fruit]);
        if (xFirst.length) connectorWarnings.push(`seed ${seed} ${fruit.id} ${fruit.region} (${fruit.x},${fruit.y}) from (${end.x},${end.y}): X-first blocked; Y-first ${yFirst.length ? 'blocked' : 'clear'}`);
        if (xFirst.length && yFirst.length) issues.push(`${fruit.id} ${fruit.region}: neither exact-target axis approach clears: ${[...xFirst, ...yFirst].join('; ')}`);
      }
    }
    expect(issues, `seed ${seed}: ${issues.join('; ')}`).toEqual([]);
  });

  it('keeps map geometry, portal arrivals and original spawns immutable during the audit', () => {
    expect(JSON.stringify(districtMaps)).toBe(immutableBefore);
  });
});

describe('exact feet, roof collision and occlusion contracts', () => {
  it.each([
    { x: 484, y: 600, clear: true }, { x: 484.001, y: 600, clear: false },
    { x: 716, y: 600, clear: true }, { x: 715.999, y: 600, clear: false },
    { x: 600, y: 491, clear: true }, { x: 600, y: 491.001, clear: false },
    { x: 600, y: 709, clear: true }, { x: 600, y: 708.999, clear: false },
    { x: 44, y: 44, clear: true }, { x: 43.999, y: 44, clear: false },
    { x: 2356, y: 1556, clear: true }, { x: 2356.001, y: 1556, clear: false },
    { x: 44, y: 1556.001, clear: false }, { x: 44, y: 43.999, clear: false },
  ])('honors feet edge/margin contact at $x,$y (clear=$clear)', ({ x, y, clear }) => {
    expect(canOccupyWorldPosition(x, y, [{ x: 500, y: 500, width: 200, height: 200 }], DISTRICT_WIDTH, DISTRICT_HEIGHT)).toBe(clear);
  });

  it.each(maps)('audits all blocker interiors and subpixel feet boundaries in $id', map => {
    for (const block of map.blockers) {
      const cx = block.x + block.width / 2;
      const cy = block.y + block.height / 2;
      const xs = [block.x - 16, block.x - 15.999, block.x, cx, block.x + block.width, block.x + block.width + 15.999, block.x + block.width + 16];
      const ys = [block.y - 9, block.y - 8.999, block.y, cy, block.y + block.height, block.y + block.height + 8.999, block.y + block.height + 9];
      for (const x of xs) for (const y of ys) {
        expect(canOccupyWorldPosition(x, y, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT), `${map.id} feet at ${x},${y}`)
          .toBe(exactFeetClear({ x, y }, map));
      }
    }
  });

  it.each(maps)('separates side-edge translucency from roof collision and front depth in $id', map => {
    // Legacy side-of-rectangle alpha assertions are not polygon roof-mask contracts.
    for (const block of map.blockers.filter(block => !block.polygon && !isMapBoundary(block, DISTRICT_WIDTH, DISTRICT_HEIGHT))) {
      const y = block.y + block.height / 2;
      expect(canOccupyWorldPosition(block.x + block.width / 2, y, [block], DISTRICT_WIDTH, DISTRICT_HEIGHT), 'roof/wall interior').toBe(false);
      for (const x of [block.x - 16, block.x + block.width + 16]) {
        if (x < 44 || x > DISTRICT_WIDTH - 44 || y < 44 || y > DISTRICT_HEIGHT - 44) continue;
        expect(canOccupyWorldPosition(x, y, [block], DISTRICT_WIDTH, DISTRICT_HEIGHT)).toBe(true);
        expect(getWallOcclusionAlpha(x, y, [block])).toBe(0.52);
      }
      expect(getWallOcclusionAlpha(block.x + block.width / 2, block.y - 9, [block]), 'top overlap does not trigger side alpha').toBe(1);
      expect(getFeetDepth(block.y + block.height - 9)).toBeLessThan(getWallFrontDepth(block));
      expect(getFeetDepth(block.y + block.height + 9)).toBeGreaterThan(getWallFrontDepth(block));
    }
    for (const boundary of map.blockers.filter(block => isMapBoundary(block, DISTRICT_WIDTH, DISTRICT_HEIGHT))) {
      expect(getWallOcclusionAlpha(boundary.x - 16, boundary.y + boundary.height / 2, [boundary])).toBe(1);
    }
  });

  it('exposes snapped blocked goals: non-null path alone does not prove roof access', () => {
    const map = districtMaps.oldTown;
    const roof = { x: 850, y: 1100 };
    const path = findWorldPath(map.spawn, roof, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    expect(exactFeetClear(roof, map)).toBe(false);
    expect(path).not.toBeNull();
    expect(auditApproach(map, roof, 120)).not.toEqual([]);
    if (path) expect(inspectRoute(map, map.spawn, path)).toEqual([]);
  });
});
