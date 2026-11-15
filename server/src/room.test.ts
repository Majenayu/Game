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
});
