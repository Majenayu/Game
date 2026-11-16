/** Two virtual sticks: left half moves, right half aims and fires. */
export interface TouchState {
  active: boolean;
  moveX: number;
  moveY: number;
  aiming: boolean;
  aimAngle: number;
}

const RADIUS = 60;

interface Stick {
  id: number | null;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  el: HTMLDivElement;
  knob: HTMLDivElement;
}

let deviceOverride: boolean | null = null;
/** Uses the platform's device detection when available (CrazyGames asks not to guess from touch support). */
export function setTouchDevice(v: boolean | null): void {
  deviceOverride = v;
  document.body.classList.toggle('touchdev', v === true);
}
export function isTouchDevice(): boolean {
  return deviceOverride ?? matchMedia('(pointer: coarse)').matches;
}

export class TouchControls {
  state: TouchState = { active: false, moveX: 0, moveY: 0, aiming: false, aimAngle: 0 };
  private root = document.getElementById('touch') as HTMLDivElement;
  private left = this.makeStick();
  private right = this.makeStick();

  constructor() {
    const r = this.root;
    document.body.classList.toggle('touchdev', isTouchDevice());
    r.addEventListener('pointerdown', (e) => this.down(e));
    r.addEventListener('pointermove', (e) => this.move(e));
    r.addEventListener('pointerup', (e) => this.up(e));
    r.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  get enabled(): boolean {
    return this.root.classList.contains('on');
  }

  setEnabled(on: boolean): void {
    this.root.classList.toggle('on', on && isTouchDevice());
    if (!on) this.releaseAll();
  }

  private makeStick(): Stick {
    const el = document.createElement('div');
    el.className = 'stick';
    el.hidden = true;
    const knob = document.createElement('div');
    knob.className = 'knob';
    el.appendChild(knob);
    this.root.appendChild(el);
    return { id: null, ox: 0, oy: 0, dx: 0, dy: 0, el, knob };
  }

  private down(e: PointerEvent): void {
    this.state.active = true;
    const s = e.clientX < innerWidth / 2 ? this.left : this.right;
    if (s.id !== null) return;
    s.id = e.pointerId;
    s.ox = e.clientX;
    s.oy = e.clientY;
    s.dx = 0;
    s.dy = 0;
    s.el.hidden = false;
    const bounds = this.root.getBoundingClientRect();
    s.el.style.left = `${s.ox - bounds.left}px`;
    s.el.style.top = `${s.oy - bounds.top}px`;
    s.knob.style.transform = 'translate(0,0)';
    this.root.setPointerCapture?.(e.pointerId);
    this.sync();
  }

  private move(e: PointerEvent): void {
    for (const s of [this.left, this.right]) {
      if (s.id !== e.pointerId) continue;
      let dx = e.clientX - s.ox;
      let dy = e.clientY - s.oy;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      s.dx = dx;
      s.dy = dy;
      s.knob.style.transform = `translate(${dx}px,${dy}px)`;
    }
    this.sync();
  }

  private up(e: PointerEvent): void {
    for (const s of [this.left, this.right]) {
      if (s.id === e.pointerId) {
        s.id = null;
        s.dx = 0;
        s.dy = 0;
        s.el.hidden = true;
      }
    }
    this.sync();
  }

  private releaseAll(): void {
    for (const s of [this.left, this.right]) {
      s.id = null;
      s.dx = 0;
      s.dy = 0;
      s.el.hidden = true;
    }
    this.sync();
  }

  private sync(): void {
    const l = this.left;
    const r = this.right;
    this.state.moveX = l.dx / RADIUS;
    this.state.moveY = l.dy / RADIUS;
    this.state.active = l.id !== null || r.id !== null;
    this.state.aiming = r.id !== null && Math.hypot(r.dx, r.dy) > 8;
    if (this.state.aiming) this.state.aimAngle = Math.atan2(r.dy, r.dx);
  }
}
