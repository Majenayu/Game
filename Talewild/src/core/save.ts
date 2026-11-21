// Save system: versioned schema with migrations, 3 slots, atomic writes with one backup, export/import codes.
// Pure TypeScript (no Phaser), so it is unit-tested in Node.

import type { Dir } from './input';
import type { KV } from './storage';
import { hash32 } from './rng';

export const SAVE_VERSION = 1;
export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

export interface Look {
  skin: number;
  hair: number;
  hairStyle: number;
  outfit: number;
}

export interface SaveData {
  version: number;
  savedAt: number;
  playMs: number;
  player: { name: string; look: Look; map: string; x: number; y: number; facing: Dir };
  flags: Record<string, boolean>;
  vars: Record<string, number>;
  bag: Record<string, number>;
}

export interface SlotSummary {
  slot: Slot;
  name: string;
  map: string;
  savedAt: number;
  playMs: number;
  fromBackup: boolean;
}

/**
 * Migrations from version N to N+1. Version 0 is the prototype format used before saves were versioned:
 * { name, map, pos: [x, y], flags }.
 */
export const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  0: (d) => {
    const pos = (d.pos as [number, number] | undefined) ?? [0, 0];
    return {
      version: 1,
      savedAt: Number(d.savedAt ?? 0),
      playMs: 0,
      player: {
        name: String(d.name ?? 'Scribe'),
        look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
        map: String(d.map ?? 'study'),
        x: pos[0],
        y: pos[1],
        facing: 'down',
      },
      flags: (d.flags as Record<string, boolean>) ?? {},
      vars: {},
      bag: {},
    };
  },
};

export class SaveError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const DIR_SET = new Set(['up', 'down', 'left', 'right']);

/** Throws SaveError when the data does not match the current schema. */
export function validate(d: unknown): SaveData {
  if (!isObj(d)) throw new SaveError('save is not an object');
  if (d.version !== SAVE_VERSION) throw new SaveError(`unexpected version ${String(d.version)}`);
  const p = d.player;
  if (!isObj(p)) throw new SaveError('missing player');
  if (typeof p.name !== 'string' || typeof p.map !== 'string') throw new SaveError('bad player name or map');
  if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) throw new SaveError('bad player position');
  if (!DIR_SET.has(String(p.facing))) throw new SaveError('bad facing');
  if (!isObj(p.look)) throw new SaveError('bad look');
  for (const k of ['flags', 'vars', 'bag'] as const) if (!isObj(d[k])) throw new SaveError(`bad ${k}`);
  if (typeof d.savedAt !== 'number' || typeof d.playMs !== 'number') throw new SaveError('bad times');
  return d as unknown as SaveData;
}

export function migrate(raw: unknown): SaveData {
  if (!isObj(raw)) throw new SaveError('save is not an object');
  let d = raw;
  let v = typeof d.version === 'number' ? d.version : 0;
  if (v > SAVE_VERSION) throw new SaveError(`save is from a newer version (${v})`);
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError(`no migration from version ${v}`);
    d = step(d);
    v = Number(d.version);
  }
  return validate(d);
}

interface Envelope {
  sum: number;
  body: string;
}

function wrap(data: SaveData): string {
  const body = JSON.stringify(data);
  return JSON.stringify({ sum: hash32(body), body } satisfies Envelope);
}

function unwrap(text: string): SaveData {
  let env: unknown;
  try {
    env = JSON.parse(text);
  } catch {
    throw new SaveError('save is not valid JSON');
  }
  if (!isObj(env) || typeof env.body !== 'string' || typeof env.sum !== 'number') throw new SaveError('bad envelope');
  if (hash32(env.body) !== env.sum) throw new SaveError('checksum mismatch');
  return migrate(JSON.parse(env.body));
}

export class SaveManager {
  constructor(
    private kv: KV,
    private prefix = 'tw',
  ) {}

  private key(slot: Slot): string {
    return `${this.prefix}.slot${slot}`;
  }

  /**
   * Writes a slot without ever leaving it half-written:
   * 1. write the new save to `.tmp`, 2. move the current save to `.bak`, 3. write the main key, 4. drop `.tmp`.
   * If step 3 fails, the previous save is still in `.bak` and is used on load.
   */
  write(slot: Slot, data: SaveData): void {
    const text = wrap(validate(data));
    const main = this.key(slot);
    this.kv.setItem(`${main}.tmp`, text);
    const current = this.kv.getItem(main);
    if (current !== null) this.kv.setItem(`${main}.bak`, current);
    this.kv.setItem(main, text);
    this.kv.removeItem(`${main}.tmp`);
  }

  /** Loads a slot, falling back to the backup if the main copy is missing or damaged. */
  read(slot: Slot): { data: SaveData; fromBackup: boolean } | null {
    const main = this.key(slot);
    for (const [k, fromBackup] of [
      [main, false],
      [`${main}.bak`, true],
    ] as const) {
      const text = this.kv.getItem(k);
      if (text === null) continue;
      try {
        return { data: unwrap(text), fromBackup };
      } catch (e) {
        console.warn(`save ${k} could not be read:`, (e as Error).message);
      }
    }
    return null;
  }

  list(): (SlotSummary | null)[] {
    return SLOTS.map((slot) => {
      const r = this.read(slot);
      if (!r) return null;
      const p = r.data.player;
      return { slot, name: p.name, map: p.map, savedAt: r.data.savedAt, playMs: r.data.playMs, fromBackup: r.fromBackup };
    });
  }

  /** The most recently saved slot, for "Continue". */
  latest(): SlotSummary | null {
    return this.list().reduce<SlotSummary | null>((best, s) => (s && (!best || s.savedAt > best.savedAt) ? s : best), null);
  }

  remove(slot: Slot): void {
    const main = this.key(slot);
    for (const k of [main, `${main}.bak`, `${main}.tmp`]) this.kv.removeItem(k);
  }
}

// ---- export / import codes ----------------------------------------------------------------------------------

const CODE_PREFIX = 'TW1';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** A copyable backup code: "TW1.<base64url JSON>.<checksum>". */
export function exportCode(data: SaveData): string {
  const json = JSON.stringify(validate(data));
  return `${CODE_PREFIX}.${toBase64Url(json)}.${hash32(json).toString(36)}`;
}

export function importCode(code: string): SaveData {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) throw new SaveError('this is not a Talewild save code');
  let json: string;
  try {
    json = fromBase64Url(parts[1]!);
  } catch {
    throw new SaveError('the code is damaged');
  }
  if (hash32(json).toString(36) !== parts[2]) throw new SaveError('the code is damaged');
  return migrate(JSON.parse(json));
}
