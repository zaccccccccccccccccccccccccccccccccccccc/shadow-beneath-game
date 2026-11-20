export interface Point {
  x: number;
  y: number;
}

export interface WalkableZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelRoute {
  id: 'tutorial' | 'act-one';
  spawn: Point;
  walkableZones: WalkableZone[];
  exit: {
    x: number;
    y: number;
    radius: number;
    targetScene: 'act-one' | 'next-patch';
  };
}

function contains(zone: WalkableZone, point: Point): boolean {
  return point.x >= zone.x && point.x <= zone.x + zone.width
    && point.y >= zone.y && point.y <= zone.y + zone.height;
}

function nearestPoint(point: Point, zone: WalkableZone): Point {
  return {
    x: Math.max(zone.x, Math.min(point.x, zone.x + zone.width)),
    y: Math.max(zone.y, Math.min(point.y, zone.y + zone.height)),
  };
}

export function constrainToWalkable(point: Point, level: LevelRoute): Point {
  if (level.walkableZones.some((zone) => contains(zone, point))) return point;

  return level.walkableZones
    .map((zone) => nearestPoint(point, zone))
    .reduce((closest, candidate) => {
      const closestDistance = (closest.x - point.x) ** 2 + (closest.y - point.y) ** 2;
      const candidateDistance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
      return candidateDistance < closestDistance ? candidate : closest;
    });
}

export const tutorialLevel: LevelRoute = {
  id: 'tutorial',
  spawn: { x: 325, y: 610 },
  walkableZones: [
    { x: 115, y: 493, width: 1370, height: 178 },
    { x: 1290, y: 446, width: 145, height: 225 },
  ],
  exit: { x: 1395, y: 555, radius: 78, targetScene: 'act-one' },
};

export const actOneLevel: LevelRoute = {
  id: 'act-one',
  spawn: { x: 800, y: 584 },
  walkableZones: [
    { x: 132, y: 462, width: 1335, height: 191 },
    { x: 54, y: 507, width: 110, height: 107 },
  ],
  exit: { x: 1492, y: 555, radius: 68, targetScene: 'next-patch' },
};

export const nextLevelPatch = {
  sceneKey: 'next-patch',
  chapter: '第二幕 · 账本的空白页',
  title: '社团活动费',
  synopsis: '三笔看似无关的报销，指向同一页被撕下的账本。下一次巡查，你需要比“看见”更早一步：学会追问。',
  status: '内容制作中 · 本次版本已预留入口与章节转场',
} as const;
