// Training: a dummy that stands, guards, jumps or fights back as a bot; no timer; hitboxes on request.
import { ELEMENT_IDS, ELEMENTS, type ElementId } from '../../content/elements';
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, specFor, squadAvatars } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { stickSpec } from '../../sim/stats';
import { activeOf, createMatch } from '../../sim/step';
import type { DummyMode } from '../../sim/types';
import { btn, h, toast } from '../dom';
import { frame, show } from '../router';
import { showLobby } from './lobby';

const MODES: { id: DummyMode; label: string }[] = [
  { id: 'stand', label: 'Stand still' },
  { id: 'guard', label: 'Always guard' },
  { id: 'jump', label: 'Keep jumping' },
  { id: 'bot', label: 'Fight back (bot)' },
];

let dummyEl: ElementId = 'earth';
let dummyMode: DummyMode = 'stand';
let hitboxes = false;

export function showTraining(): void {
  const { el, body } = frame('training', 'Training', showLobby);
  body.appendChild(h('p', 'hint', 'No timer, no KOs: the dummy heals when you stop hitting it. Try combos, powers and matchups.'));
  const p1 = h('div', 'panel');
  p1.appendChild(h('h3', '', 'Dummy element'));
  const grid = h('div', 'chip-grid');
  for (const e of ELEMENT_IDS) {
    const b = btn(`${elementIcon(e, 20)}<span>${ELEMENTS[e].name}</span>`, () => {
      dummyEl = e;
      showTraining();
    }, `btn chip ${e === dummyEl ? 'on' : ''}`);
    grid.appendChild(b);
  }
  p1.appendChild(grid);
  body.appendChild(p1);
  const p2 = h('div', 'panel');
  p2.appendChild(h('h3', '', 'Dummy behaviour'));
  const g2 = h('div', 'chip-grid');
  for (const m of MODES)
    g2.appendChild(btn(m.label, () => {
      dummyMode = m.id;
      showTraining();
    }, `btn chip ${m.id === dummyMode ? 'on' : ''}`));
  g2.appendChild(btn(hitboxes ? 'Hitboxes: on' : 'Hitboxes: off', () => {
    hitboxes = !hitboxes;
    showTraining();
  }, `btn chip ${hitboxes ? 'on' : ''}`));
  p2.appendChild(g2);
  body.appendChild(p2);
  body.appendChild(btn('Start training', () => run(), 'btn primary big'));
  show({ id: 'training', el, back: showLobby });
}

function run(): void {
  const p = app.profile;
  const squad = squadAvatars(p);
  const lvl = squad[0]?.level ?? 1;
  const dummy = { ...stickSpec('Dummy', dummyEl, lvl), dummy: dummyMode };
  const m = createMatch({ mode: 'training', teamA: squad.map((a) => specFor(a)), teamB: [dummy], seed: 77, bots: [0, 3] });
  startFight({
    match: m,
    arena: 'gym',
    labels: [p.name, 'Dummy'],
    music: 'fight',
    input: 'solo',
    showHitboxes: hitboxes,
    pauseItems: MODES.map((md) => ({
      label: `Dummy: ${md.label}`,
      run: (mm) => {
        const f = activeOf(mm, 1);
        if (f) f.spec.dummy = md.id;
        dummyMode = md.id;
        toast(`Dummy: ${md.label}`);
      },
    })),
    done: (r) => {
      if (r.seconds > 30) {
        const rw = applyMatch(p, summary('training', r), squad);
        saveProfile();
        toast(`Training: +${rw.xp} XP`);
      }
      showTraining();
    },
  });
}
