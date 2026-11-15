import type { Kind } from './skills/catalog';

/** Starting classes. The first-run screen asks what kind of fighter you want to be; the starter skills follow. */
export interface ClassDef {
  id: string;
  name: string;
  desc: string;
  /** Suggested character and weapon. */
  char: string;
  weapon: number;
  /** Skill kinds for the five starter slots (ranks B, C, D, E, F). */
  kinds: Kind[][];
}
export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    desc: 'Close-range brawler: big swings, shockwaves and a shield.',
    char: 'titan',
    weapon: 1,
    kinds: [['cleave'], ['nova'], ['shield'], ['dash'], ['projectile']],
  },
  {
    id: 'mage',
    name: 'Mage',
    desc: 'Long-range caster: beams, volleys and healing.',
    char: 'nova',
    weapon: 0,
    kinds: [['beam'], ['volley'], ['nova'], ['heal'], ['blink']],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    desc: 'Strikes from the shadows, then vanishes.',
    char: 'ghost',
    weapon: 3,
    kinds: [['ambush'], ['cleave'], ['stealth'], ['dash'], ['projectile']],
  },
  {
    id: 'guardian',
    name: 'Guardian',
    desc: 'Hard to kill: shields, barriers, heals and pulls.',
    char: 'medic',
    weapon: 5,
    kinds: [['shield'], ['barrier'], ['heal'], ['pull'], ['nova']],
  },
  {
    id: 'summoner',
    name: 'Summoner',
    desc: 'Fights with pets, mines and auras.',
    char: 'viper',
    weapon: 0,
    kinds: [['summon'], ['mine'], ['aura'], ['heal'], ['projectile']],
  },
  {
    id: 'gunner',
    name: 'Gunner',
    desc: 'Pure firepower: shots, volleys, beams and buffs.',
    char: 'sniper',
    weapon: 2,
    kinds: [['projectile'], ['volley'], ['beam'], ['buff'], ['dash']],
  },
];
export function classById(id: string): ClassDef | undefined {
  return CLASSES.find((c) => c.id === id);
}
