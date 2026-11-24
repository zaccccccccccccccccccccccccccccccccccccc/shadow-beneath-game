import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { spiritVerticalMetrics, getSpiritVerticalRuntimeModel } from '../src/game/spirit-vertical-metrics';
import { playerVerticalMetrics, getPlayerVerticalRuntimeModel } from '../src/game/player-vertical-metrics';
import { spirits } from '../src/game/spirits';

function verifyPng(assetPath: string, hash: string, width: number, height: number): void {
  const bytes=readFileSync(new URL('../'+assetPath,import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
  expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([width,height]);
}

describe('measured directional art actually shipped to the game',()=>{
  for (const {id} of spirits) it(`${id}: all three forms have complete independent front/back crops`,()=>{
    const sheet=spiritVerticalMetrics[id];expect(sheet,`${id} is missing accepted art`).not.toBeNull();
    if (!sheet) return;
    verifyPng(sheet.assetPath,sheet.sha256,sheet.imageWidth,sheet.imageHeight);
    expect(sheet.alpha.min).toBe(0);expect(sheet.alpha.max).toBe(255);
    expect(sheet.alpha.transparentPixels/sheet.alpha.totalPixels).toBeGreaterThan(.3);
    expect(sheet.frames).toHaveLength(18);
    for (const stage of ['young','growing','guardian'] as const) for(const facing of ['front','back'] as const){
      const poses=['idle','a','b'].map(pose=>getSpiritVerticalRuntimeModel(id,stage,facing,pose as 'idle'|'a'|'b',88)!);
      expect(new Set(poses.map(p=>p.frameName)).size).toBe(3);
      expect(new Set(poses.map(p=>p.scale)).size).toBe(1);
      for(const p of poses){const b=p.sourceBBox;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(sheet.imageWidth);expect(b.y+b.height).toBeLessThanOrEqual(sheet.imageHeight);}
    }
  });
  it('aligns both player boot exchanges to the existing idle head without stretching each frame',()=>{
    const sheet=playerVerticalMetrics;verifyPng(sheet.assetPath,sheet.sha256,sheet.imageWidth,sheet.imageHeight);
    expect(sheet.alpha.min).toBe(0);expect(sheet.alpha.transparentPixels/sheet.alpha.totalPixels).toBeGreaterThan(.3);
    for (const facing of ['front','back'] as const) for (const pose of ['a','b'] as const){
      const p=getPlayerVerticalRuntimeModel(facing,pose),frame=sheet.frames[p.index],target=sheet.oldIdle[facing].headWorld;
      expect((frame.headAnchor.x-frame.sourceBBox.width/2)*p.scale+p.offsetX).toBeCloseTo(target.x,8);
      expect((frame.headAnchor.y-frame.sourceBBox.height)*p.scale+p.offsetY).toBeCloseTo(target.y,8);
    }
  });
});
