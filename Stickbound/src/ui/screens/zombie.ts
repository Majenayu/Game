// Zombie Survival (solo in v1): endless waves, a boss every 5th wave, a local leaderboard, and one opt-in
// rewarded revive per run.
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, specFor, squadAvatars } from '../../meta/profile';
import { createMatch } from '../../sim/step';
import { btn, h } from '../dom';
import { confirmBox } from '../dialog';
import { frame, show } from '../router';
import { showResults } from './results';
import { showLobby } from './lobby';

export function showZombie(): void {
  const p = app.profile;
  const { el, body } = frame('zombie', 'Zombie Survival', showLobby);
  body.appendChild(h('p', 'hint', 'Zombies come in waves and get tougher. Every 5th wave brings a boss. Health and MP drops help you last. Tag swap to rest a fighter.'));
  const best = h('div', 'panel z-best');
  best.innerHTML = `<div><b>${p.zombie.best}</b><span>Best wave</span></div><div><b>${p.zombie.bestKills}</b><span>Most KOs</span></div>`;
  body.appendChild(best);
  const go = btn('Start', () => run(), 'btn primary big');
  body.appendChild(go);
  const board = h('div', 'panel board');
  board.appendChild(h('h3', '', 'Your best runs'));
  const runs = [...p.zombie.runs].sort((a, b) => b.wave - a.wave || b.kills - a.kills).slice(0, 10);
  if (!runs.length) board.appendChild(h('p', 'hint', 'No runs yet.'));
  const ol = h('ol', 'board-list');
  for (const r of runs) {
    const li = h('li');
    li.innerHTML = `<span class="b-name">Wave ${r.wave}</span><span>${r.kills} KOs</span><span class="b-rate">${r.date}</span>`;
    ol.appendChild(li);
  }
  board.appendChild(ol);
  body.appendChild(board);
  show({ id: 'zombie', el, back: showLobby });
}

function run(): void {
  const p = app.profile;
  const squad = squadAvatars(p);
  const lvl = Math.round(squad.reduce((s, a) => s + a.level, 0) / Math.max(1, squad.length));
  const m = createMatch({ mode: 'zombie', teamA: squad.map((a) => specFor(a)), teamB: [], seed: Date.now() & 0xffffff, zombieLevel: lvl });
  startFight({
    match: m,
    arena: 'city',
    labels: [p.name, 'Zombies'],
    music: 'zombie',
    input: 'solo',
    onRevive: app.platform.hasRewarded ? async () => (await confirmBox('Overrun!', 'Watch an ad to bring your squad back with full health? (once per run)', 'Watch ad', 'No thanks')) && app.platform.rewarded() : undefined,
    done: (r) => {
      const wave = r.match.wave;
      const rewards = applyMatch(p, summary('zombie', r), squad);
      const newBest = wave > p.zombie.best;
      p.zombie.best = Math.max(p.zombie.best, wave);
      p.zombie.bestKills = Math.max(p.zombie.bestKills, r.match.kills);
      p.zombie.runs.push({ wave, kills: r.match.kills, date: new Date().toISOString().slice(0, 10) });
      p.zombie.runs = [...p.zombie.runs].sort((a, b) => b.wave - a.wave || b.kills - a.kills).slice(0, 20);
      saveProfile();
      showResults({
        title: r.quit ? 'Run ended' : 'Overrun!',
        sub: `You reached wave ${wave} and knocked out ${r.match.kills} zombies.`,
        result: r,
        rewards,
        squad,
        lines: newBest ? ['New best wave!'] : [],
        next: showZombie,
        retry: run,
      });
    },
  });
}
