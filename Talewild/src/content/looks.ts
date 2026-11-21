// Character look palettes for the layered sprite builder (body, hair, outfit). The player picks from these,
// and NPCs are defined with the same structure.

import type { Look } from '../core/save';

export const SKINS = ['#f6d3b3', '#efbf96', '#d9a07a', '#b97a56', '#8d5a3b', '#5e3b27'];
export const HAIR_COLOURS = ['#5a3726', '#2b211d', '#c9873e', '#e9d27a', '#a8412f', '#cfcfd8'];
export const HAIR_STYLES = ['short', 'long', 'bun', 'cap'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

/** [main, shade, accent] */
export const OUTFITS: [string, string, string][] = [
  ['#3b5ba8', '#2c437d', '#f2c14e'],
  ['#4f8a5a', '#3a6a44', '#f6e7c1'],
  ['#b4533f', '#8a3a2d', '#f2c14e'],
  ['#6b5bb5', '#4e4290', '#9ad1ff'],
  ['#2f7a8a', '#225c69', '#ffd27a'],
  ['#c9873e', '#9c6528', '#3b2a22'],
  ['#d86b8e', '#a84d6c', '#fff3d6'],
  ['#3d3d52', '#28283a', '#e8603c'],
  ['#7a9a3a', '#5a7428', '#f3ead6'],
  ['#e0b04a', '#b78a2e', '#3b5ba8'],
  ['#8a5a9e', '#683f7a', '#7fd6a8'],
  ['#efe6d2', '#c9bfa8', '#b4533f'],
];

export const DEFAULT_LOOK: Look = { skin: 1, hair: 0, hairStyle: 0, outfit: 0 };

export const NPC_LOOKS: Record<string, Look> = {
  mara: { skin: 2, hair: 5, hairStyle: 2, outfit: 4 },
  kid: { skin: 0, hair: 2, hairStyle: 0, outfit: 2 },
  sailor: { skin: 3, hair: 1, hairStyle: 3, outfit: 7 },
  fisher: { skin: 4, hair: 1, hairStyle: 3, outfit: 9 },
};
