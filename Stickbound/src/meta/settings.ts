// Player settings (separate from story profiles).

import { SOLO_KEYS, type Bindings } from '../core/input';
import type { KV } from '../core/storage';

export interface Settings {
  musicVol: number;
  sfxVol: number;
  shake: boolean;
  reducedMotion: boolean;
  reducedFlash: boolean;
  damageNumbers: boolean;
  oneHand: boolean;
  largeText: boolean;
  highContrast: boolean;
  /** fewer particles and glows, no camera tricks (weak devices) */
  lowGraphics: boolean;
  timerSec: number;
  keys: Bindings;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVol: 0.5,
  sfxVol: 0.7,
  shake: true,
  reducedMotion: false,
  reducedFlash: false,
  damageNumbers: true,
  oneHand: false,
  largeText: false,
  highContrast: false,
  lowGraphics: false,
  timerSec: 60,
  keys: SOLO_KEYS,
};

export const settings: Settings = structuredClone(DEFAULT_SETTINGS);
let store: KV | null = null;
const KEY = 'ek.settings';

export function loadSettings(kv: KV): void {
  store = kv;
  try {
    const raw = kv.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      Object.assign(settings, { ...structuredClone(DEFAULT_SETTINGS), ...s, keys: { ...SOLO_KEYS, ...(s.keys ?? {}) } });
    }
  } catch {
    /* keep defaults */
  }
  applySettings();
}

export function saveSettings(): void {
  try {
    store?.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage full or blocked */
  }
  applySettings();
}

export function applySettings(): void {
  const d = document.documentElement.dataset;
  d.text = settings.largeText ? 'large' : 'normal';
  d.contrast = settings.highContrast ? 'high' : 'normal';
  d.motion = settings.reducedMotion ? 'reduced' : 'full';
}
