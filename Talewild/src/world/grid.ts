// 4-direction grid movement with smooth tweening between tiles. Pure logic: the renderer only reads `fx`/`fy`.

import type { Dir } from '../core/input';

export const DIR_VEC: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const WALK_TILES_PER_SEC = 4.5;
export const RUN_TILES_PER_SEC = 8;
/** Tapping a new direction while standing only turns; holding it at least this long starts walking. */
export const TURN_HOLD_MS = 90;

export interface StepResult {
  /** A step towards a new tile started this update. */
  started: boolean;
  /** The mover arrived on a new tile this update. */
  arrived: boolean;
  /** The mover tried to walk into something solid. */
  bumped: boolean;
}

export class GridMover {
  x: number;
  y: number;
  facing: Dir;
  speed = WALK_TILES_PER_SEC;
  private fromX: number;
  private fromY: number;
  private t = 1;
  /** Walking continuously: the next step starts without the turn delay. */
  private chain = false;
  /** This press turned the mover; it must be held TURN_HOLD_MS before walking. */
  private turned = false;
  private holdMs = 0;

  constructor(x: number, y: number, facing: Dir = 'down') {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.facing = facing;
  }

  get moving(): boolean {
    return this.t < 1;
  }

  /** Interpolated position in tiles. */
  get fx(): number {
    return this.fromX + (this.x - this.fromX) * this.t;
  }

  get fy(): number {
    return this.fromY + (this.y - this.fromY) * this.t;
  }

  /** The tile being left while moving (equal to x/y when standing). */
  get prevX(): number {
    return this.fromX;
  }

  get prevY(): number {
    return this.fromY;
  }

  /** Tile in front of the mover. */
  front(): [number, number] {
    const [dx, dy] = DIR_VEC[this.facing];
    return [this.x + dx, this.y + dy];
  }

  teleport(x: number, y: number, facing: Dir = this.facing): void {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.t = 1;
    this.facing = facing;
    this.stop();
  }

  face(d: Dir): void {
    if (!this.moving) this.facing = d;
  }

  stop(): void {
    this.chain = false;
    this.turned = false;
    this.holdMs = 0;
  }

  /**
   * Advances movement.
   * @param want direction the controller wants, or null
   * @param run running (faster)
   * @param blocked returns true when a tile cannot be entered
   * @param tapToTurn players turn on a short tap; NPC AI walks straight away
   */
  update(ms: number, want: Dir | null, run: boolean, blocked: (x: number, y: number) => boolean, tapToTurn = true): StepResult {
    const res: StepResult = { started: false, arrived: false, bumped: false };
    this.speed = run ? RUN_TILES_PER_SEC : WALK_TILES_PER_SEC;
    let budget = ms;

    if (this.moving) {
      const needMs = ((1 - this.t) / this.speed) * 1000;
      if (budget < needMs) {
        this.t += (budget / 1000) * this.speed;
        return res;
      }
      budget -= needMs;
      this.t = 1;
      this.fromX = this.x;
      this.fromY = this.y;
      res.arrived = true;
    }

    if (!want) {
      this.stop();
      return res;
    }

    if (!this.chain && tapToTurn) {
      if (this.facing !== want) {
        this.facing = want;
        this.turned = true;
        this.holdMs = 0;
        return res;
      }
      if (this.turned) {
        this.holdMs += budget;
        if (this.holdMs < TURN_HOLD_MS) return res;
      }
    }

    this.facing = want;
    const [dx, dy] = DIR_VEC[want];
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (blocked(nx, ny)) {
      res.bumped = true;
      this.chain = false;
      return res;
    }
    this.fromX = this.x;
    this.fromY = this.y;
    this.x = nx;
    this.y = ny;
    this.t = Math.min(0.999, (budget / 1000) * this.speed);
    this.chain = true;
    this.turned = false;
    res.started = true;
    return res;
  }
}
