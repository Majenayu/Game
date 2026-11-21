// On-screen controls for touch screens: a d-pad you can slide across, A (talk/confirm), B (back, hold to run)
// and a menu button. They press the same actions as the keyboard.

import type { Action, Dir, InputState } from '../core/input';
import { t } from '../core/i18n';
import { h } from './ui';

/** Pointer capture keeps a held button pressed when the finger slides off it. Ignored if the browser refuses. */
function capture(el: HTMLElement, id: number): void {
  try {
    el.setPointerCapture(id);
  } catch {
    /* synthetic or already released pointer */
  }
}

export class TouchControls {
  readonly el = h('div', 'touch');
  private pad = h('div', 'pad');
  private padDir: Dir | null = null;
  private padPointer: number | null = null;

  constructor(private input: InputState) {
    for (const d of ['up', 'down', 'left', 'right'] as const) this.pad.appendChild(h('div', `pad-${d}`));
    this.pad.appendChild(h('div', 'pad-hub'));
    const a = this.actionButton('btn-a', t('touch.a'), ['interact']);
    const b = this.actionButton('btn-b', t('touch.b'), ['back', 'run']);
    const menu = this.actionButton('btn-menu', '☰', ['menu']);
    menu.setAttribute('aria-label', t('touch.menu'));
    const right = h('div', 'touch-right');
    right.append(b, a);
    this.el.append(this.pad, right, menu);

    this.pad.addEventListener('pointerdown', (e) => {
      this.padPointer = e.pointerId;
      capture(this.pad, e.pointerId);
      this.trackPad(e);
    });
    this.pad.addEventListener('pointermove', (e) => e.pointerId === this.padPointer && this.trackPad(e));
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.padPointer) return;
      this.padPointer = null;
      this.setPadDir(null);
    };
    this.pad.addEventListener('pointerup', end);
    this.pad.addEventListener('pointercancel', end);
  }

  private actionButton(cls: string, label: string, actions: Action[]): HTMLElement {
    const el = h('div', `tbtn ${cls}`, label);
    const down = (e: PointerEvent) => {
      e.preventDefault();
      capture(el, e.pointerId);
      el.classList.add('down');
      actions.forEach((a) => this.input.press(a, 'touch'));
    };
    const up = () => {
      el.classList.remove('down');
      actions.forEach((a) => this.input.release(a, 'touch'));
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return el;
  }

  private trackPad(e: PointerEvent): void {
    const r = this.pad.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(x, y) < r.width * 0.12) return this.setPadDir(null);
    this.setPadDir(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up');
  }

  private setPadDir(d: Dir | null): void {
    if (d === this.padDir) return;
    if (this.padDir) this.input.release(this.padDir, 'touch');
    this.padDir = d;
    this.pad.dataset.dir = d ?? '';
    if (d) this.input.press(d, 'touch');
  }

  /** Touch controls show on touch screens, or with ?touch=1. */
  static wanted(): boolean {
    return new URLSearchParams(location.search).has('touch') || matchMedia('(pointer: coarse)').matches;
  }
}
