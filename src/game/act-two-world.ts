import type { CompanionProgress } from './companion';
import { districtMaps, type RegionId } from './world-data';
import type { ActTwoRegion } from './act-two';

export interface ActTwoWorldPortal {
  from: ActTwoRegion;
  to: ActTwoRegion;
  x: number;
  y: number;
  width: number;
  height: number;
  spawn: { x: number; y: number };
}

export function getActTwoWorldPortals(): ActTwoWorldPortal[] {
  return (Object.keys(districtMaps) as RegionId[])
    .flatMap((from) => districtMaps[from].portals
      .map((portal) => ({
        from: from as ActTwoRegion,
        to: portal.target as ActTwoRegion,
        x: portal.x + portal.width / 2,
        y: portal.y + portal.height / 2,
        width: portal.width,
        height: portal.height,
        spawn: portal.spawn,
      })));
}

export interface ChapterOneCompanionSnapshot {
  unlocked: boolean;
  progress: CompanionProgress;
}

export function readChapterOneCompanion(claimedValue: string | null, progressValue: string | null): ChapterOneCompanionSnapshot {
  const fallback: CompanionProgress = { claimedSnackIds: [], snacks: 0, fed: 0 };
  let progress = fallback;
  try {
    const stored = JSON.parse(progressValue || 'null') as Partial<CompanionProgress> | null;
    if (stored && Array.isArray(stored.claimedSnackIds)) {
      progress = {
        claimedSnackIds: [...new Set(stored.claimedSnackIds.filter((item): item is string => typeof item === 'string'))],
        snacks: Math.max(0, Number.isFinite(Number(stored.snacks)) ? Number(stored.snacks) : 0),
        fed: Math.max(0, Number.isFinite(Number(stored.fed)) ? Number(stored.fed) : 0),
      };
    }
  } catch { /* Use a clean companion record when a saved record is malformed. */ }
  return { unlocked: claimedValue === 'true', progress };
}
