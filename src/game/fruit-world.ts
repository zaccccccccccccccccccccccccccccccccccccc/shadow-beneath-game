import { spirits, type SpiritId } from './spirits';
import { districtMaps, worldInteractions, DISTRICT_WIDTH, DISTRICT_HEIGHT, type RegionId } from './world-data';
import { canOccupyWorldPosition, findWorldPath } from './world-geometry';

export const MAX_WORLD_FRUITS = 36;
export const QUIZ_COOLDOWN_MS = 30_000;
export const fruitDescriptions: Record<SpiritId, string> = {
  xiezhi: '金色果皮帶着細緻的稜線，兩側紋路對稱，靠近燈火時映出清亮光點。',
  baize: '乳白薄霜覆在藍紫色莓果上，葉脈像細小的書頁，散出清淡的草木香。',
  pixiu: '翡翠色梨身繞着一道金紋，果柄微微捲曲，拿近時能聞到清甜香氣。',
  qilin: '淡粉蓮瓣托住溫潤果實，表面有柔和的暖光，葉尖掛着一滴露水。',
  xuanwu: '褐綠色豆莢有層層甲紋，外殼結實，輕晃時能聽見豆粒相碰。',
  qinglong: '青金色柑皮有雲狀紋路，葉片舒展，剝開一角便透出明亮果香。',
};
export interface WorldFruit {
  id: string; spiritId: SpiritId; act: number; questionIndex: number;
  region: RegionId; x: number; y: number;
}

/** Every save owns a seeded layout: chapter changes reveal entries, never replace them. */
export function createWorldFruitLayout(seed: number): WorldFruit[] {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const regions: RegionId[] = ['hq', 'oldTown', 'campus', 'harbor', 'hill', 'hq'];
  const result: WorldFruit[] = [];
  for (const spirit of spirits) for (let index = 0; index < 6; index++) {
    const region = regions[index];
    const map = districtMaps[region];
    let found = false;
    for (let attempt = 0; attempt < 2500; attempt++) {
      const x = 90 + Math.floor(random() * (DISTRICT_WIDTH - 180));
      const y = 150 + Math.floor(random() * (DISTRICT_HEIGHT - 300));
      if (!canOccupyWorldPosition(x, y, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT)) continue;
      if (worldInteractions.some(p => p.region === region && Math.hypot(p.x-x,p.y-y) < 135)) continue;
      if (map.portals.some(p => Math.hypot(p.x+p.width/2-x,p.y+p.height/2-y) < 155)) continue;
      if (result.some(p => p.region === region && Math.hypot(p.x-x,p.y-y) < 105)) continue;
      if (!findWorldPath(map.spawn, {x,y}, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT)) continue;
      result.push({ id: `${spirit.id}:fruit-${index}`, spiritId: spirit.id, act: spirit.unlockAct, questionIndex: index, region, x, y });
      found = true; break;
    }
    if (!found) throw new Error(`No reachable fruit position for ${spirit.id}/${index}`);
  }
  return result;
}

export function cooldownSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function questionDifficulty(collected: number): '基礎辨識' | '情境核對' | '綜合判斷' {
  return collected < 2 ? '基礎辨識' : collected < 4 ? '情境核對' : '綜合判斷';
}
