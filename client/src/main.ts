import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/bangers/latin-400.css';
import Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import {
  BOSS_LEVELS,
  LEVELS,
  RECONNECT_SECONDS,
  CHAMPION_LEVEL_ID,
  TOWER_FIRST_ID,
  rankedTier,
  WORLD_H,
  WORLD_W,
  getSkill,
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
import { LobbyPanel } from './game/lobby';
import { LevelRunner } from './meta/campaign';
import { showOnboarding } from './meta/onboarding';
import { Progress, type SkillDrop } from './meta/economy';
import { Pages, type PageName } from './meta/pages';
import { joinArena, joinDuel, reconnect, serverUrls, type JoinTarget } from './net';
import { DuelScene, OfflineDuel, OnlineDuel, type DuelSource } from './game/duel';
import { createPlatform, showMidgameAd, showRewardedAd, type Platform } from './platform/crazygames';
import { TouchControls, isTouchDevice } from './ui/touch';
import { Ui } from './ui/ui';

async function boot(): Promise<void> {
  const platform = await createPlatform();
  platform.loadingStart();
  await Promise.all([
    document.fonts.load('700 17px Rajdhani'),
    document.fonts.load('900 24px Cinzel'),
    document.fonts.load('400 30px Bangers'),
  ]).catch(() => {});

  const progress = new Progress(platform);
  await progress.init();

  const ui = new Ui();
  const touch = new TouchControls();

  const scene = new GameScene();
  scene.ui = ui;
  scene.touch = touch;
  const duelScene = new DuelScene();
  duelScene.ui = ui;
  duelScene.touch = touch;
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
    scene: [scene, duelScene],
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

  const dropText = (d?: SkillDrop): string =>
    d
      ? `${getSkill(d.skillId).name} (${d.rank})${d.merged ? `, merged to level ${d.level}` : ' found!'}`
      : '';
  /** Skills the local player used in the running match, for mastery. */
  const uses = new Map<number, number>();
  const flushMastery = () => {
    if (uses.size) progress.addMastery(uses);
    uses.clear();
  };

  let campaignActive = false;
  let offlinePractice = false;
  let rankedActive = false;

  const lobby = new LobbyPanel(ui, progress);
  scene.hooks = {
    onFrame: (snap, me, players) => lobby.frame(snap, me, players, scene.activeSource),
    onPlayingChange: (p) => {
      playingFlag = p;
      sfx.intense = p;
      applyPlaying();
    },
    onRoundEnd: (r: RoundResult) => {
      void showMidgameAd(platform);
      flushMastery();
      if (campaignActive || !r.me) return '';
      let rankedHtml = '';
      if (rankedActive) {
        const rk = progress.recordRanked(r.won);
        const tier = rankedTier(rk.rating);
        rankedHtml = `<div class="reward">Ranked: ${rk.delta >= 0 ? '+' : ''}${rk.delta} &middot; ${rk.rating} (${tier.name})</div>`;
        if (rk.drop) ui.notify(`Ranked drop: ${dropText(rk.drop)}`, '#b77dff', 4500);
      }
      const res = progress.recordMatch(
        { mode: r.mode, kills: r.me.kills, deaths: r.me.deaths, score: r.me.score, won: r.won },
        offlinePractice ? 0.5 : 1,
      );
      res.levelsGained.forEach((l) => ui.notify(`Level up! Level ${l}`, '#ffc93c', 4000));
      if (r.won) ui.notify('Victory!', '#ffc93c', 4000);
      if (res.drop) ui.notify(`Skill drop: ${dropText(res.drop)}`, '#b77dff', 4500);
      return `<div class="reward">+${res.coins} coins &middot; +${res.xp} XP${r.won ? ' &middot; Victory bonus!' : ''}${offlinePractice ? ' (practice rewards are halved)' : ''}</div>${rankedHtml}`;
    },
    onEvent: (ev, me) => {
      if (ev.t === 'skill' && ev.id === me) uses.set(ev.skill, (uses.get(ev.skill) ?? 0) + 1);
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
        : '<b>WASD</b> move &middot; <b>Mouse</b> aim &middot; <b>Click</b> shoot &middot; <b>1-5</b> skills') +
        '<br />Grab glowing powerups. Highest score wins!',
    );

  const endSession = async () => {
    sessionId++;
    intentionalLeave = true;
    runner?.stop();
    runner = null;
    campaignActive = false;
    offlinePractice = false;
    rankedActive = false;
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
    if (duelScene.active) {
      duelScene.setSource(null);
      game.scene.sleep('duel');
      game.scene.wake('game');
    }
    touch.setEnabled(false);
    document.body.dataset.mode = '';
    document.body.dataset.room = '';
  };
  /** Ranked 1v1 duel (online) or a practice duel against a bot (offline). */
  const startDuel = async (online: boolean) => {
    const name = readNick(ui.nickValue());
    await endSession();
    const mySession = sessionId;
    let src: DuelSource;
    let room: Room | null = null;
    if (online) {
      ui.showGame();
      ui.showOverlay('Finding a ranked opponent...');
      try {
        room = (await joinDuel(name, loadoutOf(), progress.level.level)).room;
      } catch (e) {
        console.warn('duel join failed', e);
        ui.showOverlay('Could not reach the game server.', [
          { label: 'Practice duel vs bot', onClick: () => void startDuel(false) },
          { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
        ]);
        return;
      }
      if (mySession !== sessionId) {
        void room.leave();
        return;
      }
      current = room;
      intentionalLeave = false;
      src = new OnlineDuel(room);
    } else {
      src = new OfflineDuel(name, loadoutOf(), progress.loadoutInstances(), progress.level.level, 0.45);
    }
    ui.hideOverlay();
    game.scene.sleep('game');
    if (game.scene.isSleeping('duel')) game.scene.wake('duel');
    else game.scene.run('duel');
    duelScene.setSource(src);
    duelScene.onMatchEnd = (won) => {
      let line = '';
      if (online) {
        const rk = progress.recordRanked(won);
        line = `Ranked: ${rk.delta >= 0 ? '+' : ''}${rk.delta} &middot; ${rk.rating} (${rankedTier(rk.rating).name})`;
        if (rk.drop) ui.notify(`Ranked drop: ${dropText(rk.drop)}`, '#b77dff', 4500);
        if (won) progress.data.chests.silver += 1;
      }
      const res = progress.recordMatch({ mode: 'duel', kills: won ? 1 : 0, deaths: won ? 0 : 1, score: won ? 1 : 0, won }, online ? 1 : 0.5);
      window.setTimeout(() => {
        ui.showOverlayHtml(
          `<h2 style="margin:0;color:${won ? '#ffc93c' : '#ff8a9a'}">${won ? 'Victory!' : 'Defeat'}</h2><div class="reward">+${res.coins} coins &middot; +${res.xp} XP${online && won ? ' &middot; Silver Chest' : ''}</div>${line ? `<div class="reward">${line}</div>` : ''}`,
          [
            { label: online ? 'Next ranked duel' : 'Duel again', onClick: () => void startDuel(online) },
            { label: 'Menu', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
          ],
        );
      }, 1800);
    };
    document.body.dataset.mode = online ? 'duel' : 'duelpractice';
    ui.showDuel();
    touch.setEnabled(true);
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
    scene.setSource(
      new OfflineSource(name, loadoutOf(), { mode, mapId }, progress.loadoutInstances(), progress.level.level),
    );
    document.body.dataset.mode = 'offline';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    showHowTo();
  };

  /** Training ground: harmless dummies, fast mana, you cannot be knocked out. */
  const startTraining = async () => {
    const name = readNick(ui.nickValue());
    await endSession();
    offlinePractice = true;
    campaignActive = true;
    scene.setSource(
      new OfflineSource(
        name,
        loadoutOf(),
        { mode: 'dm', mapId: 'throne', seats: 4, training: true, roundTime: 600 },
        progress.loadoutInstances(),
        progress.level.level,
      ),
    );
    document.body.dataset.mode = 'offline';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    ui.setObjective('Training ground: try every skill on the dummies. Press Q for auto skills. Esc to leave.');
  };
  const startLevel = async (level: LevelDef) => {
    const name = readNick(ui.nickValue());
    await endSession();
    campaignActive = true;
    scene.suppressBoard = true;
    const src = new OfflineSource(
      name,
      loadoutOf(),
      {
        mode: level.mode,
        mapId: level.map,
        seats: level.bots + 1,
        botSkill: level.skill,
        autoRestart: false,
        boss: level.boss === true,
        roundTime: level.time,
        bossName: level.bossName,
        bossHp: level.bossHp,
        bossColor: level.bossColor,
        bossKit: level.id === CHAMPION_LEVEL_ID ? progress.championKit() : level.bossKit,
        bossDomain: level.bossDomain,
        bossFinal: level.bossFinal,
      },
      progress.loadoutInstances(),
      progress.level.level,
    );
    scene.setSource(src);
    document.body.dataset.mode = 'campaign';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    ui.notify(`Level ${level.id}: ${level.name}`, '#4dd2ff', 3500);
    runner = new LevelRunner(level, src, ui, (res) => {
      flushMastery();
      const reward = res.won ? progress.finishLevel(level, res.stars) : null;
      if (res.won) sfx.reward();
      const starHtml = [1, 2, 3]
        .map((i) => `<span class="star ${i <= res.stars ? 'on' : ''}" style="font-size:32px">&#9733;</span>`)
        .join('');
      const tower = level.id >= TOWER_FIRST_ID;
      const next = (tower ? BOSS_LEVELS : LEVELS).find((l) => l.id === level.id + 1);
      const buttons = [
        ...(res.won && next ? [{ label: 'Next level', onClick: () => void startLevel(next) }] : []),
        {
          label: res.won ? 'Replay' : 'Try again',
          ghost: res.won && !!next,
          onClick: () => void startLevel(level),
        },
        {
          label: tower ? 'Boss Tower' : 'Campaign',
          ghost: true,
          onClick: () => void toMenu().then(() => pages.open(tower ? 'tower' : 'campaign')),
        },
        { label: 'Menu', ghost: true, onClick: () => void toMenu() },
      ];
      ui.showOverlayHtml(
        `<h2 style="margin:0;color:${res.won ? '#ffc93c' : '#ff8a9a'}">${res.won ? 'Level complete!' : 'Level failed'}</h2>
         <div>${starHtml}</div>
         ${reward ? `<div style="color:#ffc93c;margin-top:6px">+${reward.coins} coins &middot; +${reward.xp} XP</div>` : '<div class="sub">Try a different loadout or skills.</div>'}`,
        buttons,
      );
      if (reward?.drop) ui.notify(`Skill drop: ${dropText(reward.drop)}`, '#b77dff', 4500);
      reward?.levelsGained.forEach((l) => ui.notify(`Level up! Level ${l}`, '#ffc93c', 4000));
      if (res.won && level.id === CHAMPION_LEVEL_ID) {
        // The new champion chooses one skill from the champion's kit.
        const kit = progress.championKit();
        ui.showOverlayHtml(
          `<h2 style="margin:0;color:#ffc93c">You defeated the champion!</h2><div class="sub">You are the new champion. Choose one skill from the champion's kit.</div>`,
          kit.map((id) => ({
            label: `${getSkill(id).name}`,
            onClick: () => {
              const d = progress.claimChampion(id);
              if (d) ui.notify(`Champion skill: ${dropText(d)}. A Legend Chest is waiting!`, '#ffc93c', 6000);
              void toMenu();
            },
          })),
        );
      }
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
    const full: JoinTarget = { ...target, loadout: loadoutOf(), level: progress.level.level };
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
    playTraining: () => {
      pages.close();
      void startTraining();
    },
    challengeChampion: () => {
      const ok = progress.canChallengeChampion();
      if (!ok.ok) return ui.notify(ok.reason ?? 'Not yet', '#ff8a9a');
      pages.close();
      void startLevel(BOSS_LEVELS.find((l) => l.id === CHAMPION_LEVEL_ID)!);
    },
    playRanked: () => {
      pages.close();
      void startDuel(true);
    },
    playDuelPractice: () => {
      pages.close();
      void startDuel(false);
    },
    playTeam2v2: () => {
      pages.close();
      void startOnline(ui.nickValue(), { ranked: true });
    },
    watchAd: () => showRewardedAd(platform),
  });
  ui.onPage = (name) => pages.open(name as PageName);
  ui.onChampion = () => {
    sfx.unlock();
    const ok = progress.canChallengeChampion();
    if (!ok.ok) return ui.notify(ok.reason ?? 'Not yet', '#ff8a9a');
    void startLevel(BOSS_LEVELS.find((l) => l.id === CHAMPION_LEVEL_ID)!);
  };
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
  ui.onEmote = (e) => scene.sendEmote(e);
  ui.onAuto = () => ui.setAuto(scene.toggleAuto());
  ui.setAuto(scene.autoSkills);
  ui.chatAllowed = !platform.disableChat;
  window.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && scene.hasSource && !pages.current) {
      ui.toggleEmotes();
      return;
    }
    if ((e.key === 'q' || e.key === 'Q') && scene.hasSource && !pages.current) {
      ui.setAuto(scene.toggleAuto());
      return;
    }
    if (e.key !== 'Escape') return;
    if (pages.current) ui.onPageClose();
    else if (scene.hasSource || duelScene.active) void toMenu();
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
    if (progress.needsProfile) {
      await showOnboarding(progress, nick);
      nick = sanitizeNick(progress.data.nick);
      ui.setNick(nick);
      ui.notify('Welcome! Your class skills are equipped. Try them in Training.', '#b77dff', 5000);
    }
    ui.showMenu();
    refreshStatus();
    ui.setChampion(progress.data.champion.name, progress.data.champion.isYou);
    if (progress.dailyStatus().canClaim) ui.notify('Your daily reward is ready!', '#ffc93c', 4000);
  }
  nick = nick || '';
}

void boot();
