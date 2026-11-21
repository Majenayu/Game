// Talewild entry point: platform, services, UI, Phaser game, input wiring and test hooks.

import Phaser from 'phaser';
import './ui/styles.css';
import { attachKeyboard, GamepadPoller } from './core/input';
import { GameContext, setContext } from './game/context';
import { GameFlow, getDialogue, getUi } from './game/flow';
import { applySettingsToDocument } from './game/settings';
import { createPlatform } from './platform/index';
import type { BasePlatform } from './platform/types';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { DebugPanel } from './ui/debug';
import { TouchControls } from './ui/touch';
import { Ui } from './ui/ui';

declare global {
  interface Window {
    __tw: Record<string, unknown> & { ready: boolean };
  }
}

async function start(): Promise<void> {
  window.__tw = { ready: false };
  const platform = await createPlatform();
  const ctx = new GameContext(platform);
  setContext(ctx);
  applySettingsToDocument(ctx.settings);

  const uiRoot = document.getElementById('ui')!;
  const ui = new Ui(uiRoot);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#14112a',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    input: { keyboard: false, gamepad: false },
    audio: { noAudio: true },
    banner: false,
    scene: [BootScene, TitleScene, WorldScene],
  });

  const flow = new GameFlow(game, ctx, ui);
  attachKeyboard(ctx.input, () => ctx.settings.keys);
  const pads = new GamepadPoller(ctx.input);

  if (TouchControls.wanted()) uiRoot.appendChild(new TouchControls(ctx.input).el);
  window.addEventListener('touchstart', () => {
    if (!uiRoot.querySelector('.touch')) uiRoot.appendChild(new TouchControls(ctx.input).el);
  }, { once: true, passive: true });

  const world = () => game.scene.getScene('world') as WorldScene;
  const debug = new DebugPanel(ctx, {
    teleport: (map, x, y, facing) => world().scene.isActive() && world().teleport(map, x, y, facing),
    fps: () => game.loop.actualFps,
    where: () => (world().scene.isActive() ? world().where() : 'title'),
  });
  uiRoot.appendChild(debug.el);

  // UI and pads run before the scenes each frame; one-shot presses are cleared after.
  game.events.on(Phaser.Core.Events.PRE_STEP, (_time: number, delta: number) => {
    pads.poll();
    if (ctx.input.consume('debug')) debug.toggle();
    if (flow.pauseOpen && ctx.input.consume('menu')) flow.resume();
    ui.update(ctx.input, delta);
    debug.update(delta);
  });
  game.events.on(Phaser.Core.Events.POST_STEP, () => ctx.input.endFrame());

  window.addEventListener('blur', () => {
    ctx.input.releaseAll();
    flow.focusLost();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ctx.input.releaseAll();
      flow.focusLost();
    }
  });

  // Read-only hooks for end-to-end tests; teleport only in debug mode.
  Object.assign(window.__tw, {
    state: () => {
      const s = ctx.session;
      const dlg = getDialogue().el.isConnected ? getDialogue().el.querySelector('.dlg-text')?.textContent ?? '' : null;
      return {
        scene: game.scene.isActive('world') ? 'world' : game.scene.isActive('title') ? 'title' : 'boot',
        map: s?.player.map ?? null,
        x: s?.player.x ?? null,
        y: s?.player.y ?? null,
        facing: s?.player.facing ?? null,
        slot: s?.slot ?? null,
        flags: s ? { ...s.state.flags } : {},
        bag: s ? { ...s.state.bag } : {},
        uiBusy: getUi().busy,
        dialogue: dlg,
        scripting: game.scene.isActive('world') && world().isScripting,
        paused: flow.pauseOpen,
      };
    },
    platformLog: () => [...(platform as BasePlatform).log],
    debug: ctx.debug ? { teleport: (map: string, x: number, y: number, facing: 'up' | 'down' | 'left' | 'right') => world().teleport(map, x, y, facing) } : undefined,
  });
}

void start().catch((e) => {
  console.error(e);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'Talewild could not start. Please reload the page.';
});
