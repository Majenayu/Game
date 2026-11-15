import { TICK_MS, movePlayer } from '@orb/shared';

interface SentInput {
  seq: number;
  moveX: number;
  moveY: number;
}

const SNAP_DISTANCE = 150;
const CORRECTION_RATE = 10;

/**
 * Client-side prediction for the local player. Moves immediately from input, then blends toward
 * the server position replayed with the inputs the server has not acknowledged yet (by seq).
 */
export class Predictor {
  x = 0;
  y = 0;
  private corrX = 0;
  private corrY = 0;
  private pending: SentInput[] = [];
  private ready = false;

  get initialised(): boolean {
    return this.ready;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.corrX = 0;
    this.corrY = 0;
    this.pending = [];
    this.ready = true;
  }

  recordSent(seq: number, moveX: number, moveY: number): void {
    this.pending.push({ seq, moveX, moveY });
    if (this.pending.length > 60) this.pending.shift();
  }

  /** Called for every authoritative snapshot. `sinceSendSec` is the age of the newest sent input. */
  onServer(sx: number, sy: number, ack: number, sinceSendSec: number): void {
    if (!this.ready) return this.reset(sx, sy);
    this.pending = this.pending.filter((i) => i.seq > ack);
    let tx = sx;
    let ty = sy;
    this.pending.forEach((inp, idx) => {
      const dt = idx === this.pending.length - 1 ? sinceSendSec : TICK_MS / 1000;
      const m = movePlayer(tx, ty, inp.moveX, inp.moveY, dt);
      tx = m.x;
      ty = m.y;
    });
    const ex = tx - this.x;
    const ey = ty - this.y;
    if (Math.hypot(ex, ey) > SNAP_DISTANCE) {
      this.x = tx;
      this.y = ty;
      this.corrX = 0;
      this.corrY = 0;
    } else {
      this.corrX = ex;
      this.corrY = ey;
    }
  }

  step(moveX: number, moveY: number, dt: number): void {
    const m = movePlayer(this.x, this.y, moveX, moveY, dt);
    this.x = m.x;
    this.y = m.y;
    const f = Math.min(1, dt * CORRECTION_RATE);
    const cx = this.corrX * f;
    const cy = this.corrY * f;
    this.x += cx;
    this.y += cy;
    this.corrX -= cx;
    this.corrY -= cy;
  }
}
