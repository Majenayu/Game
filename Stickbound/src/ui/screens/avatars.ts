// Avatars: roster, details (stats, powers and ranks, perks), squad of 2, new avatars, the Forge and the
// element matchup chart.
import { audio } from '../../audio/synth';
import { BEATS, ELEMENT_IDS, ELEMENTS, matchup, STRONG_PCT, WEAK_PCT, type ElementId } from '../../content/elements';
import { AURA_NAMES, BACKS, BODY_NAMES, EXTRAS, EYES, HANDS, HATS, HEADS, LOCKED, SUITS, lookFromSeed, MOUTHS, THICK_NAMES, WIN_POSES, type Look } from '../../content/looks';
import { ARCHETYPE_IDS, ARCHETYPES, mechanicOf, POWER_TEXT, POWER_UNLOCK_LEVELS, powersFor, RANK_MP_OFF, type Archetype } from '../../content/powers';
import { app, saveProfile } from '../../app/state';
import { addAvatar, avatarById, buy, choosePerk, cleanName, slotsFor, squadClash, suggestArchetype, xpToNext, type Avatar } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { comboLenFor, hpFor, PERK_LEVELS, PERKS, ranksFor, stickSpec, MAX_LEVEL } from '../../sim/stats';
import { btn, h, html, toast } from '../dom';
import { powerPreview } from '../powerPreview';
import { askText } from '../dialog';
import { frame, refreshCoins, show } from '../router';
import { stickPreview } from '../preview';
import { esc } from './results';
import { showLobby } from './lobby';

let selected = '';

export function showAvatars(sel?: string): void {
  const p = app.profile;
  if (sel) selected = sel;
  if (!avatarById(p, selected)) selected = p.squad[0] ?? p.avatars[0]?.id ?? '';
  const { el, body } = frame('avatars', 'Avatars', showLobby);
  const wrap = h('div', 'av-wrap');
  // roster
  const roster = h('div', 'panel roster');
  p.slots = slotsFor(p);
  roster.appendChild(h('h3', '', `Roster ${p.avatars.length}/${p.slots}`));
  const list = h('div', 'roster-list');
  for (const a of p.avatars) {
    const sq = p.squad.indexOf(a.id);
    const b = btn(`${elementIcon(a.element, 26)}<b>${esc(a.name)}</b><small>Lv ${a.level}</small>${sq >= 0 ? `<em class="sq">${sq === 0 ? 'Lead' : 'Partner'}</em>` : ''}`, () => showAvatars(a.id), `btn roster-item ${a.id === selected ? 'on' : ''}`);
    b.style.setProperty('--el', ELEMENTS[a.element].css[0]);
    list.appendChild(b);
  }
  roster.appendChild(list);
  const newBtn = btn('+ New avatar', () => newAvatar(), 'btn');
  newBtn.disabled = p.avatars.length >= p.slots;
  roster.appendChild(newBtn);
  roster.appendChild(btn('Element matchups', () => showMatchups(), 'btn small'));
  wrap.appendChild(roster);
  const a = avatarById(p, selected);
  if (a) wrap.appendChild(detail(a));
  body.appendChild(wrap);
  show({ id: 'avatars', el, back: showLobby });
}

const STAT_ROWS: [keyof ReturnType<typeof stickSpec>['stats'], string][] = [
  ['might', 'Basic attack'],
  ['guard', 'Defense'],
  ['spirit', 'Special attack'],
  ['resolve', 'Special defense'],
  ['speed', 'Speed'],
];

function detail(a: Avatar): HTMLElement {
  const p = app.profile;
  const box = h('div', 'panel av-detail');
  box.style.setProperty('--el', ELEMENTS[a.element].css[0]);
  const top = h('div', 'av-top');
  top.appendChild(stickPreview({ look: a.look, element: a.element, live: true }, 150, 190));
  const info = h('div', 'av-info');
  info.innerHTML = `<h2>${elementIcon(a.element, 28)} ${esc(a.name)}</h2><p>${ELEMENTS[a.element].name} ${ARCHETYPES[a.archetype].name} · Level ${a.level}${a.level >= MAX_LEVEL ? ' (max)' : ''} · ${a.wins} W / ${a.losses} L</p><p class="hint">${ELEMENTS[a.element].passive}</p>`;
  const xb = h('div', 'bar xpbar');
  const xf = h('div', 'fill');
  xf.style.width = a.level >= MAX_LEVEL ? '100%' : `${Math.round((a.xp / xpToNext(a.level)) * 100)}%`;
  xb.appendChild(xf);
  info.appendChild(xb);
  if (a.level < MAX_LEVEL) info.appendChild(h('small', 'hint', `${a.xp} / ${xpToNext(a.level)} XP to level ${a.level + 1}`));
  const acts = h('div', 'av-actions');
  const sq = p.squad.indexOf(a.id);
  const setSquad = (slot: 0 | 1) => {
    const s = [...p.squad];
    const other = s.indexOf(a.id);
    if (other >= 0) s.splice(other, 1);
    s.splice(slot, 0, a.id);
    p.squad = s.slice(0, 2);
    if (p.squad.length < 2) {
      const extra = p.avatars.find((x) => !p.squad.includes(x.id));
      if (extra) p.squad.push(extra.id);
    }
    saveProfile();
    toast(squadClash(p) ? 'Heads up: both squad avatars now have the same 3 powers.' : `${a.name} is now your ${slot === 0 ? 'lead' : 'partner'}`);
    showAvatars(a.id);
  };
  const lead = btn('Set as lead', () => setSquad(0), 'btn small');
  lead.disabled = sq === 0;
  const partner = btn('Set as partner', () => setSquad(1), 'btn small');
  partner.disabled = sq === 1 || p.avatars.length < 2;
  acts.append(lead, partner, btn('Forge (looks)', () => showForge(a), 'btn small primary'), btn('Fighting style', () => pickStyle(a.element, a), 'btn small'), btn('Rename', () => void rename(a), 'btn small'));
  if (squadClash(p) && sq >= 0) info.appendChild(h('p', 'warn', 'Both squad avatars have the same element and style, so they share the same 3 powers. Pick a different style or partner for more options.'));
  info.appendChild(acts);
  top.appendChild(info);
  box.appendChild(top);

  // stats
  const spec = stickSpec(a.name, a.element, a.level, a.perks.filter((x): x is string => !!x), false, undefined, a.archetype);
  const next = a.level < MAX_LEVEL ? stickSpec(a.name, a.element, Math.min(MAX_LEVEL, a.level + 5)) : null;
  const st = h('div', 'av-stats');
  const row = (label: string, v: number, nv: number | null, max: number) => {
    const r = h('div', 'st-row');
    r.innerHTML = `<span>${label}</span><div class="bar stbar"><div class="fill" style="width:${Math.min(100, (v / max) * 100)}%"></div></div><b>${v}</b>${nv !== null && nv > v ? `<small>+${nv - v} at Lv ${Math.min(MAX_LEVEL, a.level + 5)}</small>` : '<small></small>'}`;
    st.appendChild(r);
  };
  row('HP', hpFor(spec), next ? hpFor(next) : null, 900);
  for (const [k, label] of STAT_ROWS) row(label, spec.stats[k], next ? next.stats[k] : null, 180);
  st.appendChild(h('p', 'hint', `Basic combo: ${comboLenFor(a.level)} hits. Every level makes attacks and defenses a little stronger.`));
  box.appendChild(h('h3', '', 'Stats'));
  box.appendChild(st);

  // powers
  box.appendChild(h('h3', '', 'Powers'));
  const pw = h('div', 'power-list');
  const ranks = ranksFor(a.level);
  powersFor(a.element, a.archetype).forEach((mv, i) => {
    const rank = ranks[i]!;
    const c = h('div', `power ${rank ? '' : 'locked'}`);
    const cost = Math.max(0, (mv.mp ?? 0) - RANK_MP_OFF[Math.max(1, rank)]!);
    const pips = Array.from({ length: 5 }, (_, k) => `<i class="${k < rank ? 'on' : ''}"></i>`).join('');
    c.innerHTML = `<div class="pw-head">${elementIcon(a.element, 22)}<b>${mv.name}</b><span class="pw-key">Power ${i + 1}${i === 2 ? ' · super' : ''}</span></div><span class="pw-mech">${mechName(mechanicOf(mv))}</span><p>${POWER_TEXT[mv.id] ?? ''}</p><div class="pw-foot">${rank ? `<span class="pips" aria-label="Rank ${rank} of 5">${pips}</span><span>Rank ${rank}/5 · ${cost} MP</span>` : `<span>Unlocks at level ${POWER_UNLOCK_LEVELS[i]}</span>`}</div>`;
    pw.appendChild(c);
  });
  box.appendChild(pw);
  box.appendChild(powerPreview({ element: a.element, archetype: a.archetype, look: a.look, level: Math.max(20, a.level), w: Math.min(560, window.innerWidth - 60), h: 220 }).el);
  box.appendChild(h('p', 'hint', 'No cooldowns: powers only cost MP and have wind-up and recovery. Ranks go up on their own as you level (more damage, less MP, stronger effects, rank 5 is bigger).'));

  // perks
  box.appendChild(h('h3', '', 'Perks'));
  const pk = h('div', 'perk-tiers');
  PERK_LEVELS.forEach((lvl, tier) => {
    const t = h('div', 'perk-tier');
    t.appendChild(h('span', 'pt-level', `Lv ${lvl}`));
    for (const perk of PERKS.filter((x) => x.tier === tier)) {
      const on = a.perks[tier] === perk.id;
      const b = btn(`<b>${perk.name}</b><small>${perk.text}</small>`, () => {
        if (choosePerk(a, tier, perk.id)) {
          saveProfile();
          showAvatars(a.id);
        }
      }, `btn perk ${on ? 'on' : ''}`);
      b.disabled = a.level < lvl;
      t.appendChild(b);
    }
    pk.appendChild(t);
  });
  box.appendChild(pk);
  return box;
}

async function rename(a: Avatar): Promise<void> {
  const v = await askText('Avatar name', a.name);
  if (v === null) return;
  const n = cleanName(v);
  if (!n) return toast('Use letters, numbers, spaces, apostrophes or hyphens.');
  a.name = n;
  saveProfile();
  showAvatars(a.id);
}

function newAvatar(): void {
  const p = app.profile;
  const { el, body } = frame('newav', 'New avatar', () => showAvatars());
  body.appendChild(h('p', 'hint', 'Pick an element you have unlocked. Locked elements come from Champion Road district bosses or the Shop.'));
  const grid = h('div', 'starter-grid');
  for (const id of ELEMENT_IDS) {
    const info = ELEMENTS[id];
    const open = p.unlocked.includes(id);
    const b = btn(`${elementIcon(id, 36)}<b>${info.name}</b><small>${open ? info.passive : 'Locked'}</small>`, () => pickStyle(id), `btn el-card ${open ? '' : 'locked'}`);
    b.style.setProperty('--el', info.css[0]);
    b.style.setProperty('--el2', info.css[1]);
    b.disabled = !open;
    grid.appendChild(b);
  }
  body.appendChild(grid);
  show({ id: 'newav', el, back: () => showAvatars() });
}

const MECH_NAME: Record<string, string> = {
  shot: 'shot', lob: 'arc shot', wave: 'ground wave', fan: 'spread shot', rain: 'rain from above', boomerang: 'boomerang',
  dash: 'dash-cut', rising: 'rising launcher', flurry: 'flurry', spin: 'spin', beam: 'beam', reach: 'long reach', melee: 'strike', armor: 'armored strike',
  aura: 'burst around you', field: 'area', wall: 'wall', walls: 'wall trap', trap: 'trap', pillar: 'eruption', drop: 'delayed strike', multistrike: 'strikes from below',
  orbit: 'orbiting shield', counter: 'counter stance', decoy: 'decoy', buff: 'power-up', drain: 'drain', teleportBehind: 'teleport', recall: 'rewind', barrier: 'shield', heal: 'heal',
};
export const mechName = (id: string) => MECH_NAME[id] ?? id;

/** The 3 powers of a style as a compact card list. */
function styleCard(el: ElementId, a: Archetype, onPick: (() => void) | null, current = false): HTMLElement {
  const info = ARCHETYPES[a];
  const card = h('div', `panel style-card ${current ? 'on' : ''}`);
  card.style.setProperty('--el', ELEMENTS[el].css[0]);
  card.appendChild(html('div', 'style-head', `<b>${info.name}</b><span>${info.role}</span>`));
  card.appendChild(h('p', 'hint', info.blurb));
  const ul = h('ol', 'style-powers');
  powersFor(el, a).forEach((mv, i) => {
    const li = html('li', '', `<b>${mv.name}</b> <em>${mechName(mechanicOf(mv))}</em><small>Lv ${POWER_UNLOCK_LEVELS[i]}${i === 2 ? ' · super' : ''} · ${POWER_TEXT[mv.id] ?? ''}</small>`);
    ul.appendChild(li);
  });
  card.appendChild(ul);
  if (onPick) card.appendChild(btn(current ? 'Current style' : `Choose ${info.name}`, onPick, `btn ${current ? '' : 'primary'}`));
  return card;
}

/** Style picker with a live preview of the selected style's 3 powers. */
function pickStyle(el: ElementId, existing?: Avatar): void {
  const p = app.profile;
  let sel: Archetype = existing?.archetype ?? suggestArchetype(p, el);
  const back = () => (existing ? showAvatars(existing.id) : newAvatar());
  const { el: root, body } = frame('style', existing ? `Fighting style: ${existing.name}` : `${ELEMENTS[el].name}: choose a fighting style`, back);
  body.appendChild(h('p', 'hint', 'Each style has its own 3 powers. Two avatars of the same element play differently when their styles differ.'));
  const stage = h('div', 'style-stage');
  const tabs = h('div', 'style-tabs');
  const cards = h('div', 'style-cards');
  let prev: ReturnType<typeof powerPreview> | null = null;
  const look = existing?.look ?? lookFromSeed(p.nextId * 31 + p.created);
  const render = () => {
    prev?.stop();
    prev = powerPreview({ element: el, archetype: sel, look, w: Math.min(520, window.innerWidth - 40), h: 240 });
    stage.replaceChildren(prev.el);
    tabs.replaceChildren(
      ...ARCHETYPE_IDS.map((a) => {
        const b = btn(`<b>${ARCHETYPES[a].name}</b><small>${ARCHETYPES[a].role}</small>`, () => {
          sel = a;
          render();
        }, `btn chip style-tab ${a === sel ? 'on' : ''}`);
        b.setAttribute('aria-pressed', String(a === sel));
        return b;
      }),
    );
    cards.replaceChildren(
      styleCard(el, sel, async () => {
        if (existing) {
          existing.archetype = sel;
          saveProfile();
          toast(`${existing.name} now fights as a ${ARCHETYPES[sel].name}`);
          return showAvatars(existing.id);
        }
        const name = await askText('Name your avatar', '');
        if (name === null) return;
        const av = addAvatar(p, el, name, look, sel);
        if (!av) return toast('No free roster slot.');
        saveProfile();
        audio.sfx('level');
        showAvatars(av.id);
      }, existing?.archetype === sel),
    );
  };
  render();
  body.append(tabs, stage, cards);
  show({ id: 'style', el: root, back, leave: () => prev?.stop() });
}

// ---- Forge -------------------------------------------------------------------------------------------------

const FORGE: { key: keyof Look; label: string; names: string[] }[] = [
  { key: 'head', label: 'Head', names: HEADS },
  { key: 'eyes', label: 'Eyes', names: EYES },
  { key: 'mouth', label: 'Mouth', names: MOUTHS },
  { key: 'body', label: 'Body colour', names: BODY_NAMES },
  { key: 'thick', label: 'Line', names: THICK_NAMES },
  { key: 'hat', label: 'Headgear', names: HATS },
  { key: 'back', label: 'Back', names: BACKS },
  { key: 'suit', label: 'Suit pattern', names: SUITS },
  { key: 'hand', label: 'Hand effect', names: HANDS },
  { key: 'extra', label: 'Extra', names: EXTRAS },
  { key: 'aura', label: 'Aura', names: AURA_NAMES },
  { key: 'pose', label: 'Win pose', names: WIN_POSES },
];

export const lookKey = (k: keyof Look, i: number) => `${k}:${i}`;
export const lookPrice = (k: keyof Look, i: number) => LOCKED[k]?.[i] ?? 0;
export const ownsLook = (k: keyof Look, i: number) => lookPrice(k, i) === 0 || app.profile.owned.includes(lookKey(k, i));

function showForge(a: Avatar, previewPose = 'idle'): void {
  if (!savedLooks.has(a.id) && FORGE.every((f) => ownsLook(f.key, a.look[f.key]))) savedLooks.set(a.id, { ...a.look });
  const { el, body } = frame('forge', `Forge: ${a.name}`, () => showAvatars(a.id));
  const wrap = h('div', 'forge');
  const prev = h('div', 'panel forge-prev');
  prev.appendChild(previewPose === 'idle' ? powerPreview({ element: a.element, archetype: a.archetype, look: a.look, level: Math.max(20, a.level), w: Math.min(300, window.innerWidth - 40), h: 260, span: 420 }).el : stickPreview({ look: a.look, element: a.element, live: true, pose: previewPose }, 220, 280));
  prev.appendChild(h('p', 'hint', 'Looks never change stats.'));
  wrap.appendChild(prev);
  const opts = h('div', 'panel forge-opts');
  for (const f of FORGE) {
    const row = h('div', 'forge-row');
    const i = a.look[f.key];
    const price = lookPrice(f.key, i);
    const owned = ownsLook(f.key, i);
    const set = (d: number) => {
      a.look = { ...a.look, [f.key]: (i + d + f.names.length) % f.names.length };
      // only owned options are saved; unowned ones are previewed until bought
      saveIfOwned(a);
      showForge(a, f.key === 'pose' ? `win${a.look.pose % 8}` : 'idle');
    };
    row.appendChild(h('span', 'f-label', f.label));
    const prevB = btn('‹', () => set(-1), 'btn arrow');
    prevB.setAttribute('aria-label', `Previous ${f.label}`);
    row.appendChild(prevB);
    const name = h('span', `f-val ${owned ? '' : 'locked'}`, f.names[i] ?? String(i));
    row.appendChild(name);
    const nextB = btn('›', () => set(1), 'btn arrow');
    nextB.setAttribute('aria-label', `Next ${f.label}`);
    row.appendChild(nextB);
    if (!owned) {
      const b = btn(`Buy ${price}`, () => {
        if (buy(app.profile, lookKey(f.key, i), price)) {
          saveIfOwned(a);
          audio.sfx('coin');
          refreshCoins();
          toast(`Bought: ${f.names[i]}`);
          showForge(a);
        } else toast('Not enough coins yet. Win fights and finish quests to earn more.');
      }, 'btn small buy');
      row.appendChild(b);
    }
    opts.appendChild(row);
  }
  wrap.appendChild(opts);
  body.appendChild(wrap);
  const back = () => {
    revertUnowned(a);
    showAvatars(a.id);
  };
  body.appendChild(btn('Done', back, 'btn primary big'));
  show({ id: 'forge', el, back });
}

const savedLooks = new Map<string, Look>();
function saveIfOwned(a: Avatar): void {
  const all = FORGE.every((f) => ownsLook(f.key, a.look[f.key]));
  if (all) {
    savedLooks.set(a.id, { ...a.look });
    saveProfile();
  }
}
function revertUnowned(a: Avatar): void {
  for (const f of FORGE) {
    if (!ownsLook(f.key, a.look[f.key])) {
      const last = savedLooks.get(a.id);
      a.look = { ...a.look, [f.key]: last && ownsLook(f.key, last[f.key]) ? last[f.key] : 0 };
    }
  }
  saveProfile();
}

// ---- matchups ---------------------------------------------------------------------------------------------

export function showMatchups(back: () => void = () => showAvatars()): void {
  const { el, body } = frame('matchups', 'Element matchups', back);
  body.appendChild(h('p', 'hint', 'Matchups depend on the element only. The fighting style (Vanguard, Striker, Warden) changes your powers, not your matchups.'));
  body.appendChild(h('p', 'hint', `Each element is strong against two others (deals ${STRONG_PCT}% damage) and weak against two (deals ${WEAK_PCT}%). Everything else is even.`));
  const list = h('div', 'mu-list');
  for (const e of ELEMENT_IDS) {
    const weakTo = ELEMENT_IDS.filter((x) => BEATS[x].includes(e));
    const r = h('div', 'panel mu-row');
    r.style.setProperty('--el', ELEMENTS[e].css[0]);
    r.innerHTML = `<div class="mu-el">${elementIcon(e, 28)}<b>${ELEMENTS[e].name}</b></div><div class="mu-good"><small>Strong vs</small>${BEATS[e].map((x) => `${elementIcon(x, 22)}<span>${ELEMENTS[x].name}</span>`).join('')}</div><div class="mu-bad"><small>Weak vs</small>${weakTo.map((x) => `${elementIcon(x, 22)}<span>${ELEMENTS[x].name}</span>`).join('')}</div>`;
    list.appendChild(r);
  }
  body.appendChild(list);
  // compact grid
  const t = h('table', 'mu-grid');
  t.setAttribute('aria-label', 'Matchup grid: rows attack, columns defend');
  let html = `<tr><th></th>${ELEMENT_IDS.map((e) => `<th>${elementIcon(e, 18)}</th>`).join('')}</tr>`;
  for (const a of ELEMENT_IDS) {
    html += `<tr><th>${elementIcon(a, 18)}</th>${ELEMENT_IDS.map((d) => {
      const m = matchup(a, d as ElementId);
      return `<td class="${m}">${m === 'strong' ? '▲' : m === 'weak' ? '▼' : ''}</td>`;
    }).join('')}</tr>`;
  }
  t.innerHTML = html;
  body.appendChild(t);
  show({ id: 'matchups', el, back });
}
