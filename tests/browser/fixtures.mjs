export const SAVE = Object.freeze({
  checkpoint: 'under-shadow-world-checkpoint-v1',
  chapter: 'under-shadow-current-chapter',
  claimed: 'under-shadow-xiezhi-chapter1-claimed-v2',
  legacyPet: 'under-shadow-xiezhi-v3',
  species: 'under-shadow-species-fruits-v1',
  cooldown: 'under-shadow-quiz-retry-at-v1',
});

export function freshFixture() {
  return {
    'under-the-shadow-locale': 'zh-Hant',
    'under-the-shadow-player-name': '瀏覽器見習生',
    'under-shadow-fruit-layout-seed-v1': '20261123',
  };
}

export function resumeFixture() {
  const pet = { claimedSnackIds: [], snacks: 2, fed: 2 };
  const empty = () => ({ claimedSnackIds: [], snacks: 0, fed: 0 });
  return {
    ...freshFixture(),
    [SAVE.chapter]: '2',
    [SAVE.claimed]: 'true',
    [SAVE.checkpoint]: JSON.stringify({
      area: 'hq', position: { x: 1190, y: 1120 },
      tutorial: { moved: true, mentor: true, supervisor: true, file: true, notebook: true, map: true, helpUsed: true, oldTown: true, informant: true },
      clues: [], visited: [], visitedAreas: ['hq', 'oldTown'], helpUses: 1,
    }),
    'under-shadow-act-two-v1': JSON.stringify({ completed: [], lampOil: 100, rewardClaimed: false }),
    [SAVE.legacyPet]: JSON.stringify(pet),
    [SAVE.species]: JSON.stringify({ xiezhi: pet, baize: empty(), pixiu: empty(), qilin: empty(), xuanwu: empty(), qinglong: empty() }),
  };
}

export function cooldownFixture(now = Date.now()) {
  return { ...resumeFixture(), [SAVE.cooldown]: String(now + 30000) };
}
