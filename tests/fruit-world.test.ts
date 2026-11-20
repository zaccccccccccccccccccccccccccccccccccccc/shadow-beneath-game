import { describe, it, expect } from 'vitest';
import { createWorldFruitLayout, MAX_WORLD_FRUITS, QUIZ_COOLDOWN_MS, cooldownSeconds, questionDifficulty, fruitDescriptions } from '../src/game/fruit-world';
import { districtMaps, DISTRICT_WIDTH, DISTRICT_HEIGHT } from '../src/game/world-data';
import { canOccupyWorldPosition, findWorldPath } from '../src/game/world-geometry';

describe('persistent random fruit pool', () => {
  it('has exactly 36 non-overlapping, reachable fruit positions with six per species', () => {
    for (const seed of [1, 93745, 4294967295]) {
      const pool = createWorldFruitLayout(seed);
      expect(pool).toHaveLength(MAX_WORLD_FRUITS);
      expect(new Set(pool.map(fruit => fruit.id)).size).toBe(36);
      for (const id of Object.keys(fruitDescriptions)) expect(pool.filter(f => f.spiritId === id)).toHaveLength(6);
      for (const fruit of pool) {
        const map = districtMaps[fruit.region];
        expect(canOccupyWorldPosition(fruit.x, fruit.y, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT)).toBe(true);
        expect(findWorldPath(map.spawn, fruit, map.blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT)).not.toBeNull();
        expect(pool.filter(p => p.region === fruit.region && p.id !== fruit.id).every(p => Math.hypot(p.x-fruit.x,p.y-fruit.y) >= 105)).toBe(true);
      }
    }
  });
  it('keeps old fruits when a later chapter appears and restores positions from the same save seed', () => {
    const pool = createWorldFruitLayout(500);
    expect(pool).toEqual(createWorldFruitLayout(500));
    expect(pool).not.toEqual(createWorldFruitLayout(501));
    const chapter1 = pool.filter(f => f.act === 1);
    const chapter2 = pool.filter(f => f.act <= 2);
    expect(chapter2).toHaveLength(12);
    expect(chapter2.filter(f => f.act === 1)).toEqual(chapter1);
    expect(new Set(chapter2.map(f => `${f.region}:${f.x}:${f.y}`)).size).toBe(12);
  });
});

describe('quiz progression and cooldown', () => {
  it('blocks all questions for 30 seconds including across a serialized reload', () => {
    const now=100000;
    const deadline=JSON.parse(JSON.stringify(now+QUIZ_COOLDOWN_MS));
    expect(cooldownSeconds(deadline,now)).toBe(30);
    expect(cooldownSeconds(deadline,now+29999)).toBe(1);
    expect(cooldownSeconds(deadline,now+30000)).toBe(0);
    expect(cooldownSeconds(deadline,now+40000)).toBe(0);
  });
  it('requires basic then contextual then advanced questions for the final two fruits', () => {
    expect([0,1,2,3,4,5].map(questionDifficulty)).toEqual(['基礎辨識','基礎辨識','情境核對','情境核對','綜合判斷','綜合判斷']);
  });
});
