import { describe, expect, it } from 'vitest';
import { BEATS, ELEMENT_IDS, ELEMENTS } from '../src/content/elements';
import { PRIMARY_PAIRS, SECONDARY_PAIRS } from '../src/content/elementPrefs';
import { POWERS, POWERS_BY_ELEMENT, POWER_TEXT } from '../src/content/powers';
import { isRegular, searchWheel } from '../src/content/wheelSearch';

describe('element wheel', () => {
  it('is regular: every element beats exactly 2, loses to exactly 2, no mutual wins', () => {
    expect(isRegular(ELEMENT_IDS, BEATS)).toEqual([]);
  });

  it('is the wheel the search picks, satisfying the most preferred pairs', () => {
    const r = searchWheel(ELEMENT_IDS, PRIMARY_PAIRS, SECONDARY_PAIRS);
    expect(r.primaryHit).toBe(PRIMARY_PAIRS.length);
    for (const e of ELEMENT_IDS) expect([...BEATS[e]].sort()).toEqual([...r.beats[e]!].sort());
  });

  it('every element has a distinct icon shape (works without colour)', () => {
    const shapes = new Set(ELEMENT_IDS.map((e) => ELEMENTS[e].icon));
    expect(shapes.size).toBe(ELEMENT_IDS.length);
  });
});

describe('powers', () => {
  it('there are 30 powers, 3 per element, with unique names', () => {
    expect(POWERS).toHaveLength(30);
    for (const e of ELEMENT_IDS) expect(POWERS_BY_ELEMENT[e]).toHaveLength(3);
    expect(new Set(POWERS.map((p) => p.name)).size).toBe(30);
  });

  it('every power has data, an MP cost, an animation key, a description and something that happens', () => {
    for (const p of POWERS) {
      expect(p.mp, p.id).toBeGreaterThan(0);
      expect(p.anim, p.id).toBeTruthy();
      expect(POWER_TEXT[p.id], p.id).toBeTruthy();
      expect(!!(p.hit || p.spawn || p.special), p.id).toBe(true);
      expect(p.startup + p.active + p.recovery, p.id).toBeGreaterThan(10);
    }
  });
});
