// Menu screens built from small "views" inside one layer: title, story slots, character creation, settings,
// bag, backup code and the pause menu. Back always returns to the previous view.

import type { InputState } from '../core/input';
import { t } from '../core/i18n';
import { exportCode, importCode, SLOTS, type Look, type Slot, type SlotSummary } from '../core/save';
import { DEFAULT_LOOK, HAIR_COLOURS, HAIR_STYLES, OUTFITS, SKINS } from '../content/looks';
import type { GameContext } from '../game/context';
import { cleanName } from '../game/session';
import { applySettingsToDocument } from '../game/settings';
import { buildCharacterSheet, CHAR_H, CHAR_W } from '../render/characters';
import { button, h, ListNav, type Layer } from './ui';

export interface Flow {
  newStory(slot: Slot, name: string, look: Look): void;
  loadStory(slot: Slot): void;
  resume(): void;
  quitToTitle(): void;
}

interface View {
  title: string;
  render(body: HTMLElement): HTMLElement[];
  /** Left/right on the focused row (character creation). */
  side?: (focused: HTMLElement, dir: -1 | 1) => void;
}

const rowHandlers = new WeakMap<HTMLElement, (dir: -1 | 1) => void>();

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export class MenuLayer implements Layer {
  readonly el: HTMLElement;
  private panel = h('div', 'panel menu');
  private titleEl = h('h2', 'menu-title');
  private body = h('div', 'menu-body');
  private views: View[] = [];
  private nav = new ListNav([], () => this.back());

  constructor(
    cls: string,
    readonly isBreak: boolean,
    private onEmpty: () => void,
  ) {
    this.el = h('div', `menu-layer ${cls}`);
    this.panel.append(this.titleEl, this.body);
    this.el.appendChild(this.panel);
  }

  open(view: View): void {
    this.views.push(view);
    this.render();
  }

  replace(view: View): void {
    this.views.pop();
    this.open(view);
  }

  back(): void {
    if (this.views.length <= 1) return this.onEmpty();
    this.views.pop();
    this.render();
  }

  render(keepFocus = false): void {
    const v = this.views[this.views.length - 1];
    if (!v) return;
    this.titleEl.textContent = v.title;
    this.titleEl.hidden = !v.title;
    this.body.replaceChildren();
    const focusables = v.render(this.body);
    this.nav.setItems(focusables, keepFocus);
  }

  update(input: InputState): void {
    const v = this.views[this.views.length - 1];
    const focused = this.nav.items[this.nav.index];
    if (v?.side && focused) {
      if (input.consume('left')) v.side(focused, -1);
      if (input.consume('right')) v.side(focused, 1);
    }
    this.nav.update(input);
  }
}

// ---- shared views -----------------------------------------------------------------------------------------------

function slotButton(s: SlotSummary | null, slot: Slot, onPick: () => void): HTMLButtonElement {
  const b = button('', onPick, 'btn slot');
  const title = h('div', 'slot-title', s ? `${t('slot.label', { n: slot })}: ${s.name}` : t('slot.empty'));
  b.appendChild(title);
  if (s) {
    const info = `${t(`map.${s.map}`)} · ${formatTime(s.playMs)} · ${new Date(s.savedAt).toLocaleDateString()}${s.fromBackup ? ` · ${t('slot.backup')}` : ''}`;
    b.appendChild(h('div', 'slot-info', info));
  }
  b.dataset.slot = String(slot);
  return b;
}

export function slotsView(ctx: GameContext, mode: 'new' | 'load' | 'save', onPick: (slot: Slot) => void): View {
  let confirm: Slot | null = null;
  return {
    title: mode === 'load' ? t('slot.title.load') : mode === 'new' ? t('slot.title.new') : t('menu.save'),
    render(body) {
      const list = ctx.saves.list();
      const buttons = SLOTS.map((slot, i) => {
        const s = list[i] ?? null;
        const b = slotButton(s, slot, () => {
          if (mode === 'load' && !s) return;
          const isCurrent = mode === 'save' && ctx.session?.slot === slot;
          if (s && mode !== 'load' && !isCurrent && confirm !== slot) {
            confirm = slot;
            b.classList.add('confirm');
            b.querySelector('.slot-title')!.textContent = t('slot.overwrite');
            return;
          }
          onPick(slot);
        });
        if (mode === 'load' && !s) b.classList.add('disabled');
        return b;
      });
      body.append(...buttons);
      return buttons;
    },
  };
}

export function settingsView(ctx: GameContext, rerender: () => void): View {
  const s = ctx.settings;
  const cycle = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length]!;
  const apply = () => {
    ctx.persistSettings();
    applySettingsToDocument(ctx.settings);
    rerender();
  };
  return {
    title: t('settings.title'),
    render(body) {
      const rows: [string, string, () => void][] = [
        [t('settings.textSize'), t(`settings.textSize.${s.textSize}`), () => (s.textSize = cycle(['normal', 'large'] as const, s.textSize))],
        [t('settings.textSpeed'), t(`settings.textSpeed.${s.textSpeed}`), () => (s.textSpeed = cycle(['slow', 'normal', 'fast'] as const, s.textSpeed))],
        [t('settings.run'), t(s.runToggle ? 'settings.run.toggle' : 'settings.run.hold'), () => (s.runToggle = !s.runToggle)],
        [t('settings.motion'), t(s.reducedMotion ? 'on' : 'off'), () => (s.reducedMotion = !s.reducedMotion)],
      ];
      const buttons = rows.map(([label, value, change]) => {
        const b = button('', () => {
          change();
          apply();
        }, 'btn setting');
        b.append(h('span', 'setting-label', label), h('span', 'setting-value', value));
        return b;
      });
      body.append(...buttons);
      return buttons;
    },
  };
}

function lookRow(label: string, get: () => number, count: number, set: (v: number) => void, redraw: () => void): HTMLElement {
  const row = h('div', 'btn look-row');
  const value = h('span', 'look-value', `${get() + 1} / ${count}`);
  const change = (d: -1 | 1) => {
    set((get() + d + count) % count);
    value.textContent = `${get() + 1} / ${count}`;
    redraw();
  };
  const left = button('◀', () => change(-1), 'arrow');
  const right = button('▶', () => change(1), 'arrow');
  row.append(h('span', 'look-label', label), left, value, right);
  row.addEventListener('click', () => change(1));
  rowHandlers.set(row, change);
  return row;
}

export function createView(onBegin: (name: string, look: Look) => void): View {
  const look: Look = { ...DEFAULT_LOOK };
  let name = t('create.defaultName');
  return {
    title: t('create.title'),
    side: (el, d) => rowHandlers.get(el)?.(d),
    render(body) {
      const preview = h('canvas', 'preview') as HTMLCanvasElement;
      preview.width = CHAR_W * 3;
      preview.height = CHAR_H * 3;
      const redraw = () => {
        const sheet = buildCharacterSheet(look);
        const c = preview.getContext('2d')!;
        c.imageSmoothingEnabled = false;
        c.clearRect(0, 0, preview.width, preview.height);
        c.drawImage(sheet, 0, 0, CHAR_W, CHAR_H, 0, 0, preview.width, preview.height);
      };
      const field = h('label', 'btn name-field');
      const input = h('input', 'name-input') as HTMLInputElement;
      input.value = name;
      input.maxLength = 16;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', t('create.name'));
      input.addEventListener('input', () => {
        const c = cleanName(input.value);
        if (c !== input.value) input.value = c;
        name = c;
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') input.blur();
      });
      field.append(h('span', 'look-label', t('create.name')), input);
      field.addEventListener('click', () => input.focus());
      const rows = [
        lookRow(t('create.skin'), () => look.skin, SKINS.length, (v) => (look.skin = v), redraw),
        lookRow(t('create.hair'), () => look.hair, HAIR_COLOURS.length, (v) => (look.hair = v), redraw),
        lookRow(t('create.style'), () => look.hairStyle, HAIR_STYLES.length, (v) => (look.hairStyle = v), redraw),
        lookRow(t('create.outfit'), () => look.outfit, OUTFITS.length, (v) => (look.outfit = v), redraw),
      ];
      const begin = button(t('create.start'), () => onBegin(cleanName(name) || t('create.defaultName'), { ...look }), 'btn primary');
      begin.id = 'begin';
      const form = h('div', 'create-form');
      form.append(field, ...rows, begin);
      const wrap = h('div', 'create');
      wrap.append(preview, form);
      body.append(wrap, h('div', 'hint', t('create.namehint')));
      redraw();
      return [field, ...rows, begin];
    },
  };
}

export function bagView(ctx: GameContext): View {
  return {
    title: t('menu.bag'),
    render(body) {
      const bag = ctx.session?.state.bag ?? {};
      const entries = Object.entries(bag);
      if (!entries.length) body.appendChild(h('p', 'hint', t('bag.empty')));
      const list = h('ul', 'bag');
      for (const [item, n] of entries) list.appendChild(h('li', '', `${t(`item.${item}`)} x${n}`));
      body.appendChild(list);
      return [];
    },
  };
}

export function codeView(ctx: GameContext, flow: Flow, layer: MenuLayer): View {
  return {
    title: t('code.title'),
    render(body) {
      body.appendChild(h('p', 'hint', t('code.help')));
      const out = h('textarea', 'code') as HTMLTextAreaElement;
      out.readOnly = true;
      out.value = ctx.session ? exportCode(ctx.session.toSave()) : '';
      const copy = button(t('code.copy'), () => {
        out.select();
        void navigator.clipboard?.writeText(out.value).catch(() => document.execCommand('copy'));
      });
      const paste = h('textarea', 'code paste') as HTMLTextAreaElement;
      paste.placeholder = t('code.paste');
      const msg = h('p', 'hint');
      const restore = button(t('code.import'), () => {
        try {
          const data = importCode(paste.value);
          const slot = ctx.session?.slot ?? 1;
          ctx.saves.write(slot, data);
          msg.textContent = t('code.ok', { n: slot });
          flow.loadStory(slot);
        } catch (e) {
          msg.textContent = t('code.bad', { why: (e as Error).message });
        }
        layer.render(true);
      });
      body.append(out, copy, paste, restore, msg);
      return [copy, restore];
    },
  };
}

// ---- title and pause --------------------------------------------------------------------------------------------

export function titleLayer(ctx: GameContext, flow: Flow): MenuLayer {
  const layer = new MenuLayer('title', true, () => {});
  const root: View = {
    title: '',
    render(body) {
      const logo = h('div', 'logo');
      logo.append(h('h1', '', t('game.title')), h('p', 'tagline', t('game.tagline')));
      body.appendChild(logo);
      const latest = ctx.saves.latest();
      const items: HTMLButtonElement[] = [];
      if (latest) {
        const c = button(t('title.continue'), () => flow.loadStory(latest.slot), 'btn primary');
        c.id = 'continue';
        items.push(c);
      }
      const n = button(t('title.new'), () =>
        layer.open(slotsView(ctx, 'new', (slot) => layer.open(createView((name, look) => flow.newStory(slot, name, look))))),
      latest ? 'btn' : 'btn primary');
      n.id = 'new-story';
      items.push(n);
      if (latest) items.push(button(t('title.load'), () => layer.open(slotsView(ctx, 'load', (slot) => flow.loadStory(slot)))));
      items.push(button(t('title.settings'), () => layer.open(settingsView(ctx, () => layer.render(true)))));
      body.append(...items, h('p', 'version', t('title.version')));
      return items;
    },
  };
  layer.open(root);
  return layer;
}

export function pauseLayer(ctx: GameContext, flow: Flow): MenuLayer {
  const layer: MenuLayer = new MenuLayer('pause', true, () => flow.resume());
  layer.open({
    title: t('menu.title'),
    render(body) {
      const items = [
        button(t('menu.resume'), () => flow.resume(), 'btn primary'),
        button(t('menu.save'), () =>
          layer.open(
            slotsView(ctx, 'save', (slot) => {
              const ok = ctx.save(slot);
              if (!ok) layer.render(true);
              else flow.resume();
            }),
          ),
        ),
        button(t('menu.load'), () => layer.open(slotsView(ctx, 'load', (slot) => flow.loadStory(slot)))),
        button(t('menu.bag'), () => layer.open(bagView(ctx))),
        button(t('menu.settings'), () => layer.open(settingsView(ctx, () => layer.render(true)))),
        button(t('menu.code'), () => layer.open(codeView(ctx, flow, layer))),
        button(t('menu.quit'), () => flow.quitToTitle()),
      ];
      items[1]!.id = 'menu-save';
      body.append(...items);
      return items;
    },
  });
  return layer;
}

/** Shown when the window loses focus: the world freezes until the player comes back. */
export class FocusPause implements Layer {
  readonly el = h('div', 'focus-pause');
  readonly isBreak = false;

  constructor(private onResume: () => void) {
    this.el.appendChild(h('div', 'panel', t('paused')));
    this.el.addEventListener('pointerdown', () => this.onResume());
  }

  update(input: InputState): void {
    for (const a of ['interact', 'back', 'menu', 'up', 'down', 'left', 'right'] as const) if (input.consume(a)) return this.onResume();
  }
}
