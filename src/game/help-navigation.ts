export interface RoutePoint { x: number; y: number }
export interface RouteDash { from: RoutePoint; to: RoutePoint }

export function remainingHints(used: number, limit: number): number {
  return Math.max(0, limit - used);
}

export function getDashedRouteSegments(route: readonly RoutePoint[], dashLength = 12, gapLength = 12): RouteDash[] {
  const dashes: RouteDash[] = [];
  for (let i = 1; i < route.length; i += 1) {
    const start = route[i - 1];
    const end = route[i];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length < 0.001) continue;
    for (let offset = 0; offset < length; offset += dashLength + gapLength) {
      const toOffset = Math.min(length, offset + dashLength);
      const pointAt = (distance: number): RoutePoint => ({
        x: start.x + (end.x - start.x) * distance / length,
        y: start.y + (end.y - start.y) * distance / length,
      });
      dashes.push({ from: pointAt(offset), to: pointAt(toOffset) });
    }
  }
  return dashes;
}

export function getReachableRouteTarget(
  requested: RoutePoint,
  route: readonly RoutePoint[],
  canOccupy: (point: RoutePoint) => boolean,
  fallback: RoutePoint,
): RoutePoint {
  if (canOccupy(requested)) return requested;
  return route[route.length - 1] ?? fallback;
}

export function getPathArrowAngle(player: RoutePoint, route: readonly RoutePoint[], minDistance = 28): number | null {
  const waypoint = route.find((point) => Math.hypot(point.x - player.x, point.y - player.y) >= minDistance);
  if (!waypoint) return null;
  return Math.atan2(waypoint.y - player.y, waypoint.x - player.x);
}
