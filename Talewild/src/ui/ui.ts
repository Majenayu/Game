// DOM user interface on top of the game canvas. Layers stack; only the top layer receives input.
// Every menu works with keyboard, gamepad, mouse and touch through the same InputState actions.

import type { InputState } from '../core/input';

export interface Layer {
  el: HTMLElement;
  /** Menus are gameplay breaks (portal gameplayStop); dialogue and the focus-pause overlay are not. */
  isBreak: boolean;
  update(input: InputState, dt: number): void;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(label: string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  const b = h('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** Keyboard/gamepad focus over a list of buttons (vertical, or a grid with `columns`). */
export class ListNav {
  index = 0;

  constructor(
    public items: HTMLElement[],
    private onBack?: () => void,
    private columns = 1,
  ) {
    this.items.forEach((el, i) => el.addEventListener('pointerenter', () => this.focus(i)));
    this.focus(0);
  }

  setItems(items: HTMLElement[], keepIndex = false): void {
    this.items = items;
    items.forEach((el, i) => el.addEventListener('pointerenter', () => this.focus(i)));
    this.focus(keepIndex ? Math.min(this.index, items.length - 1) : 0);
  }

  focus(i: number): void {
    if (!this.items.length) return;
    this.index = (i + this.items.length) % this.items.length;
    this.items.forEach((el, j) => el.classList.toggle('focus', j === this.index));
  }

  update(input: InputState): void {
    if (!this.items.length) return;
    if (input.consume('up')) this.focus(this.index - this.columns);
    if (input.consume('down')) this.focus(this.index + this.columns);
    if (this.columns > 1) {
      if (input.consume('left')) this.focus(this.index - 1);
      if (input.consume('right')) this.focus(this.index + 1);
    }
    if (input.consume('interact')) (this.items[this.index] as HTMLElement).click();
    if (input.consume('back') && this.onBack) this.onBack();
  }
}

export class Ui {
  readonly root: HTMLElement;
  private stack: Layer[] = [];
  private toastBox: HTMLElement;
  onChange: (busy: boolean) => void = () => {};
  onBreakChange: (delta: 1 | -1) => void = () => {};

  constructor(root: HTMLElement) {
    this.root = root;
    this.toastBox = h('div', 'toasts');
    root.appendChild(this.toastBox);
  }

  get busy(): boolean {
    return this.stack.length > 0;
  }

  get top(): Layer | undefined {
    return this.stack[this.stack.length - 1];
  }

  has(layer: Layer): boolean {
    return this.stack.includes(layer);
  }

  push(layer: Layer): void {
    if (this.has(layer)) return;
    this.stack.push(layer);
    this.root.appendChild(layer.el);
    if (layer.isBreak) this.onBreakChange(1);
    this.changed();
  }

  remove(layer: Layer): void {
    const i = this.stack.indexOf(layer);
    if (i < 0) return;
    this.stack.splice(i, 1);
    layer.el.remove();
    if (layer.isBreak) this.onBreakChange(-1);
    this.changed();
  }

  clear(): void {
    for (const l of [...this.stack]) this.remove(l);
  }

  private changed(): void {
    this.root.classList.toggle('busy', this.busy);
    this.onChange(this.busy);
  }

  update(input: InputState, dt: number): void {
    this.top?.update(input, dt);
  }

  toast(text: string, ms = 2200): void {
    const el = h('div', 'toast', text);
    this.toastBox.appendChild(el);
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }
}
