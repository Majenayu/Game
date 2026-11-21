import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, CHARACTER_LIST, EFFECT_LIST, MAP_LIST, WEAPONS } from '@orb/shared';
import { drawArena } from './arena';
import { drawCast, drawEffectGlyph, drawEnd, VISUAL_KINDS } from './lifecycle';
import { heroSvg } from './hero';

function graphics() {
  const calls: unknown[][] = [];
  const g = new Proxy({}, {
    get: (_target, name) => (...args: unknown[]) => {
      calls.push([name, ...args]);
      return g;
    },
  }) as Phaser.GameObjects.Graphics;
  return { g, calls };
}

describe('bounded visual coverage', () => {
  it('keeps all seven characters distinct and all six weapon profiles available', () => {
    expect(CHARACTER_LIST).toHaveLength(7);
    expect(WEAPONS).toHaveLength(6);
    const heroes = new Set(CHARACTER_LIST.map(character => heroSvg({ char: character.id, gear: [] })));
    expect(heroes.size).toBe(7);
  });

  it('covers every real skill kind at cast and end', () => {
    expect(new Set(ARCHETYPES.map(a => a.kind))).toEqual(new Set(VISUAL_KINDS));
    const cast = new Set<string>();
    const end = new Set<string>();
    for (const kind of VISUAL_KINDS) {
      const c = graphics();
      const e = graphics();
      drawCast(c.g, kind, 100, 100, 0, 0.7, 0x66b3ff);
      drawEnd(e.g, kind, 100, 100, 0, 0.7, 0x66b3ff);
      expect(c.calls.length).toBeGreaterThan(4);
      expect(e.calls.length).toBeGreaterThan(4);
      cast.add(JSON.stringify(c.calls));
      end.add(JSON.stringify(e.calls));
    }
    expect(cast.size).toBe(VISUAL_KINDS.length);
    expect(end.size).toBe(VISUAL_KINDS.length);
  });

  it('gives every pickup effect a distinct monochrome glyph', () => {
    const signatures = new Set<string>();
    for (const effect of EFFECT_LIST) {
      const { g, calls } = graphics();
      drawEffectGlyph(g, effect.id, 100, 100, 8, 0xffffff);
      signatures.add(JSON.stringify(calls));
    }
    expect(EFFECT_LIST).toHaveLength(12);
    expect(signatures.size).toBe(12);
  });

  it('draws all arenas without changing map geometry', () => {
    expect(MAP_LIST).toHaveLength(25);
    for (const map of MAP_LIST) {
      const before = JSON.stringify(map);
      const { g, calls } = graphics();
      drawArena(g, map);
      expect(calls.length).toBeGreaterThan(80);
      expect(JSON.stringify(map)).toBe(before);
    }
  });
});
