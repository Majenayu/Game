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
  /** derived from the graphics quality (true on Low); older saves stored it directly */
  lowGraphics: boolean;
  /** graphics quality; 'auto' picks from the frame time of the first fight */
  quality: 'auto' | 'high' | 'medium' | 'low';
  /** what auto picked on this device (null until measured) */
  autoQuality: 'high' | 'medium' | 'low' | null;
  bloom: boolean;
  reflections: boolean;
  particles: boolean;
  scanlines: boolean;
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
  quality: 'auto',
  autoQuality: null,
  bloom: true,
  reflections: true,
  particles: true,
  scanlines: false,
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
      // saves from before the quality setting: Low graphics on means quality Low
      if (s.quality === undefined && s.lowGraphics) settings.quality = 'low';
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

/** The quality in use: the player's choice, or what auto measured (high on desktop, medium on touch until then). */
export function resolvedQuality(): 'high' | 'medium' | 'low' {
  if (settings.quality !== 'auto') return settings.quality;
  if (settings.autoQuality) return settings.autoQuality;
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}

export function applySettings(): void {
  settings.lowGraphics = resolvedQuality() === 'low';
  const d = document.documentElement.dataset;
  d.text = settings.largeText ? 'large' : 'normal';
  d.contrast = settings.highContrast ? 'high' : 'normal';
  d.motion = settings.reducedMotion ? 'reduced' : 'full';
  d.quality = resolvedQuality();
  d.scanlines = settings.scanlines ? 'on' : 'off';
}
