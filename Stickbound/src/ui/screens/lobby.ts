// The lobby: squad on show, a big Play button (next Champion Road fight), modes, streak and quests.
import { audio } from '../../audio/synth';
import { ALL_CHAMPIONS } from '../../content/champions';
import { ELEMENTS } from '../../content/elements';
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
import { btn, h, toast } from '../dom';
import { askText } from '../dialog';
import { coinBadge, refreshCoins, show } from '../router';
import { stickPreview } from '../preview';
import { esc } from './results';
import { showAvatars } from './avatars';
import { showChampionRoad, playChampion } from './champion';
import { showRanked } from './ranked';
import { showZombie } from './zombie';
import { showTraining } from './training';
import { showLocal } from './local';
import { showShop } from './shop';
import { showSettings } from './settings';

export function showLobby(): void {
  const p = app.profile;
  refreshQuests(p);
  const seasonReward = checkSeason(p);
  if (seasonReward > 0) toast(`New Ranked season! Last season reward: +${seasonReward} coins`, 3500);
  saveProfile();
  audio.play('lobby');

  const el = h('div', 'lobby');
  // ---- top bar
  const top = h('header', 'lobby-top');
  const pl = playerLevel(p.playerXp);
  const who = h('div', 'who');
  const nameBtn = btn(`<b>${esc(p.name)}</b><span>Lv ${pl.level} · ${pl.tier}</span>`, () => void rename(), 'btn ghost who-btn', 'Change your name');
  who.appendChild(nameBtn);
  const plBar = h('div', 'bar plbar');
  const plFill = h('div', 'fill');
  plFill.style.width = `${Math.round((pl.into / pl.need) * 100)}%`;
  plBar.appendChild(plFill);
  who.appendChild(plBar);
  top.appendChild(who);
  const tier = rankTier(p.ranked.rating);
  top.appendChild(h('div', `rank-chip t-${tier.name.toLowerCase()}`, `${tier.name} · ${p.ranked.rating}`));
  top.appendChild(coinBadge());
  el.appendChild(top);

  // ---- squad
  const main = h('div', 'lobby-main');
  const squadBox = h('section', 'squad-box');
  const squad = squadAvatars(p);
  const figs = h('div', 'squad-figs');
  squad.forEach((a, i) => {
    const c = h('div', `squad-fig ${i ? 'partner' : 'lead'}`);
    c.style.setProperty('--el', ELEMENTS[a.element].css[0]);
    c.appendChild(stickPreview({ look: a.look, element: a.element, live: true, face: i ? -1 : 1, expression: i ? 'smug' : 'determined' }, i ? 120 : 170, i ? 150 : 210));
    const tag = h('div', 'fig-tag');
    tag.innerHTML = `${elementIcon(a.element, 18)}<b>${esc(a.name)}</b><span>Lv ${a.level}</span>`;
    const bar = h('div', 'bar xpbar');
    const fill = h('div', 'fill');
    fill.style.width = a.level >= 50 ? '100%' : `${Math.round((a.xp / xpToNext(a.level)) * 100)}%`;
    bar.appendChild(fill);
    tag.appendChild(bar);
    c.appendChild(tag);
    figs.appendChild(c);
  });
  squadBox.appendChild(figs);
  squadBox.appendChild(btn('Avatars & squad', () => showAvatars(), 'btn small'));
  main.appendChild(squadBox);

  // ---- play and modes
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
  const mode = (label: string, sub: string, fn: () => void, cls: string) => {
    const b = btn(`<b>${label}</b><span>${sub}</span>`, fn, `btn mode ${cls}`);
    modes.appendChild(b);
  };
  mode('Champion Road', `${p.champion.cleared.length} / ${ALL_CHAMPIONS.length} champions`, () => showChampionRoad(), 'm-road');
  mode('Ranked Ladder', 'vs AI rivals', () => showRanked(), 'm-ranked');
  mode('Zombie Survival', p.zombie.best ? `Best: wave ${p.zombie.best}` : 'How long can you last?', () => showZombie(), 'm-zombie');
  mode('Training', 'Dummy and hitboxes', () => showTraining(), 'm-training');
  mode('Local 2P', 'Two players, one keyboard', () => showLocal(), 'm-local');
  play.appendChild(modes);
  main.appendChild(play);

  // ---- streak and quests
  const side = h('section', 'side-box');
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
  show({ id: 'lobby', el });
}

function streakBox(): HTMLElement {
  const p = app.profile;
  const avail = touchStreak(p);
  const box = h('div', 'panel streak');
  box.appendChild(h('h3', '', 'Daily streak'));
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
        toast(`+${got} coins`);
        refreshCoins();
        showLobby();
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
