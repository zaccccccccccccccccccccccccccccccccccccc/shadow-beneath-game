import { describe, expect, it } from 'vitest';
import { getDashedRouteSegments, getPathArrowAngle, getReachableRouteTarget, remainingHints } from '../src/game/help-navigation';
import { findWorldPath } from '../src/game/world-geometry';
import { districtMaps, DISTRICT_HEIGHT, DISTRICT_WIDTH } from '../src/game/world-data';

describe('manual route guidance', () => {
  it('can guide the player from the tutorial street spawn to the walking practice point', () => {
    const route = findWorldPath({ x: 1190, y: 1120 }, { x: 1190, y: 1370 }, districtMaps.hq.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    expect(route).not.toBeNull();
    expect(getDashedRouteSegments(route ?? []).length).toBeGreaterThan(0);
  });
  it('points toward the first useful waypoint on the navigable route', () => {
    expect(getPathArrowAngle({ x: 100, y: 100 }, [{ x: 108, y: 108 }, { x: 100, y: 220 }])).toBeCloseTo(Math.PI / 2);
  });

  it('returns no direction after the route is exhausted', () => {
    expect(getPathArrowAngle({ x: 100, y: 100 }, [])).toBeNull();
  });

  it('limits manual route hints to three uses', () => {
    expect(remainingHints(0, 3)).toBe(3);
    expect(remainingHints(2, 3)).toBe(1);
    expect(remainingHints(3, 3)).toBe(0);
    expect(remainingHints(5, 3)).toBe(0);
  });

  it('draws spaced ground dashes along a cornered navigable route', () => {
    const dashes = getDashedRouteSegments([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }], 12, 12);
    expect(dashes.length).toBeGreaterThan(3);
    expect(dashes[0]).toEqual({ from: { x: 0, y: 0 }, to: { x: 12, y: 0 } });
    expect(dashes.some((dash) => dash.from.x === 60 && dash.to.x === 60 && dash.to.y > dash.from.y)).toBe(true);
    expect(dashes.every((dash) => dash.to.x <= 60 && dash.to.y <= 60)).toBe(true);
  });

  it('uses the last walkable waypoint when a requested point is behind a wall', () => {
    const route = [{ x: 120, y: 100 }, { x: 120, y: 148 }];
    expect(getReachableRouteTarget({ x: 220, y: 100 }, route, (point) => point.x < 180, { x: 100, y: 100 })).toEqual({ x: 120, y: 148 });
    expect(getReachableRouteTarget({ x: 160, y: 100 }, route, () => true, { x: 100, y: 100 })).toEqual({ x: 160, y: 100 });
  });
});
