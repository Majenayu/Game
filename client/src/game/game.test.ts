import { describe, expect, it } from 'vitest';
import { movePlayer, type PlayerView } from '@orb/shared';
import { SnapshotBuffer } from './interp';
import { Predictor } from './predict';

const pv = (id: string, x: number, y: number, aim = 0): PlayerView => ({
  id,
  name: id,
  bot: false,
  color: 1,
  x,
  y,
  aim,
  hp: 3,
  kills: 0,
  deaths: 0,
  alive: true,
  invuln: false,
  boss: false,
  maxHp: 3,
  score: 0,
  team: 0,
  char: 'nova',
  fx: '',
  shield: 0,
  slow: false,
  trail: 0,
  bfx: 0,
  spd: 1,
  seq: 0,
  skills: '',
  cds: '',
  mp: 100,
  maxMp: 100,
  hidden: false,
  casting: 0,
});

describe('SnapshotBuffer', () => {
  it('interpolates between snapshots', () => {
    const b = new SnapshotBuffer();
    b.push(0, [pv('a', 0, 0)]);
    b.push(100, [pv('a', 100, 50)]);
    const p = b.at(50)[0];
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(25);
  });

  it('snaps on teleports (respawn)', () => {
    const b = new SnapshotBuffer();
    b.push(0, [pv('a', 0, 0)]);
    b.push(100, [pv('a', 900, 500)]);
    expect(b.at(50)[0].x).toBe(900);
  });

  it('holds the last sample instead of extrapolating', () => {
    const b = new SnapshotBuffer();
    b.push(0, [pv('a', 0, 0)]);
    b.push(100, [pv('a', 10, 0)]);
    expect(b.at(500)[0].x).toBe(10);
  });
});

describe('Predictor', () => {
  it('stays close to a lagged authoritative server while moving', () => {
    const pred = new Predictor();
    let sx = 200;
    let sy = 450;
    pred.reset(sx, sy);
    const frame = 1 / 60;
    let seq = 0;
    let sinceSend = 0;
    const inflight: Array<{ seq: number; arrive: number }> = [];
    let ack = 0;
    let maxErr = 0;
    for (let f = 0; f < 600; f++) {
      const t = f * frame;
      pred.step(1, 0, frame);
      sinceSend += frame;
      if (sinceSend >= 0.05) {
        sinceSend = 0;
        seq++;
        pred.recordSent(seq, 1, 0);
        inflight.push({ seq, arrive: t + 0.08 });
      }
      // server ticks every 50ms and processes arrived inputs
      if (f % 3 === 0) {
        while (inflight.length && inflight[0].arrive <= t) ack = inflight.shift()!.seq;
        if (ack > 0) {
          const m = movePlayer(sx, sy, 1, 0, 0.05);
          sx = m.x;
          sy = m.y;
        }
        // snapshot reaches the client 80 ms later; approximated as immediate with ack
        pred.onServer(sx, sy, ack, sinceSend);
      }
      if (f > 120) maxErr = Math.max(maxErr, Math.abs(pred.x - sx));
    }
    // predicted position is ahead of the server by roughly RTT * speed, never wildly off
    expect(maxErr).toBeLessThan(160);
    expect(pred.x).toBeGreaterThan(sx - 5);
  });

  it('snaps on large errors', () => {
    const pred = new Predictor();
    pred.reset(100, 100);
    pred.onServer(800, 600, 0, 0);
    expect(pred.x).toBe(800);
  });
});
