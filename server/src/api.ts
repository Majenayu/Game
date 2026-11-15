import express, { type Express, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { GUILD_MAX, containsProfanity, eloUpdate, guildBuff, guildLevel, rankedTier, validName, CLASSES } from '@orb/shared';
import { HOLD_BRACKETS, dayKey, type GuildRec, type PlayerRec, type Store, validToken, worldScore } from './store';

const MAX_GUILD = GUILD_MAX;
const RAID_HITS = 5;
const RAID_NAMES = ['Ancient Golem', 'Sky Leviathan', 'Inferno Titan', 'Void Colossus', 'Frost Wyrm', 'Storm Hydra', 'Shadow Kraken'];
const hits = new Map<string, { t: number; n: number }>();
/** 40 requests per 10 seconds per address. */
function limited(req: Request, res: Response): boolean {
  const ip = req.ip ?? 'x';
  const now = Date.now();
  const r = hits.get(ip) ?? { t: now, n: 0 };
  if (now - r.t > 10_000) {
    r.t = now;
    r.n = 0;
  }
  r.n++;
  hits.set(ip, r);
  if (r.n > (process.env.VITEST ? 1000 : 40)) {
    res.status(429).json({ ok: false, reason: 'Too many requests' });
    return true;
  }
  return false;
}
export function publicPlayer(store: Store, p: PlayerRec) {
  const g = p.guild ? store.db.guilds[p.guild] : undefined;
  return {
    name: p.name,
    rating: p.rating,
    best: p.best,
    wins: p.wins,
    games: p.games,
    rating2: p.rating2 ?? 1000,
    wins2: p.wins2 ?? 0,
    games2: p.games2 ?? 0,
    level: p.level ?? 1,
    cls: p.cls ?? '',
    score: worldScore(p),
    tier: rankedTier(p.rating).name,
    tier2: rankedTier(p.rating2 ?? 1000).name,
    rank: store.rankOf(p.id),
    streak: p.streak ?? null,
    title: p.title ? `Top ${p.title}` : '',
    pending: p.pending ?? [],
    guild: g ? { id: g.id, name: g.name, tag: g.tag, level: guildLevel(g.xp ?? 0), buff: guildBuff(classesOf(store, g), guildLevel(g.xp ?? 0)) } : null,
  };
}
function classesOf(store: Store, g: GuildRec): string[] {
  return g.members.map((id) => store.db.players[id]?.cls ?? '').filter(Boolean);
}
function guildInfo(store: Store, g: GuildRec) {
  const members = g.members.map((id) => store.db.players[id]).filter((p): p is PlayerRec => !!p);
  const power = members.reduce((s, p) => s + worldScore(p), 0);
  const level = guildLevel(g.xp ?? 0);
  return {
    id: g.id,
    name: g.name,
    tag: g.tag,
    members: members.length,
    power,
    owner: store.db.players[g.owner]?.name ?? '',
    level,
    xp: g.xp ?? 0,
    wars: g.wars ?? 0,
    buff: guildBuff(classesOf(store, g), level),
  };
}
/** Today's raid boss of a guild (created on first look each day). Stronger guilds face stronger bosses. */
function raidOf(g: GuildRec) {
  const today = dayKey();
  if (!g.raid || g.raid.day !== today) {
    const max = 400_000 + guildLevel(g.xp ?? 0) * 150_000;
    g.raid = { day: today, hp: max, max, hits: {}, claimed: [] };
  }
  return g.raid;
}

/** Applies a ranked result to registered players. Returns the change for each id. */
export function applyRanked(store: Store, winnerId: string | null, loserId: string | null): Record<string, { rating: number; delta: number; rank: number }> {
  const out: Record<string, { rating: number; delta: number; rank: number }> = {};
  const w = winnerId ? store.db.players[winnerId] : undefined;
  const l = loserId ? store.db.players[loserId] : undefined;
  // Against an unregistered or fill opponent, rate as if they had your own rating.
  const wr = w?.rating ?? l?.rating ?? 1000;
  const lr = l?.rating ?? w?.rating ?? 1000;
  if (w) {
    const r = eloUpdate(w.rating, lr, 1);
    out[w.id] = { rating: r, delta: r - w.rating, rank: 0 };
    w.rating = r;
    w.best = Math.max(w.best, r);
    w.wins += 1;
    w.games += 1;
  }
  if (l) {
    const r = eloUpdate(l.rating, wr, 0);
    out[l.id] = { rating: r, delta: r - l.rating, rank: 0 };
    l.rating = r;
    l.games += 1;
  }
  for (const id of Object.keys(out)) out[id].rank = store.rankOf(id);
  store.changed();
  return out;
}

export function registerApi(app: Express, store: Store): void {
  const api = express.Router();
  api.use(express.json({ limit: '4kb' }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    store.dailyTick();
    if (!limited(req, res)) next();
  });
  /** Optional profile facts sent by the client: class and level (for guild buffs and the world score). */
  const facts = (p: PlayerRec, body: unknown) => {
    const b = (body ?? {}) as { cls?: unknown; level?: unknown };
    if (typeof b.cls === 'string' && CLASSES.some((c) => c.id === b.cls)) p.cls = b.cls;
    const lv = Number(b.level);
    if (Number.isFinite(lv)) p.level = Math.max(p.level ?? 1, Math.min(1000, Math.floor(lv)));
    store.changed();
  };
  const me = (req: Request, res: Response): PlayerRec | null => {
    const t = (req.body as { token?: unknown } | undefined)?.token;
    if (!validToken(t)) {
      res.status(400).json({ ok: false, reason: 'Bad token' });
      return null;
    }
    const p = store.byToken(t);
    if (!p) {
      res.status(404).json({ ok: false, reason: 'Pick a name first' });
      return null;
    }
    return p;
  };

  api.get('/name', (req, res) => {
    const v = validName(req.query.n);
    if (!v.ok) return void res.json({ ok: true, available: false, reason: v.reason });
    const taken = !!store.idOfName(v.name);
    res.json({ ok: true, available: !taken, reason: taken ? 'That name is taken' : undefined });
  });
  api.post('/register', (req, res) => {
    const { token, name } = (req.body ?? {}) as { token?: unknown; name?: unknown };
    if (!validToken(token)) return void res.status(400).json({ ok: false, reason: 'Bad token' });
    const v = validName(name);
    if (!v.ok) return void res.status(400).json({ ok: false, reason: v.reason });
    const p = store.register(token, v.name);
    if (!p) return void res.status(409).json({ ok: false, reason: 'That name is taken' });
    facts(p, req.body);
    res.json({ ok: true, player: publicPlayer(store, p) });
  });
  api.post('/me', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    facts(p, req.body);
    res.json({ ok: true, player: publicPlayer(store, p) });
  });
  /** Collects the rewards for holding a world rank for 30 days. */
  api.post('/claim', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    const rewards = p.pending ?? [];
    p.pending = [];
    store.changed();
    res.json({ ok: true, rewards });
  });
  api.get('/leaderboard', (req, res) => {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const mode = req.query.mode === '1v1' || req.query.mode === '2v2' ? req.query.mode : 'world';
    const tier = typeof req.query.tier === 'string' ? req.query.tier : '';
    const ratingOf = (p: PlayerRec) => (mode === '2v2' ? (p.rating2 ?? 1000) : p.rating);
    let list = store.top(1000, mode);
    if (tier && mode !== 'world') list = list.filter((p) => rankedTier(ratingOf(p)).name === tier);
    const top = list.slice(0, limit).map((p, i) => ({ ...publicPlayer(store, p), rank: i + 1 }));
    res.json({ ok: true, mode, tier, total: list.length, top, brackets: HOLD_BRACKETS });
  });
  api.post('/raid', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    const g = store.db.guilds[p.guild];
    if (!g) return void res.status(400).json({ ok: false, reason: 'Join a guild first' });
    const r = raidOf(g);
    const name = RAID_NAMES[new Date().getUTCDay() % RAID_NAMES.length];
    res.json({ ok: true, raid: { name, hp: r.hp, max: r.max, myHits: r.hits[p.id] ?? 0, maxHits: RAID_HITS, defeated: r.hp <= 0, claimed: r.claimed.includes(p.id) } });
  });
  api.post('/raid/hit', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    const g = store.db.guilds[p.guild];
    if (!g) return void res.status(400).json({ ok: false, reason: 'Join a guild first' });
    const r = raidOf(g);
    if ((r.hits[p.id] ?? 0) >= RAID_HITS) return void res.status(400).json({ ok: false, reason: 'No raid attempts left today' });
    const dmg = Math.max(0, Math.min(250_000, Math.floor(Number((req.body as { dmg?: unknown }).dmg) || 0)));
    r.hits[p.id] = (r.hits[p.id] ?? 0) + 1;
    const was = r.hp;
    r.hp = Math.max(0, r.hp - dmg);
    if (was > 0 && r.hp <= 0) g.xp = (g.xp ?? 0) + 1000;
    store.changed();
    res.json({ ok: true, hp: r.hp, max: r.max, defeated: r.hp <= 0 });
  });
  api.post('/raid/claim', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    const g = store.db.guilds[p.guild];
    const r = g ? raidOf(g) : undefined;
    if (!r || r.hp > 0) return void res.status(400).json({ ok: false, reason: 'The raid boss is not defeated yet' });
    if (r.claimed.includes(p.id)) return void res.status(400).json({ ok: false, reason: 'Already claimed today' });
    r.claimed.push(p.id);
    store.changed();
    res.json({ ok: true, reward: { chest: 'gold', stones: 5 } });
  });
  api.get('/guilds', (_req, res) => {
    const list = Object.values(store.db.guilds)
      .map((g) => guildInfo(store, g))
      .sort((a, b) => b.power - a.power)
      .slice(0, 100);
    res.json({ ok: true, guilds: list });
  });
  api.get('/guild/:id', (req, res) => {
    const g = store.db.guilds[String(req.params.id)];
    if (!g) return void res.status(404).json({ ok: false, reason: 'No such guild' });
    const members = g.members
      .map((id) => store.db.players[id])
      .filter((p): p is PlayerRec => !!p)
      .sort((a, b) => worldScore(b) - worldScore(a))
      .map((p) => ({ name: p.name, rating: p.rating, tier: rankedTier(p.rating).name, owner: p.id === g.owner, cls: p.cls ?? '', level: p.level ?? 1 }));
    res.json({ ok: true, guild: guildInfo(store, g), members });
  });
  api.post('/guild/create', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    if (p.guild) return void res.status(400).json({ ok: false, reason: 'Leave your guild first' });
    const { name, tag } = req.body as { name?: unknown; tag?: unknown };
    const n = typeof name === 'string' ? name.trim() : '';
    const t = typeof tag === 'string' ? tag.trim().toUpperCase() : '';
    if (!/^[A-Za-z0-9 _-]{3,20}$/.test(n) || containsProfanity(n)) return void res.status(400).json({ ok: false, reason: 'Guild name: 3 to 20 letters or digits' });
    if (!/^[A-Z0-9]{2,4}$/.test(t) || containsProfanity(t)) return void res.status(400).json({ ok: false, reason: 'Tag: 2 to 4 letters or digits' });
    const all = Object.values(store.db.guilds);
    if (all.some((g) => g.name.toLowerCase() === n.toLowerCase())) return void res.status(409).json({ ok: false, reason: 'Guild name taken' });
    if (all.some((g) => g.tag === t)) return void res.status(409).json({ ok: false, reason: 'Tag taken' });
    const id = randomBytes(6).toString('hex');
    store.db.guilds[id] = { id, name: n, tag: t, owner: p.id, members: [p.id], created: Date.now() };
    p.guild = id;
    store.changed();
    res.json({ ok: true, guild: guildInfo(store, store.db.guilds[id]) });
  });
  api.post('/guild/join', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    if (p.guild) return void res.status(400).json({ ok: false, reason: 'Leave your guild first' });
    const g = store.db.guilds[String((req.body as { id?: unknown }).id)];
    if (!g) return void res.status(404).json({ ok: false, reason: 'No such guild' });
    if (g.members.length >= MAX_GUILD) return void res.status(400).json({ ok: false, reason: 'Guild is full' });
    g.members.push(p.id);
    p.guild = g.id;
    store.changed();
    res.json({ ok: true, guild: guildInfo(store, g) });
  });
  api.post('/guild/leave', (req, res) => {
    const p = me(req, res);
    if (!p) return;
    const g = store.db.guilds[p.guild];
    p.guild = '';
    if (g) {
      g.members = g.members.filter((id) => id !== p.id);
      if (!g.members.length) delete store.db.guilds[g.id];
      else if (g.owner === p.id) g.owner = g.members[0];
    }
    store.changed();
    res.json({ ok: true });
  });
  app.use('/api', api);
}
