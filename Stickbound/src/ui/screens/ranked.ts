// Ranked Ladder v1: rating, 6 tiers, monthly seasons, and a leaderboard of AI "ranked rivals". Every rival is a
// bot and is labeled as one. Stats are normalized (level gives at most about +15%).
import { ELEMENTS } from '../../content/elements';
import { lookFromSeed } from '../../content/looks';
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, eloDelta, pickRival, rankTier, RANK_TIERS, rivals, seasonKey, specFor, squadAvatars, type Rival } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { registerLook } from '../../render/fighterView';
import { DIFFICULTY_NAMES } from '../../sim/ai';
import { stickSpec } from '../../sim/stats';
import { stylesFor } from '../../content/championFight';
import { createMatch } from '../../sim/step';
import { settings } from '../../meta/settings';
import { btn, h } from '../dom';
import { frame, show } from '../router';
import { esc, showResults } from './results';
import { showLobby } from './lobby';

function seasonName(): string {
  const d = new Date(`${seasonKey()}-01T00:00:00Z`);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function showRanked(): void {
  const p = app.profile;
  const { el, body } = frame('ranked', 'Ranked Ladder', showLobby);
  const tier = rankTier(p.ranked.rating);
  const ti = RANK_TIERS.indexOf(tier);
  const nextT = RANK_TIERS[ti + 1];
  const card = h('div', 'panel rank-card');
  card.innerHTML = `<div class="rank-badge t-${tier.name.toLowerCase()}">${tier.name}</div>
    <div class="rank-info"><b>${p.ranked.rating}</b> rating<br><small>Peak ${p.ranked.peak} · Season ${seasonName()} · ${p.ranked.matches} matches</small>
    ${nextT ? `<div class="bar rbar"><div class="fill" style="width:${Math.max(0, Math.min(100, ((p.ranked.rating - tier.min) / (nextT.min - tier.min)) * 100))}%"></div></div><small>${nextT.min - p.ranked.rating} to ${nextT.name}</small>` : '<small>Top tier!</small>'}</div>`;
  body.appendChild(card);
  body.appendChild(h('p', 'hint', 'All Ranked Ladder opponents are AI rivals (bots), not real players. Levels are evened out: a higher level gives at most about 15% more stats. Seasons reset monthly.'));
  const rival = pickRival(p);
  const go = btn(`<b>Find a match</b><span>vs ${esc(rival.name)} (AI) · ${rival.rating}</span>`, () => fightRival(rival), 'btn primary big');
  body.appendChild(go);

  const cols = h('div', 'rank-cols');
  const board = h('div', 'panel board');
  board.appendChild(h('h3', '', 'Leaderboard'));
  const rows = [...rivals().map((r) => ({ name: `${r.name}`, rating: r.rating, ai: true, els: r.elements })), { name: p.name, rating: p.ranked.rating, ai: false, els: squadAvatars(p).map((a) => a.element) }].sort((a, b) => b.rating - a.rating);
  const ol = h('ol', 'board-list');
  rows.forEach((r) => {
    const li = h('li', r.ai ? '' : 'me');
    li.innerHTML = `<span class="b-els">${r.els.map((e) => elementIcon(e, 16)).join('')}</span><span class="b-name">${esc(r.name)}${r.ai ? ' <em class="ai-tag">AI</em>' : ' <em class="you-tag">You</em>'}</span><span class="b-rate">${r.rating}</span>`;
    ol.appendChild(li);
  });
  board.appendChild(ol);
  cols.appendChild(board);
  const hist = h('div', 'panel history');
  hist.appendChild(h('h3', '', 'Recent matches'));
  if (!p.ranked.history.length) hist.appendChild(h('p', 'hint', 'No matches this season yet.'));
  for (const m of p.ranked.history.slice(0, 10)) {
    const r = h('div', `hist ${m.win ? 'w' : 'l'}`);
    r.innerHTML = `<b>${m.win ? 'Win' : 'Loss'}</b><span>vs ${esc(m.opp)} (AI)</span><span class="d">${m.delta > 0 ? '+' : ''}${m.delta}</span>`;
    hist.appendChild(r);
  }
  cols.appendChild(hist);
  body.appendChild(cols);
  show({ id: 'ranked', el, back: showLobby });
}

function fightRival(r: Rival): void {
  const p = app.profile;
  const squad = squadAvatars(p);
  const level = Math.max(5, Math.min(50, Math.round((r.rating - 800) / 22)));
  const id = `rival:${r.name}`;
  registerLook(id, lookFromSeed(r.rating * 31 + r.name.length));
  const styles = stylesFor(r.name, r.elements[0] === r.elements[1]);
  const teamB = r.elements.map((e, i) => stickSpec(i ? `${r.name.split(' ')[0]}'s partner` : r.name, e, level, [], true, i ? undefined : id, styles[i]));
  const m = createMatch({ mode: 'duel', teamA: squad.map((a) => specFor(a, true)), teamB, seed: (Date.now() & 0xffffff) ^ r.rating, timerSec: settings.timerSec, bots: [0, r.difficulty], ranked: true });
  startFight({
    match: m,
    arena: ['rooftop', 'city', 'sky', 'ruins'][r.rating % 4]!,
    labels: [p.name, `${r.name} (AI)`],
    music: 'ranked',
    input: 'solo',
    done: (res) => {
      if (res.quit) {
        // leaving a ranked match counts as a loss, so quitting is never a way out of a bad rating
        res.win = false;
      }
      const delta = eloDelta(p.ranked.rating, r.rating, res.win);
      p.ranked.rating = Math.max(0, p.ranked.rating + delta);
      p.ranked.peak = Math.max(p.ranked.peak, p.ranked.rating);
      p.ranked.matches++;
      p.ranked.history.unshift({ opp: r.name, win: res.win, delta, date: new Date().toISOString().slice(0, 10) });
      p.ranked.history = p.ranked.history.slice(0, 20);
      const rewards = applyMatch(p, summary('ranked', res), squad);
      saveProfile();
      const tier = rankTier(p.ranked.rating);
      showResults({
        result: res,
        rewards,
        squad,
        sub: `vs ${r.name} (AI rival, ${DIFFICULTY_NAMES[r.difficulty]} bot, ${r.elements.map((e) => ELEMENTS[e].name).join(' + ')})`,
        lines: [`Rating ${delta >= 0 ? '+' : ''}${delta} → ${p.ranked.rating} (${tier.name})`],
        next: showRanked,
      });
    },
  });
}
