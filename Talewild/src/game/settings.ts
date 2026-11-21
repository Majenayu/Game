// Player settings, stored apart from story saves so they survive starting a new story.

import { DEFAULT_KEYS, type KeyBindings } from '../core/input';
import type { KV } from '../core/storage';

export interface Settings {
  textSize: 'normal' | 'large';
  runToggle: boolean;
  textSpeed: 'slow' | 'normal' | 'fast';
  reducedMotion: boolean;
  keys: KeyBindings;
}

export const DEFAULT_SETTINGS: Settings = {
  textSize: 'normal',
  runToggle: false,
  textSpeed: 'normal',
  reducedMotion: false,
  keys: DEFAULT_KEYS,
};

export const TEXT_SPEED_CPS: Record<Settings['textSpeed'], number> = { slow: 28, normal: 55, fast: 120 };

const KEY = 'tw.settings';

export function loadSettings(kv: KV): Settings {
  try {
    const raw = kv.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const s = JSON.parse(raw) as Partial<Settings>;
    return { ...structuredClone(DEFAULT_SETTINGS), ...s, keys: { ...DEFAULT_KEYS, ...(s.keys ?? {}) } };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(kv: KV, s: Settings): void {
  try {
    kv.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('settings not saved:', (e as Error).message);
  }
}

export function applySettingsToDocument(s: Settings): void {
  document.documentElement.dataset.textSize = s.textSize;
  document.documentElement.dataset.motion = s.reducedMotion ? 'reduced' : 'full';
}
