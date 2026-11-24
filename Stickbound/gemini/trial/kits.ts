/**
 * Element kits for the Hero Trial lab: colours, names and the power list of each hero.
 * Power names and mechanics follow the game's power table (src/content/powers.ts, master prompt C4):
 * U = Power I, I = Power II, O = Power III. K is the element heavy, L the dash, P the ultimate, S the element shield.
 * Looks follow the owner's reference sheets in gemini/ (one sheet per element).
 */
export type ElementId = 'fire' | 'water' | 'ice' | 'wind' | 'earth' | 'leaf' | 'light' | 'gravity' | 'time';
export const TRIAL_ELEMENTS: ElementId[] = ['fire', 'water', 'ice', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];

export interface PowerInfo {
  key: 'KeyU' | 'KeyI' | 'KeyO';
  clip: string;
  name: string;
  mp: number;
  /** what it does, for the panel */
  text: string;
}
export interface Kit {
  id: ElementId;
  name: string;
  icon: string;
  /** outline, light (hot core) and accent colours */
  line: string;
  light: string;
  accent: string;
  fill: string;
  /** rgb triplets for additive effects: glow, mid, core */
  fx: { glow: string; mid: string; core: string };
  /** a second effect palette (sparks of a second colour) */
  fx2: { glow: string; mid: string; core: string };
  heavy: string;
  kick: string;
  rising: string;
  dash: string;
  shield: string;
  ult: string;
  ultBanner: string;
  passive: string;
  powers: [PowerInfo, PowerInfo, PowerInfo];
  /** combo shout labels at 3, 5 and 8 hits */
  shouts: [string, string, string];
  /** false hides the gravity orbit ring (Lightning borrows the gravity moves) */
  orbit?: false;
}

const P = (key: PowerInfo['key'], clip: string, name: string, mp: number, text: string): PowerInfo => ({ key, clip, name, mp, text });

export const KITS: Record<ElementId, Kit> = {
  fire: {
    id: 'fire', name: 'Fire', icon: '🔥',
    line: '#ff7a2a', light: '#ffd23a', accent: '#ff3b2f', fill: '#140c10',
    fx: { glow: '255,90,20', mid: '255,170,60', core: '255,245,200' },
    fx2: { glow: '255,40,20', mid: '255,110,40', core: '255,220,140' },
    heavy: 'Flare Hammer', kick: 'Flame Kick', rising: 'Rising Flame', dash: 'Heat Dash', shield: 'flame wall',
    ult: 'Inferno Crown', ultBanner: 'INFERNO CROWN', passive: 'Burns last longer',
    shouts: ['HOT', 'SCORCHING!', 'INFERNO!'],
    powers: [
      P('KeyU', 'fireShot', 'Hot Shot', 20, 'fireball, sets the foe on fire (Burn)'),
      P('KeyI', 'scorchDash', 'Scorch Dash', 30, 'flaming dash through the foe, leaves a burning trail'),
      P('KeyO', 'furnace', 'Furnace Rise', 50, 'fire column erupts under the foe and launches'),
    ],
  },
  water: {
    id: 'water', name: 'Water', icon: '💧',
    line: '#3fe0ff', light: '#c0f2ff', accent: '#2a8cff', fill: '#0b1020',
    fx: { glow: '30,140,255', mid: '90,220,255', core: '230,250,255' },
    fx2: { glow: '20,90,220', mid: '60,170,255', core: '200,240,255' },
    heavy: 'Crash Wave', kick: 'Surf Kick', rising: 'Rising Wave', dash: 'Slip Stream', shield: 'bubble dome',
    ult: 'Maelstrom', ultBanner: 'MAELSTROM', passive: 'Hits refill a little MP',
    shouts: ['SPLASH', 'TORRENT!', 'TSUNAMI!'],
    powers: [
      P('KeyU', 'jetLance', 'Jet Lance', 20, 'high-pressure water jet that shoves the foe'),
      P('KeyI', 'undertow', 'Undertow', 35, 'ground wave that rolls across the whole arena'),
      P('KeyO', 'bubbleLock', 'Bubble Lock', 50, 'bubble that traps the foe in the air'),
    ],
  },
  ice: {
    id: 'ice', name: 'Ice', icon: '❄️',
    line: '#bfe9ff', light: '#ffffff', accent: '#6fc8ff', fill: '#0c1222',
    fx: { glow: '90,170,255', mid: '190,235,255', core: '255,255,255' },
    fx2: { glow: '60,120,230', mid: '140,200,255', core: '235,248,255' },
    heavy: 'Frost Hammer', kick: 'Frost Kick', rising: 'Rising Frost', dash: 'Ice Skate', shield: 'crystal wall',
    ult: 'Absolute Zero', ultBanner: 'ABSOLUTE ZERO', passive: 'Hits slow the foe a little',
    shouts: ['CHILL', 'FROZEN!', 'SUBZERO!'],
    powers: [
      P('KeyU', 'rimeDart', 'Rime Dart', 20, 'fast ice shard, slows the foe'),
      P('KeyI', 'glacierGate', 'Glacier Gate', 25, 'ice wall that blocks the foe for 4 seconds'),
      P('KeyO', 'permafrost', 'Permafrost', 55, 'ice spikes all around you freeze the foe'),
    ],
  },
  wind: {
    id: 'wind', name: 'Wind', icon: '🌪️',
    line: '#6ef0b0', light: '#d8fff0', accent: '#3fd0a0', fill: '#0a1416',
    fx: { glow: '60,220,160', mid: '170,255,220', core: '240,255,250' },
    fx2: { glow: '40,170,140', mid: '120,230,190', core: '220,255,240' },
    heavy: 'Gale Hammer', kick: 'Gale Kick', rising: 'Rising Gale', dash: 'Tailwind', shield: 'wind barrier',
    ult: 'Tempest', ultBanner: 'TEMPEST', passive: 'Double jump (press jump again in the air)',
    shouts: ['BREEZY', 'GALE FORCE!', 'HURRICANE!'],
    powers: [
      P('KeyU', 'breezeShove', 'Breeze Shove', 15, 'gust from the palm with big knockback'),
      P('KeyI', 'whirlKick', 'Whirl Kick', 30, 'spinning kick, 6 hits while moving forward'),
      P('KeyO', 'razorDraft', 'Razor Draft', 40, 'three fast wind blades across the arena'),
    ],
  },
  earth: {
    id: 'earth', name: 'Earth', icon: '🪨',
    line: '#e09a48', light: '#ffd08a', accent: '#8a5a2a', fill: '#3a2414',
    fx: { glow: '230,140,50', mid: '255,200,120', core: '255,240,200' },
    fx2: { glow: '150,100,60', mid: '200,160,110', core: '240,220,180' },
    heavy: 'Rock Hammer', kick: 'Stone Kick', rising: 'Rising Rock', dash: 'Landslide', shield: 'stone plate',
    ult: 'Titan Quake', ultBanner: 'TITAN QUAKE', passive: 'Guard takes 10% less',
    shouts: ['SOLID', 'ROCK HARD!', 'EARTHSHAKER!'],
    powers: [
      P('KeyU', 'boulderLob', 'Boulder Lob', 20, 'arcing boulder that lands on the foe'),
      P('KeyI', 'graniteFist', 'Granite Fist', 30, 'armoured stone punch, does not flinch'),
      P('KeyO', 'groundbreak', 'Groundbreak', 50, 'shockwave of rock spikes that hits grounded foes'),
    ],
  },
  leaf: {
    id: 'leaf', name: 'Leaf', icon: '🌿',
    line: '#78e65a', light: '#d4ff9a', accent: '#ff8fc8', fill: '#0b140c',
    fx: { glow: '80,220,70', mid: '180,255,130', core: '240,255,220' },
    fx2: { glow: '255,90,170', mid: '255,160,210', core: '255,235,245' },
    heavy: 'Root Hammer', kick: 'Thorn Kick', rising: 'Rising Thorn', dash: 'Petal Dash', shield: 'leaf weave',
    ult: 'Lotus Bloom', ultBanner: 'LOTUS BLOOM', passive: 'Slow HP regen out of combat',
    shouts: ['SPROUT', 'IN BLOOM!', 'OVERGROWN!'],
    powers: [
      P('KeyU', 'vineSnare', 'Vine Snare', 20, 'long vine that grabs the foe and pulls it in'),
      P('KeyI', 'burrMine', 'Burr Mine', 25, 'hidden seed mine, roots the foe that steps on it'),
      P('KeyO', 'thicket', 'Thicket Rise', 55, 'roots across the floor hold the foe, heals you a little'),
    ],
  },
  light: {
    id: 'light', name: 'Light', icon: '✨',
    line: '#ffe8a0', light: '#ffffff', accent: '#fff3c8', fill: '#15130c',
    fx: { glow: '255,200,90', mid: '255,240,180', core: '255,255,255' },
    fx2: { glow: '255,160,60', mid: '255,220,140', core: '255,250,230' },
    heavy: 'Sun Hammer', kick: 'Halo Kick', rising: 'Rising Sun', dash: 'Light Step', shield: 'radiant aegis',
    ult: 'Dawnburst', ultBanner: 'DAWNBURST', passive: 'Projectiles fly faster',
    shouts: ['BRIGHT', 'DAZZLING!', 'RADIANT!'],
    powers: [
      P('KeyU', 'brightDart', 'Bright Dart', 20, 'very fast light dart that dazzles the foe'),
      P('KeyI', 'sunlance', 'Sunlance', 35, 'piercing beam of light, 4 hits'),
      P('KeyO', 'shineShield', 'Shine Shield', 50, 'barrier that blocks the next hit and heals'),
    ],
  },
  gravity: {
    id: 'gravity', name: 'Gravity', icon: '🌀',
    line: '#c04cff', light: '#f0c8ff', accent: '#ff5ad8', fill: '#0f0a18',
    fx: { glow: '170,60,255', mid: '220,150,255', core: '250,230,255' },
    fx2: { glow: '255,60,200', mid: '255,140,230', core: '255,225,250' },
    heavy: 'Mass Hammer', kick: 'Void Kick', rising: 'Rising Mass', dash: 'Phase Slide', shield: 'gravity lens',
    ult: 'Event Horizon', ultBanner: 'EVENT HORIZON', passive: 'Knockback pulls slightly toward you',
    shouts: ['HEAVY', 'CRUSHING!', 'SINGULARITY!'],
    powers: [
      P('KeyU', 'gravWell', 'Grav Well', 25, 'gravity well that drags the foe toward you'),
      P('KeyI', 'anchorDrop', 'Anchor Drop', 30, 'crushing mass slams the foe into the floor'),
      P('KeyO', 'weightless', 'Weightless', 55, 'the foe floats helpless and takes more damage'),
    ],
  },
  time: {
    id: 'time', name: 'Time', icon: '⏳',
    line: '#2fe0c8', light: '#c8fff4', accent: '#e0904a', fill: '#0a1415',
    fx: { glow: '40,210,190', mid: '160,255,240', core: '240,255,252' },
    fx2: { glow: '230,140,60', mid: '255,200,120', core: '255,240,210' },
    heavy: 'Clock Hammer', kick: 'Tick Kick', rising: 'Rising Hour', dash: 'Blink', shield: 'clock face',
    ult: 'Zero Hour', ultBanner: 'ZERO HOUR', passive: 'MP refills faster after a perfect guard',
    shouts: ['TICK', 'TOCK!', 'TIMELESS!'],
    powers: [
      P('KeyU', 'rewindStep', 'Rewind Step', 20, 'jump back to where you were 2 seconds ago'),
      P('KeyI', 'tickField', 'Tick Field', 35, 'clock field that slows the foe inside it'),
      P('KeyO', 'freezeFrame', 'Freeze Frame', 60, 'stops the foe in time for 1.2 seconds'),
    ],
  },
};
