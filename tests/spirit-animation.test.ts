import { describe, expect, it } from 'vitest';
import {
  createSpiritVerticalLayout, getSpiritWalkPose, SPIRIT_WALK_CYCLE_PIXELS,
  type SpiritAnimationLayout, type SpiritAnimationMetadata, type SpiritFacing,
} from '../src/game/spirit-animation';
import { spirits } from '../src/game/spirits';

const stages = ['young', 'growing', 'guardian'] as const;
const facings: SpiritFacing[] = ['front', 'back', 'left', 'right'];
// Synthetic metadata only: no nonexistent production assets are registered.
function testLayout(id: string): SpiritAnimationLayout {
  const side = (stage: string) => ({
    texture: `${id}-${stage}-approved-test`, frameWidth: 543, frameHeight: 724,
    frames: [0, 1, 2, 3] as const,
  });
  return {
    vertical: createSpiritVerticalLayout(`${id}-vertical-test`, 256, 320),
    side: { young: side('young'), growing: side('growing'), guardian: side('guardian') },
  };
}
const metadata: SpiritAnimationMetadata = {
  xiezhi: testLayout('xiezhi'), baize: testLayout('baize'), pixiu: testLayout('pixiu'),
  qilin: testLayout('qilin'), xuanwu: testLayout('xuanwu'), qinglong: testLayout('qinglong'),
};

describe('spirit direction and growth selection', () => {
  it.each(spirits.map(({ id }) => id))('%s selects real front/back cells for all three forms', id => {
    for (const [column, stage] of stages.entries()) {
      for (const [facing, firstRow] of [['front', 0], ['back', 3]] as const) {
        const idle = getSpiritWalkPose(id, stage, facing, 147, false, metadata);
        const a = getSpiritWalkPose(id, stage, facing, 0, true, metadata);
        const b = getSpiritWalkPose(id, stage, facing, 96, true, metadata);
        expect([idle.frame, a.frame, b.frame]).toEqual([
          firstRow * 3 + column, (firstRow + 1) * 3 + column, (firstRow + 2) * 3 + column,
        ]);
        for (const pose of [idle, a, b]) {
          expect(pose.texture).toBe(`${id}-vertical-test`);
          expect(pose.flipX).toBe(false);
          expect([pose.frameWidth, pose.frameHeight]).toEqual([256, 320]);
        }
      }
    }
  });

  it('retains all approved side frames and mirrors only left, for every form', () => {
    for (const { id } of spirits) for (const stage of stages) {
      for (const facing of ['left', 'right'] as const) {
        const poses = [0, 48, 96, 144, 192].map(d => getSpiritWalkPose(id, stage, facing, d, true, metadata));
        expect(poses.map(p => p.frame)).toEqual([0, 1, 2, 3, 0]);
        expect(poses.every(p => p.texture === `${id}-${stage}-approved-test` && p.flipX === (facing === 'left'))).toBe(true);
        expect(poses.every(p => p.frameWidth === 543 && p.frameHeight === 724)).toBe(true);
      }
    }
  });

  it('stops immediately at logical pose zero, retaining direction and form', () => {
    for (const { id } of spirits) for (const [column, stage] of stages.entries()) {
      for (const facing of facings) for (const d of [0, 49, 100, 191, 600]) {
        const pose = getSpiritWalkPose(id, stage, facing, d, false, metadata);
        expect(pose.phase).toBe(0);
        expect(pose.poseIndex).toBe(0);
        expect(pose.frame).toBe(facing === 'front' ? column : facing === 'back' ? 9 + column : 0);
      }
    }
  });
});

describe('distance based full walk cycle', () => {
  const pose = (facing: SpiritFacing, d: number, cycle = SPIRIT_WALK_CYCLE_PIXELS) =>
    getSpiritWalkPose('xiezhi', 'young', facing, d, true, metadata, cycle);

  it('holds both vertical steps equally and wraps on the exact 192px boundary', () => {
    const distances = [0, 47.999, 48, 95.999, 96, 143.999, 144, 191.999, 192, 288, 384];
    expect(distances.map(d => pose('front', d).frame)).toEqual([3, 3, 3, 3, 6, 6, 6, 6, 3, 6, 3]);
    expect(distances.map(d => pose('back', d).frame)).toEqual([12, 12, 12, 12, 15, 15, 15, 15, 12, 15, 12]);
    expect(distances.map(d => pose('right', d).frame)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0, 2, 0]);
  });

  it('shares the phase across species, stages and directions and depends only on distance', () => {
    for (const d of [0, 48, 96, 144, 192, 1057]) {
      const expected = Math.floor((d % 192) / 48);
      for (const { id } of spirits) for (const stage of stages) for (const facing of facings) {
        expect(getSpiritWalkPose(id, stage, facing, d, true, metadata).phase).toBe(expected);
      }
    }
    // Sampling a single movement in different update sizes reaches the same pose.
    const advance = (deltas: number[]) => pose('back', deltas.reduce((sum, d) => sum + d, 0));
    expect(advance([48, 48, 48])).toEqual(advance([144]));
  });

  it('supports a parent-selected cycle without changing relative step holds', () => {
    expect([0, 30, 60, 90, 120].map(d => pose('right', d, 120).frame)).toEqual([0, 1, 2, 3, 0]);
    expect([0, 30, 60, 90, 120].map(d => pose('front', d, 120).poseIndex)).toEqual([1, 1, 2, 2, 1]);
  });

  it('treats negative/nonfinite travel as the start and rejects invalid cycle lengths', () => {
    for (const d of [-1, NaN, Infinity, -Infinity]) expect(pose('front', d)).toEqual(pose('front', 0));
    for (const cycle of [0, -1, NaN, Infinity]) expect(() => pose('front', 1, cycle)).toThrow(RangeError);
  });
});

describe('parent-owned layout metadata', () => {
  it('supports reordered columns/rows and existing nonsequential approved frame numbers', () => {
    const custom: SpiritAnimationMetadata = {
      ...metadata,
      xiezhi: {
        vertical: {
          texture: 'custom', frameWidth: 80, frameHeight: 90, columns: 5,
          stageColumns: { young: 4, growing: 2, guardian: 0 },
          rows: { front: [5, 4, 3], back: [2, 1, 0] },
        },
        side: { ...metadata.xiezhi.side, young: {
          texture: 'approved', frameWidth: 12, frameHeight: 16, frames: [8, 3, 7, 2],
        } },
      },
    };
    expect(getSpiritWalkPose('xiezhi', 'growing', 'back', 96, true, custom).frame).toBe(2);
    expect(getSpiritWalkPose('xiezhi', 'young', 'front', 96, false, custom).frame).toBe(29);
    expect([0, 48, 96, 144].map(d => getSpiritWalkPose('xiezhi', 'young', 'left', d, true, custom).frame)).toEqual([8, 3, 7, 2]);
    expect(custom.xiezhi.vertical.rows.front).toEqual([5, 4, 3]);
  });

  it('describes the proposed 3x6 artwork using caller supplied cell dimensions', () => {
    const layout = createSpiritVerticalLayout('future-sheet', 300, 400);
    expect(layout).toEqual({
      texture: 'future-sheet', frameWidth: 300, frameHeight: 400, columns: 3,
      stageColumns: { young: 0, growing: 1, guardian: 2 },
      rows: { front: [0, 1, 2], back: [3, 4, 5] },
    });
    for (const size of [0, -1, 2.5, NaN, Infinity]) {
      expect(() => createSpiritVerticalLayout('bad', size, 300)).toThrow(RangeError);
      expect(() => createSpiritVerticalLayout('bad', 300, size)).toThrow(RangeError);
    }
  });
});
