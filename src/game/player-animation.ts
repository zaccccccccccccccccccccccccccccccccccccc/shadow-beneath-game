export type PlayerFacing = 'front' | 'back' | 'left' | 'right';

/** Two front/back poses need twice the hold of the four side poses. */
export function getVerticalWalkRow(traveledPixels: number): 1 | 2 {
  return (Math.floor(Math.max(0, traveledPixels) / 96) % 2 + 1) as 1 | 2;
}

const walkFrames: Record<PlayerFacing, readonly [number, number]> = {
  front: [0, 3],
  left: [1, 4],
  right: [1, 4],
  back: [2, 5],
};

export function getWalkFrameSequence(facing: PlayerFacing): readonly [number, number] {
  return walkFrames[facing];
}

export function getWalkFrameForDistance(facing: PlayerFacing, traveledPixels: number): number {
  const frames = getWalkFrameSequence(facing);
  return frames[Math.floor(Math.max(0, traveledPixels) / 36) % frames.length];
}

export function getWalkAnimationKey(facing: PlayerFacing): string {
  return facing === 'front' ? 'walk-front' : facing === 'back' ? 'walk-back' : 'walk-side';
}

export function isMirroredWalkDirection(facing: PlayerFacing): boolean {
  return facing === 'right';
}

export type SideWalkPose = 'wide' | 'rear-lift' | 'passing' | 'front-lift';

export function getSideWalkPose(traveledPixels: number): SideWalkPose {
  const phase = Math.floor(Math.max(0, traveledPixels) / 24) % 4;
  return (['wide', 'rear-lift', 'passing', 'front-lift'] as const)[phase];
}

export function getSideWalkSprite(facing: Extract<PlayerFacing, 'left' | 'right'>, traveledPixels: number): { frame: number; flipX: boolean } {
  const phase = Math.floor(Math.max(0, traveledPixels) / 48) % 4;
  return { frame: phase, flipX: facing === 'left' };
}
