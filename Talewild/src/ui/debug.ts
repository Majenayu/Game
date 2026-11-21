// Hidden debug mode (?debug=1, or always in `npm run dev`). F9 toggles the panel.
// Tools: performance overlay, map validator, teleport, flag toggler, save inspector, platform event log.

import type { Dir } from '../core/input';
import type { GameContext } from '../game/context';
import type { BasePlatform } from '../platform/types';
import { validateMaps } from '../world/validate';
import { button, h } from './ui';

export interface DebugHooks {
  teleport(map: string, x: number, y: number, facing: Dir): void;
  fps(): number;
  where(): string;
}

export class DebugPanel {
  readonly el = h('div', 'debug');
  private perf = h('div', 'debug-perf');
  private body = h('div', 'debug-body');
  private open = false;
  private frameMs: number[] = [];

  constructor(
    private ctx: GameContext,
    private hooks: DebugHooks,
  ) {
    this.el.append(this.perf, this.body);
    this.el.hidden = !ctx.debug;
    this.perf.addEventListener('click', () => this.toggle());
  }

  toggle(): void {
    if (!this.ctx.debug) return;
    this.open = !this.open;
    this.el.classList.toggle('open', this.open);
    if (this.open) this.renderBody();
  }

  /** Called every frame. */
  update(dt: number): void {
    if (!this.ctx.debug) return;
    this.frameMs.push(dt);
    if (this.frameMs.length > 60) this.frameMs.shift();
    if (this.frameMs.length % 15 !== 0) return;
    const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
    const worst = Math.max(...this.frameMs);
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    this.perf.textContent = `${this.hooks.fps().toFixed(0)} fps · ${avg.toFixed(1)} ms avg · ${worst.toFixed(0)} ms worst${mem ? ` · ${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : ''} · ${this.hooks.where()}`;
  }

  private section(title: string, ...children: HTMLElement[]): HTMLElement {
    const s = h('section');
    s.append(h('h4', '', title), ...children);
    return s;
  }

  renderBody(): void {
    const ctx = this.ctx;
    this.body.replaceChildren();
    if (!ctx.chapter) {
      this.body.appendChild(h('p', '', 'Chapter not loaded yet.'));
      return;
    }
    const issues = validateMaps(ctx.chapter.maps, ctx.chapter.scripts, ctx.chapter.startMap, ctx.chapter.startSpawn);
    const v = h('ul');
    if (!issues.length) v.appendChild(h('li', 'ok', 'All maps valid: warps matched, everything reachable, scripts present.'));
    for (const i of issues) v.appendChild(h('li', 'bad', `${i.map}: ${i.message}`));

    const tp = h('div', 'debug-grid');
    for (const map of Object.values(ctx.chapter.maps))
      for (const o of map.objects)
        if (o.kind === 'spawn') tp.appendChild(button(`${map.id}:${o.name}`, () => this.hooks.teleport(map.id, o.x, o.y, o.facing), 'mini'));

    const flags = h('div', 'debug-grid');
    const known = new Set(['got_letter', 'met_mara', 'met_fisher', ...Object.keys(ctx.session?.state.flags ?? {})]);
    for (const f of known) {
      const on = !!ctx.session?.state.flags[f];
      flags.appendChild(
        button(`${on ? '☑' : '☐'} ${f}`, () => {
          ctx.session?.state.set(f, !on);
          this.renderBody();
        }, 'mini'),
      );
    }

    const save = h('pre', 'debug-json', ctx.session ? JSON.stringify(ctx.session.toSave(), null, 1) : 'no session');
    const slots = h('pre', 'debug-json', JSON.stringify(ctx.saves.list(), null, 1));
    const log = h('pre', 'debug-json', ((ctx.platform as BasePlatform).log ?? []).slice(-20).join('\n'));
    this.body.append(
      button('Refresh', () => this.renderBody(), 'mini'),
      this.section('Map validator', v),
      this.section('Teleport', tp),
      this.section('Flags', flags),
      this.section('Current state', save),
      this.section('Save slots', slots),
      this.section(`Platform (${ctx.platform.name}) events`, log),
    );
  }
}
