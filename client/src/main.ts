import Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import {
  LEVELS,
  RECONNECT_SECONDS,
  WORLD_H,
  WORLD_W,
  powerupFromId,
  powerupName,
  randomNick,
  sanitizeNick,
  type LevelDef,
  type ModeId,
} from '@orb/shared';
import { sfx } from './audio';
import { GameScene, type RoundResult } from './game/GameScene';
import { OfflineSource, OnlineSource } from './game/sources';
import { LevelRunner } from './meta/campaign';
import { Progress } from './meta/economy';
import { Pages, type PageName } from './meta/pages';
import { joinArena, reconnect, serverUrls, type JoinTarget } from './net';
import { createPlatform, showMidgameAd, showRewardedAd, type Platform } from './platform/crazygames';
import { TouchControls, isTouchDevice } from './ui/touch';
import { Ui } from './ui/ui';

async function boot(): Promise<void> {
  const platform = await createPlatform();
  platform.loadingStart();

  const progress = new Progress(platform);
  await progress.init();

  const ui = new Ui();
  const touch = new TouchControls();

  const scene = new GameScene();
  scene.ui = ui;
  scene.touch = touch;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#0b0e1a',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
    input: { mouse: { preventDefaultWheel: true }, touch: { capture: true } },
    scene,
  });
  (window as any).__orbGame = game;
  (window as any).__orbProgress = progress;

  // ---- identity -----------------------------------------------------------
  const user = await platform.getUser();
  let nick = sanitizeNick(
    user?.username ?? (progress.data.nick || localStorage.getItem('orb.nick')) ?? randomNick(),
  );
  ui.setNick(nick);
  const readNick = (raw: string): string => {
    const n = sanitizeNick(raw);
    progress.data.nick = n;
    ui.setNick(n);
    return user ? user.username : n;
  };

  // ---- meta status ----------------------------------------------------------
  const refreshStatus = () => {
    const l = progress.level;
    ui.setStatus(l.level, l.into, l.need, progress.data.coins);
    ui.setBadge('daily', progress.dailyStatus().canClaim);
    ui.setBadge('spin', progress.spinStatus().free);
    progress.ensureQuests();
    const q = [...progress.data.quests.list, ...progress.data.quests.weekList];
    ui.setBadge(
      'quests',
      q.some((x) => {
        const d = progress.questDef(x.id);
        return !!d && !x.claimed && x.progress >= d.target;
      }),
    );
  };
  progress.onChange(refreshStatus);
  refreshStatus();

  // ---- audio --------------------------------------------------------------
  const syncMute = () => {
    sfx.setPlatformMuted(platform.muteAudio);
    ui.setMuted(sfx.muted);
  };
  syncMute();
  platform.onSettingsChange(syncMute);
  ui.onMuteToggle = () => {
    sfx.unlock();
    sfx.setUserMuted(!sfx.userMuted);
    syncMute();
  };
  const unlock = () => sfx.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // ---- gameplay events for the SDK ------------------------------------------
  let playingFlag = false;
  let sdkPlaying = false;
  const applyPlaying = () => {
    const want = playingFlag && !document.hidden;
    if (want === sdkPlaying) return;
    sdkPlaying = want;
    if (want) platform.gameplayStart();
    else platform.gameplayStop();
  };

  let campaignActive = false;
  let offlinePractice = false;

  scene.hooks = {
    onPlayingChange: (p) => {
      playingFlag = p;
      applyPlaying();
    },
    onRoundEnd: (r: RoundResult) => {
      void showMidgameAd(platform);
      if (campaignActive || !r.me) return '';
      const res = progress.recordMatch(
        { mode: r.mode, kills: r.me.kills, deaths: r.me.deaths, score: r.me.score, won: r.won },
        offlinePractice ? 0.5 : 1,
      );
      res.levelsGained.forEach((l) => ui.notify(`Level up! Level ${l}`, '#ffc93c', 4000));
      if (r.won) ui.notify('Victory!', '#ffc93c', 4000);
      return `<div class="reward">+${res.coins} coins &middot; +${res.xp} XP${r.won ? ' &middot; Victory bonus!' : ''}${offlinePractice ? ' (practice rewards are halved)' : ''}</div>`;
    },
    onEvent: (ev, me) => {
      if (campaignActive) return;
      if (ev.t === 'kill' && ev.by === me && ev.id !== me) progress.track('kills', 1);
      else if (ev.t === 'skill' && ev.id === me) progress.track('skills', 1);
      else if (ev.t === 'coin' && ev.id === me) {
        progress.track('coins', ev.v);
        progress.data.stats.coinsCollected += ev.v;
      } else if (ev.t === 'pickup' && ev.id === me) {
        progress.track('pickups', 1);
        if (progress.discover(ev.pu)) {
          const pu = powerupFromId(ev.pu);
          if (pu) ui.notify(`New powerup discovered: ${powerupName(pu)}`, '#80d8ff', 3500);
        }
      }
    },
  };
  document.addEventListener('visibilitychange', () => {
    sfx.setHidden(document.hidden);
    applyPlaying();
  });

  // ---- session flow ---------------------------------------------------------
  let current: Room | null = null;
  let intentionalLeave = false;
  let sessionId = 0;
  let runner: LevelRunner | null = null;

  const showHowTo = () =>
    ui.showHint(
      (isTouchDevice()
        ? '<b>Left stick</b> to move &middot; <b>Right stick</b> to aim and shoot &middot; buttons for skills'
        : '<b>WASD</b> move &middot; <b>Mouse</b> aim &middot; <b>Click</b> shoot &middot; <b>Space / E</b> skills') +
        '<br />Grab glowing powerups. Highest score wins!',
    );

  const endSession = async () => {
    sessionId++;
    intentionalLeave = true;
    runner?.stop();
    runner = null;
    campaignActive = false;
    offlinePractice = false;
    scene.suppressBoard = false;
    ui.setObjective('');
    const r = current;
    current = null;
    if (r) {
      try {
        await r.leave(true);
      } catch {
        /* already closed */
      }
      platform.leftRoom();
    }
    scene.setSource(null);
    touch.setEnabled(false);
    document.body.dataset.mode = '';
    document.body.dataset.room = '';
  };

  const toMenu = async () => {
    await endSession();
    ui.showMenu();
    refreshStatus();
  };

  const loadoutOf = () => progress.data.loadout;

  const startOffline = async (rawName: string, mode: ModeId, mapId: string) => {
    const name = readNick(rawName);
    await endSession();
    offlinePractice = true;
    scene.setSource(new OfflineSource(name, loadoutOf(), { mode, mapId }));
    document.body.dataset.mode = 'offline';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    showHowTo();
  };

  const startLevel = async (level: LevelDef) => {
    const name = readNick(ui.nickValue());
    await endSession();
    campaignActive = true;
    scene.suppressBoard = true;
    const src = new OfflineSource(name, loadoutOf(), {
      mode: level.mode,
      mapId: level.map,
      seats: level.bots + 1,
      botSkill: level.skill,
      autoRestart: false,
      boss: level.boss === true,
      roundTime: level.time,
    });
    scene.setSource(src);
    document.body.dataset.mode = 'campaign';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    ui.notify(`Level ${level.id}: ${level.name}`, '#4dd2ff', 3500);
    runner = new LevelRunner(level, src, ui, (res) => {
      const reward = res.won ? progress.finishLevel(level, res.stars) : null;
      if (res.won) sfx.reward();
      const starHtml = [1, 2, 3]
        .map((i) => `<span class="star ${i <= res.stars ? 'on' : ''}" style="font-size:32px">&#9733;</span>`)
        .join('');
      const next = LEVELS.find((l) => l.id === level.id + 1);
      const buttons = [
        ...(res.won && next ? [{ label: 'Next level', onClick: () => void startLevel(next) }] : []),
        {
          label: res.won ? 'Replay' : 'Try again',
          ghost: res.won && !!next,
          onClick: () => void startLevel(level),
        },
        { label: 'Campaign', ghost: true, onClick: () => void toMenu().then(() => pages.open('campaign')) },
        { label: 'Menu', ghost: true, onClick: () => void toMenu() },
      ];
      ui.showOverlayHtml(
        `<h2 style="margin:0;color:${res.won ? '#ffc93c' : '#ff8a9a'}">${res.won ? 'Level complete!' : 'Level failed'}</h2>
         <div>${starHtml}</div>
         ${reward ? `<div style="color:#ffc93c;margin-top:6px">+${reward.coins} coins &middot; +${reward.xp} XP</div>` : '<div class="sub">Try a different loadout or skills.</div>'}`,
        buttons,
      );
      reward?.levelsGained.forEach((l) => ui.notify(`Level up! Level ${l}`, '#ffc93c', 4000));
    });
    runner.start();
  };

  const runOnline = (room: Room, serverIndex: number, name: string, target: JoinTarget, firstJoin = true) => {
    const mySession = sessionId;
    current = room;
    intentionalLeave = false;
    const src = new OnlineSource(room);
    scene.setSource(src);
    document.body.dataset.mode = 'online';
    document.body.dataset.room = room.roomId;
    ui.hideOverlay();
    ui.showGame();
    ui.setInviteVisible(true);
    ui.onInvite = () => void shareInvite(room, serverIndex);
    touch.setEnabled(true);
    if (firstJoin) showHowTo();
    platform.updateRoom({
      roomId: room.roomId,
      isJoinable: true,
      inviteParams: { roomId: room.roomId, server: String(serverIndex) },
    });
    room.onLeave(() => {
      if (mySession !== sessionId || intentionalLeave || current !== room) return;
      void handleDrop(room, serverIndex, name, target);
    });
    room.onError(() => {
      /* surfaced through onLeave */
    });
  };

  const shareInvite = async (room: Room, serverIndex: number) => {
    const link = platform.inviteLink({ roomId: room.roomId, server: String(serverIndex) });
    if (!link) return ui.toast('Invite link not available');
    try {
      await navigator.clipboard.writeText(link);
      ui.toast('Invite link copied! Send it to a friend.');
    } catch {
      ui.toast(link);
    }
    window.setTimeout(() => ui.toast(''), 4000);
  };

  const handleDrop = async (room: Room, serverIndex: number, name: string, target: JoinTarget) => {
    const mySession = sessionId;
    ui.showOverlay('Reconnecting...');
    const urls = serverUrls();
    const back = await reconnect(room, urls[serverIndex] ?? urls[0], RECONNECT_SECONDS);
    if (mySession !== sessionId) {
      void back?.leave();
      return;
    }
    if (back) {
      runOnline(back, serverIndex, name, target, false);
      return;
    }
    current = null;
    scene.setSource(null);
    touch.setEnabled(false);
    platform.leftRoom();
    ui.showOverlay('Connection lost.', [
      { label: 'Rejoin', onClick: () => void startOnline(name, { ...target, roomId: undefined }) },
      { label: 'Practice offline', ghost: true, onClick: () => void startOffline(name, 'dm', 'neon') },
      { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
    ]);
  };

  const startOnline = async (rawName: string, target: JoinTarget = {}) => {
    const name = readNick(rawName);
    await endSession();
    const mySession = sessionId;
    ui.showGame();
    ui.setInviteVisible(false);
    ui.showOverlay('Connecting...');
    const full: JoinTarget = { ...target, loadout: loadoutOf() };
    try {
      const { room, serverIndex } = await joinArena(name, full);
      if (mySession !== sessionId) {
        void room.leave();
        return;
      }
      runOnline(room, serverIndex, name, full);
    } catch (e) {
      console.warn('join failed', e);
      if (mySession !== sessionId) return;
      ui.showOverlay('Could not reach the game server.', [
        {
          label: 'Retry',
          onClick: () => void startOnline(name, full.roomId ? { ...full, roomId: undefined } : full),
        },
        { label: 'Practice offline', ghost: true, onClick: () => void startOffline(name, 'dm', 'neon') },
        { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
      ]);
    }
  };

  // ---- pages --------------------------------------------------------------------
  const pages: Pages = new Pages(ui, progress, {
    playOnline: (mode, map) => {
      pages.close();
      void startOnline(ui.nickValue(), { mode, map });
    },
    playOffline: (mode, map) => {
      pages.close();
      void startOffline(ui.nickValue(), mode, map);
    },
    startLevel: (level) => {
      pages.close();
      void startLevel(level);
    },
    watchAd: () => showRewardedAd(platform),
  });
  ui.onPage = (name) => pages.open(name as PageName);
  ui.onPageClose = () => {
    pages.close();
    ui.showMenu();
    refreshStatus();
  };
  progress.onChange(() => {
    if (pages.current && pages.current !== 'spin') pages.render();
  });

  ui.onPlay = (raw) => void startOnline(raw, { mode: 'mix', map: 'rotate' });
  ui.onPractice = (raw) => void startOffline(raw, 'dm', 'neon');
  ui.onLeave = () => void toMenu();
  ui.onSkill = (slot) => scene.queueSkill(slot);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pages.current) ui.onPageClose();
    else if (scene.hasSource) void toMenu();
  });
  window.addEventListener('pagehide', () => progress.flush());

  const inviteTarget = (params: Pick<Platform, 'getInviteParam'>): JoinTarget | null => {
    const roomId = params.getInviteParam('roomId');
    if (!roomId || !/^[A-Za-z0-9_-]{4,32}$/.test(roomId)) return null;
    const idx = Number(params.getInviteParam('server'));
    return { roomId, serverIndex: Number.isInteger(idx) && idx >= 0 ? idx : undefined };
  };
  platform.onJoinRoom((p) => {
    const roomId = p?.roomId;
    if (!roomId || !/^[A-Za-z0-9_-]{4,32}$/.test(String(roomId))) return;
    const idx = Number(p.server);
    void startOnline(nick, { roomId: String(roomId), serverIndex: Number.isInteger(idx) ? idx : undefined });
  });

  // wait for the first scene frame so the canvas is ready
  await new Promise<void>((resolve) => {
    if (game.isRunning && game.scene.isActive('game')) resolve();
    else game.events.once(Phaser.Core.Events.READY, () => resolve());
  });
  platform.loadingStop();

  const invite = inviteTarget(platform);
  if (invite) void startOnline(nick, invite);
  else if (platform.isInstantMultiplayer) void startOnline(nick, { createPrivate: true });
  else {
    ui.showMenu();
    if (progress.dailyStatus().canClaim) ui.notify('Your daily reward is ready!', '#ffc93c', 4000);
  }
  nick = nick || '';
}

void boot();
