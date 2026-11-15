import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { RANKED_START } from '@orb/shared';

/** A registered player. The secret token never leaves the client; we only keep its hash as the id. */
export interface PlayerRec {
  id: string;
  name: string;
  rating: number;
  best: number;
  wins: number;
  games: number;
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
}
export interface Db {
  players: Record<string, PlayerRec>;
  /** Lower-case name -> player id. */
  names: Record<string, string>;
  guilds: Record<string, GuildRec>;
}
const empty = (): Db => ({ players: {}, names: {}, guilds: {} });

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
  /** World rank (1 = best) of a player. */
  rankOf(id: string): number {
    const me = this.db.players[id];
    if (!me) return 0;
    let n = 1;
    for (const p of Object.values(this.db.players)) if (p.rating > me.rating) n++;
    return n;
  }
  top(limit: number): PlayerRec[] {
    return Object.values(this.db.players)
      .filter((p) => p.games > 0)
      .sort((a, b) => b.rating - a.rating || b.wins - a.wins || a.created - b.created)
      .slice(0, limit);
  }
}
