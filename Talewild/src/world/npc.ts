// NPC behaviour: stand still, wander near home, or patrol a path. Pure logic driven by a seeded RNG.

import type { Dir } from '../core/input';
import { Rng } from '../core/rng';
import { DIR_VEC, GridMover } from './grid';
import type { NpcMove } from './mapData';

export interface NpcConfig {
  move: NpcMove;
  homeX: number;
  homeY: number;
  radius: number;
  path: [number, number][];
  facing: Dir;
}

const DIR_LIST: Dir[] = ['up', 'down', 'left', 'right'];

export class NpcBrain {
  readonly mover: GridMover;
  private waitMs: number;
  private pathIndex = 0;
  /** While talking the NPC stops and faces the player. */
  talking = false;

  constructor(
    readonly cfg: NpcConfig,
    private rng: Rng,
  ) {
    this.mover = new GridMover(cfg.homeX, cfg.homeY, cfg.facing);
    this.waitMs = 600 + rng.int(0, 1400);
  }

  /** Current patrol target. */
  get target(): [number, number] | null {
    return this.cfg.path.length ? this.cfg.path[this.pathIndex % this.cfg.path.length]! : null;
  }

  lookAt(x: number, y: number): void {
    const dx = x - this.mover.x;
    const dy = y - this.mover.y;
    this.mover.face(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  update(ms: number, blocked: (x: number, y: number) => boolean): void {
    // Finish any step in progress first.
    if (this.mover.moving || this.talking || this.cfg.move === 'still') {
      this.mover.update(ms, null, false, blocked, false);
      return;
    }
    this.waitMs -= ms;
    if (this.waitMs > 0) return;

    const want = this.cfg.move === 'wander' ? this.wanderDir(blocked) : this.patrolDir();
    if (!want) {
      if (this.waitMs <= 0) this.waitMs = 400;
      return;
    }
    const r = this.mover.update(ms, want, false, blocked, false);
    if (r.bumped) {
      // Someone is in the way (often the player): look at it and try again later.
      this.waitMs = 500 + this.rng.int(0, 500);
      return;
    }
    this.waitMs = this.cfg.move === 'wander' ? 900 + this.rng.int(0, 1800) : 0;
  }

  private wanderDir(blocked: (x: number, y: number) => boolean): Dir | null {
    const options = DIR_LIST.filter((d) => {
      const [dx, dy] = DIR_VEC[d];
      const nx = this.mover.x + dx;
      const ny = this.mover.y + dy;
      const inRange = Math.abs(nx - this.cfg.homeX) <= this.cfg.radius && Math.abs(ny - this.cfg.homeY) <= this.cfg.radius;
      return inRange && !blocked(nx, ny);
    });
    return options.length ? this.rng.pick(options) : null;
  }

  private patrolDir(): Dir | null {
    const tgt = this.target;
    if (!tgt) return null;
    if (this.mover.x === tgt[0] && this.mover.y === tgt[1]) {
      // Reached a patrol point: pause, then head for the next one.
      this.pathIndex++;
      this.waitMs = 700;
      return null;
    }
    if (this.mover.x !== tgt[0]) return tgt[0] > this.mover.x ? 'right' : 'left';
    return tgt[1] > this.mover.y ? 'down' : 'up';
  }
}
