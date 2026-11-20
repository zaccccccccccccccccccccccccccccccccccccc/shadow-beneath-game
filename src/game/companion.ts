export interface TrailPoint { x: number; y: number }
export type CompanionPose = { facing: 'front' | 'back' | 'left' | 'right'; moving: boolean; phase: number };
export interface CompanionProgress { claimedSnackIds: string[]; snacks: number; fed: number }
export type CompanionGrowthStage = { id: 'young' | 'growing' | 'guardian'; size: number };

export function claimSnack(progress: CompanionProgress, snackId: string, correct: boolean): CompanionProgress {
  if (!correct || progress.claimedSnackIds.includes(snackId)) return progress;
  return { ...progress, claimedSnackIds: [...progress.claimedSnackIds, snackId], snacks: progress.snacks + 1 };
}

export function feedCompanion(progress: CompanionProgress): CompanionProgress | null {
  if (progress.snacks < 1) return null;
  return { ...progress, snacks: progress.snacks - 1, fed: progress.fed + 1 };
}

export function getCompanionGrowthStage(fed: number): CompanionGrowthStage {
  if (fed >= 6) return { id: 'guardian', size: 128 };
  if (fed >= 3) return { id: 'growing', size: 108 };
  return { id: 'young', size: 88 };
}

export function getCompanionPose(dx: number, dy: number, moving: boolean, phase: number): CompanionPose {
  const facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'back' : 'front');
  return { facing, moving, phase };
}

export function getCompanionTrailPoint(player: TrailPoint, trail: readonly TrailPoint[], distanceBehind: number): TrailPoint {
  let current = player;
  let remaining = distanceBehind;
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const older = trail[index];
    const length = Math.hypot(older.x - current.x, older.y - current.y);
    if (length >= remaining && length > 0) {
      const ratio = remaining / length;
      return { x: current.x + (older.x - current.x) * ratio, y: current.y + (older.y - current.y) * ratio };
    }
    remaining -= length;
    current = older;
  }
  return trail[0] ?? { x: player.x - 55, y: player.y + 12 };
}
