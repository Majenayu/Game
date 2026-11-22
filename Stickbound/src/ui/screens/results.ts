// Results, level-up and perk screens. Rewards are applied before this screen is shown.
import { audio } from '../../audio/synth';
import { settings } from '../../meta/settings';
import { ELEMENTS } from '../../content/elements';
import { powerById } from '../../content/powers';
import { app, saveProfile } from '../../app/state';
import type { FightResult } from '../../app/fights';
import { avatarById, choosePerk, pendingPerk, xpToNext, type Avatar, type Rewards } from '../../meta/profile';
import { PERK_LEVELS, PERKS } from '../../sim/stats';
import { elementIcon } from '../../render/icons';
import { btn, h, toast } from '../dom';
import { blockWhile } from '../dialog';
import { frame, refreshCoins, show } from '../router';
import { stickPreview } from '../preview';

export interface ResultsOpts {
  title?: string;
  sub?: string;
  result: FightResult;
  rewards: Rewards | null;
  squad: Avatar[];
  /** extra lines (rating change, wave reached, unlocked element...) */
  lines?: string[];
  next: () => void;
  nextLabel?: string;
  retry?: () => void;
}

let skipNext = false;
/** The next break gets no midgame ad (CrazyGames: never a midgame ad and a "watch to keep playing" offer at the
 *  same break). */
export function skipNextMidgame(): void {
  skipNext = true;
}

/** Midgame ads only at natural breaks (after a results screen). The CrazyGames SDK limits frequency itself (at most
 *  one every 3 minutes), so it is asked at every break; elsewhere at most every second break. Input is blocked
 *  until the ad finishes or fails. */
export async function adBreak(): Promise<void> {
  app.breaks++;
  if (skipNext) {
    skipNext = false;
    return;
  }
  if (app.platform.name !== 'crazygames' && app.breaks % 2 !== 0) return;
  await blockWhile(() => app.platform.midgame());
}

/** Rewarded "double coins" is offered at most once every 5 minutes after it was used. */
const REWARD_GAP_MS = 5 * 60_000;
let lastRewarded = -Infinity;
export const AD_ICON = '<span class="ad-ico" aria-label="video ad"></span>';

export function showResults(o: ResultsOpts): void {
  const r = o.result;
  const win = o.title ? !/defeat|overrun/i.test(o.title) : r.win;
  const title = o.title ?? (r.win ? 'Victory!' : r.match.winner === 2 ? 'Draw' : 'Defeat');
  const { el, body } = frame('results', title, null);
  el.classList.add(win ? 'won' : 'lost');
  if (win) app.platform.happytime();
  const top = h('div', 'res-top');
  const lead = o.squad[0];
  if (lead) top.appendChild(stickPreview({ look: lead.look, element: lead.element, pose: win ? `win${lead.look.pose % 8}` : 'hurt', expression: win ? 'happy' : 'hurt', live: true }, 150, 190));
  const info = h('div', 'res-info');
  if (o.sub) info.appendChild(h('p', 'res-sub', o.sub));
  const s = r.stats;
  const grid = h('div', 'res-stats');
  const stat = (label: string, v: string) => {
    const c = h('div', 'res-stat');
    c.append(h('b', '', v), h('span', '', label));
    grid.appendChild(c);
  };
  if (r.match.mode === 'zombie') {
    stat('Wave', String(r.match.wave));
    stat('Zombies KO', String(r.match.kills));
  } else stat('Rounds', `${r.match.teams[0].wins} - ${r.match.teams[1].wins}`);
  stat('Hits', String(s.hits));
  stat('Damage', s.damage.toLocaleString('en-US'));
  stat('Best combo', String(s.maxCombo));
  stat('Powers', String(s.powers));
  stat('Perfect guards', String(s.perfect));
  info.appendChild(grid);
  for (const l of o.lines ?? []) info.appendChild(h('p', 'res-line', l));
  if (o.rewards) {
    const rw = h('div', 'res-rewards');
    rw.innerHTML = `<span class="xp">+${o.rewards.xp} XP</span><span class="coin-gain"><span class="coin-ico"></span>+${o.rewards.coins}</span>`;
    info.appendChild(rw);
    for (const a of o.squad) info.appendChild(xpRow(a));
  }
  top.appendChild(info);
  body.appendChild(top);

  const row = h('div', 'res-actions');
  let doubled = false;
  if (o.rewards && o.rewards.coins > 0 && app.platform.hasRewarded && performance.now() - lastRewarded > REWARD_GAP_MS) {
    const b = btn(`${AD_ICON} Watch an ad: double coins (+${o.rewards.coins})`, async () => {
      if (doubled) return;
      b.disabled = true;
      const ok = await blockWhile(() => app.platform.rewarded());
      if (ok) {
        lastRewarded = performance.now();
        doubled = true;
        app.profile.coins += o.rewards!.coins;
        saveProfile();
        refreshCoins();
        toast(`+${o.rewards!.coins} coins`);
        audio.sfx('coin');
        b.textContent = 'Coins doubled';
      } else {
        toast('No ad is available right now. Try again later.');
        // no rewarded button may stay clickable without effect (ads disabled or blocked)
        if (!app.platform.hasRewarded) b.remove();
        else b.disabled = false;
      }
    }, 'btn reward');
    row.appendChild(b);
  }
  if (o.retry) row.appendChild(btn('Fight again', async () => { await adBreak(); o.retry!(); }));
  const levelUps = o.rewards?.levelUps ?? [];
  row.appendChild(
    btn(o.nextLabel ?? 'Continue', async () => {
      await adBreak();
      if (levelUps.length) showLevelUps(levelUps.map((l) => l), o.next);
      else afterPerks(o.next);
    }, 'btn primary'),
  );
  body.appendChild(row);
  show({ id: 'results', el });
  audio.play(null);
  if (win) audio.sfx('level');
}

function xpRow(a: Avatar): HTMLElement {
  const row = h('div', 'xp-row');
  row.innerHTML = `${elementIcon(a.element, 20)}<span class="xp-name">${esc(a.name)} · Lv ${a.level}</span>`;
  const bar = h('div', 'bar xpbar');
  const fill = h('div', 'fill');
  fill.style.width = a.level >= 50 ? '100%' : `${Math.round((a.xp / xpToNext(a.level)) * 100)}%`;
  bar.appendChild(fill);
  row.appendChild(bar);
  return row;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function showLevelUps(list: Rewards['levelUps'], next: () => void): void {
  const lu = list.shift();
  if (!lu) return afterPerks(next);
  const a = avatarById(app.profile, lu.avatar);
  if (!a) return showLevelUps(list, next);
  const { el, body } = frame('levelup', 'Level up!', null);
  const card = h('div', 'panel lvl-card');
  card.style.setProperty('--el', ELEMENTS[a.element].css[0]);
  card.appendChild(stickPreview({ look: a.look, element: a.element, pose: 'win2', expression: 'happy', live: true }, 140, 180));
  const t = h('div', 'lvl-text');
  t.appendChild(h('h2', '', `${a.name} reached level ${lu.to}`));
  const ul = h('ul', 'unlock-list');
  const items = lu.unlocks.length ? lu.unlocks : ['Stats went up a little.'];
  for (const u of [...new Set(items)]) ul.appendChild(h('li', '', u));
  t.appendChild(ul);
  card.appendChild(t);
  if (!settings.reducedMotion && !settings.lowGraphics) {
    const cols = [ELEMENTS[a.element].css[0], ELEMENTS[a.element].css[1], '#ffd84a', '#ffffff'];
    for (let i = 0; i < 36; i++) {
      const cf = h('span', 'confetti');
      cf.style.left = `${(i * 37) % 100}%`;
      cf.style.background = cols[i % cols.length]!;
      cf.style.animationDelay = `${(i % 9) * 0.06}s`;
      cf.style.setProperty('--x', `${((i * 53) % 120) - 60}px`);
      cf.style.setProperty('--r', `${(i * 97) % 720}deg`);
      card.appendChild(cf);
    }
  }
  body.appendChild(card);
  body.appendChild(btn('Nice!', () => showLevelUps(list, next), 'btn primary big'));
  show({ id: 'levelup', el });
  audio.sfx('level');
}

/** Any avatar in the squad with an unchosen perk gets the pick-1-of-2 screen. */
function afterPerks(next: () => void): void {
  const a = app.profile.avatars.find((x) => pendingPerk(x) !== null && app.profile.squad.includes(x.id));
  if (!a) return next();
  showPerkPick(a, () => afterPerks(next));
}

export function showPerkPick(a: Avatar, done: () => void): void {
  const tier = pendingPerk(a);
  if (tier === null) return done();
  const { el, body } = frame('perk', `Choose a perk for ${a.name}`, null);
  body.appendChild(h('p', 'hint', `Level ${PERK_LEVELS[tier]} perk. Pick one; you can change it later on the Avatars screen.`));
  const row = h('div', 'perk-row');
  for (const p of PERKS.filter((x) => x.tier === tier)) {
    const b = btn(`<b>${p.name}</b><span>${p.text}</span>`, () => {
      choosePerk(a, tier, p.id);
      saveProfile();
      toast(`${a.name}: ${p.name}`);
      showPerkPick(a, done);
    }, 'btn perk-card');
    row.appendChild(b);
  }
  body.appendChild(row);
  show({ id: 'perk', el });
}

export function powerName(id: string): string {
  return powerById(id)?.name ?? id;
}
