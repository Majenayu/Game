import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, QUALITY_BUDGETS, normalizePreferences } from './presentation';

describe('presentation preferences', () => {
  it('normalizes corrupt values without touching gameplay data', () => {
    expect(normalizePreferences({ quality: 'cinematic', music: 4, effects: -2, voice: Number.NaN })).toEqual({
      ...DEFAULT_PREFERENCES,
      music: 1,
      effects: 0,
    });
  });

  it('keeps explicit accessibility settings and bounded quality tiers', () => {
    expect(normalizePreferences({ quality: 'low', motion: false, shake: false, colorblind: true })).toMatchObject({
      quality: 'low', motion: false, shake: false, colorblind: true,
    });
    expect(QUALITY_BUDGETS.low.particles).toBeLessThan(QUALITY_BUDGETS.medium.particles);
    expect(QUALITY_BUDGETS.medium.particles).toBeLessThan(QUALITY_BUDGETS.high.particles);
  });
});
