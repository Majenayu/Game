import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'colyseus.js';
import { MAX_PLAYERS, MSG_INPUT } from '@orb/shared';
import { createGameServer } from './app';

const PORT = 2599;
const server = createGameServer();

async function until(cond: () => boolean, ms = 4000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 25));
  }
}

beforeAll(async () => {
  await server.listen(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe('ArenaRoom', () => {
  it('serves /health and /ping with CORS', async () => {
    const r = await fetch(`http://localhost:${PORT}/health`);
    expect((await r.json()).ok).toBe(true);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const p = await fetch(`http://localhost:${PORT}/ping`);
    expect(typeof (await p.json()).t).toBe('number');
  });

  it('puts two humans in one room, fills seats with bots, moves on input', async () => {
    const a = await new Client(`ws://localhost:${PORT}`).joinOrCreate<any>('arena', { name: 'Alice' });
    const b = await new Client(`ws://localhost:${PORT}`).joinOrCreate<any>('arena', { name: '<b>Bob</b>' });
    expect(a.roomId).toBe(b.roomId);

    await until(() => a.state.players?.size === MAX_PLAYERS && b.state.players?.size === MAX_PLAYERS);
    const humans = (room: any) => {
      let n = 0;
      room.state.players.forEach((p: any) => {
        if (!p.bot) n++;
      });
      return n;
    };
    await until(() => humans(a) === 2 && humans(b) === 2);
    expect(b.state.players.get(b.sessionId).name).toBe('Bob');

    const x0 = a.state.players.get(a.sessionId).x;
    for (let i = 1; i <= 10; i++) {
      a.send(MSG_INPUT, { moveX: 1, moveY: 0, aimAngle: 0, shooting: false, seq: i });
      await new Promise((r) => setTimeout(r, 50));
    }
    await until(() => a.state.players.get(a.sessionId).seq > 0);
    const x1 = b.state.players.get(a.sessionId).x;
    expect(Math.abs(x1 - x0)).toBeGreaterThan(20);

    // garbage input is ignored
    a.send(MSG_INPUT, { moveX: 'x', seq: -4 });
    a.send(MSG_INPUT, null);

    await b.leave();
    await until(() => humans(a) === 1);
    expect(a.state.players.size).toBe(MAX_PLAYERS);
    await a.leave();
  });

  it('private rooms are skipped by matchmaking but joinable by id', async () => {
    const host = await new Client(`ws://localhost:${PORT}`).create<any>('arena', {
      name: 'Host',
      private: true,
    });
    const friend = await new Client(`ws://localhost:${PORT}`).joinById<any>(host.roomId, { name: 'Friend' });
    const stranger = await new Client(`ws://localhost:${PORT}`).joinOrCreate<any>('arena', {
      name: 'Stranger',
    });
    expect(friend.roomId).toBe(host.roomId);
    expect(stranger.roomId).not.toBe(host.roomId);
    await Promise.all([host.leave(), friend.leave(), stranger.leave()]);
  });

  it('separates rooms by mode and map, applies the loadout and syncs mode state', async () => {
    const url = `ws://localhost:${PORT}`;
    const loadout = { char: 'titan', skills: ['pulse', 'mine'], color: 9, trail: 2, bfx: 1 };
    const a = await new Client(url).joinOrCreate<any>('arena', {
      name: 'Coiner',
      mode: 'coins',
      map: 'maze',
      loadout,
    });
    const b = await new Client(url).joinOrCreate<any>('arena', {
      name: 'Hiller',
      mode: 'hill',
      map: 'pillars',
    });
    const c = await new Client(url).joinOrCreate<any>('arena', {
      name: 'Coiner2',
      mode: 'coins',
      map: 'maze',
    });
    expect(a.roomId).toBe(c.roomId);
    expect(a.roomId).not.toBe(b.roomId);
    await until(() => a.state.mode === 'coins' && a.state.mapId === 'maze' && a.state.players?.size === 8);
    await until(() => b.state.mode === 'hill' && b.state.mapId === 'pillars');
    const me = a.state.players.get(a.sessionId);
    expect(me.char).toBe('titan');
    expect(me.maxHp).toBe(5);
    expect(me.sk0).toBe('pulse');
    expect(me.color).toBe(0x2979ff);
    await until(() => a.state.coins.size > 0);
    await Promise.all([a.leave(), b.leave(), c.leave()]);
  });

  it('rejects unknown modes and maps, and ignores bad loadouts', async () => {
    const url = `ws://localhost:${PORT}`;
    await expect(new Client(url).joinOrCreate('arena', { mode: 'hax' })).rejects.toBeDefined();
    await expect(new Client(url).joinOrCreate('arena', { map: '../../etc' })).rejects.toBeDefined();
    const r = await new Client(url).joinOrCreate<any>('arena', {
      name: 'Odd',
      mode: 'dm',
      map: 'neon',
      loadout: { char: 'god', skills: [1, 2], color: -5 },
    });
    await until(() => r.state.players?.size === 8);
    const me = r.state.players.get(r.sessionId);
    expect(me.char).toBe('nova');
    expect(me.maxHp).toBe(3);
    await r.leave();
  });

  it('skill messages trigger a skill and cooldown', async () => {
    const r = await new Client(`ws://localhost:${PORT}`).joinOrCreate<any>('arena', {
      name: 'Skiller',
      mode: 'dm',
      map: 'neon',
    });
    await until(() => r.state.players?.size === 8);
    r.send(MSG_INPUT, { moveX: 0, moveY: 0, aimAngle: 0, shooting: false, seq: 1, skill: 1 });
    await until(() => r.state.players.get(r.sessionId).cd0 > 0);
    await r.leave();
  });
});
