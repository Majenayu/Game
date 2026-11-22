// Shop: coins only (earned by playing). No real money, no loot boxes: every item shows exactly what you get.
import { audio } from '../../audio/synth';
import { ELEMENT_IDS, ELEMENTS } from '../../content/elements';
import { AURA_NAMES, BACKS, EXTRAS, HATS, LOCKED, WIN_POSES, type Look } from '../../content/looks';
import { app, saveProfile } from '../../app/state';
import { buy, ELEMENT_PRICE, MAX_SLOTS, SLOT_PRICE, slotsFor, unlockElement } from '../../meta/profile';
import { elementIcon } from '../../render/icons';
import { btn, h, toast } from '../dom';
import { frame, refreshCoins, show } from '../router';
import { lookKey } from './avatars';
import { showLobby } from './lobby';

const NAMES: Partial<Record<keyof Look, string[]>> = { hat: HATS, back: BACKS, extra: EXTRAS, aura: AURA_NAMES, pose: WIN_POSES };
const KIND: Partial<Record<keyof Look, string>> = { hat: 'Hat', back: 'Back', extra: 'Extra', aura: 'Aura', pose: 'Win pose' };

export function showShop(): void {
  const p = app.profile;
  const { el, body } = frame('shop', 'Shop', showLobby);
  body.appendChild(h('p', 'hint', 'Everything here costs coins you earn by playing. Looks never change stats.'));
  const poor = () => toast('Not enough coins yet. Win fights, claim your streak and finish quests.');
  const done = (msg: string) => {
    saveProfile();
    audio.sfx('coin');
    refreshCoins();
    toast(msg);
    showShop();
  };

  // elements
  const els = h('div', 'panel');
  els.appendChild(h('h3', '', 'Elements'));
  const eg = h('div', 'shop-grid');
  for (const e of ELEMENT_IDS) {
    const owned = p.unlocked.includes(e);
    const b = btn(`${elementIcon(e, 30)}<b>${ELEMENTS[e].name}</b><span>${owned ? 'Unlocked' : `${ELEMENT_PRICE} coins`}</span>`, () => {
      if (unlockElement(p, e, true)) done(`${ELEMENTS[e].name} unlocked! Make an avatar on the Avatars screen.`);
      else poor();
    }, `btn shop-item ${owned ? 'owned' : ''}`);
    b.disabled = owned;
    eg.appendChild(b);
  }
  els.appendChild(eg);
  els.appendChild(h('p', 'hint', 'District bosses on Champion Road also unlock elements for free.'));
  body.appendChild(els);

  // roster slot
  const slots = slotsFor(p);
  const sl = h('div', 'panel');
  sl.appendChild(h('h3', '', 'Roster'));
  const sb = btn(`<b>+1 avatar slot</b><span>${slots >= MAX_SLOTS ? 'Maxed' : `${SLOT_PRICE} coins · now ${slots}/${MAX_SLOTS}`}</span>`, () => {
    if (p.coins < SLOT_PRICE) return poor();
    p.coins -= SLOT_PRICE;
    p.slots = slots + 1;
    done('New roster slot!');
  }, 'btn shop-item');
  sb.disabled = slots >= MAX_SLOTS;
  sl.appendChild(sb);
  body.appendChild(sl);

  // cosmetics
  const cs = h('div', 'panel');
  cs.appendChild(h('h3', '', 'Looks'));
  const cg = h('div', 'shop-grid');
  for (const [k, items] of Object.entries(LOCKED) as [keyof Look, Record<number, number>][]) {
    for (const [idx, price] of Object.entries(items)) {
      const i = Number(idx);
      const key = lookKey(k, i);
      const owned = p.owned.includes(key);
      const b = btn(`<small>${KIND[k]}</small><b>${NAMES[k]?.[i] ?? key}</b><span>${owned ? 'Owned' : `${price} coins`}</span>`, () => {
        if (buy(p, key, price)) done(`Bought: ${NAMES[k]?.[i]}. Put it on in the Forge.`);
        else poor();
      }, `btn shop-item ${owned ? 'owned' : ''}`);
      b.disabled = owned;
      cg.appendChild(b);
    }
  }
  cs.appendChild(cg);
  body.appendChild(cs);
  show({ id: 'shop', el, back: showLobby });
}
