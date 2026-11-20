export type SpiritId = 'xiezhi' | 'baize' | 'pixiu' | 'qilin' | 'xuanwu' | 'qinglong';
export type SpiritGrowthId = 'young' | 'growing' | 'guardian';

export interface SpiritDefinition {
  id: SpiritId;
  unlockAct: number;
  name: { hans: string; hant: string };
  virtue: { hans: string; hant: string };
  fruit: { id: string; hans: string; hant: string };
  forms: Array<{ id: SpiritGrowthId; hans: string; hant: string }>;
}

export interface SpiritProgress {
  claimedFruitIds: string[];
  fruits: Record<SpiritId, number>;
  fed: Record<SpiritId, number>;
}

const ids: SpiritId[] = ['xiezhi', 'baize', 'pixiu', 'qilin', 'xuanwu', 'qinglong'];
const emptyCounter = (): Record<SpiritId, number> => ({ xiezhi: 0, baize: 0, pixiu: 0, qilin: 0, xuanwu: 0, qinglong: 0 });

const forms = (hans: [string, string, string], hant: [string, string, string]) => [
  { id: 'young' as const, hans: hans[0], hant: hant[0] },
  { id: 'growing' as const, hans: hans[1], hant: hant[1] },
  { id: 'guardian' as const, hans: hans[2], hant: hant[2] },
];

export const spirits: SpiritDefinition[] = [
  { id: 'xiezhi', unlockAct: 1, name: { hans: '獬豸', hant: '獬豸' }, virtue: { hans: '明辨曲直', hant: '明辨曲直' }, fruit: { id: 'clarity', hans: '明鉴果', hant: '明鑑果' }, forms: forms(['幼灵', '巡查灵', '守正灵'], ['幼靈', '巡查靈', '守正靈']) },
  { id: 'baize', unlockAct: 2, name: { hans: '白泽', hant: '白澤' }, virtue: { hans: '求证核实', hant: '求證核實' }, fruit: { id: 'testimony', hans: '证言莓', hant: '證言莓' }, forms: forms(['初识', '博闻', '鉴证'], ['初識', '博聞', '鑑證']) },
  { id: 'pixiu', unlockAct: 3, name: { hans: '貔貅', hant: '貔貅' }, virtue: { hans: '守住边界', hant: '守住邊界' }, fruit: { id: 'boundary', hans: '守界梨', hant: '守界梨' }, forms: forms(['纳福', '知止', '镇界'], ['納福', '知止', '鎮界']) },
  { id: 'qilin', unlockAct: 4, name: { hans: '麒麟', hant: '麒麟' }, virtue: { hans: '克制私欲', hant: '克制私欲' }, fruit: { id: 'calm', hans: '清心莲果', hant: '清心蓮果' }, forms: forms(['微光', '仁心', '瑞行'], ['微光', '仁心', '瑞行']) },
  { id: 'xuanwu', unlockAct: 5, name: { hans: '玄武', hant: '玄武' }, virtue: { hans: '守责到底', hant: '守責到底' }, fruit: { id: 'record', hans: '负卷豆', hant: '負卷豆' }, forms: forms(['守卷', '负甲', '定责'], ['守卷', '負甲', '定責']) },
  { id: 'qinglong', unlockAct: 6, name: { hans: '青龙', hant: '青龍' }, virtue: { hans: '公开透明', hant: '公開透明' }, fruit: { id: 'daylight', hans: '昭明柑', hant: '昭明柑' }, forms: forms(['初霁', '行云', '昭明'], ['初霽', '行雲', '昭明']) },
];

export function getSpirit(id: SpiritId): SpiritDefinition {
  return spirits.find((spirit) => spirit.id === id) ?? spirits[0];
}

export function getSpiritGrowthStage(fed: number): { id: SpiritGrowthId; index: number } {
  if (fed >= 6) return { id: 'guardian', index: 2 };
  if (fed >= 3) return { id: 'growing', index: 1 };
  return { id: 'young', index: 0 };
}

export function createSpiritProgress(): SpiritProgress {
  return { claimedFruitIds: [], fruits: emptyCounter(), fed: emptyCounter() };
}

export function migrateSpiritProgress(legacy: Partial<{ claimedSnackIds: string[]; snacks: number; fed: number }> | null): SpiritProgress {
  const progress = createSpiritProgress();
  if (!legacy) return progress;
  progress.claimedFruitIds = Array.isArray(legacy.claimedSnackIds) ? legacy.claimedSnackIds : [];
  progress.fruits.xiezhi = Math.max(0, Number(legacy.snacks) || 0);
  progress.fed.xiezhi = Math.max(0, Number(legacy.fed) || 0);
  return progress;
}

export function addSpiritFruit(progress: SpiritProgress, spirit: SpiritId, fruitId: string): SpiritProgress {
  if (progress.claimedFruitIds.includes(fruitId)) return progress;
  return { ...progress, claimedFruitIds: [...progress.claimedFruitIds, fruitId], fruits: { ...progress.fruits, [spirit]: progress.fruits[spirit] + 1 } };
}

export function feedSpirit(progress: SpiritProgress, spirit: SpiritId): SpiritProgress | null {
  if (progress.fruits[spirit] < 1) return null;
  return { ...progress, fruits: { ...progress.fruits, [spirit]: progress.fruits[spirit] - 1 }, fed: { ...progress.fed, [spirit]: progress.fed[spirit] + 1 } };
}

export function isSpiritUnlocked(spirit: SpiritId, completedAct: number): boolean {
  return getSpirit(spirit).unlockAct <= completedAct;
}
