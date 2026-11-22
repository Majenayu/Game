// Menu screens are plain DOM over the Phaser backdrop. One screen at a time lives in #screens.
import { audio } from '../audio/synth';
import { app } from '../app/state';
import { btn, h, MenuNav } from './dom';

export interface Screen {
  id: string;
  el: HTMLElement;
  back?: () => void;
  /** called when the screen is removed */
  leave?: () => void;
}

let nav: MenuNav | null = null;
let cur: Screen | null = null;
const coinEls = new Set<HTMLElement>();

export function screensRoot(): HTMLElement {
  return document.getElementById('screens')!;
}

export function initRouter(): void {
  nav = new MenuNav(document.getElementById('ui')!);
}

export function show(s: Screen): void {
  cur?.leave?.();
  cur = s;
  coinEls.forEach((e) => !e.isConnected && coinEls.delete(e));
  const root = screensRoot();
  root.replaceChildren(s.el);
  s.el.classList.add('screen', `scr-${s.id}`);
  document.body.dataset.screen = s.id;
  nav?.setBack(s.back ?? null);
  root.scrollTop = 0;
  requestAnimationFrame(() => nav?.focusFirst());
}

export function currentScreen(): string {
  return cur?.id ?? '';
}

/** Refresh every visible coin counter. */
export function refreshCoins(): void {
  for (const e of coinEls) e.textContent = app.profile.coins.toLocaleString('en-US');
}

export function coinBadge(): HTMLElement {
  const b = h('div', 'coins');
  b.innerHTML = '<span class="coin-ico" aria-hidden="true"></span>';
  const n = h('span', 'coin-n', app.profile.coins.toLocaleString('en-US'));
  coinEls.add(n);
  b.appendChild(n);
  b.setAttribute('aria-label', 'Coins');
  return b;
}

/** Standard screen frame: header with back button, title and coins; scrollable body. */
export function frame(id: string, title: string, back: (() => void) | null): { el: HTMLElement; body: HTMLElement; head: HTMLElement } {
  const el = h('div', 'frame');
  const head = h('header', 'frame-head');
  if (back) {
    const b = btn('<span aria-hidden="true">‹</span> Back', back, 'btn back');
    b.setAttribute('aria-label', 'Back');
    head.appendChild(b);
  }
  head.appendChild(h('h1', '', title));
  head.appendChild(coinBadge());
  const body = h('div', 'frame-body');
  el.append(head, body);
  el.dataset.id = id;
  return { el, head, body };
}

export function clickSound(): void {
  audio.sfx('ui');
}
