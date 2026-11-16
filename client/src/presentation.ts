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
  quality: 'auto', motion: true, shake: true, colorblind: false,
  music: 0.45, effects: 0.75, voice: 0,
};
export function normalizePreferences(value: unknown = {}): Preferences {
  const raw = (value !== null && typeof value === 'object' ? value : {}) as Partial<Preferences>;
  const p = { ...DEFAULT_PREFERENCES };
  if (['auto', 'low', 'medium', 'high'].includes(raw.quality ?? '')) p.quality = raw.quality!;
  for (const key of ['motion', 'shake', 'colorblind'] as const)
    if (typeof raw[key] === 'boolean') p[key] = raw[key];
  for (const key of ['music', 'effects', 'voice'] as const)
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) p[key] = Math.max(0, Math.min(1, raw[key]!));
  return p;
}
export const QUALITY_BUDGETS = {
  low: { particles: 80, perFrame: 8, detail: 0.45 },
  medium: { particles: 160, perFrame: 16, detail: 0.7 },
  high: { particles: 280, perFrame: 24, detail: 1 },
};
export function friendly(localId: string, ownerId: string, teamMode: boolean, localTeam?: number, ownerTeam?: number): boolean {
  return localId === ownerId || (teamMode && localTeam !== undefined && ownerTeam !== undefined && localTeam === ownerTeam);
}
export const SIDE = { ally: 0x66b3ff, enemy: 0xff657a };

class Presentation {
  prefs: Preferences = { ...DEFAULT_PREFERENCES };
  detected: 'low' | 'medium' | 'high' = 'medium';
  private elapsed = 0;
  private frames = 0;
  constructor() {
    this.reload();
  }
  reload(): void {
    let raw: Partial<Preferences> | null = null;
    try {
      raw = JSON.parse(localStorage.getItem('orb.presentation1') || '{}');
    } catch { /* Private mode and old/broken preferences use defaults. */ }
    this.prefs = normalizePreferences(raw);
    if (typeof raw?.motion !== 'boolean' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.prefs.motion = false;
      this.prefs.shake = false;
    }
  }
  get budget() { return QUALITY_BUDGETS[this.prefs.quality === 'auto' ? this.detected : this.prefs.quality]; }
  update(next: Partial<Preferences>): void {
    this.prefs = normalizePreferences({ ...this.prefs, ...next });
    try { localStorage.setItem('orb.presentation1', JSON.stringify(this.prefs)); } catch { /* storage optional */ }
    this.apply();
    window.dispatchEvent(new Event('orb:preferences'));
  }
  apply(): void {
    document.documentElement.dataset.motion = this.prefs.motion ? 'on' : 'off';
    document.documentElement.dataset.colorblind = String(this.prefs.colorblind);
    document.documentElement.dataset.quality = this.prefs.quality === 'auto' ? this.detected : this.prefs.quality;
  }
  sample(ms: number): void {
    if (document.hidden || ms > 300) return;
    this.elapsed += ms;
    this.frames++;
    if (this.elapsed < 4000) return;
    const fps = this.frames * 1000 / this.elapsed;
    this.detected = fps < 38 ? 'low' : fps < 55 ? 'medium' : 'high';
    this.frames = this.elapsed = 0;
    this.apply();
  }
}
export const presentation = new Presentation();

/** Fixed reusable slots: burst emission can never allocate an unbounded array. */
export class ParticlePool {
  readonly slots = Array.from({ length: 280 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: 0, size: 0 }));
  private emitted = 0;
  beginFrame(): void { this.emitted = 0; }
  emit(x: number, y: number, color: number, count: number): void {
    const budget = presentation.budget;
    let remaining = Math.min(count, budget.perFrame - this.emitted);
    for (let i = 0; i < budget.particles && remaining > 0; i++) {
      const p = this.slots[i];
      if (p.life > 0) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 190;
      Object.assign(p, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color,
        life: 0.45, max: 0.45, size: 1.5 + Math.random() * 2.5 });
      this.emitted++;
      remaining--;
    }
  }
}
