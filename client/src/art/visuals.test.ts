import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, CHARACTER_LIST, MAP_LIST, ELEMENTS, EFFECT_LIST } from '@orb/shared';
import { heroSvg } from './hero';
import { drawArena } from './arena';
import { drawCast, drawEffectGlyph, drawEnd, VISUAL_KINDS } from './lifecycle';
import { drawSkillAnim } from './skillanim';
import { presentation } from '../presentation';
import { avatar } from './icons2';

function graphics() {
  const calls: unknown[][] = [];
  const g = new Proxy({}, {
    get: (_target, name) => (...args: unknown[]) => { calls.push([name, ...args]); return g; },
  }) as Phaser.GameObjects.Graphics;
  return { g, calls };
}
describe('visual coverage without simulation mutation', () => {
  it('renders all seven original hero silhouettes and injured faces', () => {
    expect(CHARACTER_LIST).toHaveLength(7);
    const shapes = new Set<string>();
    for (const char of CHARACTER_LIST) {
      const svg = heroSvg({ char: char.id, gear: [] }, { combat: true });
      expect(svg).toContain('viewBox="0 0 100 120"');
      expect(svg).not.toContain('undefined');
      expect(avatar(char.id)).toContain('<svg x="7" y="2" width="50" height="60"');
      shapes.add(svg.match(/<path d="(M(?:19 59|50 20|29 25|50 22|20 57|32 27|19 49)[^"]+)"/)![1]);
      expect(heroSvg({ char: char.id, gear: [] }, { hurt: true })).not.toBe(svg);
    }
    expect(shapes.size).toBe(7);
  });
  it('draws all 25 arenas without altering their colliders or hazards', () => {
    expect(MAP_LIST).toHaveLength(25);
    for (const map of MAP_LIST) {
      const before = JSON.stringify(map);
      const { g, calls } = graphics();
      drawArena(g, map);
      expect(calls.length).toBeGreaterThan(100);
      expect(JSON.stringify(map)).toBe(before);
    }
  });
  it('covers every real kind at cast, active and end, for all elements', () => {
    expect(new Set(ARCHETYPES.map(a => a.kind))).toEqual(new Set(VISUAL_KINDS));
    presentation.prefs.motion = true;
    const active = new Set<string>(), cast = new Set<string>(), end = new Set<string>();
    for (const kind of VISUAL_KINDS) {
      for (let element = 0; element < ELEMENTS.length; element++) {
        const { g, calls } = graphics();
        for (const k of [0.05, 0.5, 0.9]) drawSkillAnim(g, kind, element, 400, 300, 0, k, 1, 0x66b3ff, 1);
        expect(calls.length).toBeGreaterThan(5);
        expect(JSON.stringify(calls)).not.toMatch(/NaN|undefined/);
      }
      const c = graphics(), a = graphics(), e = graphics();
      drawCast(c.g, kind, 400, 300, 0, 0.5, 0x66b3ff);
      drawSkillAnim(a.g, kind, 0, 400, 300, 0, 0.5, 1, 0x66b3ff, 1);
      drawEnd(e.g, kind, 400, 300, 0, 0.5, 0x66b3ff);
      cast.add(JSON.stringify(c.calls)); active.add(JSON.stringify(a.calls)); end.add(JSON.stringify(e.calls));
    }
    expect(cast.size).toBe(20); expect(active.size).toBe(20); expect(end.size).toBe(20);
  });
  it('keeps a visible cue with reduced motion and low quality', () => {
    const old = { ...presentation.prefs };
    presentation.prefs.motion = false;
    presentation.prefs.quality = 'low';
    for (const kind of VISUAL_KINDS) {
      const { g, calls } = graphics();
      drawSkillAnim(g, kind, 0, 0, 0, 0, 0.5, 1, 0x66b3ff, 1);
      expect(calls.length).toBeGreaterThan(3);
    }
    for (const id of ['heal','shield','freeze','magnet','ricochet','big','triple','pierce','speed'] as const) {
      const { g, calls } = graphics();
      drawEffectGlyph(g, id, 0, 0, 8, 0xffffff);
      expect(calls.length).toBeGreaterThan(2);
    }
    Object.assign(presentation.prefs, old);
  });
  it('gives all twelve real pickup effects a distinct monochrome glyph', () => {
    const signatures=new Set<string>();
    for (const effect of EFFECT_LIST) {
      const {g,calls}=graphics();
      drawEffectGlyph(g,effect.id,100,100,8,0xffffff);
      signatures.add(JSON.stringify(calls));
    }
    expect(EFFECT_LIST).toHaveLength(12);
    expect(signatures.size).toBe(12);
  });
});
