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
  WORLDS,
  worldOfLevel,
  TOWER_FIRST_ID,
  rankedTier,
  WORLD_H,
  WORLD_W,
  CHESTS,
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
import { claimName, showOnboarding } from './meta/onboarding';
import { accountToken, claimHold, facts, fetchMe, raidHit } from './account';
import { activeSummon, equippedGear, myStats, setGuildBonus } from './meta/inventory';
import { Ui as UiClass } from './ui/ui';
import { Progress, type SkillDrop } from './meta/economy';
import { Pages, type PageName } from './meta/pages';
import { joinArena, joinDuel, reconnect, serverUrls, type JoinTarget } from './net';
import { DuelScene, OfflineDuel, OnlineDuel, type DuelSource } from './game/duel';
import { createPlatform, showMidgameAd, showRewardedAd, type Platform } from './platform/crazygames';
import { TouchControls, isTouchDevice, setTouchDevice } from './ui/touch';
import { Ui } from './ui/ui';
import { presentation } from './presentation';
import { mountSettings } from './ui/settings';
import { mountJourney } from './ui/journey';
import './ui/refined-starforge.css?phase=5';

/**
 * Removes data from older versions (old save, old nickname). Opening the game with ?reset=1 wipes everything
 * this game stored in the browser, including the device token, for a completely fresh player.
 */
function cleanStorage(): void {
  try {
    const full = new URLSearchParams(location.search).get('reset') === '1';
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('orb.')) continue;
      if (full || k === 'orb.save2' || k === 'orb.nick') localStorage.removeItem(k);
    }
    if (full) history.replaceState(null, '', location.pathname);
  } catch {
    /* storage blocked */
  }
}

async function boot(): Promise<void> {
  cleanStorage();
  presentation.reload();
  const platform = await createPlatform();
  platform.loadingStart();
  await Promise.all([
    document.fonts.load('700 17px Rajdhani'),
    document.fonts.load('900 24px Cinzel'),
    document.fonts.load('400 30px Bangers'),
  ]).catch(() => {});

  if (platform.device) setTouchDevice(platform.device !== 'desktop');
  const progress = new Progress(platform);
  await progress.init();

  const ui = new Ui();
  mountSettings(ui);
  mountJourney(ui, progress);
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
    user?.username ?? (progress.data.nick || randomNick()),
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
  window.addEventListener('touchend', unlock, { passive: true });

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
  const adCallbacks = () => {
    let wasPlaying = false;
    return {
      adStarted: () => {
        wasPlaying = sdkPlaying;
        if (wasPlaying) platform.gameplayStop();
        sfx.setPlatformMuted(true);
      },
      adFinished: () => {
        sfx.setPlatformMuted(platform.muteAudio);
        if (wasPlaying) applyPlaying();
      },
      adError: (error?: unknown) => {
        sfx.setPlatformMuted(platform.muteAudio);
        if (wasPlaying) applyPlaying();
        if (error) console.warn('[CrazyGames ad]', error);
      },
    };
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
      void showMidgameAd(platform, adCallbacks());
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
      levelUps(res?.levelsGained ?? []);
      if (r.won) ui.notify('Victory!', '#ffc93c', 4000);
      if (res.drop) ui.notify(`Skill drop: ${dropText(res.drop)}`, '#b77dff', 4500);
      if (res.chest) ui.notify(`${CHESTS[res.chest].name} earned! Open it in Chests.`, '#ffc93c', 4500);
      return `<div class="reward">+${res.coins} coins &middot; +${res.xp} XP${res.chest ? ` &middot; ${CHESTS[res.chest].name}` : ''}${r.won ? ' &middot; Victory bonus!' : ''}${offlinePractice ? ' (practice rewards are halved)' : ''}</div>${rankedHtml}`;
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
        : UiClass.keycaps()) + '<br />Grab glowing powerups. Highest score wins!',
    );

  const endSession = async () => {
    sessionId++;
    intentionalLeave = true;
    runner?.stop();
    runner = null;
    campaignActive = false;
    offlinePractice = false;
    rankedActive = false;
    paused = false;
    duelScene.paused = false;
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
        room = (await joinDuel(name, { ...loadoutOf(), skillIds: progress.duelSkillIds() }, progress.level.level, accountToken())).room;
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
      src = new OfflineDuel(name, loadoutOf(), progress.duelInstances(), progress.level.level, 0.45);
    }
    ui.hideOverlay();
    game.scene.sleep('game');
    if (game.scene.isSleeping('duel')) game.scene.wake('duel');
    else game.scene.run('duel');
    duelScene.setSource(src);
    duelScene.onMatchEnd = (won) => {
      let extraChest = false;
      if (online) {
        const rk = progress.recordRanked(won);
        if (rk.drop) ui.notify(`Ranked drop: ${dropText(rk.drop)}`, '#b77dff', 4500);
        if (won) {
          progress.data.chests.silver += 1;
          extraChest = true;
        }
      }
      const res = progress.recordMatch({ mode: 'duel', kills: won ? 1 : 0, deaths: won ? 0 : 1, score: won ? 1 : 0, won }, online ? 1 : 0.5);
      window.setTimeout(() => {
        // The server's world rating wins over the local estimate.
        let line = '';
        const rated = src instanceof OnlineDuel ? src.rated : null;
        if (rated) {
          progress.data.ranked.rating = rated.rating;
          progress.data.ranked.best = Math.max(progress.data.ranked.best, rated.rating);
          progress.commit();
          line = `World rating ${rated.delta >= 0 ? '+' : ''}${rated.delta} &middot; ${rated.rating} (${rated.tier}) &middot; world #${rated.rank}`;
        } else if (online) line = `Rating ${progress.data.ranked.rating} (${rankedTier(progress.data.ranked.rating).name}) &middot; reserve your name to enter the world ranking`;
        const chests = [res.chest ? CHESTS[res.chest].name : '', extraChest ? 'Silver Chest' : ''].filter(Boolean).join(' + ');
        ui.showOverlayHtml(
          `<h2 style="margin:0;color:${won ? '#ffc93c' : '#ff8a9a'}">${won ? 'Victory!' : 'Defeat'}</h2><div class="reward">+${res.coins} coins &middot; +${res.xp} XP${chests ? ` &middot; ${chests}` : ''}</div>${line ? `<div class="reward">${line}</div>` : ''}`,
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
    if (!progress.data.profile.onboarded && progress.data.profile.cls) {
      // After the first tutorial: name, class and look.
      ui.showMenu();
      await showOnboarding(progress, progress.data.nick);
      ui.setNick(progress.data.nick);
    }
    ui.showMenu();
    refreshStatus();
  };

  const loadoutOf = () => progress.data.loadout;

  const startOffline = async (rawName: string, mode: ModeId, mapId: string) => {
    const name = readNick(rawName);
    await endSession();
    offlinePractice = true;
    scene.setSource(
      new OfflineSource(name, loadoutOf(), { mode, mapId }, progress.loadoutInstances(), progress.level.level, offlineExtra()),
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
        offlineExtra(),
      ),
    );
    document.body.dataset.mode = 'offline';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    ui.setObjective('Training ground: try every skill on the dummies. Press Q for auto skills. Use Leave to exit.');
  };
  /** Your stats and summon for offline matches. */
  const offlineExtra = () => ({ stats: myStats(progress).combat, summon: activeSummon(progress), gear: equippedGear(progress) });
  const levelUps = (levels: number[]) => {
    if (levels.length) ui.showLevelUp(levels[levels.length - 1], levels.length);
  };
  /** Guild raid: 60 seconds against the raid boss; your damage counts toward the guild's daily total. */
  const startRaid = async () => {
    const name = readNick(ui.nickValue());
    await endSession();
    campaignActive = true;
    scene.suppressBoard = true;
    const src = new OfflineSource(
      name,
      loadoutOf(),
      { mode: 'dm', mapId: 'throne', seats: 2, autoRestart: false, boss: true, bossName: 'Raid Boss', bossHp: 60, bossColor: 0xff4d5e, botLevel: 200, bossSkillScale: 0.2, roundTime: 60, noRespawn: true },
      progress.loadoutInstances(),
      progress.level.level,
      offlineExtra(),
    );
    scene.setSource(src);
    document.body.dataset.mode = 'raid';
    ui.showGame();
    ui.setInviteVisible(false);
    touch.setEnabled(true);
    ui.setObjective('Guild raid: deal as much damage as you can in 60 seconds');
    const t = window.setInterval(() => {
      const boss = Array.from(src.sim.players.values()).find((p) => p.boss);
      const me = src.sim.players.get(src.localId);
      if (!boss || !me) return;
      const done = src.sim.phase === 'scoreboard' || !me.alive || !boss.alive;
      if (!done) return;
      window.clearInterval(t);
      src.paused = true;
      const dmg = (boss.maxHp - Math.max(0, boss.hp)) * 10;
      void raidHit(dmg).then((r) =>
        ui.showOverlayHtml(
          `<h2 style="margin:0;color:#ffc93c">Raid over</h2><div class="reward">You dealt ${dmg} damage</div>${r.ok ? `<div class="sub">Guild total: ${r.max - r.hp} / ${r.max}${r.defeated ? ' &middot; BOSS DEFEATED! Claim your reward in Guilds.' : ''}</div>` : `<div class="sub">${r.reason ?? ''}</div>`}`,
          [{ label: 'Guilds', onClick: () => void toMenu().then(() => pages.open('guild')) }],
        ),
      );
    }, 300);
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
        seats: 2,
        noRespawn: true,
        autoRestart: false,
        botSkill: level.skill,
        boss: level.boss === true,
        roundTime: level.time,
        bossName: level.bossName,
        bossHp: level.bossHp,
        bossColor: level.bossColor,
        bossKit: level.id === CHAMPION_LEVEL_ID ? progress.championKit() : level.bossKit,
        bossDomain: level.bossDomain,
        bossFinal: level.bossFinal,
        // Campaign worlds: arena effect, element bonus and enemies that get tougher level by level.
        ...(level.id <= 88
          ? (() => {
              const w = WORLDS[worldOfLevel(level.id).world];
              const { world, index } = worldOfLevel(level.id);
              const you = progress.level.level;
              const curve = 1 + (level.id - 1) * 7 + (level.boss ? 25 : 0);
              // Enemy 1 of a map is a bit below your level, enemy 10 is above it; the boss is far above.
              const rel = level.boss ? you * (1.5 + world * 0.1) + 10 : you * (0.85 + index * 0.04 + world * 0.03);
              return {
                effect: w.effect,
                effectElement: w.element >= 0 ? w.element : undefined,
                botLevel: Math.min(1000, Math.round(Math.max(curve, rel))),
              };
            })()
          : { botLevel: level.id === CHAMPION_LEVEL_ID ? 1000 : 300 }),
        bossSkillScale: level.id === CHAMPION_LEVEL_ID ? 1.5 : 0.6 + 0.06 * worldOfLevel(Math.min(88, level.id)).world,
      },
      progress.loadoutInstances(),
      progress.level.level,
      offlineExtra(),
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
         ${res.won ? `<div class="sub">Hero HP remaining: ${Math.round(res.hpPercent)}% &middot; ${res.stars === 3 ? 'Perfect health clear!' : res.stars === 2 ? 'Strong clear!' : 'Cleared!'}</div>` : '<div class="sub">Your hero reached 0 HP.</div>'}
         ${reward ? `<div style="color:#ffc93c;margin-top:6px">+${reward.coins} coins &middot; +${reward.xp} XP${reward.stones ? ` &middot; +${reward.stones} fusion stones` : ''}${reward.bonus ? ` &middot; Map reward: ${reward.bonus}` : ''}</div>` : '<div class="sub">Try a different loadout or skills.</div>'}`,
        buttons,
      );
      if (reward?.drop) ui.notify(`Skill drop: ${dropText(reward.drop)}`, '#b77dff', 4500);
      if (reward?.chest) ui.notify(`${CHESTS[reward.chest].name} earned! Open it in Chests.`, '#ffc93c', 4500);
      levelUps(reward?.levelsGained ?? []);
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
    room.onMessage('rated', (r: { mode: string; rating: number; delta: number; tier: string; rank: number }) => {
      if (r.mode === '1v1') progress.data.ranked.rating = r.rating;
      progress.commit();
      ui.notify(`Ranked ${r.mode}: ${r.delta >= 0 ? '+' : ''}${r.delta} (${r.rating}, ${r.tier}) &middot; world #${r.rank}`, '#ffc93c', 5000);
    });
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
    const full: JoinTarget = {
      ...target,
      loadout: loadoutOf(),
      level: progress.level.level,
      token: accountToken(),
      gear: equippedGear(progress),
      summon: activeSummon(progress),
    };
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
      void startOnline(ui.nickValue(), { rankedMode: '2v2' });
    },
    playRankedArena: (mode) => {
      pages.close();
      void startOnline(ui.nickValue(), { rankedMode: mode });
    },
    startRaid: () => {
      pages.close();
      void startRaid();
    },
    joinWar: () => {
      pages.close();
      void startOnline(ui.nickValue(), { war: true });
    },
    watchAd: () => showRewardedAd(platform, adCallbacks()),
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
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      !document.getElementById('modal')!.hidden
    ) return;
    if ((e.key === 't' || e.key === 'T') && scene.hasSource && !pages.current) {
      ui.toggleEmotes();
      return;
    }
    // X toggles auto skills (same place on QWERTY and AZERTY). Escape is left to the browser (fullscreen).
    if (e.code === 'KeyX' && scene.hasSource && !pages.current) {
      ui.setAuto(scene.toggleAuto());
      return;
    }
    if (e.code === 'KeyP' && (scene.hasSource || duelScene.active) && !pages.current) togglePause();
  });
  let paused = false;
  const togglePause = () => {
    paused = !paused;
    const src = scene.activeSource;
    if (src instanceof OfflineSource && !runner) src.paused = paused;
    duelScene.paused = paused;
    if (paused)
      ui.showOverlay('Paused', [
        { label: 'Resume', onClick: () => togglePause() },
        { label: 'Leave match', ghost: true, onClick: () => void toMenu().then(() => ui.hideOverlay()) },
      ]);
    else ui.hideOverlay();
  };
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
    progress.onSkill((d) => {
      if (progress.data.profile.onboarded) ui.showSkillGain(d);
    });
    if (progress.needsProfile) {
      // CrazyGames: new players land in gameplay immediately. Start the tutorial right away with a
      // default kit; the "create your fighter" screen opens when they leave it.
      const first = (user?.username ?? nick).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
      progress.createProfile('warrior', { nick: first.length >= 3 ? first : nick, char: 'titan', color: 0, acc: 0 });
      void claimName(progress, progress.data.nick).then((err) => {
        if (err) void claimName(progress, (progress.data.nick + Math.floor(Math.random() * 999)).slice(0, 16));
      });
      void startTraining().then(() => {
        ui.showHint(UiClass.keycaps() + '<br />Try your skills on the dummies! Press <b>Leave</b> when you are ready.', 15000);
      });
      return;
    }
    if (!progress.data.profile.onboarded) {
      await showOnboarding(progress, nick);
      nick = sanitizeNick(progress.data.nick);
      ui.setNick(nick);
    }
    facts.cls = progress.data.profile.cls;
    facts.level = progress.level.level;
    void fetchMe().then((r) => {
      if (!r.ok) return;
      setGuildBonus(r.player.guild?.buff?.bonus);
      if (r.player.pending?.length)
        void claimHold().then((c) => {
          if (!c.ok) return;
          for (const rw of c.rewards) {
            const d = rw.rank === 'U' ? progress.grantUnique() : progress.grantSkillOfRank(rw.rank as never);
            ui.notify(`World rank reward (top ${rw.bracket} for 30 days): ${getSkill(d.skillId).name}`, '#ffc93c', 7000);
          }
          progress.commit();
        });
    });
    // Reserve the name now if it could not be checked earlier (offline).
    if (!progress.data.profile.registered && progress.data.nick) void claimName(progress, progress.data.nick);
    ui.showMenu();
    refreshStatus();
    ui.setChampion(progress.data.champion.name, progress.data.champion.isYou);
    if (progress.dailyStatus().canClaim) ui.notify('Your daily reward is ready!', '#ffc93c', 4000);
  }
  nick = nick || '';
}

void boot();
