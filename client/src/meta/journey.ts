import { LEVELS, WORLDS, MASTERY_XP, getSkill, masteryLevel } from '@orb/shared';
import type { SaveData } from './save';
import type { QuestDef } from './economy';

export interface JourneyGoal {
  label: string;
  title: string;
  detail: string;
  done: number;
  total: number;
  page: 'quests' | 'campaign' | 'collection';
  action: string;
}

/** Read-only projections of existing progression. No new economy, unlocks or reward clock. */
export function journeyModel(data: SaveData, definitions: QuestDef[], pinned = '') {
  const quests = [...data.quests.list, ...data.quests.weekList]
    .filter(q => !q.claimed)
    .map(q => ({ ...q, def: definitions.find(d => d.id === q.id) }))
    .filter((q): q is typeof q & { def: QuestDef } => !!q.def);
  const sorted = [...quests].sort((a,b) => b.progress / b.def.target - a.progress / a.def.target);
  const quest = quests.find(q => q.id === pinned) ?? sorted[0];
  const ready = quests.filter(q => q.progress >= q.def.target).length;
  const focus: JourneyGoal = quest ? {
    label: 'YOUR QUEST FOCUS', title: quest.def.text,
    detail: quest.progress >= quest.def.target ? 'Complete. Your reward is ready in Quests.' : `${quest.def.coins} coins + ${quest.def.xp} XP when claimed`,
    done: Math.min(quest.progress,quest.def.target), total:quest.def.target,
    page:'quests', action: quest.progress >= quest.def.target ? 'Claim in Quests' : 'View quests',
  } : {
    label:'YOUR QUEST FOCUS', title:'All objectives claimed',
    detail:'New quests arrive on their regular schedule.',done:1,total:1,page:'quests',action:'View quests',
  };
  const levels = LEVELS.filter(l => l.id <= WORLDS.length * 11);
  const stars = levels.reduce((n,l) => n + (data.campaign[String(l.id)] ?? 0),0);
  const next = levels.find(l => !data.campaign[String(l.id)] && (l.id === 1 || data.campaign[String(l.id-1)] > 0));
  const world = next ? WORLDS[Math.floor((next.id-1)/11)] : undefined;
  const campaign: JourneyGoal = {
    label:'THE ROAD AHEAD',title:world?.name ?? 'All worlds cleared',
    detail:next ? `Next: ${next.name}${next.boss ? ' · World boss' : ''}` : 'Replay encounters to improve your star record.',
    done:stars,total:levels.length*3,page:'campaign',action:'Open campaign',
  };
  const skill = [...data.skills].sort((a,b) => b.masteryXp-a.masteryXp)[0];
  const xp = skill?.masteryXp ?? 0, level = masteryLevel(xp);
  const lower = MASTERY_XP[level-1], upper = MASTERY_XP[level] ?? lower;
  const mastery: JourneyGoal = {
    label:'SIGNATURE MASTERY',title:skill ? getSkill(skill.skillId).name : 'Find your signature',
    detail:level === MASTERY_XP.length ? 'Maximum mastery reached.' : `Mastery ${level} · Use this skill in matches to grow.`,
    done:upper === lower ? 1 : xp-lower,total:upper === lower ? 1 : upper-lower,
    page:'collection',action:'Open skills',
  };
  return { goals:[focus,campaign,mastery],quests,ready,selected:quest?.id ?? '' };
}
