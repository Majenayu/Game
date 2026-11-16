import { describe, expect, it } from 'vitest';
import { friendly, normalizePreferences, QUALITY_BUDGETS, DEFAULT_PREFERENCES } from './presentation';

describe('presentation only settings', () => {
  it('keeps blue ownership relative to the local player on either team', () => {
    expect(friendly('me', 'ally', true, 1, 1)).toBe(true);
    expect(friendly('me', 'foe', true, 1, 0)).toBe(false);
    expect(friendly('me', 'foe', false, 0, 0)).toBe(false);
    expect(friendly('me', 'me', false)).toBe(true);
    expect(friendly('me', 'unknown', true)).toBe(false);
  });
  it('normalizes additive preferences without touching a game save', () => {
    expect(normalizePreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({ effects: 5, music: -1, voice: NaN })).toMatchObject({ effects: 1, music: 0, voice: 0 });
    expect(normalizePreferences({ quality: 'broken' as 'auto' }).quality).toBe('auto');
    for (const invalid of [null, false, 5, 'old setting', []]) {
      expect(normalizePreferences(invalid)).toEqual(DEFAULT_PREFERENCES);
    }
  });
  it('caps every quality tier under the pool capacity', () => {
    for (const b of Object.values(QUALITY_BUDGETS)) {
      expect(b.particles).toBeLessThanOrEqual(280);
      expect(b.perFrame).toBeLessThanOrEqual(24);
    }
  });
});
