export type Quality = 'auto' | 'low' | 'medium' | 'high';
export interface Preferences {
  quality: Quality;
  motion: boolean;
  shake: boolean;
  colorblind: boolean;
  music: number;
  effects: number;
  voice: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  quality: 'auto',
  motion: true,
  shake: true,
  colorblind: false,
  music: 0.45,
  effects: 0.75,
  voice: 0,
};

export const QUALITY_BUDGETS = {
  low: { particles: 80, perBurst: 8, detail: 0.45 },
  medium: { particles: 160, perBurst: 16, detail: 0.72 },
  high: { particles: 280, perBurst: 28, detail: 1 },
};

export function normalizePreferences(value: unknown = {}): Preferences {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Preferences>;
  const result = { ...DEFAULT_PREFERENCES };
  if (raw.quality && ['auto', 'low', 'medium', 'high'].includes(raw.quality)) result.quality = raw.quality;
  for (const key of ['motion', 'shake', 'colorblind'] as const)
    if (typeof raw[key] === 'boolean') result[key] = raw[key];
  for (const key of ['music', 'effects', 'voice'] as const)
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key]))
      result[key] = Math.max(0, Math.min(1, raw[key]));
  return result;
}

class Presentation {
  prefs = { ...DEFAULT_PREFERENCES };
  detected: 'low' | 'medium' | 'high' = 'medium';
  private elapsed = 0;
  private frames = 0;

  constructor() {
    this.reload();
  }

  reload(): void {
    let raw: Partial<Preferences> = {};
    try {
      raw = JSON.parse(localStorage.getItem('orb.presentation1') || '{}');
    } catch {
      // Broken or blocked storage falls back safely.
    }
    this.prefs = normalizePreferences(raw);
    if (
      typeof raw.motion !== 'boolean' &&
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.prefs.motion = false;
      this.prefs.shake = false;
    }
    this.apply();
  }

  get budget() {
    return QUALITY_BUDGETS[this.prefs.quality === 'auto' ? this.detected : this.prefs.quality];
  }

  update(next: Partial<Preferences>): void {
    this.prefs = normalizePreferences({ ...this.prefs, ...next });
    try {
      localStorage.setItem('orb.presentation1', JSON.stringify(this.prefs));
    } catch {
      // Preferences remain active for this session when storage is unavailable.
    }
    this.apply();
    window.dispatchEvent(new Event('orb:preferences'));
  }

  apply(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.motion = this.prefs.motion ? 'on' : 'off';
    document.documentElement.dataset.colorblind = String(this.prefs.colorblind);
    document.documentElement.dataset.quality =
      this.prefs.quality === 'auto' ? this.detected : this.prefs.quality;
  }

  sample(ms: number): void {
    if (document.hidden || ms > 300) return;
    this.elapsed += ms;
    this.frames++;
    if (this.elapsed < 4000) return;
    const fps = (this.frames * 1000) / this.elapsed;
    this.detected = fps < 38 ? 'low' : fps < 55 ? 'medium' : 'high';
    this.elapsed = 0;
    this.frames = 0;
    this.apply();
  }
}

export const presentation = new Presentation();
export const SIDE = { ally: 0x66b3ff, enemy: 0xff657a };
