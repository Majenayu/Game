// Phase 1 test scenes. All text values are locale keys.

import type { Script } from '../../script/types';

const s = (id: string, steps: Script['steps']): Script => ({ id, steps });

export const scripts: Record<string, Script> = {
  elowen_desk: s('elowen_desk', [
    { if: 'got_letter', then: [{ say: 'desk.again' }, { end: true }] },
    { say: 'desk.1' },
    { say: 'desk.2' },
    { emote: 'nib', icon: 'surprise' },
    { say: 'nib.chirp', who: 'nib' },
    { give: 'old_letter' },
    { set: 'got_letter' },
    { say: 'desk.3' },
  ]),
  bookshelf: s('bookshelf', [{ say: 'shelf.1' }]),
  bed: s('bed', [{ say: 'bed.1' }]),
  sign_house: s('sign_house', [{ say: 'sign.house' }]),
  mara: s('mara', [
    { if: '!got_letter', then: [{ say: 'mara.early', who: 'mara' }, { end: true }] },
    { if: 'met_mara', then: [{ say: 'mara.again', who: 'mara' }, { end: true }] },
    { say: 'mara.1', who: 'mara' },
    { say: 'mara.2', who: 'mara' },
    {
      choice: ['mara.q.scribe', 'mara.q.field'],
      branches: [[{ say: 'mara.a.scribe', who: 'mara' }], [{ say: 'mara.a.field', who: 'mara' }]],
    },
    { camera: { x: 19, y: 3, ms: 900 } },
    { say: 'mara.3', who: 'mara' },
    { camera: 'player' },
    { emote: 'nib', icon: 'note' },
    { set: 'met_mara' },
    { say: 'mara.4', who: 'mara' },
  ]),
  kid: s('kid', [{ if: 'met_mara', then: [{ say: 'kid.2', who: 'kid' }], else: [{ say: 'kid.1', who: 'kid' }] }]),
  sailor: s('sailor', [
    { add: 'sailor_talks', n: 1 },
    { ifVar: 'sailor_talks', gte: 3, then: [{ say: 'sailor.3', who: 'sailor' }], else: [{ say: 'sailor.1', who: 'sailor' }] },
  ]),
  fisher: s('fisher', [
    { if: 'met_fisher', then: [{ say: 'fisher.again', who: 'fisher' }, { end: true }] },
    { say: 'fisher.1', who: 'fisher' },
    { give: 'salve', n: 2 },
    { set: 'met_fisher' },
    { say: 'fisher.2', who: 'fisher' },
  ]),
  nib: s('nib', [{ emote: 'nib', icon: 'heart' }, { say: 'nib.chirp', who: 'nib' }]),
};
