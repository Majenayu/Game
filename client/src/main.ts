import Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import { RECONNECT_SECONDS, WORLD_H, WORLD_W, randomNick, sanitizeNick } from '@orb/shared';
import { sfx } from './audio';
import { GameScene } from './game/GameScene';
import { OfflineSource, OnlineSource } from './game/sources';
import { joinArena, reconnect, serverUrls, type JoinTarget } from './net';
import { createPlatform, showMidgameAd, type Platform } from './platform/crazygames';
import { TouchControls, isTouchDevice } from './ui/touch';
import { Ui } from './ui/ui';

const NICK_KEY = 'orb.nick';

async function boot(): Promise<void> {
  const platform = await createPlatform();
  platform.loadingStart();

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

  // ---- identity -----------------------------------------------------------
  const user = await platform.getUser();
  let nick = user?.username ?? localStorage.getItem(NICK_KEY) ?? randomNick();
  nick = sanitizeNick(nick);
  ui.setNick(nick);
  const readNick = (raw: string): string => {
    const n = sanitizeNick(raw);
    if (!user) localStorage.setItem(NICK_KEY, n);
    ui.setNick(n);
    return user ? user.username : n;
  };

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
  scene.hooks = {
    onPlayingChange: (p) => {
      playingFlag = p;
      applyPlaying();
    },
    onRoundEnd: () => {
      void showMidgameAd(platform);
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

  const endSession = async () => {
    sessionId++;
    intentionalLeave = true;
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
  };

  const showHowTo = () =>
    ui.showHint(
      (isTouchDevice()
        ? '<b>Left stick</b> to move &middot; <b>Right stick</b> to aim and shoot'
        : '<b>WASD</b> to move &middot; <b>Mouse</b> to aim &middot; <b>Click</b> to shoot') +
        '<br />Most kills in 90 seconds wins!',
    );

  const startOffline = async (rawName: string) => {
    const name = readNick(rawName);
    await endSession();
    scene.setSource(new OfflineSource(name));
    document.body.dataset.mode = 'offline';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    showHowTo();
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

  const runOnline = (room: Room, serverIndex: number, name: string, firstJoin = true) => {
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
      void handleDrop(room, serverIndex, name);
    });
    room.onError(() => {
      /* surfaced through onLeave */
    });
  };

  const handleDrop = async (room: Room, serverIndex: number, name: string) => {
    const mySession = sessionId;
    ui.showOverlay('Reconnecting...');
    const urls = serverUrls();
    const back = await reconnect(room, urls[serverIndex] ?? urls[0], RECONNECT_SECONDS);
    if (mySession !== sessionId) {
      void back?.leave();
      return;
    }
    if (back) {
      runOnline(back, serverIndex, name, false);
      return;
    }
    current = null;
    scene.setSource(null);
    touch.setEnabled(false);
    platform.leftRoom();
    ui.showOverlay('Connection lost.', [
      { label: 'Rejoin', onClick: () => void startOnline(name) },
      { label: 'Practice offline', ghost: true, onClick: () => void startOffline(name) },
      { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
    ]);
  };

  const startOnline = async (rawName: string, target: JoinTarget = {}) => {
    const name = readNick(rawName);
    await endSession();
    const mySession = sessionId;
    ui.showGame();
    ui.showOverlay('Connecting...');
    try {
      const { room, serverIndex } = await joinArena(name, target);
      if (mySession !== sessionId) {
        void room.leave();
        return;
      }
      runOnline(room, serverIndex, name);
    } catch (e) {
      console.warn('join failed', e);
      if (mySession !== sessionId) return;
      ui.showOverlay('Could not reach the game server.', [
        { label: 'Retry', onClick: () => void startOnline(name, target.roomId ? {} : target) },
        { label: 'Practice offline', ghost: true, onClick: () => void startOffline(name) },
        { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
      ]);
    }
  };

  ui.onPlay = (raw) => void startOnline(raw);
  ui.onPractice = (raw) => void startOffline(raw);
  ui.onLeave = () => void toMenu();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && scene.hasSource) void toMenu();
  });

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
  else ui.showMenu();
}

void boot();
