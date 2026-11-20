import { describe, it, expect } from 'vitest';
import { GAME_SAVE_KEYS, CHECKPOINT_KEY, startFreshGame, hasGameSave, type GameStorage } from '../src/game/save-session';
import { fourthActDraft } from '../src/game/act-four';
import { worldInteractions } from '../src/game/world-data';

function storageWith(values: Record<string, string>) {
  const map = new Map(Object.entries(values));
  const storage: GameStorage = { getItem: key => map.get(key) ?? null, setItem: (key,value) => { map.set(key,value); }, removeItem: key => { map.delete(key); } };
  return { map, storage };
}

describe('new game and explicit resume', () => {
  it('starts fresh without any old chapter, pet, fruit or cooldown and preserves the previous slot', () => {
    const previous = Object.fromEntries(GAME_SAVE_KEYS.map(key => [key, key === 'under-shadow-current-chapter' ? '3' : 'saved-state']));
    const { storage, map } = storageWith({ ...previous, 'under-shadow-music': 'off', 'unrelated-app': 'keep' });
    expect(hasGameSave(storage)).toBe(true);
    startFreshGame(storage);
    expect(hasGameSave(storage)).toBe(false);
    for (const key of GAME_SAVE_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(JSON.parse(storage.getItem('under-shadow-previous-save-v1')!)).toEqual(previous);
    expect(map.get('under-shadow-music')).toBe('off');
    expect(map.get('unrelated-app')).toBe('keep');
  });
  it('does not erase a prior backup when starting a second empty game', () => {
    const { storage } = storageWith({ [CHECKPOINT_KEY]: JSON.stringify({ area: 'oldTown', position: { x: 1500, y: 630 } }) });
    startFreshGame(storage);
    const backup = storage.getItem('under-shadow-previous-save-v1');
    startFreshGame(storage);
    expect(storage.getItem('under-shadow-previous-save-v1')).toBe(backup);
  });
  it('does not replace the current slot if backing up fails', () => {
    const { storage } = storageWith({ 'under-shadow-current-chapter': '2' });
    storage.setItem = () => { throw new Error('quota'); };
    expect(() => startFreshGame(storage)).toThrow('quota');
    expect(storage.getItem('under-shadow-current-chapter')).toBe('2');
  });
});

describe('fourth-act preparation', () => {
  it('targets only existing NPCs in their existing districts', () => {
    expect(fourthActDraft.status).toBe('prepared');
    expect(fourthActDraft.route).toHaveLength(5);
    for (const step of fourthActDraft.route) {
      expect(worldInteractions.find(npc => npc.id === step.npcId)?.region).toBe(step.region);
    }
  });
});
