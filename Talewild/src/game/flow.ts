// Moves the game between title, new story, loading, playing and pause. Owns the shared UI objects.

import type Phaser from 'phaser';
import { t } from '../core/i18n';
import type { Look, Slot } from '../core/save';
import { Dialogue } from '../ui/dialogue';
import { FocusPause, pauseLayer, titleLayer, type Flow, type MenuLayer } from '../ui/menus';
import type { Ui } from '../ui/ui';
import type { GameContext } from './context';
import { Session } from './session';

let ui: Ui;
let dialogue: Dialogue;
let flow: GameFlow;

export const getUi = (): Ui => ui;
export const getDialogue = (): Dialogue => dialogue;
export const getFlow = (): GameFlow => flow;

export class GameFlow implements Flow {
  private pause: MenuLayer | null = null;
  private title: MenuLayer | null = null;
  readonly focusPause: FocusPause;

  constructor(
    private game: Phaser.Game,
    private ctx: GameContext,
    theUi: Ui,
  ) {
    ui = theUi;
    dialogue = new Dialogue();
    flow = this;
    ui.onBreakChange = (d) => ctx.addBreak(d);
    this.focusPause = new FocusPause(() => this.unfocusPause());
  }

  showTitle(): void {
    ui.clear();
    this.ctx.setWorldActive(false);
    this.game.scene.stop('world');
    if (!this.game.scene.isActive('title')) this.game.scene.start('title');
    this.title = titleLayer(this.ctx, this);
    ui.push(this.title);
  }

  newStory(slot: Slot, name: string, look: Look): void {
    const ch = this.ctx.chapter;
    const sp = ch.maps[ch.startMap]!.spawn(ch.startSpawn)!;
    this.ctx.session = new Session({ name, look, map: ch.startMap, x: sp.x, y: sp.y, facing: sp.facing }, slot);
    if (!this.ctx.save(slot)) ui.toast(t('toast.saveFailed'));
    this.enterWorld();
  }

  loadStory(slot: Slot): void {
    const r = this.ctx.saves.read(slot);
    if (!r) {
      ui.toast(t('toast.saveFailed'));
      return;
    }
    const session = Session.fromSave(r.data, slot);
    const ch = this.ctx.chapter;
    const map = ch.maps[session.player.map];
    // A save pointing at a map that no longer exists (or a blocked tile) goes back to the chapter start.
    if (!map || map.isSolid(session.player.x, session.player.y)) {
      const sp = ch.maps[ch.startMap]!.spawn(ch.startSpawn)!;
      session.player = { ...session.player, map: ch.startMap, x: sp.x, y: sp.y, facing: sp.facing };
    }
    this.ctx.session = session;
    this.enterWorld();
  }

  private enterWorld(): void {
    ui.clear();
    this.pause = null;
    this.title = null;
    this.game.scene.stop('title');
    this.game.scene.start('world');
  }

  openPause(): void {
    if (this.pause && ui.has(this.pause)) return;
    this.pause = pauseLayer(this.ctx, this);
    ui.push(this.pause);
  }

  get pauseOpen(): boolean {
    return !!this.pause && ui.has(this.pause);
  }

  resume(): void {
    if (this.pause) ui.remove(this.pause);
    this.pause = null;
    this.ctx.input.endFrame();
  }

  quitToTitle(): void {
    this.ctx.autosave();
    this.ctx.session = null;
    this.showTitle();
  }

  focusLost(): void {
    if (!this.ctx.worldActive || ui.busy) return;
    this.ctx.focusPaused = true;
    ui.push(this.focusPause);
  }

  private unfocusPause(): void {
    this.ctx.focusPaused = false;
    ui.remove(this.focusPause);
    this.ctx.input.endFrame();
  }
}
