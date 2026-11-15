import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyRanked } from './api';
import { createGameServer } from './app';
import { Store, hashToken } from './store';

const PORT = 2571;
const url = (p: string) => `http://localhost:${PORT}/api${p}`;
const post = (p: string, body: unknown) =>
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
  it('guilds: create, unique names and tags, join, list, leave', async () => {
    expect((await post('/guild/create', { token: T3, name: 'Nope', tag: 'NP' })).status).toBe(404);
    const g = await post('/guild/create', { token: T1, name: 'Star Forge', tag: 'sf' });
    expect(g.ok).toBe(true);
    expect(g.guild.tag).toBe('SF');
    expect((await post('/guild/create', { token: T2, name: 'star forge', tag: 'XX' })).status).toBe(409);
    expect((await post('/guild/join', { token: T2, id: g.guild.id })).ok).toBe(true);
    const list = await fetch(url('/guilds')).then((x) => x.json());
    expect(list.guilds[0]).toMatchObject({ name: 'Star Forge', members: 2 });
    const det = await fetch(url(`/guild/${g.guild.id}`)).then((x) => x.json());
    expect(det.members.map((m: { name: string }) => m.name)).toEqual(['Majenayu', 'Rival_3']);
    expect((await post('/guild/leave', { token: T1 })).ok).toBe(true);
    const det2 = await fetch(url(`/guild/${g.guild.id}`)).then((x) => x.json());
    expect(det2.guild.owner).toBe('Rival_3');
  });
});
