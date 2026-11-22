// Champion Road: the story ladder. 8 districts, 5 champions each, then the final fight.
// Original premise: the Grand Circuit tournament of Brightvale, and a masked champion who has never lost.

import type { ElementId } from './elementPrefs';

export interface Champion {
  name: string;
  elements: [ElementId, ElementId];
  level: number;
  difficulty: number;
  intro: [string, string];
  outro: string;
  coins: number;
  unlock?: ElementId;
}

export interface District {
  name: string;
  arena: string;
  blurb: string;
  champions: Champion[];
}

export const PREMISE: string[] = [
  'Every summer the eight districts of Brightvale hold the Grand Circuit, a tournament for elemental stick fighters.',
  'This year a masked fighter called Null has entered. Null has never been hit. Not once.',
  'Every champion Null beats loses their element for a whole year. The districts are going dark.',
  'You are a rookie from the Rooftop Gym with one element and one best friend. Time to enter the Circuit.',
];

const C = (name: string, e1: ElementId, e2: ElementId, level: number, difficulty: number, l1: string, l2: string, outro: string, coins = 60, unlock?: ElementId): Champion => ({
  name, elements: [e1, e2], level, difficulty, intro: [l1, l2], outro, coins, unlock,
});

export const DISTRICTS: District[] = [
  {
    name: 'Rooftop Row',
    arena: 'rooftop',
    blurb: 'Windy rooftops where every fighter starts.',
    champions: [
      C('Kit Tallow', 'wind', 'wind', 2, 1, 'First fight? I will go easy on you.', 'Just kidding. I never go easy!', 'Okay, okay, you are good.'),
      C('Rook Danner', 'light', 'wind', 3, 1, 'My mum says I fight like a lighthouse.', 'Bright, tall, and very loud.', 'I need a brighter plan.'),
      C('Sunny Ko', 'light', 'water', 4, 1, 'Light beats Time, Water beats Light.', 'I made a chart. Want to see it?', 'Your chart was better than mine.', 80, 'water'),
      C('Gusty Mae', 'wind', 'lightning', 5, 2, 'I jump twice. You jump once. Math!', 'Catch me if you can.', 'You caught me. Rude.'),
      C('Captain Vela', 'wind', 'light', 7, 2, 'I rule these roofs, rookie.', 'Null took my crown once. Not again.', 'Go. Beat Null for all of us.', 150, 'wind'),
    ],
  },
  {
    name: 'Mosswood',
    arena: 'forest',
    blurb: 'A green maze of vines and hidden traps.',
    champions: [
      C('Fern Odell', 'leaf', 'leaf', 8, 2, 'Watch your step. Literally.', 'I planted mines everywhere.', 'I forgot where my own mines were.'),
      C('Barkley', 'leaf', 'earth', 9, 2, 'I stand like a tree.', 'You cannot push a tree.', 'Fine. You can push a tree.'),
      C('Willa Root', 'leaf', 'water', 10, 2, 'Roots drink rivers. I drink tea.', 'Then I win.', 'The tea was cold anyway.', 80, 'light'),
      C('Mossy Gus', 'earth', 'leaf', 11, 2, 'Mossy is my name and my mood.', 'Slow and steady.', 'Too slow. Too steady.'),
      C('Elder Thorne', 'leaf', 'gravity', 13, 3, 'The forest remembers every fighter.', 'It will remember you losing.', 'The forest will remember you winning.', 160, 'leaf'),
    ],
  },
  {
    name: 'Magma Works',
    arena: 'lava',
    blurb: 'Hot factories that never sleep.',
    champions: [
      C('Spitfire Jo', 'fire', 'fire', 14, 2, 'Hot hands, hot feet, hot temper.', 'Mostly the temper.', 'I need to cool down.'),
      C('Forge Boss Hal', 'fire', 'earth', 15, 3, 'I hammer steel for breakfast.', 'You look softer than steel.', 'Okay. You are steel.'),
      C('Kenna Vox', 'fire', 'lightning', 16, 3, 'Fire and storm. Twice the boom.', 'Earmuffs recommended.', 'My ears are ringing. In a good way.'),
      C('Slag Twins', 'earth', 'fire', 17, 3, 'There are two of us.', 'Well, there are always two of everyone here.', 'We lost twice as hard.'),
      C('Furnace Queen Ada', 'fire', 'water', 19, 3, 'My furnace has burned for 40 years.', 'Null tried to put it out.', 'Keep my fire going. Win.', 170, 'fire'),
    ],
  },
  {
    name: 'Frost Harbor',
    arena: 'ice',
    blurb: 'A frozen port where fighters slide into trouble.',
    champions: [
      C('Skate Lin', 'ice', 'ice', 20, 3, 'I skate faster than you run.', 'Ice is my floor.', 'I slipped. You saw nothing.'),
      C('Harbor Pete', 'water', 'ice', 21, 3, 'Forty years on the docks.', 'Forty years of cold fists.', 'Warm handshake?'),
      C('Glacia Moon', 'ice', 'light', 22, 3, 'Sun on snow is my favorite trick.', 'Can you look at it?', 'You looked right through it.'),
      C('Blizz Brothers', 'ice', 'wind', 23, 3, 'Wind plus ice equals blizzard.', 'We did the math too.', 'Our math was wrong.'),
      C('Admiral Frost', 'ice', 'water', 25, 4, 'I froze the whole harbor once.', 'Null did not even shiver.', 'You made me shiver. Thank you.', 180, 'ice'),
    ],
  },
  {
    name: 'Thunder Heights',
    arena: 'sky',
    blurb: 'Cloud platforms where storms are a sport.',
    champions: [
      C('Volt Kid', 'lightning', 'lightning', 26, 3, 'Zap! That was the warning.', 'The next one is not.', 'I am out of zaps.'),
      C('Storm Sister Ione', 'lightning', 'wind', 27, 4, 'The clouds answer to me.', 'Today they say no to you.', 'The clouds changed their mind.'),
      C('Dyno Ray', 'lightning', 'water', 28, 4, 'I power the whole district.', 'Try not to trip the breaker.', 'Breaker tripped. Lights out.'),
      C('Arc Duo', 'lightning', 'gravity', 29, 4, 'We hop behind you. Every time.', 'Look behind you. Too late.', 'You looked behind us first.'),
      C('Highlord Tesca', 'lightning', 'light', 31, 4, 'Thunder Heights bows to nobody.', 'Not Null. Not you.', 'Fine. One small bow.', 190, 'lightning'),
    ],
  },
  {
    name: 'Dune Quarry',
    arena: 'ruins',
    blurb: 'Stone pits and old ruins under a huge sun.',
    champions: [
      C('Pebble Pax', 'earth', 'earth', 32, 4, 'I throw rocks. Big ones.', 'Bigger than you.', 'The rocks were heavy. I am tired.'),
      C('Sandy Rourke', 'earth', 'wind', 33, 4, 'Sand in your eyes, sand in your shoes.', 'That is the Quarry welcome.', 'Shake out your shoes. You earned it.'),
      C('Digger May', 'earth', 'leaf', 34, 4, 'I dug this whole pit with a spoon.', 'Respect the spoon.', 'I respect your fists.'),
      C('Twin Pillars', 'earth', 'light', 35, 4, 'We hold up the ruins.', 'Do not knock us over.', 'Oops. The ruins are fine.'),
      C('Stone Warden Gore', 'earth', 'gravity', 37, 4, 'Nothing moves me.', 'Not even Null moved me.', 'You moved me. A little.', 200, 'earth'),
    ],
  },
  {
    name: 'Skyline Ruins',
    arena: 'city',
    blurb: 'A broken skyline where gravity forgets itself.',
    champions: [
      C('Float Fia', 'gravity', 'gravity', 38, 4, 'Up is down here. Down is lunch.', 'I am hungry.', 'Lunch break. You win.'),
      C('Heavy Hux', 'gravity', 'earth', 39, 4, 'I weigh as much as a building.', 'Some days two buildings.', 'You lifted two buildings.'),
      C('Spin Ollie', 'gravity', 'light', 40, 5, 'I spin around you like a moon.', 'You get dizzy, I win.', 'I got dizzy first.'),
      C('Neon Sasha', 'gravity', 'lightning', 41, 5, 'This city glows for me.', 'Tonight it glows for my win.', 'Tonight it glows for you.'),
      C('Duchess Vantor', 'gravity', 'time', 43, 5, 'I have watched a hundred Circuits.', 'Null is the only one who scared me.', 'Now you scare me too. Good.', 210, 'gravity'),
    ],
  },
  {
    name: 'Clocktower Square',
    arena: 'gym',
    blurb: 'The heart of Brightvale, where the Circuit ends.',
    champions: [
      C('Tick Tam', 'time', 'time', 44, 5, 'I will rewind your best move.', 'Then rewind it again.', 'I ran out of rewind.'),
      C('Professor Hourne', 'time', 'water', 45, 5, 'I studied every fighter in the Circuit.', 'You are chapter forty-one.', 'I need to add a chapter.'),
      C('Second Hand Sal', 'time', 'fire', 46, 5, 'One second is all I need.', 'You have fifty-nine left.', 'That was a long second.'),
      C('Chrono Pair', 'time', 'ice', 47, 5, 'We freeze time and you.', 'Mostly you.', 'Time melts. So did we.'),
      C('Grand Marshal Oda', 'time', 'gravity', 49, 5, 'I run the Circuit. I let Null in.', 'Prove I was wrong to.', 'Go. Null is waiting in the Crown Arena.', 300, 'time'),
    ],
  },
];

export const FINAL = C('Null', 'time', 'gravity', 50, 5, 'You are the first fighter to reach me.', 'Hit me once. Just once. I want to feel it.', 'You hit me. I finally felt something.', 600);

export const ENDINGS = {
  crown: [
    'You win the Grand Circuit. Every district gets its element back the moment Null falls.',
    'Null takes off the mask. Under it is a tired old champion who never lost a match in sixty years.',
    'He bows, hands you the crown, and walks away into the crowd. The rooftops cheer all night.',
  ],
  rival: [
    'You win, but you hold out your hand instead of taking the crown.',
    'Null takes off the mask. "Nobody has ever offered me a rematch," he says.',
    'Now Brightvale has two champions, a weekly rematch, and a very happy crowd.',
  ],
};

export const ALL_CHAMPIONS: Champion[] = [...DISTRICTS.flatMap((d) => d.champions), FINAL];
