import { describe, expect, it } from 'vitest';
import { makeInstance, MASTERY_XP } from '@orb/shared';
import { defaultSave } from './save';
import { journeyModel } from './journey';
import type { QuestDef } from './economy';

const defs: QuestDef[] = [
  {id:'daily',text:'Play three rounds',type:'rounds',target:3,coins:50,xp:40},
  {id:'weekly',text:'Win ten rounds',type:'wins',target:10,coins:500,xp:350},
];
describe('read-only roadmap journey presentation', () => {
  it('prioritizes a ready quest and honors a valid pinned quest without changing rewards', () => {
    const data = defaultSave();
    data.quests.list = [{id:'daily',progress:3,claimed:false}];
    data.quests.weekList = [{id:'weekly',progress:2,claimed:false}];
    const before = JSON.stringify(data);
    expect(journeyModel(data,defs).selected).toBe('daily');
    expect(journeyModel(data,defs).ready).toBe(1);
    expect(journeyModel(data,defs,'weekly').selected).toBe('weekly');
    expect(JSON.stringify(data)).toBe(before);
  });
  it('falls back safely when a pinned daily expires or is claimed', () => {
    const data = defaultSave();
    data.quests.list = [{id:'daily',progress:3,claimed:true}];
    expect(journeyModel(data,defs,'daily').selected).toBe('');
    expect(journeyModel(data,defs,'expired').goals[0].title).toBe('All objectives claimed');
  });
  it('excludes tower and champion records from the eight-world star total', () => {
    const data = defaultSave();
    data.campaign = {'1':3,'1000':3,'9999':3};
    const campaign = journeyModel(data,defs).goals[1];
    expect(campaign.done).toBe(3);
    expect(campaign.total).toBe(264);
  });
  it('uses existing mastery thresholds and never grants mastery', () => {
    const data = defaultSave();
    data.skills = [{...makeInstance(1,()=>.5,'test'),masteryXp:125}];
    const model = journeyModel(data,defs);
    expect(model.goals[2]).toMatchObject({done:25,total:150});
    expect(data.skills[0].masteryXp).toBe(125);
    data.skills[0].masteryXp = MASTERY_XP[MASTERY_XP.length-1];
    expect(journeyModel(data,defs).goals[2]).toMatchObject({done:1,total:1});
  });
});
