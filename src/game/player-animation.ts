export type PlayerFacing = 'front' | 'back' | 'left' | 'right';

/** Two front/back poses need twice the hold of the four side poses. */
export function getVerticalWalkRow(traveledPixels: number): 1 | 2 {
  return (Math.floor(Math.max(0, traveledPixels) / 96) % 2 + 1) as 1 | 2;
}

export function getSideWalkSprite(facing: Extract<PlayerFacing, 'left' | 'right'>, traveledPixels: number): { frame: number; flipX: boolean; offsetX: number } {
  const phase = Math.floor(Math.max(0, traveledPixels) / 48) % 4;
  // Measured opaque head anchors in the 627px source cells; negate after mirroring.
  const shift = [-19, 38, -20, 35][phase] * 123 / 627;
  return { frame: phase, flipX: facing === 'left', offsetX: facing === 'left' ? -shift : shift };
}
