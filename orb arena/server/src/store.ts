import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { RANKED_START } from '@orb/shared';

/** A registered player. The secret token never leaves the client; we only keep its hash as the id. */
export interface PlayerRec {
  id: string;
  name: string;
  /** 1v1 ranked rating. */
  rating: number;
  best: number;
  wins: number;
  games: number;
  /** 2v2 ranked rating and record. */
  rating2?: number;
  wins2?: number;
  games2?: number;
  /** Highest player level seen (counts toward the world score). */
  level?: number;
  /** Class id (warrior, mage...). */
  cls?: string;
  /** Days in a world-rank bracket (top 10, 50, 100, 250, 500, 1000). */
  streak?: { bracket: number; days: number; day: string };
  /** Earned and not yet claimed rewards for holding a rank for 30 days. */
  pending?: Array<{ bracket: number; rank: string }>;
  /** Best bracket ever held for 30 days (shown in the profile). */
  title?: number;
  guild: string;
  created: number;
  seen: number;
}
export interface GuildRec {
  id: string;
  name: string;
  tag: string;
  owner: string;
  members: string[];
  created: number;
  xp?: number;
  wars?: number;
  /** Today's raid boss. */
  raid?: { day: string; hp: number; max: number; hits: Record<string, number>; claimed: string[] };
}
export interface Db {
  players: Record<string, PlayerRec>;
  /** Lower-case name -> player id. */
  names: Record<string, string>;
  guilds: Record<string, GuildRec>;
  /** Last day the world-rank streaks were counted. */
  lastDay?: string;
}
const empty = (): Db => ({ players: {}, names: {}, guilds: {} });
export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/** World-rank brackets and the skill rank paid for holding one for 30 days. */
export const HOLD_BRACKETS: Array<{ top: number; rank: string }> = [
  { top: 10, rank: 'U' },
  { top: 50, rank: 'S' },
  { top: 100, rank: 'A' },
  { top: 250, rank: 'B' },
  { top: 500, rank: 'C' },
  { top: 1000, rank: 'D' },
];
export const HOLD_DAYS = 30;
/** World score: both ranked ratings plus player level. */
export function worldScore(p: PlayerRec): number {
  return p.rating + (p.rating2 ?? 1000) + (p.level ?? 1);
}

interface Backend {
  load(): Promise<Db | null>;
  save(db: Db): Promise<void>;
}
class MemoryBackend implements Backend {
  async load(): Promise<Db | null> {
    return null;
  }
  async save(): Promise<void> {}
}
class FileBackend implements Backend {
  constructor(private path: string) {}
  async load(): Promise<Db | null> {
    try {
      return JSON.parse(readFileSync(this.path, 'utf8')) as Db;
    } catch {
      return null;
    }
  }
  async save(db: Db): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(db));
    renameSync(tmp, this.path);
  }
}
/** Postgres (e.g. a free Render or Neon database): one row with the whole document. Fine for a beta. */
class PgBackend implements Backend {
  private pool: import('pg').Pool | null = null;
  constructor(private url: string) {}
  private async db(): Promise<import('pg').Pool> {
    if (!this.pool) {
      const pg = await import('pg');
      this.pool = new pg.default.Pool({ connectionString: this.url, ssl: this.url.includes('localhost') ? false : { rejectUnauthorized: false }, max: 3 });
      await this.pool.query('create table if not exists orb_kv (k text primary key, v jsonb not null)');
    }
    return this.pool;
  }
  async load(): Promise<Db | null> {
    const r = await (await this.db()).query('select v from orb_kv where k = $1', ['db']);
    return (r.rows[0]?.v as Db | undefined) ?? null;
  }
  async save(db: Db): Promise<void> {
    await (await this.db()).query('insert into orb_kv (k, v) values ($1, $2) on conflict (k) do update set v = excluded.v', ['db', JSON.stringify(db)]);
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(`orb:${token}`).digest('hex').slice(0, 24);
}
export function validToken(t: unknown): t is string {
  return typeof t === 'string' && /^[A-Za-z0-9]{20,64}$/.test(t);
}

/** In-memory database with write-behind persistence. */
export class Store {
  db: Db = empty();
  private timer: NodeJS.Timeout | null = null;
  private ready: Promise<void>;
  constructor(private backend: Backend) {
    this.ready = backend
      .load()
      .then((d) => {
        if (d && d.players && d.names && d.guilds) this.db = d;
      })
      .catch((e) => console.warn('[store] load failed', e instanceof Error ? e.message : e));
  }
  static auto(): Store {
    if (process.env.VITEST) return new Store(new MemoryBackend());
    if (process.env.DATABASE_URL) return new Store(new PgBackend(process.env.DATABASE_URL));
    return new Store(new FileBackend(process.env.DATA_FILE ?? './data/orb-db.json'));
  }
  whenReady(): Promise<void> {
    return this.ready;
  }
  changed(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.backend.save(this.db).catch((e) => console.warn('[store] save failed', e instanceof Error ? e.message : e));
    }, 2000);
    this.timer.unref?.();
  }
  byToken(token: string): PlayerRec | undefined {
    return this.db.players[hashToken(token)];
  }
  idOfName(name: string): string | undefined {
    return this.db.names[name.toLowerCase()];
  }
  /** Creates or renames a player. Returns null when the name belongs to someone else. */
  register(token: string, name: string): PlayerRec | null {
    const id = hashToken(token);
    const owner = this.idOfName(name);
    if (owner && owner !== id) return null;
    const now = Date.now();
    let p = this.db.players[id];
    if (!p) {
      p = { id, name, rating: RANKED_START, best: RANKED_START, wins: 0, games: 0, guild: '', created: now, seen: now };
      this.db.players[id] = p;
    } else if (p.name.toLowerCase() !== name.toLowerCase()) delete this.db.names[p.name.toLowerCase()];
    p.name = name;
    p.seen = now;
    this.db.names[name.toLowerCase()] = id;
    this.changed();
    return p;
  }
  private rated(p: PlayerRec): boolean {
    return p.games > 0 || (p.games2 ?? 0) > 0;
  }
  /** World rank (1 = best) by world score. */
  rankOf(id: string): number {
    const me = this.db.players[id];
    if (!me) return 0;
    const mine = worldScore(me);
    let n = 1;
    for (const p of Object.values(this.db.players)) if (this.rated(p) && worldScore(p) > mine) n++;
    return n;
  }
  /** Leaderboard for a mode: '1v1', '2v2' or 'world'. */
  top(limit: number, mode: '1v1' | '2v2' | 'world' = 'world'): PlayerRec[] {
    const key = (p: PlayerRec) => (mode === '1v1' ? p.rating : mode === '2v2' ? (p.rating2 ?? 1000) : worldScore(p));
    return Object.values(this.db.players)
      .filter((p) => (mode === '1v1' ? p.games > 0 : mode === '2v2' ? (p.games2 ?? 0) > 0 : this.rated(p)))
      .sort((a, b) => key(b) - key(a) || a.created - b.created)
      .slice(0, limit);
  }
  /** Once a day: count how long each player has held a world-rank bracket; 30 days pays a reward. */
  dailyTick(now = Date.now()): void {
    const today = dayKey(now);
    if (this.db.lastDay === today) return;
    const yesterday = dayKey(now - 86_400_000);
    this.db.lastDay = today;
    const ranked = this.top(1000, 'world');
    ranked.forEach((p, i) => {
      const b = HOLD_BRACKETS.find((x) => i + 1 <= x.top);
      if (!b) return;
      const s = p.streak;
      const keep = s && s.day === yesterday;
      // Keep counting while you stay inside the bracket you started in (or a better one).
      p.streak = keep && b.top <= s!.bracket ? { bracket: s!.bracket, days: s!.days + 1, day: today } : { bracket: b.top, days: 1, day: today };
      if (p.streak.days >= HOLD_DAYS) {
        const reward = HOLD_BRACKETS.find((x) => x.top === p.streak!.bracket)!;
        (p.pending ??= []).push({ bracket: reward.top, rank: reward.rank });
        p.title = Math.min(p.title ?? 99999, reward.top);
        p.streak = { bracket: b.top, days: 0, day: today };
      }
    });
    this.changed();
  }
}
