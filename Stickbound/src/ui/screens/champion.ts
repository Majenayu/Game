// Champion Road: 8 districts x 5 champions, then Null. Story panels before and after fights, two endings.
import { audio } from '../../audio/synth';
import { ALL_CHAMPIONS, DISTRICTS, ENDINGS, FINAL, PREMISE, type Champion } from '../../content/champions';
import { ELEMENTS } from '../../content/elements';
import { app, saveProfile } from '../../app/state';
import { startFight, summary } from '../../app/fights';
import { applyMatch, specFor, squadAvatars, unlockElement } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { arenaById } from '../../render/arenas';
const hexOf = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
import { lookFromSeed } from '../../content/looks';
import { registerLook } from '../../render/fighterView';
import { championTeam } from '../../content/championFight';
import { createMatch } from '../../sim/step';
import { DIFFICULTY_NAMES } from '../../sim/ai';
import { settings } from '../../meta/settings';
import { btn, h } from '../dom';
import { frame, show } from '../router';
import { stickPreview } from '../preview';
import { esc, showResults } from './results';
import { showLobby } from './lobby';

const districtOf = (i: number) => (i >= 40 ? null : DISTRICTS[Math.floor(i / 5)]!);
const arenaOf = (i: number) => districtOf(i)?.arena ?? 'city';
export const isUnlocked = (i: number) => i === 0 || app.profile.champion.cleared.includes(i - 1) || app.profile.champion.cleared.includes(i);

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function champLook(c: Champion) {
  const id = `champ:${c.name}`;
  const look = lookFromSeed(hashStr(c.name));
  if (c === FINAL) Object.assign(look, { hat: 0, eyes: 2, mouth: 0, body: 0, back: 2, extra: 4, aura: 1 });
  registerLook(id, look);
  return { id, look };
}

export function showStory(title: string, lines: string[], next: () => void, who?: Champion): void {
  const { el, body } = frame('story', title, null);
  const card = h('div', 'panel story-card');
  if (who) {
    const { look } = champLook(who);
    card.appendChild(stickPreview({ look, element: who.elements[0], live: true, face: -1, expression: who === FINAL ? 'neutral' : 'smug' }, 140, 180));
  }
  const text = h('div', 'story-text');
  let i = 0;
  const p = h('p', 'story-line');
  text.appendChild(p);
  const dots = h('div', 'story-dots', '');
  text.appendChild(dots);
  card.appendChild(text);
  body.appendChild(card);
  const nextBtn = btn('Next', () => step(), 'btn primary big');
  const skip = btn('Skip', () => next(), 'btn ghost');
  const row = h('div', 'story-actions');
  row.append(skip, nextBtn);
  body.appendChild(row);
  const step = () => {
    if (i >= lines.length) return next();
    p.textContent = lines[i]!;
    p.classList.remove('in');
    void p.offsetWidth;
    p.classList.add('in');
    dots.textContent = lines.map((_, k) => (k === i ? '●' : '○')).join(' ');
    i++;
    nextBtn.textContent = i >= lines.length ? 'Continue' : 'Next';
  };
  step();
  show({ id: 'story', el, back: next });
}

export function showChampionRoad(): void {
  const p = app.profile;
  if (!p.champion.seen.includes('premise')) {
    p.champion.seen.push('premise');
    saveProfile();
    return showStory('The Grand Circuit', PREMISE, showChampionRoad);
  }
  const { el, body } = frame('road', 'Champion Road', showLobby);
  body.appendChild(h('p', 'hint', 'Beat all five champions of a district to move on. District bosses unlock a new element.'));
  const list = h('div', 'district-list road-map');
  DISTRICTS.forEach((d, di) => {
    const box = h('div', 'panel district zone');
    const ar = arenaById(d.arena);
    box.style.setProperty('--dc', hexOf(ar.accent));
    box.style.setProperty('--dc2', hexOf(ar.accent2));
    const cleared = d.champions.filter((_, k) => p.champion.cleared.includes(di * 5 + k)).length;
    if (cleared === 5) box.classList.add('cleared');
    else if (isUnlocked(di * 5)) box.classList.add('open');
    box.appendChild(html2(`<span class="d-node">${di + 1}</span><h3>${d.name}</h3><span class="d-arena">${esc(ar.name)}</span><span class="d-count">${cleared}/5</span>`, 'd-head'));
    box.appendChild(h('p', 'd-blurb', d.blurb));
    const row = h('div', 'champ-row');
    d.champions.forEach((c, k) => row.appendChild(champBtn(di * 5 + k, c)));
    box.appendChild(row);
    list.appendChild(box);
  });
  const fin = h('div', 'panel district final');
  fin.appendChild(html2('<h3>Crown Arena</h3>', 'd-head'));
  fin.appendChild(h('p', 'd-blurb', 'The masked champion waits.'));
  const row = h('div', 'champ-row');
  row.appendChild(champBtn(40, FINAL));
  fin.appendChild(row);
  list.appendChild(fin);
  body.appendChild(list);
  show({ id: 'road', el, back: showLobby });
  const cur = list.querySelector<HTMLElement>('.champ.current');
  cur?.scrollIntoView({ block: 'center' });
}

function html2(inner: string, cls: string): HTMLElement {
  const e = h('div', cls);
  e.innerHTML = inner;
  return e;
}

function champBtn(i: number, c: Champion): HTMLElement {
  const p = app.profile;
  const done = p.champion.cleared.includes(i);
  const open = isUnlocked(i);
  const cur = open && !done;
  const b = btn(
    `${elementIcon(c.elements[0], 22)}${c.elements[1] !== c.elements[0] ? elementIcon(c.elements[1], 22) : ''}<b>${esc(c.name)}</b><small>Lv ${c.level} · ${DIFFICULTY_NAMES[c.difficulty]}</small>${done ? '<span class="tick">✓</span>' : !open ? '<span class="lock">🔒</span>' : ''}`,
    () => playChampion(i, showChampionRoad),
    `btn champ ${done ? 'done' : ''} ${cur ? 'current' : ''}`,
  );
  b.disabled = !open;
  return b;
}

export function playChampion(i: number, back: () => void): void {
  const c = ALL_CHAMPIONS[i]!;
  const p = app.profile;
  if (!p.champion.seen.includes('premise')) {
    p.champion.seen.push('premise');
    saveProfile();
    return showStory('The Grand Circuit', PREMISE, () => playChampion(i, back));
  }
  const d = districtOf(i);
  const { el, body } = frame('vs', d ? d.name : 'Crown Arena', back);
  const squad = squadAvatars(p);
  const vs = h('div', 'vs-row');
  const mine = h('div', 'vs-side');
  squad.forEach((a, k) => mine.appendChild(stickPreview({ look: a.look, element: a.element, live: true, face: 1, expression: 'determined' }, k ? 100 : 140, k ? 130 : 180)));
  const label = (txt: string, sub: string) => html2(`<b>${esc(txt)}</b><small>${sub}</small>`, 'vs-label');
  mine.appendChild(label(squad.map((a) => a.name).join(' + '), squad.map((a) => `${ELEMENTS[a.element].name} Lv ${a.level}`).join(', ')));
  const theirs = h('div', 'vs-side foe');
  const { look } = champLook(c);
  theirs.appendChild(stickPreview({ look, element: c.elements[0], live: true, face: -1, expression: 'smug' }, 140, 180));
  theirs.appendChild(label(c.name, `${c.elements.map((e) => ELEMENTS[e].name).join(' + ')} · Lv ${c.level} · ${DIFFICULTY_NAMES[c.difficulty]}`));
  vs.append(mine, h('div', 'vs-mid', 'VS'), theirs);
  vs.style.setProperty('--el', ELEMENTS[squad[0]?.element ?? 'fire'].css[0]);
  vs.style.setProperty('--el2', ELEMENTS[c.elements[0]].css[0]);
  body.appendChild(vs);
  body.appendChild(h('p', 'vs-arena', `Arena: ${arenaById(arenaOf(i)).name}`));
  const quote = h('div', 'panel quote');
  quote.innerHTML = `<p>“${esc(c.intro[0])}”</p><p>“${esc(c.intro[1])}”</p>`;
  body.appendChild(quote);
  const reward = h('p', 'hint', p.champion.cleared.includes(i) ? 'Rematch: normal rewards.' : `First win: +${c.coins} coins${c.unlock && !p.unlocked.includes(c.unlock) ? ` and the ${ELEMENTS[c.unlock].name} element` : ''}.`);
  body.appendChild(reward);
  const go = btn('Fight!', () => fightChampion(i, back), 'btn primary big');
  go.dataset.test = 'fight';
  body.appendChild(go);
  show({ id: 'vs', el, back });
}

function fightChampion(i: number, back: () => void): void {
  const c = ALL_CHAMPIONS[i]!;
  const p = app.profile;
  const squad = squadAvatars(p);
  const { id } = champLook(c);
  const teamB = championTeam(c, id);
  const m = createMatch({ mode: 'duel', teamA: squad.map((a) => specFor(a)), teamB, seed: (Date.now() & 0xffffff) ^ (i * 7919), timerSec: settings.timerSec, bots: [0, c.difficulty] });
  const boss = i % 5 === 4 || i === 40;
  startFight({
    match: m,
    arena: arenaOf(i),
    labels: [p.name, c.name],
    music: boss ? 'boss' : 'fight',
    input: 'solo',
    done: (r) => {
      if (r.quit) return playChampion(i, back);
      const first = r.win && !p.champion.cleared.includes(i);
      const rewards = applyMatch(p, summary('champion', r), squad, { coinsBonus: first ? c.coins : 0 });
      const lines: string[] = [];
      if (first) {
        p.champion.cleared.push(i);
        app.platform.reportProgress((p.champion.cleared.length / ALL_CHAMPIONS.length) * 100);
        if (c.unlock && unlockElement(p, c.unlock, false)) lines.push(`New element unlocked: ${ELEMENTS[c.unlock].name}! Make an avatar with it on the Avatars screen.`);
        lines.push(`First win bonus: +${c.coins} coins.`);
      }
      saveProfile();
      const nextI = i + 1 < ALL_CHAMPIONS.length && isUnlocked(i + 1) ? i + 1 : -1;
      const after = () => {
        if (first && i === 40) return showEnding();
        if (nextI >= 0 && r.win) return playChampion(nextI, back);
        back();
      };
      const toResults = () =>
        showResults({
          result: r,
          rewards,
          squad,
          lines,
          next: after,
          nextLabel: r.win && nextI >= 0 ? 'Next champion' : 'Continue',
          retry: r.win ? undefined : () => fightChampion(i, back),
        });
      if (r.win) showStory(c.name, [c.outro], toResults, c);
      else toResults();
    },
  });
}

function showEnding(): void {
  const { el, body } = frame('ending', 'Null is down', null);
  body.appendChild(h('p', 'story-line in', 'Null kneels in the Crown Arena. The crowd is silent. What do you do?'));
  const row = h('div', 'perk-row');
  row.append(
    btn('<b>Take the crown</b><span>Win the Grand Circuit.</span>', () => end('crown'), 'btn perk-card'),
    btn('<b>Offer a hand</b><span>Ask for a rematch instead.</span>', () => end('rival'), 'btn perk-card'),
  );
  body.appendChild(row);
  show({ id: 'ending', el });
  audio.play('victory');
  const end = (k: 'crown' | 'rival') => {
    const p = app.profile;
    if (!p.champion.seen.includes(`ending:${k}`)) p.champion.seen.push(`ending:${k}`);
    saveProfile();
    showStory(k === 'crown' ? 'The Crown' : 'Two Champions', ENDINGS[k], () => showStory('Thanks for playing', ['Champion Road is complete. Rematch any champion, climb the Ranked Ladder, or see how many zombie waves you can survive.'], showLobby));
  };
}
