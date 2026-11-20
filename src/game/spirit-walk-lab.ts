import type { SpiritGrowthId, SpiritId } from './spirits';
import { spirits } from './spirits';
import { getCompanionGrowthStage } from './companion';

export interface WalkLabCase {
  spirit: SpiritId;
  stage: SpiritGrowthId;
  lane: number;
  speed: number;
}

export function createWalkLabCases(): WalkLabCase[] {
  const stages: SpiritGrowthId[] = ['young', 'growing', 'guardian'];
  return spirits.flatMap((spirit, lane) => stages.map((stage, index) => ({ spirit: spirit.id, stage, lane, speed: 82 + lane * 7 + index * 5 })));
}

export function nextWalkLabFrame(moving: boolean, current: number, frameCount = 4): number {
  if (!moving) return 0;
  return (current + 1) % frameCount;
}

export function getWalkLabSpriteHeight(stage: SpiritGrowthId): number {
  const fed = stage === 'young' ? 0 : stage === 'growing' ? 3 : 6;
  return getCompanionGrowthStage(fed).size;
}

export function getStageCropMetrics(sourceWidth: number, sourceHeight: number, targetHeight: number): { cropWidth: number; cropHeight: number; scale: number } {
  const cropWidth = sourceWidth / 3;
  return { cropWidth, cropHeight: sourceHeight, scale: targetHeight / sourceHeight };
}

export function getWalkFrameMetrics(sourceWidth: number, sourceHeight: number, targetHeight: number): { frameWidth: number; frameHeight: number; scale: number } {
  const frameWidth = sourceWidth / 2;
  return { frameWidth, frameHeight: sourceHeight, scale: targetHeight / sourceHeight };
}
