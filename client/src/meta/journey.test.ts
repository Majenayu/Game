import { describe, expect, it } from 'vitest';
import { makeInstance } from '@orb/shared';
import { defaultSave } from './save';
import { journeyModel } from './journey';
import type { QuestDef } from './economy';

const definitions: QuestDef[] = [
  { id: 'daily', text: 'Play three rounds', type: 'rounds', target: 3, coins: 50, xp: 40 },
  { id: 'weekly', text: 'Win ten rounds', type: 'wins', target: 10, coins: 500, xp: 350 },
];

describe('read-only journey presentation', () => {
  it('projects existing goals without mutating rewards or progress', () => {
    const data = defaultSave();
    data.quests.list = [{ id: 'daily', progress: 3, claimed: false }];
    data.quests.weekList = [{ id: 'weekly', progress: 2, claimed: false }];
    data.skills = [{ ...makeInstance(1, () => 0.5, 'test'), masteryXp: 125 }];
    const before = JSON.stringify(data);
    const model = journeyModel(data, definitions, 'weekly');
    expect(model.selected).toBe('weekly');
    expect(model.ready).toBe(1);
    expect(model.goals).toHaveLength(3);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('excludes unrelated champion and tower records from campaign stars', () => {
    const data = defaultSave();
    data.campaign = { '1': 3, '1000': 3, '9999': 3 };
    expect(journeyModel(data, definitions).goals[1]).toMatchObject({ done: 3, total: 264 });
  });
});
