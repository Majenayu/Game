// First run: pick a free starter element, then straight into a short tutorial fight that a new player can
// win inside a minute (one round, a Rookie sparring partner on low HP, one tip at a time).
import { audio } from '../../audio/synth';
import { BEATS, ELEMENT_IDS, ELEMENTS, type ElementId } from '../../content/elements';
import { DEFAULT_LOOK } from '../../content/looks';
import { POWERS_BY_ELEMENT } from '../../content/powers';
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, chooseStarter, specFor, squadAvatars } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { stickSpec } from '../../sim/stats';
import { activeOf, createMatch } from '../../sim/step';
import type { TutorialStep } from '../../scenes/FightScene';
import { TouchPad } from '../touchPad';
import { btn, h } from '../dom';
import { show } from '../router';
import { registerLook } from '../../render/fighterView';
import { showResults } from './results';
import { showLobby } from './lobby';

export function showStarter(): void {
  const el = h('div', 'frame starter');
  const logo = h('div', 'logo small');
  logo.innerHTML = '<span class="logo-a">ELEMEN</span><span class="logo-b">TICK</span>';
  el.appendChild(logo);
  el.appendChild(h('h1', 'starter-title', 'Choose your element'));
  el.appendChild(h('p', 'hint', 'It is free and yours to keep. You unlock the other nine by playing.'));
  const grid = h('div', 'starter-grid');
  for (const id of ELEMENT_IDS) {
    const info = ELEMENTS[id];
    const b = btn('', () => pickStarter(id), 'btn el-card');
    b.style.setProperty('--el', info.css[0]);
    b.style.setProperty('--el2', info.css[1]);
    b.innerHTML = `${elementIcon(id, 40)}<b>${info.name}</b><small>${info.passive}</small><span class="beats">Strong vs ${BEATS[id].map((x) => ELEMENTS[x].name).join(', ')}</span>`;
    b.dataset.el = id;
    grid.appendChild(b);
  }
  el.appendChild(grid);
  show({ id: 'starter', el });
}

function pickStarter(id: ElementId): void {
  audio.unlock();
  const p = app.profile;
  chooseStarter(p, id);
  saveProfile();
  tutorialFight();
}

function tutorialSteps(): TutorialStep[] {
  const touch = TouchPad.wanted();
  const k = (keys: string, tap: string) => (touch ? tap : keys);
  let x0 = -1;
  return [
    {
      text: `<b>Move</b> ${k('A / D or ← →', 'with the stick on the left')}`,
      done: (m) => {
        const f = activeOf(m, 0);
        if (!f || m.phase !== 'fight') return false;
        if (x0 < 0) x0 = f.x;
        return Math.abs(f.x - x0) > 3000;
      },
    },
    { text: `<b>Attack</b> ${k('J or Z (tap it a few times for a combo)', 'tap ATK a few times')}`, done: (m, evs) => evs.some((e) => e.t === 'hit' && activeOf(m, 0)?.id === e.attacker && !e.guarded) },
    { text: `<b>Power</b> ${k('U or 1', 'tap the element button')}: it costs MP (blue bar)`, done: (m, evs) => evs.some((e) => e.t === 'power' && activeOf(m, 0)?.id === e.who) },
    { text: `<b>Tag swap</b> ${k('Q', 'tap TAG')}: your partner jumps in`, done: (_m, evs) => evs.some((e) => e.t === 'swap' && e.team === 0) },
    { text: `<b>Guard</b> ${k('hold L or C', 'hold GRD')}. Now finish the fight!`, done: () => false },
  ];
}

export function tutorialFight(): void {
  const p = app.profile;
  const squad = squadAvatars(p);
  const el = squad[0]!.element;
  const foeEl = BEATS[el][0];
  const foe = { ...stickSpec('Coach Bix', foeEl, 1), hpPct: 40, look: 'coach' };
  const m = createMatch({ mode: 'duel', teamA: squad.map((a) => specFor(a)), teamB: [foe], seed: 1234, winsNeeded: 1, timerSec: 60, bots: [0, 1] });
  registerLook('coach', { ...DEFAULT_LOOK, hat: 1, eyes: 6, mouth: 1, body: 1, back: 0 });
  startFight({
    match: m,
    arena: 'gym',
    labels: [p.name, 'Coach Bix'],
    music: 'fight',
    input: 'solo',
    tutorial: tutorialSteps(),
    done: (r) => {
      if (r.quit) {
        // quitting the tutorial still counts as done, so nobody gets stuck in it
        p.tutorialDone = true;
        saveProfile();
        return showLobby();
      }
      const rewards = applyMatch(p, summary('tutorial', r), squad);
      p.tutorialDone = true;
      saveProfile();
      const power = POWERS_BY_ELEMENT[el][0].name;
      showResults({
        title: r.win ? 'First win!' : 'Good try!',
        sub: r.win ? `You beat Coach Bix in ${Math.round(r.seconds)} seconds.` : 'Coach Bix got lucky. You are ready anyway.',
        result: r,
        rewards,
        squad,
        lines: [`Your power: ${power}. More powers unlock at levels 8 and 20.`, 'Next: Champion Road, eight districts and the masked champion Null.'],
        next: showLobby,
        nextLabel: 'To the lobby',
      });
    },
  });
}

