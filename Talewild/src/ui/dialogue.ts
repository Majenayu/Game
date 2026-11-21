// Dialogue box: speaker portrait and name, typewriter text, choices. Advance with interact, tap or click.

import type { InputState } from '../core/input';
import { h, ListNav, type Layer, button } from './ui';

export class Dialogue implements Layer {
  readonly el = h('div', 'dlg-layer');
  readonly isBreak = false;
  private box = h('div', 'dlg panel');
  private portrait = h('div', 'dlg-portrait');
  private nameEl = h('div', 'dlg-name');
  private textEl = h('div', 'dlg-text');
  private choicesEl = h('div', 'dlg-choices');
  private next = h('div', 'dlg-next', '▼');
  private full = '';
  private shown = 0;
  private resolveLine: (() => void) | null = null;
  private resolveChoice: ((i: number) => void) | null = null;
  private nav: ListNav | null = null;
  /** Characters per second; Infinity shows lines at once. */
  speed = 55;

  constructor() {
    const body = h('div', 'dlg-body');
    body.append(this.nameEl, this.textEl, this.choicesEl);
    this.box.append(this.portrait, body, this.next);
    this.el.appendChild(this.box);
    this.box.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.advance();
    });
    this.textEl.setAttribute('aria-live', 'polite');
  }

  get typing(): boolean {
    return this.shown < this.full.length;
  }

  say(name: string | null, text: string, portrait: HTMLCanvasElement | null): Promise<void> {
    this.nameEl.textContent = name ?? '';
    this.nameEl.hidden = !name;
    this.portrait.replaceChildren();
    if (portrait) this.portrait.appendChild(portrait);
    this.box.classList.toggle('no-portrait', !portrait);
    this.choicesEl.replaceChildren();
    this.nav = null;
    this.full = text;
    this.shown = Number.isFinite(this.speed) ? 0 : text.length;
    this.render();
    return new Promise((res) => (this.resolveLine = res));
  }

  choose(options: string[]): Promise<number> {
    this.choicesEl.replaceChildren();
    const buttons = options.map((label, i) =>
      button(label, () => {
        const r = this.resolveChoice;
        this.resolveChoice = null;
        this.choicesEl.replaceChildren();
        this.nav = null;
        r?.(i);
      }, 'btn choice'),
    );
    this.choicesEl.append(...buttons);
    this.nav = new ListNav(buttons);
    this.next.hidden = true;
    return new Promise((res) => (this.resolveChoice = res));
  }

  private render(): void {
    this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
    this.next.hidden = this.typing || !!this.nav;
  }

  private advance(): void {
    if (this.nav) return;
    if (this.typing) {
      this.shown = this.full.length;
      this.render();
      return;
    }
    const r = this.resolveLine;
    this.resolveLine = null;
    r?.();
  }

  update(input: InputState, dt: number): void {
    if (this.typing) {
      this.shown = Math.min(this.full.length, this.shown + (this.speed * dt) / 1000);
      this.render();
    }
    if (this.nav) {
      this.nav.update(input);
      return;
    }
    if (input.consume('interact') || input.consume('back')) this.advance();
  }
}
