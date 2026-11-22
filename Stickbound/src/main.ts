// Entry: platform, settings and profile, keyboard, the Phaser game (backdrop + fight scenes), DOM menus on top.
import Phaser from 'phaser';
import './ui/styles.css';
import { audio } from './audio/synth';
import { attachKeyboard } from './core/input';
import { createPlatform } from './platform';
import { loadSettings, settings } from './meta/settings';
import { app, initProfile, saveProfile } from './app/state';
import { autopilot, currentFight, fightScene } from './app/fights';
import { BackdropScene } from './scenes/BackdropScene';
import { FightScene } from './scenes/FightScene';
import { setClickSound } from './ui/dom';
import { clickSound, initRouter, currentScreen } from './ui/router';
import { showStarter, showTitle, tutorialFight } from './ui/screens/firstRun';
import { showLobby } from './ui/screens/lobby';
import { h } from './ui/dom';

declare global {
  interface Window {
    __ek?: Record<string, unknown>;
  }
}

async function boot(): Promise<void> {
  const platform = await createPlatform();
  platform.loadingStart();
  loadSettings(platform.storage);
  audio.musicVol = settings.musicVol;
  audio.sfxVol = settings.sfxVol;
  initProfile(platform);
  attachKeyboard();

  const ui = document.getElementById('ui')!;
  const screens = h('div', '');
  screens.id = 'screens';
  ui.appendChild(screens);
  initRouter();
  setClickSound(clickSound);

  app.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0d1430',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    audio: { noAudio: true },
    banner: false,
    scene: [BackdropScene, FightScene],
  });
  await new Promise<void>((r) => app.game!.events.once('ready', () => r()));
  document.getElementById('boot')?.remove();
  platform.loadingStop();

  // audio needs a user gesture
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: false, passive: true });
  window.addEventListener('keydown', unlock, { once: false });

  // portal mute and ads pause/mute the game
  if (platform.isMuted()) audio.setMuted('platform', true);
  platform.onMuteChange((m) => audio.setMuted('platform', m));
  platform.onAdState((playing) => {
    audio.setMuted('ad', playing);
    if (playing) fightScene()?.forcePause();
  });
  document.addEventListener('visibilitychange', () => {
    audio.setMuted('hidden', document.hidden);
    if (document.hidden) {
      fightScene()?.forcePause();
      saveProfile();
    }
  });
  window.addEventListener('elementick:pause', (e) => {
    if ((e as CustomEvent<boolean>).detail) platform.gameplayStop();
    else platform.gameplayStart();
  });
  window.addEventListener('pagehide', () => saveProfile());
  // no page scroll / zoom gestures on the game
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // test hooks (used by the Playwright tests; harmless for players)
  window.__ek = {
    app,
    screen: () => currentScreen(),
    autopilot,
    inFight: () => !!currentFight(),
    match: () => currentFight()?.setup.match ?? null,
    platformLog: () => (platform as unknown as { log?: string[] }).log ?? [],
  };

  const p = app.profile;
  if (!p.avatars.length) showTitle(showStarter);
  else if (!p.tutorialDone) showTitle(tutorialFight);
  else showTitle(showLobby);
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Something went wrong while loading. Please reload the page.';
});
