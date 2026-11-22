// Avatar Forge options. Cosmetics never change stats.

export interface Look {
  head: number;
  eyes: number;
  mouth: number;
  body: number;
  thick: number;
  hat: number;
  back: number;
  extra: number;
  aura: number;
  pose: number;
}

export const HEADS = ['Round', 'Wide', 'Tall', 'Small'];
export const EYES = ['Dots', 'Bright', 'Narrow', 'Sleepy', 'Wide', 'Fierce', 'Calm', 'Star'];
export const MOUTHS = ['Line', 'Smile', 'Grin', 'Small O', 'Smirk', 'Teeth'];
/** Line colours for the stick body (dark, so figures stay readable on light arenas). */
export const BODIES = [0x16161d, 0x2a2f45, 0x3b2a20, 0x1f3b2a, 0x3a1f3b, 0x40201f];
export const BODY_NAMES = ['Coal Black', 'Night Blue', 'Cocoa', 'Forest', 'Plum', 'Brick'];
export const THICKNESS = [6, 8, 10];
export const THICK_NAMES = ['Thin', 'Normal', 'Bold'];
export const HATS = ['None', 'Headband', 'Spiky hair', 'Cap', 'Beanie', 'Horns', 'Top bun', 'Antenna'];
export const BACKS = ['None', 'Scarf', 'Cape', 'Long scarf'];
export const EXTRAS = ['None', 'Wristbands', 'Belt', 'Goggles', 'Shades'];
/** 0 = element colour */
export const AURAS = [0, 0xffffff, 0xff4d8d, 0x00e0ff, 0xffd84a, 0x9b6bff, 0x55ff8a];
export const AURA_NAMES = ['Element', 'White', 'Pink', 'Cyan', 'Gold', 'Violet', 'Mint'];
export const WIN_POSES = ['Fist up', 'Bow', 'Flex', 'Point'];

export const DEFAULT_LOOK: Look = { head: 0, eyes: 0, mouth: 1, body: 0, thick: 1, hat: 0, back: 1, extra: 0, aura: 0, pose: 0 };

/** Options that must be bought in the Shop (index lists per slot). Everything else is free. */
export const LOCKED: Partial<Record<keyof Look, Record<number, number>>> = {
  hat: { 5: 300, 6: 200, 7: 350 },
  back: { 2: 400, 3: 300 },
  extra: { 3: 250, 4: 250 },
  aura: { 2: 200, 3: 200, 4: 300, 5: 300, 6: 200 },
  pose: { 2: 150, 3: 150 },
};

export function lookFromSeed(seed: number): Look {
  let s = seed >>> 0;
  const r = (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
  return { head: r(4), eyes: r(8), mouth: r(6), body: r(6), thick: 1, hat: r(5), back: r(3), extra: r(3), aura: 0, pose: r(2) };
}
