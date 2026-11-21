import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyRanked } from './api';
import { createGameServer } from './app';
import { Store, hashToken } from './store';

const PORT = 2571;
const url = (p: string) => `http://localhost:${PORT}/api${p}`;
const post = (p: string, body: unknown): Promise<Record<string, any>> =>
  fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(
    async (r) => ({ status: r.status, ...((await r.json()) as Record<string, any>) }),
  );
const T1 = 'a'.repeat(20) + '1';
const T2 = 'b'.repeat(20) + '2';
const T3 = 'c'.repeat(20) + '3';
let server: ReturnType<typeof createGameServer>;
let store: Store;

beforeAll(async () => {
  store = Store.auto();
  server = createGameServer(store);
  await server.listen(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe('accounts, world ranking and guilds', () => {
  it('names are unique (case-insensitive) and validated', async () => {
    expect((await fetch(url('/name?n=Majenayu')).then((r) => r.json())).available).toBe(true);
    expect((await post('/register', { token: T1, name: 'Majenayu' })).ok).toBe(true);
    const n = await fetch(url('/name?n=majenAYU')).then((r) => r.json());
    expect(n.available).toBe(false);
    expect((await post('/register', { token: T2, name: 'MAJENAYU' })).status).toBe(409);
    expect((await post('/register', { token: T2, name: 'a' })).status).toBe(400);
    expect((await post('/register', { token: T2, name: 'Majen' })).status).toBe(400);
    expect((await post('/register', { token: 'short', name: 'Okname' })).status).toBe(400);
    expect((await post('/register', { token: T2, name: 'Rival_2' })).ok).toBe(true);
    // renaming frees the old name
    expect((await post('/register', { token: T2, name: 'Rival_3' })).ok).toBe(true);
    expect((await fetch(url('/name?n=Rival_2')).then((r) => r.json())).available).toBe(true);
  });
  it('ranked results move ratings and fill the world leaderboard', async () => {
    const r = applyRanked(store, hashToken(T1), hashToken(T2));
    expect(r[hashToken(T1)].delta).toBe(16);
    expect(r[hashToken(T2)].delta).toBe(-16);
    const lb = await fetch(url('/leaderboard')).then((x) => x.json());
    expect(lb.total).toBe(2);
    expect(lb.top[0]).toMatchObject({ name: 'Majenayu', rank: 1, rating: 1016, wins: 1, games: 1 });
    expect(lb.top[1].name).toBe('Rival_3');
    const me = await post('/me', { token: T1 });
    expect(me.player.rank).toBe(1);
  });
  it('guilds hold at most 5, have a level and class buffs, and fight a daily raid boss', async () => {
    const tok = (i: number) => 'g'.repeat(20) + i;
    for (let i = 0; i < 6; i++) await post('/register', { token: tok(i), name: `Member${i}`, cls: ['warrior', 'mage', 'assassin', 'guardian', 'summoner', 'gunner'][i], level: 10 + i });
    const g = await post('/guild/create', { token: tok(0), name: 'Five Stars', tag: 'FIVE' });
    for (let i = 1; i < 5; i++) expect((await post('/guild/join', { token: tok(i), id: g.guild.id })).ok).toBe(true);
    expect((await post('/guild/join', { token: tok(5), id: g.guild.id })).reason).toBe('Guild is full');
    const me = await post('/me', { token: tok(0) });
    expect(me.player.guild.level).toBe(1);
    expect(me.player.guild.buff.lines.join(' ')).toContain('Harmony');
    const raid = await post('/raid', { token: tok(0) });
    expect(raid.raid.hp).toBe(raid.raid.max);
    const hit = await post('/raid/hit', { token: tok(0), dmg: 9_999_999 });
    expect(hit.hp).toBe(raid.raid.max - 250_000);
    for (let i = 0; i < 4; i++) await post('/raid/hit', { token: tok(0), dmg: 1 });
    expect((await post('/raid/hit', { token: tok(0), dmg: 1 })).status).toBe(400);
    expect((await post('/raid/claim', { token: tok(0) })).status).toBe(400);
  });
  it('leaderboards per mode and tier, and world rank uses the world score', async () => {
    const lb = await fetch(url('/leaderboard?mode=1v1&tier=Bronze')).then((r) => r.json());
    expect(lb.mode).toBe('1v1');
    expect(lb.top.every((p: { tier: string }) => p.tier === 'Bronze')).toBe(true);
    const w = await fetch(url('/leaderboard?mode=world')).then((r) => r.json());
    expect(w.brackets[0]).toMatchObject({ top: 10, rank: 'U' });
  });
  it('holding a world-rank bracket for 30 days pays a reward', async () => {
    const id = hashToken(T1);
    const p = store.db.players[id];
    const day = 86_400_000;
    const start = Date.UTC(2030, 0, 1);
    for (let d = 0; d < 30; d++) store.dailyTick(start + d * day);
    expect(p.pending?.[0]?.rank).toBe('U');
    const c = await post('/claim', { token: T1 });
    expect(c.rewards[0].rank).toBe('U');
    expect((await post('/claim', { token: T1 })).rewards.length).toBe(0);
  });
  it('guilds: create, unique names and tags, join, list, leave', async () => {
    expect((await post('/guild/create', { token: T3, name: 'Nope', tag: 'NP' })).status).toBe(404);
    const g = await post('/guild/create', { token: T1, name: 'Star Forge', tag: 'sf' });
    expect(g.ok).toBe(true);
    expect(g.guild.tag).toBe('SF');
    expect((await post('/guild/create', { token: T2, name: 'star forge', tag: 'XX' })).status).toBe(409);
    expect((await post('/guild/join', { token: T2, id: g.guild.id })).ok).toBe(true);
    const list = await fetch(url('/guilds')).then((x) => x.json());
    expect(list.guilds.find((x: { name: string }) => x.name === 'Star Forge')).toMatchObject({ members: 2 });
    const det = await fetch(url(`/guild/${g.guild.id}`)).then((x) => x.json());
    expect(det.members.map((m: { name: string }) => m.name)).toEqual(['Majenayu', 'Rival_3']);
    expect((await post('/guild/leave', { token: T1 })).ok).toBe(true);
    const det2 = await fetch(url(`/guild/${g.guild.id}`)).then((x) => x.json());
    expect(det2.guild.owner).toBe('Rival_3');
  });
});
