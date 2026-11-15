import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'colyseus.js';
import {
  MAX_PLAYERS,
  MSG_EMOTE,
  MSG_INPUT,
  MSG_LOADOUT,
  MSG_READY,
  firstIdOfRank,
  getSkill,
  skillCount,
} from '@orb/shared';
import { createGameServer } from './app';

function firstOfKind(kind: string): number {
  const start = firstIdOfRank('C');
  for (let k = 0; k < skillCount('C'); k++) if (getSkill(start + k).kind === kind) return start + k;
  throw new Error(kind);
}
const SKILL_A = firstOfKind('projectile');
const SKILL_B = firstOfKind('shield');

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
    a.send(MSG_READY);
    b.send(MSG_READY);
    await until(() => a.state.players.get(a.sessionId).hold === 0, 6000);

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
    const loadout = { char: 'titan', skillIds: [SKILL_A, SKILL_B], color: 9, trail: 2, bfx: 1 };
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
    expect(me.maxHp).toBe(500);
    expect(me.skills).toBe(`${SKILL_A},${SKILL_B}`);
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
      loadout: { char: 'god', skillIds: [-4, 99999999], color: -5 },
    });
    await until(() => r.state.players?.size === 8);
    const me = r.state.players.get(r.sessionId);
    expect(me.char).toBe('nova');
    expect(me.maxHp).toBe(300);
    expect(me.skills.split(',').every((x: string) => Number(x) > 0 && Number(x) < 99999999)).toBe(true);
    await r.leave();
  });

  it('skill messages trigger a skill and cooldown', async () => {
    const r = await new Client(`ws://localhost:${PORT}`).joinOrCreate<any>('arena', {
      name: 'Skiller',
      mode: 'dm',
      map: 'neon',
    });
    await until(() => r.state.players?.size === 8);
    r.send(MSG_READY);
    await until(() => r.state.players.get(r.sessionId).hold === 0, 6000);
    await new Promise((res) => setTimeout(res, 200));
    r.send(MSG_INPUT, { moveX: 0, moveY: 0, aimAngle: 0, shooting: false, seq: 1, skill: 1 });
    await until(() => (r.state.players.get(r.sessionId).cds as string).split(',')[0].split(':')[0] > '0');
    await r.leave();
  });
it('2v2 ranked rooms hold four orbs in two teams and stay apart from casual rooms', async () => {
    const url = `ws://localhost:${PORT}`;
    const a = await new Client(url).joinOrCreate<any>('ranked2v2', { name: 'Rank1', ranked: false });
    const b = await new Client(url).joinOrCreate<any>('ranked2v2', { name: 'Rank2' });
    const c = await new Client(url).joinOrCreate<any>('arena', { name: 'Casual', mode: 'tdm', map: 'rotate' });
    expect(a.roomId).toBe(b.roomId);
    expect(c.roomId).not.toBe(a.roomId);
    await until(() => a.state.ranked === true && a.state.players?.size === 4 && a.state.mode === 'tdm');
    const teams = Array.from(a.state.players.values()).map((p: any) => p.team);
    expect(teams.filter((t: number) => t === 0).length).toBe(2);
    await Promise.all([a.leave(), b.leave(), c.leave()]);
  });
  it('ranked is a 1v1 duel: two players, confirm, countdown, fight', async () => {
    const url = `ws://localhost:${PORT}`;
    const a = await new Client(url).joinOrCreate<any>('ranked', { name: 'Duel1' });
    const b = await new Client(url).joinOrCreate<any>('ranked', { name: 'Duel2' });
    expect(a.roomId).toBe(b.roomId);
    await until(() => a.state.fighters?.size === 2 && a.state.phase === 'lobby');
    a.send(MSG_READY);
    b.send(MSG_READY);
    await until(() => a.state.phase === 'countdown');
    await until(() => a.state.phase === 'fight', 6000);
    a.send(MSG_INPUT, { moveX: 1, moveY: 0, aimAngle: 0, shooting: false, seq: 1 });
    const x0 = a.state.fighters.get(a.sessionId).x;
    await until(() => a.state.fighters.get(a.sessionId).x > x0 + 20);
    await b.leave();
    await until(() => a.state.phase === 'matchEnd' && a.state.winner === a.sessionId);
    await a.leave();
  });
  it('waits in the lobby until everyone confirms, allows loadout changes only while waiting, then counts down', async () => {
    const url = `ws://localhost:${PORT}`;
    const a = await new Client(url).joinOrCreate<any>('arena', { name: 'L1', mode: 'coins', map: 'pillars' });
    const b = await new Client(url).joinOrCreate<any>('arena', { name: 'L2', mode: 'coins', map: 'pillars' });
    await until(() => a.state.players?.size === MAX_PLAYERS);
    expect(a.state.lobby).toBeGreaterThan(20);
    expect(a.state.players.get(a.sessionId).hold).toBeGreaterThan(20);
    a.send(MSG_LOADOUT, { char: 'nova', skillIds: [SKILL_B], weapon: 2, acc: 1 });
    await until(() => a.state.players.get(a.sessionId).weapon === 2);
    a.send(MSG_READY);
    await until(() => a.state.players.get(a.sessionId).ready === true);
    expect(a.state.lobby).toBeGreaterThan(15);
    a.send(MSG_LOADOUT, { char: 'nova', skillIds: [], weapon: 3 });
    b.send(MSG_READY);
    await until(() => a.state.lobby === 0);
    expect(a.state.players.get(a.sessionId).weapon).toBe(2);
    expect(a.state.players.get(a.sessionId).hold).toBeLessThanOrEqual(3);
    await until(() => a.state.players.get(a.sessionId).hold === 0, 6000);
    await Promise.all([a.leave(), b.leave()]);
  });
  it('broadcasts preset emotes, rejects bad ones and rate limits spam', async () => {
    const url = `ws://localhost:${PORT}`;
    const a = await new Client(url).joinOrCreate<any>('arena', { name: 'Emo', mode: 'hill', map: 'neon' });
    const b = await new Client(url).joinOrCreate<any>('arena', { name: 'Emo2', mode: 'hill', map: 'neon' });
    const got: Array<{ id: string; e: number }> = [];
    b.onMessage(MSG_EMOTE, (m: { id: string; e: number }) => got.push(m));
    a.send(MSG_EMOTE, 99);
    a.send(MSG_EMOTE, 'hi');
    a.send(MSG_EMOTE, 1);
    a.send(MSG_EMOTE, 2);
    await until(() => got.length > 0);
    await new Promise((r) => setTimeout(r, 300));
    expect(got).toEqual([{ id: a.sessionId, e: 1 }]);
    await Promise.all([a.leave(), b.leave()]);
  });
});