import { getLocale } from './localization';

const defaultName = () => getLocale() === 'zh-Hans' ? '见习生' : '見習生';
const STORAGE_KEY = 'under-the-shadow-player-name';

export function normalizePlayerName(value: string): string {
  const trimmed = value.trim();
  return (trimmed || defaultName()).slice(0, 12);
}

export function setPlayerName(value: string): string {
  const name = normalizePlayerName(value);
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, name);
  return name;
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return defaultName();
  return normalizePlayerName(window.localStorage.getItem(STORAGE_KEY) ?? defaultName());
}
