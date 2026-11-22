// Save manager (own code, adapted from the Talewild engine): versioned schema with migrations, 3 profiles,
// atomic writes with one backup, checksums, export/import codes.

import type { KV } from '../core/storage';

export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

export class SaveError extends Error {}

export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Schema<T> {
  version: number;
  migrations: Record<number, (d: Record<string, unknown>) => Record<string, unknown>>;
  validate: (d: unknown) => T;
}

export function migrate<T>(schema: Schema<T>, raw: unknown): T {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('not an object');
  let d = raw as Record<string, unknown>;
  let v = typeof d.version === 'number' ? d.version : 0;
  if (v > schema.version) throw new SaveError(`save is from a newer version (${v})`);
  while (v < schema.version) {
    const step = schema.migrations[v];
    if (!step) throw new SaveError(`no migration from version ${v}`);
    d = step(d);
    v = Number(d.version);
  }
  return schema.validate(d);
}

export class SaveManager<T> {
  constructor(
    private kv: KV,
    private schema: Schema<T>,
    private prefix = 'ek',
  ) {}

  private key(slot: Slot): string {
    return `${this.prefix}.profile${slot}`;
  }

  /** 1. write .tmp, 2. copy current to .bak, 3. write main, 4. drop .tmp. A failed write keeps the old save. */
  write(slot: Slot, data: T): void {
    const body = JSON.stringify(this.schema.validate(data));
    const text = JSON.stringify({ sum: hash32(body), body });
    const main = this.key(slot);
    this.kv.setItem(`${main}.tmp`, text);
    const cur = this.kv.getItem(main);
    if (cur !== null) this.kv.setItem(`${main}.bak`, cur);
    this.kv.setItem(main, text);
    this.kv.removeItem(`${main}.tmp`);
  }

  read(slot: Slot): { data: T; fromBackup: boolean } | null {
    const main = this.key(slot);
    for (const [k, fromBackup] of [
      [main, false],
      [`${main}.bak`, true],
    ] as const) {
      const text = this.kv.getItem(k);
      if (text === null) continue;
      try {
        const env = JSON.parse(text) as { sum: number; body: string };
        if (typeof env.body !== 'string' || hash32(env.body) !== env.sum) throw new SaveError('checksum');
        return { data: migrate(this.schema, JSON.parse(env.body)), fromBackup };
      } catch (e) {
        console.warn(`profile ${k} unreadable:`, (e as Error).message);
      }
    }
    return null;
  }

  remove(slot: Slot): void {
    for (const s of ['', '.bak', '.tmp']) this.kv.removeItem(`${this.key(slot)}${s}`);
  }

  exportCode(data: T): string {
    const json = JSON.stringify(this.schema.validate(data));
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `EK1.${b64}.${hash32(json).toString(36)}`;
  }

  importCode(code: string): T {
    const parts = code.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'EK1') throw new SaveError('This is not an Elementick save code.');
    let json: string;
    try {
      const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parts[1]!.length % 4)) % 4);
      json = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    } catch {
      throw new SaveError('The code is damaged.');
    }
    if (hash32(json).toString(36) !== parts[2]) throw new SaveError('The code is damaged.');
    return migrate(this.schema, JSON.parse(json));
  }
}
