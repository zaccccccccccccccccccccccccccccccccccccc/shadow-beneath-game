import type { SpiritGrowthId, SpiritId } from './spirits';

export type SpiritFacing = 'front' | 'back' | 'left' | 'right';
type FourFrames = readonly [number, number, number, number];

export interface SpiritSideLayout {
  /** Existing approved right-facing sheet; only left is mirrored. */
  readonly texture: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: FourFrames;
}

export interface SpiritVerticalLayout {
  readonly texture: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Row-major spritesheet, loaded with the same cell dimensions. */
  readonly columns: number;
  readonly stageColumns: Readonly<Record<SpiritGrowthId, number>>;
  /** Each tuple is [idle, step A, step B]; these must be actual drawn poses. */
  readonly rows: Readonly<Record<'front' | 'back', readonly [number, number, number]>>;
}

export interface SpiritAnimationLayout {
  readonly vertical: SpiritVerticalLayout;
  readonly side: Readonly<Record<SpiritGrowthId, SpiritSideLayout>>;
}

export type SpiritAnimationMetadata = Readonly<Record<SpiritId, SpiritAnimationLayout>>;

export interface SpiritWalkPose {
  readonly texture: string;
  /** Absolute Phaser frame number, not the logical pose index. */
  readonly frame: number;
  readonly flipX: boolean;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Shared four-quarter gait phase; always zero when stopped. */
  readonly phase: number;
  /** Vertical: 0 idle / 1 A / 2 B. Side: approved frame index 0..3. */
  readonly poseIndex: number;
}

export const SPIRIT_WALK_CYCLE_PIXELS = 192;

/**
 * Contract for NEW artwork, not a declaration that assets already exist.
 * One sheet per species: 3 columns (young/growing/guardian), 6 rows
 * (front idle/A/B, back idle/A/B). Parent supplies texture and exact cell size.
 * Keep body scale, foot baseline and padding stable within every column.
 * A/B must exchange leading feet; mirroring a side view is not a back view.
 */
export function createSpiritVerticalLayout(
  texture: string,
  frameWidth: number,
  frameHeight: number,
): SpiritVerticalLayout {
  if (![frameWidth, frameHeight].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new RangeError('Spirit cell dimensions must be positive integers');
  }
  return {
    texture, frameWidth, frameHeight, columns: 3,
    stageColumns: { young: 0, growing: 1, guardian: 2 },
    rows: { front: [0, 1, 2], back: [3, 4, 5] },
  };
}

/**
 * Pure selection; no Phaser, PNG imports, clocks, or mutable animation state.
 * Pass cumulative actual traveled world pixels (not delta time or input intent).
 * Caller resets traveled to zero at a new walking episode if restart is desired.
 * All species/directions share one cycle distance. Vertical poses hold for half
 * a cycle; the four approved side frames each hold for a quarter cycle.
 * Stopping selects pose 0 regardless of distance. Its absolute frame can be
 * nonzero, e.g. back idle in the proposed 3x6 sheet starts at frame 9.
 * Missing front/back art must be supplied in metadata; never fake it with side art.
 */
export function getSpiritWalkPose(
  id: SpiritId,
  stage: SpiritGrowthId,
  facing: SpiritFacing,
  traveled: number,
  moving: boolean,
  metadata: SpiritAnimationMetadata,
  cyclePixels = SPIRIT_WALK_CYCLE_PIXELS,
): SpiritWalkPose {
  if (!Number.isFinite(cyclePixels) || cyclePixels <= 0) {
    throw new RangeError('Spirit walk cycle distance must be finite and positive');
  }
  const distance = Number.isFinite(traveled) ? Math.max(0, traveled) : 0;
  const progress = (distance % cyclePixels) / cyclePixels;
  const phase = moving ? Math.floor(progress * 4) : 0;
  const layout = metadata[id];
  if (facing === 'left' || facing === 'right') {
    const side = layout.side[stage];
    return {
      texture: side.texture, frame: side.frames[phase], flipX: facing === 'left',
      frameWidth: side.frameWidth, frameHeight: side.frameHeight,
      phase, poseIndex: phase,
    };
  }
  const vertical = layout.vertical;
  const poseIndex = moving ? (phase < 2 ? 1 : 2) : 0;
  return {
    texture: vertical.texture,
    frame: vertical.rows[facing][poseIndex] * vertical.columns + vertical.stageColumns[stage],
    flipX: false, frameWidth: vertical.frameWidth, frameHeight: vertical.frameHeight,
    phase, poseIndex,
  };
}
