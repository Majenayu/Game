// Entry: platform, settings and profile, keyboard, the Phaser game (backdrop + fight scenes), DOM menus on top.
import Phaser from 'phaser';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import './ui/styles.css';
import './ui/theme.css';
import { audio } from './audio/synth';
import { attachKeyboard } from './core/input';
import { createPlatform } from './platform';
import { loadSettings, settings } from './meta/settings';
import { app, initProfile, saveProfile } from './app/state';
import { autopilot, currentFight, fightScene, startFight } from './app/fights';
import { ELEMENT_IDS } from './content/elements';
import { ARCHETYPE_IDS } from './content/archetypes';
import { ARENAS } from './render/arenas';
import { stickSpec } from './sim/stats';
import { createMatch } from './sim/step';
import { BackdropScene } from './scenes/BackdropScene';
import { FightScene } from './scenes/FightScene';
import { setClickSound } from './ui/dom';
import { clickSound, initRouter, currentScreen } from './ui/router';
import { showStarter, tutorialFight } from './ui/screens/firstRun';
import { showLobby } from './ui/screens/lobby';
import { showAvatars } from './ui/screens/avatars';
import { playChampion, showChampionRoad } from './ui/screens/champion';
import { showRanked } from './ui/screens/ranked';
import { showShop } from './ui/screens/shop';
import { showSettings } from './ui/screens/settings';
import { showZombie } from './ui/screens/zombie';
import { showTraining } from './ui/screens/training';
import { showLocal } from './ui/screens/local';
import { h } from './ui/dom';
import { TouchPad } from './ui/touchPad';
import { showCover } from './ui/cover';

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
  TouchPad.device = platform.deviceType();

  const ui = document.getElementById('ui')!;
  const screens = h('div', '');
  screens.id = 'screens';
  ui.appendChild(screens);
  initRouter();
  setClickSound(clickSound);
  // the Power Lab is a dev page drawn on canvases only; it does not start the Phaser game
  if (new URLSearchParams(location.search).has('powers')) {
    document.getElementById('boot')?.remove();
    platform.loadingStop();
    if (new URLSearchParams(location.search).has('rigs')) {
      const { showRigSheet } = await import('./ui/rigSheet');
      showRigSheet();
      return;
    }
    const { showPowerLab } = await import('./ui/powerLab');
    showPowerLab();
    return;
  }

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
  // iOS interrupts the AudioContext when the app is backgrounded; it may only resume inside a gesture
  document.addEventListener('touchend', unlock, { passive: true });

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
    show: (id: string) => {
      const map: Record<string, () => void> = { lobby: showLobby, avatars: () => showAvatars(), road: showChampionRoad, ranked: showRanked, shop: showShop, settings: () => showSettings(), zombie: showZombie, training: showTraining, local: showLocal };
      if (id.startsWith('vs:')) playChampion(Number(id.slice(3)), showChampionRoad);
      else if (id.startsWith('avatars:')) showAvatars(id.slice(8));
      else map[id]?.();
    },
    /** bot vs bot fight that returns to the lobby (memory soak and fps tests) */
    botFight: (i: number) => {
      const el = (k: number) => ELEMENT_IDS[(i * 3 + k * 7) % ELEMENT_IDS.length]!;
      const st = (k: number) => ARCHETYPE_IDS[(i + k * 2) % 3]!;
      const m = createMatch({ mode: 'duel', teamA: [stickSpec('Kira', el(0), 30, [], false, undefined, st(0)), stickSpec('Dax', el(1), 30, [], false, undefined, st(1))], teamB: [stickSpec('Mona', el(2), 30, [], false, undefined, st(2)), stickSpec('Vito', el(3), 30, [], false, undefined, st(3))], seed: i + 1, bots: [5, 5] });
      startFight({ match: m, arena: ARENAS[i % ARENAS.length]!.id, labels: ['Kira', 'Mona'], music: 'fight', input: 'solo', done: () => showLobby() });
      autopilot(5);
    },
    cover: (kind: 'landscape' | 'portrait' | 'square') => showCover(kind),
    platformLog: () => (platform as unknown as { log?: string[] }).log ?? [],
  };

  const p = app.profile;
  // Champion Road is the game's progression; CrazyGames asks for it on load as well as when it changes
  if (p.champion.cleared.length) platform.reportProgress((p.champion.cleared.length / 41) * 100);
  // new players land in gameplay: one click on an element starts the first fight (CrazyGames: at most 1 click)
  if (!p.avatars.length) showStarter();
  else if (!p.tutorialDone) tutorialFight();
  else showLobby();
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Something went wrong while loading. Please reload the page.';
});
