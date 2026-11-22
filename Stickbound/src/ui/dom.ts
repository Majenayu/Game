// Tiny DOM helpers and keyboard/gamepad menu navigation (buttons are real <button>s, so Tab and Enter also work).

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function html(tag: keyof HTMLElementTagNameMap, cls: string, inner: string): HTMLElement {
  const e = h(tag, cls);
  e.innerHTML = inner;
  return e;
}

let clickSound: (() => void) | null = null;
export function setClickSound(fn: () => void): void {
  clickSound = fn;
}

export function btn(label: string, onClick: () => void, cls = 'btn', title?: string): HTMLButtonElement {
  const b = h('button', cls);
  b.type = 'button';
  b.innerHTML = label;
  if (title) b.title = title;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    clickSound?.();
    onClick();
  });
  return b;
}

/** Arrow keys and the gamepad d-pad move focus between visible buttons; Escape / B goes back. */
export class MenuNav {
  private back: (() => void) | null = null;
  private padPrev = 0;
  enabled = true;

  constructor(private root: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled || document.body.dataset.screen === 'fight') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT') {
        if (e.key === 'Escape') t.blur();
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (this.back) {
          e.preventDefault();
          this.back();
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this.move(e.key);
      }
    });
    const poll = () => {
      requestAnimationFrame(poll);
      if (!this.enabled || document.body.dataset.screen === 'fight') return;
      const pad = navigator.getGamepads?.()[0];
      if (!pad) return;
      let bits = 0;
      [12, 13, 14, 15, 0, 1].forEach((i, k) => pad.buttons[i]?.pressed && (bits |= 1 << k));
      if ((pad.axes[1] ?? 0) < -0.6) bits |= 1;
      if ((pad.axes[1] ?? 0) > 0.6) bits |= 2;
      if ((pad.axes[0] ?? 0) < -0.6) bits |= 4;
      if ((pad.axes[0] ?? 0) > 0.6) bits |= 8;
      const edge = bits & ~this.padPrev;
      this.padPrev = bits;
      if (edge & 1) this.move('ArrowUp');
      if (edge & 2) this.move('ArrowDown');
      if (edge & 4) this.move('ArrowLeft');
      if (edge & 8) this.move('ArrowRight');
      if (edge & 16) (document.activeElement as HTMLElement | null)?.click();
      if (edge & 32) this.back?.();
    };
    requestAnimationFrame(poll);
  }

  setBack(fn: (() => void) | null): void {
    this.back = fn;
  }

  focusFirst(): void {
    const first = this.items().find((b) => b.classList.contains('primary')) ?? this.items()[0];
    first?.focus({ preventScroll: true });
  }

  private items(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>('button:not([disabled]), [data-nav]')].filter((e) => e.offsetParent !== null);
  }

  private move(key: string): void {
    const items = this.items();
    if (!items.length) return;
    const cur = document.activeElement as HTMLElement;
    const i = items.indexOf(cur);
    if (i < 0) return items[0]!.focus();
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const q = it.getBoundingClientRect();
      const dx = q.left + q.width / 2 - cx;
      const dy = q.top + q.height / 2 - cy;
      const ok = key === 'ArrowUp' ? dy < -4 : key === 'ArrowDown' ? dy > 4 : key === 'ArrowLeft' ? dx < -4 : dx > 4;
      if (!ok) continue;
      const d = key === 'ArrowUp' || key === 'ArrowDown' ? Math.abs(dy) + Math.abs(dx) * 2 : Math.abs(dx) + Math.abs(dy) * 2;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    (best ?? items[(i + (key === 'ArrowUp' || key === 'ArrowLeft' ? items.length - 1 : 1)) % items.length])!.focus();
  }
}

export function toast(text: string, ms = 2200): void {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = h('div', 'toasts');
    document.getElementById('ui')!.appendChild(box);
  }
  const el = h('div', 'toast', text);
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}
