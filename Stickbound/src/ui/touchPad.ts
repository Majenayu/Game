// Fight touch controls: a floating stick on the left half, large buttons on the right (min 48 px targets).
// One-handed mode puts every button in one column on the right and uses the stick only for direction taps.

import type { ElementId } from '../content/elements';
import type { TouchController } from '../core/input';
import { elementIcon } from '../render/icons';
import { IN } from '../sim/types';
import { h } from './dom';

export class TouchPad {
  readonly el = h('div', 'tpad');
  private stick = h('div', 'tstick');
  private knob = h('div', 'tknob');
  private zone = h('div', 'tzone');
  private stickId: number | null = null;
  private origin = { x: 0, y: 0 };
  private dirBits = 0;
  private btnBits = 0;
  private powerBtns: HTMLElement[] = [];

  constructor(private ctl: TouchController, oneHand = false) {
    this.el.classList.toggle('one-hand', oneHand);
    this.stick.appendChild(this.knob);
    this.zone.appendChild(this.stick);
    this.el.appendChild(this.zone);
    const grid = h('div', 'tbtns');
    const mk = (cls: string, label: string, bit: number) => {
      const b = h('div', `tb ${cls}`);
      b.innerHTML = label;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        try {
          b.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic event */
        }
        b.classList.add('down');
        this.btnBits |= bit;
        this.sync();
      };
      const up = () => {
        b.classList.remove('down');
        this.btnBits &= ~bit;
        this.sync();
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      grid.appendChild(b);
      return b;
    };
    mk('t-atk', 'ATK', IN.ATK);
    mk('t-hvy', 'HVY', IN.HVY);
    mk('t-grd', 'GRD', IN.GRD);
    mk('t-dash', 'DASH', IN.DASH);
    mk('t-jump', 'JUMP', IN.U);
    this.powerBtns = [mk('t-p1', '1', IN.P1), mk('t-p2', '2', IN.P2), mk('t-p3', '3', IN.P3)];
    mk('t-swap', 'TAG', IN.SWAP);
    this.el.appendChild(grid);

    this.zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      try {
        this.zone.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic event */
      }
      this.origin = { x: e.clientX, y: e.clientY };
      this.stick.style.left = `${e.clientX}px`;
      this.stick.style.top = `${e.clientY}px`;
      this.stick.classList.add('on');
      this.track(e);
    });
    this.zone.addEventListener('pointermove', (e) => e.pointerId === this.stickId && this.track(e));
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.dirBits = 0;
      this.stick.classList.remove('on');
      this.knob.style.transform = '';
      this.sync();
    };
    this.zone.addEventListener('pointerup', end);
    this.zone.addEventListener('pointercancel', end);
  }

  private track(e: PointerEvent): void {
    const dx = e.clientX - this.origin.x;
    const dy = e.clientY - this.origin.y;
    const d = Math.hypot(dx, dy);
    const max = 46;
    const k = d > max ? max / d : 1;
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    let bits = 0;
    if (dx < -16) bits |= IN.L;
    if (dx > 16) bits |= IN.R;
    if (dy < -34) bits |= IN.U;
    if (dy > 34) bits |= IN.D;
    this.dirBits = bits;
    this.sync();
  }

  private sync(): void {
    this.ctl.bits = this.dirBits | this.btnBits;
  }

  /** Show which powers are unlocked and affordable. */
  setPowers(element: ElementId, ranks: number[], costs: number[], mp: number): void {
    this.powerBtns.forEach((b, i) => {
      const locked = ranks[i]! <= 0;
      const key = `${element}${i}${locked}`;
      if (b.dataset.k !== key) {
        b.dataset.k = key;
        b.innerHTML = locked ? '🔒' : `${elementIcon(element, 18, false)}<small>${i + 1}</small>`;
      }
      b.classList.toggle('dim', locked || mp < costs[i]! * 10);
    });
  }

  static wanted(): boolean {
    return new URLSearchParams(location.search).has('touch') || matchMedia('(pointer: coarse)').matches;
  }
}
