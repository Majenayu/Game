// Shared services for scenes and UI: platform, saves, settings, input, the current session and chapter.

import { bus } from '../core/events';
import { InputState } from '../core/input';
import { SaveManager, type Slot } from '../core/save';
import type { LoadedChapter } from '../core/loader';
import type { Platform } from '../platform/types';
import { loadSettings, saveSettings, type Settings } from './settings';
import type { Session } from './session';

export class GameContext {
  readonly input = new InputState();
  readonly saves: SaveManager;
  settings: Settings;
  session: Session | null = null;
  chapter!: LoadedChapter;
  /** True while the world scene is running (not title). */
  worldActive = false;
  /** Number of open UI layers that are a gameplay break (menus, title). */
  private breaks = 0;
  /** Window lost focus: the world freezes, but no gameplayStop is sent (portals handle focus loss). */
  focusPaused = false;
  debug: boolean;

  constructor(readonly platform: Platform) {
    this.saves = new SaveManager(platform.storage);
    this.settings = loadSettings(platform.storage);
    const q = new URLSearchParams(location.search);
    this.debug = q.has('debug') || import.meta.env.DEV;
  }

  persistSettings(): void {
    saveSettings(this.platform.storage, this.settings);
  }

  addBreak(delta: 1 | -1): void {
    this.breaks = Math.max(0, this.breaks + delta);
    this.updateGameplay();
  }

  setWorldActive(on: boolean): void {
    this.worldActive = on;
    this.updateGameplay();
  }

  private updateGameplay(): void {
    if (this.worldActive && this.breaks === 0) this.platform.gameplayStart();
    else this.platform.gameplayStop();
  }

  /** Saves the session to a slot. Returns false (and keeps the old save) if writing fails. */
  save(slot: Slot, auto = false): boolean {
    if (!this.session) return false;
    try {
      this.saves.write(slot, this.session.toSave());
      this.session.slot = slot;
      bus.emit('save:written', { slot, auto });
      return true;
    } catch (e) {
      console.error('save failed', e);
      return false;
    }
  }

  autosave(): boolean {
    const slot = this.session?.slot;
    return slot ? this.save(slot, true) : false;
  }
}

let ctx: GameContext | null = null;

export function setContext(c: GameContext): void {
  ctx = c;
}

export function getContext(): GameContext {
  if (!ctx) throw new Error('game context not ready');
  return ctx;
}
