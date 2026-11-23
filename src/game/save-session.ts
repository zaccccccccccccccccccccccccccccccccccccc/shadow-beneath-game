export interface GameStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CHECKPOINT_KEY = 'under-shadow-world-checkpoint-v1';
export const GAME_SAVE_KEYS = [
  CHECKPOINT_KEY,
  'under-shadow-current-chapter',
  'under-shadow-act-two-v1',
  'under-shadow-act-three-v1',
  'under-shadow-late-acts-v1',
  'under-shadow-xiezhi-chapter1-claimed-v2',
  'under-shadow-xiezhi-v3',
  'under-shadow-species-fruits-v1',
  'under-shadow-fruit-layout-seed-v1',
  'under-shadow-quiz-retry-at-v1',
] as const;

export function hasGameSave(storage: GameStorage): boolean {
  return GAME_SAVE_KEYS.some(key => storage.getItem(key) !== null);
}

/** Keep the previous slot recoverable; preferences and other apps' data are untouched. */
export function startFreshGame(storage: GameStorage): void {
  const previous: Record<string, string> = {};
  for (const key of GAME_SAVE_KEYS) {
    const value = storage.getItem(key);
    if (value !== null) previous[key] = value;
  }
  if (Object.keys(previous).length) storage.setItem('under-shadow-previous-save-v1', JSON.stringify(previous));
  // Saving the backup must succeed before replacing the current slot.
  for (const key of GAME_SAVE_KEYS) storage.removeItem(key);
}
