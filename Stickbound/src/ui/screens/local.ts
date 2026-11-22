// Local 2P: two players on one keyboard (or two gamepads). Any element, even levels, best of 3.
import { ELEMENT_IDS, ELEMENTS, type ElementId } from '../../content/elements';
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, squadAvatars } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { stickSpec } from '../../sim/stats';
import { createMatch } from '../../sim/step';
import { settings } from '../../meta/settings';
import { btn, h } from '../dom';
import { frame, show } from '../router';
import { showResults } from './results';
import { showLobby } from './lobby';

const picks: [ElementId[], ElementId[]] = [
  ['fire', 'wind'],
  ['water', 'earth'],
];

export function showLocal(): void {
  const { el, body } = frame('local', 'Local 2P', showLobby);
  body.appendChild(h('p', 'hint', 'Each player picks two elements. Everyone fights at level 20 with the same stats growth, so it is fair.'));
  const cols = h('div', 'local-cols');
  ([0, 1] as const).forEach((pi) => {
    const box = h('div', `panel local-p p${pi + 1}`);
    box.appendChild(h('h3', '', `Player ${pi + 1}`));
    const grid = h('div', 'chip-grid');
    for (const e of ELEMENT_IDS) {
      const k = picks[pi].indexOf(e);
      grid.appendChild(
        btn(`${elementIcon(e, 20)}<span>${ELEMENTS[e].name}</span>${k >= 0 ? `<em>${k + 1}</em>` : ''}`, () => {
          const cur = picks[pi];
          if (k >= 0) {
            if (cur.length > 1) cur.splice(k, 1);
          } else {
            cur.push(e);
            if (cur.length > 2) cur.shift();
          }
          showLocal();
        }, `btn chip ${k >= 0 ? 'on' : ''}`),
      );
    }
    box.appendChild(grid);
    box.appendChild(
      h(
        'p',
        'keys',
        pi === 0
          ? 'Move W A S D · Attack F · Heavy G · Guard H · Powers R T Y · Tag Q · Dash Left Shift · or gamepad 1'
          : 'Move arrows · Attack M · Heavy , · Guard . · Powers J K L · Tag / · Dash Right Shift · or numpad 0-6 · or gamepad 2',
      ),
    );
    cols.appendChild(box);
  });
  body.appendChild(cols);
  body.appendChild(btn('Fight!', () => run(), 'btn primary big'));
  show({ id: 'local', el, back: showLobby });
}

function run(): void {
  const team = (pi: 0 | 1) => picks[pi].map((e, i) => stickSpec(`P${pi + 1} ${ELEMENTS[e].name}`, e, 20, [], true, `local${pi}${i}`, i ? 'striker' : 'classic'));
  const m = createMatch({ mode: 'duel', teamA: team(0), teamB: team(1), seed: Date.now() & 0xffffff, timerSec: settings.timerSec, bots: [0, 0], ranked: true });
  startFight({
    match: m,
    arena: ['rooftop', 'forest', 'lava', 'ice', 'sky', 'ruins', 'city', 'gym'][Date.now() % 8]!,
    labels: ['Player 1', 'Player 2'],
    music: 'fight',
    input: 'local',
    done: (r) => {
      if (r.quit) return showLocal();
      const p = app.profile;
      const rewards = applyMatch(p, summary('local', r), squadAvatars(p));
      saveProfile();
      showResults({
        title: r.match.winner === 0 ? 'Player 1 wins!' : r.match.winner === 1 ? 'Player 2 wins!' : 'Draw',
        result: r,
        rewards,
        squad: squadAvatars(p),
        next: showLocal,
        retry: run,
      });
    },
  });
}
