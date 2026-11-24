import { describe, expect, it } from 'vitest';
import * as geometry from '../src/game/world-geometry';
import { districtMaps } from '../src/game/world-data';

describe('polygon feet and continuous routes', () => {
  const triangle = { x: 300, y: 300, width: 200, height: 200,
    polygon: [{ x: 300, y: 300 }, { x: 500, y: 500 }, { x: 300, y: 500 }] };

  it('keeps the road outside a sloping footprint open, but blocks feet overlapping its edge', () => {
    expect(geometry.canOccupyWorldPosition(460, 340, [triangle], 1000, 1000)).toBe(true);
    expect(geometry.canOccupyWorldPosition(420, 420, [triangle], 1000, 1000)).toBe(false);
    expect(geometry.canOccupyWorldPosition(520, 500, [triangle], 1000, 1000)).toBe(true);
  });

  it('does not send a grid edge through a thin wall between two legal nodes', () => {
    const wall = [{ x: 190, y: 0, width: 1, height: 400 }];
    // 96px cells: x=144 and x=240 are both legal, but their connector crosses the wall.
    expect(geometry.findWorldPath({ x: 144, y: 144 }, { x: 240, y: 144 }, wall, 400, 400, 96)).toBeNull();
  });

  it('does not detour to a grid center when already at the goal or making a short clear click', () => {
    expect(geometry.findWorldPath({ x: 500, y: 500 }, { x: 500, y: 500 }, [], 1000, 1000)).toEqual([]);
    expect(geometry.findWorldPath({ x: 500, y: 500 }, { x: 508, y: 502 }, [], 1000, 1000))
      .toEqual([{ x: 508, y: 500 }, { x: 508, y: 502 }]);
  });

  it('does not mistake a polygon bounding-box side for a visual occlusion edge', () => {
    expect(geometry.getWallOcclusionAlpha(520, 340, [triangle], 1000, 1000)).toBe(1);
  });

  it('does not expose target objects or cached mesh points through mutable route results', () => {
    const blockers: geometry.WorldRect[] = [];
    const start = { x: 500, y: 500 }, goal = { x: 800, y: 800 };
    const first = geometry.findWorldPath(start, goal, blockers, 1000, 1000)!;
    const snapshot = first.map(point => ({ ...point }));
    for (const point of first) point.x = 999;
    expect(goal).toEqual({ x: 800, y: 800 });
    expect(geometry.findWorldPath(start, goal, blockers, 1000, 1000)).toEqual(snapshot);
  });

  it('includes a collision-free spawn connector rather than skipping the starting grid cell', () => {
    const wall = [{ x: 200, y: 200, width: 100, height: 100 }];
    const start = { x: 180, y: 310 };
    const route = geometry.findWorldPath(start, { x: 330, y: 320 }, wall, 600, 600);
    expect(route).not.toBeNull();
    let from = start;
    for (const to of route!) {
      const actual = geometry.moveAlongWalkableAxes(from.x, from.y, to.x, to.y,
        (x, y) => geometry.canOccupyWorldPosition(x, y, wall, 600, 600));
      expect({ x: actual.x, y: actual.y }).toEqual(to);
      from = to;
    }
    expect(route!.at(-1)).toEqual({ x: 330, y: 320 });
  });

  it('distinguishes a clear concave notch from the surrounding solid footprint', () => {
    const notch = { x: 300, y: 300, width: 300, height: 300, polygon: [
      { x: 300, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 400 },
      { x: 400, y: 400 }, { x: 400, y: 600 }, { x: 300, y: 600 },
    ] };
    expect(geometry.canOccupyWorldPosition(500, 500, [notch], 1000, 1000)).toBe(true);
    expect(geometry.canOccupyWorldPosition(390, 500, [notch], 1000, 1000)).toBe(false);
  });

  it('rejects a diagonal continuous sweep across a polygon even when both feet endpoints are clear', () => {
    expect(geometry.isWorldSegmentClear({ x: 260, y: 400 }, { x: 460, y: 540 }, [triangle], 1000, 1000)).toBe(false);
    expect(geometry.isWorldSegmentClear({ x: 550, y: 300 }, { x: 650, y: 500 }, [triangle], 1000, 1000)).toBe(true);
  });
});

it('fades visual eaves independently of standable feet, leaving the player opaque', () => {
  const inspect = geometry.getOcclusion;
  const masks = [{ x: 500, y: 500, width: 100, height: 30 }];
  expect(geometry.canOccupyWorldPosition(550, 540, [], 1000, 1000)).toBe(true);
  expect(inspect(550, 540, masks)).toEqual({ occluderIndices: [0], occluderAlpha: .35, playerAlpha: 1 });
  expect(inspect(550, 800, masks)).toEqual({ occluderIndices: [], occluderAlpha: 1, playerAlpha: 1 });
});

describe('annotated old-town stone roads (1536x1024 reference scaled to 2400x1600)', () => {
  const map = districtMaps.oldTown;
  const scale = 2400 / 1536;
  // Hand-picked road witnesses from the user's red boundary, not the blocker data.
  it.each([
    [530, 450, 'junction north of green house'],
    [330, 580, 'west lane formerly inside coarse rectangle'],
    [295, 690, 'southwest bend beside green house'],
    [1090, 620, 'diagonal east road below noticeboard'],
    [1030, 680, 'road behind southeast eave'],
    [950, 940, 'south road to original harbor portal'],
  ] as const)('keeps stone road at %i,%i open (%s)', (x, y, _label) => {
    expect(geometry.canOccupyWorldPosition(x * scale, y * scale, map.blockers, 2400, 1600)).toBe(true);
  });

  it.each([[550, 360], [850, 340], [1070, 330], [435, 510], [1100, 610], [500, 970], [1200, 980]] as const)(
    'makes white-marked eave at %i,%i translucent without sealing its feet approach', (x, y) => {
      expect(geometry.canOccupyWorldPosition(x * scale, y * scale, map.blockers, 2400, 1600)).toBe(true);
      expect(geometry.getOcclusion(x * scale, y * scale, map.occluders ?? []).occluderIndices.length).toBeGreaterThan(0);
    });

  it.each([[540, 640], [620, 800], [150, 500], [1230, 800], [700, 200]] as const)(
    'keeps solid buildings at %i,%i blocked', (x, y) => {
      expect(geometry.canOccupyWorldPosition(x * scale, y * scale, map.blockers, 2400, 1600)).toBe(false);
    });
});
