// The lobby: squad on show, a big Play button (next Champion Road fight), modes, streak and quests.
import { audio } from '../../audio/synth';
import { ALL_CHAMPIONS } from '../../content/champions';
import { ELEMENTS } from '../../content/elements';
import { ARCHETYPES } from '../../content/archetypes';
import { app, saveProfile } from '../../app/state';
import {
  checkSeason,
  claimQuest,
  claimStreak,
  cleanName,
  playerLevel,
  questDef,
  rankTier,
  refreshQuests,
  squadAvatars,
  STREAK_REWARDS,
  touchStreak,
  xpToNext,
  type QuestState,
} from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { btn, h, html, toast } from '../dom';
import { askText } from '../dialog';
import { coinBadge, currentScreen, refreshCoins, show } from '../router';
import { heroStage } from '../heroStage';
import { tileScene, type TileKind } from '../tileScenes';
import { settings } from '../../meta/settings';
import { esc } from './results';
import { showAvatars } from './avatars';
import { showChampionRoad, playChampion } from './champion';
import { showRanked } from './ranked';
import { showZombie } from './zombie';
import { showTraining } from './training';
import { showLocal } from './local';
import { showShop } from './shop';
import { showSettings } from './settings';

/** coins shown the last time the lobby was open (the counter counts up from here) */
let shownCoins = -1;
const TINT: Record<string, number> = { road: 0xff7a3c, ranked: 0x5f8cff, zombie: 0x6ad85a, training: 0xd8d8f0, local: 0xff5aa8 };

function levelRing(level: number, frac: number): HTMLElement {
  const r = 21;
  const len = 2 * Math.PI * r;
  const d = html('div', 'lvl-ring', `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="${r}" class="ring-bg"/><circle cx="26" cy="26" r="${r}" class="ring-fill" style="stroke-dasharray:${len};stroke-dashoffset:${len}"/></svg><b>${level}</b>`);
  // animate the XP fill after the first paint
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const fill = d.querySelector<SVGCircleElement>('.ring-fill');
      if (fill) fill.style.strokeDashoffset = String(len * (1 - frac));
    }),
  );
  d.setAttribute('aria-label', `Player level ${level}`);
  return d;
}

function countUp(el: HTMLElement, from: number, to: number): void {
  if (from < 0 || from === to || settings.reducedMotion) {
    el.textContent = to.toLocaleString('en-US');
    return;
  }
  const t0 = performance.now();
  const dur = 700;
  const stepFn = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3)).toLocaleString('en-US');
    if (k < 1 && el.isConnected) requestAnimationFrame(stepFn);
  };
  requestAnimationFrame(stepFn);
}

export function showLobby(): void {
  const p = app.profile;
  refreshQuests(p);
  const seasonReward = checkSeason(p);
  if (seasonReward > 0) toast(`New Ranked season! Last season reward: +${seasonReward} coins`, 3500);
  saveProfile();
  audio.play('lobby');

  const el = h('div', 'lobby');
  // ---- top bar: level ring, name and tier, rank, streak flame, coins
  const top = h('header', 'lobby-top');
  const pl = playerLevel(p.playerXp);
  top.appendChild(levelRing(pl.level, pl.into / pl.need));
  const who = h('div', 'who');
  who.appendChild(btn(`<b>${esc(p.name)}</b><span class="tier-badge">${pl.tier}</span>`, () => void rename(), 'btn ghost who-btn', 'Change your name'));
  top.appendChild(who);
  const tier = rankTier(p.ranked.rating);
  top.appendChild(h('div', `rank-chip t-${tier.name.toLowerCase()}`, `${tier.name} · ${p.ranked.rating}`));
  const flame = html('div', 'streak-chip', `<span class="flame" aria-hidden="true"></span><b>${p.streak.days || 1}</b>`);
  flame.title = `Daily streak: day ${p.streak.days || 1}`;
  top.appendChild(flame);
  const coins = coinBadge();
  const n = coins.querySelector<HTMLElement>('.coin-n');
  if (n) countUp(n, shownCoins, p.coins);
  shownCoins = p.coins;
  top.appendChild(coins);
  el.appendChild(top);

  const main = h('div', 'lobby-main');
  // ---- the hero stage with the squad
  const squadBox = h('section', 'squad-box');
  const squad = squadAvatars(p);
  const sw = window.innerWidth < 760 ? Math.min(window.innerWidth - 24, 460) : window.innerHeight < 500 ? 300 : Math.min(460, Math.max(300, window.innerWidth * 0.3));
  const stage = heroStage(squad, Math.round(sw), Math.round(sw * (window.innerHeight < 500 ? 0.62 : 0.74)));
  squadBox.appendChild(stage.el);
  const tags = h('div', 'squad-tags');
  squad.forEach((a) => {
    const tag = h('div', 'fig-tag');
    tag.style.setProperty('--el', ELEMENTS[a.element].css[0]);
    tag.innerHTML = `${elementIcon(a.element, 18)}<b>${esc(a.name)}</b><span>${ARCHETYPES[a.archetype].name} · Lv ${a.level}</span>`;
    const bar = h('div', 'bar xpbar');
    const fill = h('div', 'fill');
    fill.style.width = a.level >= 50 ? '100%' : `${Math.round((a.xp / xpToNext(a.level)) * 100)}%`;
    bar.appendChild(fill);
    tag.appendChild(bar);
    tags.appendChild(tag);
  });
  squadBox.appendChild(tags);
  squadBox.appendChild(btn('Avatars & squad', () => showAvatars(), 'btn small'));
  main.appendChild(squadBox);

  // ---- play and illustrated mode tiles
  const play = h('section', 'play-box');
  const nextI = ALL_CHAMPIONS.findIndex((_, i) => !p.champion.cleared.includes(i));
  const next = nextI >= 0 ? ALL_CHAMPIONS[nextI]! : null;
  const playBtn = btn(
    `<b>PLAY</b><span>${next ? `Champion Road: ${esc(next.name)}` : 'Champion Road: rematch Null'}</span>`,
    () => playChampion(nextI >= 0 ? nextI : ALL_CHAMPIONS.length - 1, showLobby),
    'btn primary play-btn',
  );
  playBtn.dataset.test = 'play';
  play.appendChild(playBtn);
  const modes = h('div', 'mode-grid');
  const mode = (kind: TileKind, label: string, sub: string, fn: () => void) => {
    const b = btn(`<div class="mode-text"><b>${label}</b><span>${sub}</span></div>`, fn, `btn mode m-${kind}`);
    b.prepend(tileScene(kind));
    const tint = () => {
      stage.setTint(TINT[kind]!);
      window.dispatchEvent(new CustomEvent('elementick:tint', { detail: TINT[kind] }));
    };
    const untint = () => {
      stage.setTint(null);
      window.dispatchEvent(new CustomEvent('elementick:tint', { detail: null }));
    };
    b.addEventListener('pointerenter', tint);
    b.addEventListener('focus', tint);
    b.addEventListener('pointerleave', untint);
    b.addEventListener('blur', untint);
    modes.appendChild(b);
  };
  mode('road', 'Champion Road', `${p.champion.cleared.length} / ${ALL_CHAMPIONS.length} champions`, () => showChampionRoad());
  mode('ranked', 'Ranked Ladder', 'vs AI rivals', () => showRanked());
  mode('zombie', 'Zombie Survival', p.zombie.best ? `Best: wave ${p.zombie.best}` : 'How long can you last?', () => showZombie());
  mode('training', 'Training', 'Dummy and hitboxes', () => showTraining());
  mode('local', 'Local 2P', 'Two players, one keyboard', () => showLocal());
  play.appendChild(modes);
  main.appendChild(play);

  // ---- news, streak and quests
  const side = h('section', 'side-box');
  side.appendChild(newsBanner());
  side.appendChild(streakBox());
  side.appendChild(questBox('Daily quests', p.quests.daily));
  side.appendChild(questBox('Weekly quests', p.quests.weekly));
  main.appendChild(side);
  const scroll = h('div', 'lobby-scroll');
  scroll.appendChild(main);
  el.appendChild(scroll);

  // ---- bottom nav
  const nav = h('nav', 'lobby-nav');
  nav.append(btn('Avatars', () => showAvatars(), 'btn'), btn('Shop', () => showShop(), 'btn'), btn('Settings', () => showSettings(), 'btn'));
  nav.appendChild(h('span', 'net-note', 'Offline play: every fight runs on your device.'));
  el.appendChild(nav);
  show({ id: 'lobby', el, leave: () => stage.stop() });
}

/** Honest news only: what is new in the game and when the Ranked season ends. */
function newsBanner(): HTMLElement {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const days = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  const b = h('div', 'panel news');
  b.innerHTML = `<span class="news-tag">NEW</span><b>Fighting styles</b><p>Every element now has 3 styles: Vanguard, Striker and Warden. That is 90 powers. Pick a style on the Avatars screen.</p><small>Ranked season ends in ${days} day${days === 1 ? '' : 's'}.</small>`;
  return b;
}
function streakBox(): HTMLElement {
  const p = app.profile;
  const avail = touchStreak(p);
  const box = h('div', 'panel streak');
  const head = h('div', 'streak-head');
  head.appendChild(h('h3', '', 'Daily streak'));
  const chest = html('div', `chest ${avail > 0 ? 'ready' : 'done'}`, '<span class="lid"></span><span class="body"></span><span class="lock"></span>');
  chest.setAttribute('aria-hidden', 'true');
  head.appendChild(chest);
  box.appendChild(head);
  const days = h('div', 'streak-days');
  STREAK_REWARDS.forEach((r, i) => {
    const d = h('div', `sday ${i + 1 < p.streak.days || (i + 1 === p.streak.days && !avail) ? 'got' : i + 1 === p.streak.days ? 'today' : ''}`);
    d.innerHTML = `<small>Day ${i + 1}</small><b>${r}</b>`;
    days.appendChild(d);
  });
  box.appendChild(days);
  if (avail > 0) {
    box.appendChild(
      btn(`Claim ${avail} coins`, () => {
        const got = claimStreak(p);
        saveProfile();
        audio.sfx('coin');
        audio.sfx('level');
        toast(`+${got} coins`);
        // the chest pops open with a burst of sparkles, then the lobby refreshes
        chest.classList.add('open');
        for (let i = 0; i < 14; i++) {
          const s = h('span', 'sparkle');
          s.style.setProperty('--a', `${(i / 14) * 360}deg`);
          s.style.setProperty('--d', `${30 + (i % 3) * 14}px`);
          chest.appendChild(s);
        }
        refreshCoins();
        // refresh only if the player is still on the lobby (they may have moved on during the animation)
        setTimeout(() => currentScreen() === 'lobby' && showLobby(), settings.reducedMotion ? 0 : 750);
      }, 'btn claim'),
    );
  } else box.appendChild(h('p', 'hint', 'Come back tomorrow for the next reward.'));
  return box;
}

function questBox(title: string, list: QuestState[]): HTMLElement {
  const box = h('div', 'panel quests');
  box.appendChild(h('h3', '', title));
  for (const q of list) {
    const def = questDef(q.id);
    if (!def) continue;
    const row = h('div', `quest ${q.claimed ? 'claimed' : ''}`);
    const pct = Math.min(1, q.progress / def.target);
    row.innerHTML = `<span class="q-text">${def.text}</span><span class="q-num">${Math.min(q.progress, def.target).toLocaleString('en-US')}/${def.target.toLocaleString('en-US')}</span>`;
    const bar = h('div', 'bar qbar');
    const fill = h('div', 'fill');
    fill.style.width = `${pct * 100}%`;
    bar.appendChild(fill);
    row.appendChild(bar);
    if (!q.claimed && pct >= 1) {
      row.appendChild(
        btn(`Claim ${def.coins}`, () => {
          claimQuest(app.profile, q.id);
          saveProfile();
          audio.sfx('coin');
          toast(`+${def.coins} coins, +${def.xp} XP`);
          showLobby();
        }, 'btn claim small'),
      );
    } else if (q.claimed) row.appendChild(h('span', 'q-done', 'Done'));
    else row.appendChild(h('span', 'q-reward', `${def.coins} coins`));
    box.appendChild(row);
  }
  return box;
}

async function rename(): Promise<void> {
  const p = app.profile;
  const v = await askText('Your name (up to 12 letters)', p.name);
  if (v === null) return;
  const n = cleanName(v);
  if (!n) return toast('Use letters, numbers, spaces, apostrophes or hyphens.');
  p.name = n;
  saveProfile();
  showLobby();
}
