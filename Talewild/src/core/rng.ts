// Seeded random numbers (mulberry32). Every random choice in rules and NPC behaviour uses this, so runs repeat.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Float in [0, 1). */
  float(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on an empty list');
    return items[Math.floor(this.float() * items.length)]!;
  }

  /** Current internal state, for saving and restoring a stream. */
  get state(): number {
    return this.s;
  }
}

/** Stable 32-bit hash of a string (FNV-1a). Used for seeds and save checksums. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
