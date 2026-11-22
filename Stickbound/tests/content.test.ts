import { describe, expect, it } from 'vitest';
import { BEATS, ELEMENT_IDS, ELEMENTS } from '../src/content/elements';
import { PRIMARY_PAIRS, SECONDARY_PAIRS } from '../src/content/elementPrefs';
import { ARCHETYPE_IDS, mechanicOf, POWERS, POWER_TEXT, powersFor } from '../src/content/powers';
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
  it('there are 90 powers: 3 styles x 3 powers per element, all with unique names and ids', () => {
    expect(POWERS).toHaveLength(90);
    for (const e of ELEMENT_IDS) for (const a of ARCHETYPE_IDS) expect(new Set(powersFor(e, a).map((p) => p!.id)).size).toBe(3);
    expect(new Set(POWERS.map((p) => p.name)).size).toBe(90);
    expect(new Set(POWERS.map((p) => p.id)).size).toBe(90);
  });
  it('two avatars of the same element but different styles share no power', () => {
    for (const e of ELEMENT_IDS)
      for (const a of ARCHETYPE_IDS)
        for (const b of ARCHETYPE_IDS) {
          if (a === b) continue;
          const A = powersFor(e, a).map((p) => p.name);
          for (const p of powersFor(e, b)) expect(A, `${e} ${a}/${b}`).not.toContain(p.name);
        }
  });
  it("at least 60% of the new powers use a mechanic the element's other styles do not", () => {
    let unique = 0;
    let total = 0;
    for (const e of ELEMENT_IDS)
      for (const a of ['striker', 'warden'] as const) {
        const others = new Set(ARCHETYPE_IDS.filter((x) => x !== a).flatMap((x) => powersFor(e, x).map(mechanicOf)));
        for (const p of powersFor(e, a)) {
          total++;
          if (!others.has(mechanicOf(p))) unique++;
        }
      }
    expect(total).toBe(60);
    expect(unique / total).toBeGreaterThanOrEqual(0.6);
  });

  it('every power has data, an MP cost, an animation key, a description and something that happens', () => {
    for (const p of POWERS) {
      expect(p.mp, p.id).toBeGreaterThan(0);
      expect(p.anim, p.id).toBeTruthy();
      expect(POWER_TEXT[p.id], p.id).toBeTruthy();
      expect(!!(p.hit || p.spawn || p.spawns?.length || p.special), p.id).toBe(true);
      expect(p.startup + p.active + p.recovery, p.id).toBeGreaterThan(10);
    }
  });
});
