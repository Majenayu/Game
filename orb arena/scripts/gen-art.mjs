// Extracts the art the game uses from two free icon packs into client/src/art/packs.gen.ts.
//  - Fluent Emoji Flat (MIT, Microsoft): colour art for summons and bosses.
//  - game-icons.net (CC BY 3.0, Lorc, Delapouite and contributors): weapon, gear and effect shapes.
// Run: node scripts/gen-art.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fl = JSON.parse(readFileSync('node_modules/@iconify-json/fluent-emoji-flat/icons.json', 'utf8'));
const gi = JSON.parse(readFileSync('node_modules/@iconify-json/game-icons/icons.json', 'utf8'));

/** First existing name from each candidate list. */
const pickOne = (pack, list) => list.find((n) => pack.icons[n]);
const pickAll = (pack, list) => [...new Set(list.filter((n) => pack.icons[n]))];

// ---- creatures: one entry per species (8 families x 12 species), fluent first, then game-icons ----
const SPECIES = {
  beast: [['wolf'], ['lion'], ['polar-bear'], ['black-cat', 'leopard'], ['boar'], ['tiger'], ['fox'], ['rhinoceros'], ['dog', 'wolf'], ['leopard', 'tiger'], ['dog'], ['deer']],
  robot: [['robot'], ['g:battle-mech', 'g:robot-golem'], ['g:laser-turret', 'g:robot-grab'], ['g:robot-grab', 'robot'], ['g:tank-tread', 'g:battle-tank'], ['g:spider-bot', 'spider'], ['g:robot-golem'], ['g:android-mask', 'robot'], ['g:cannon', 'g:mortar'], ['g:mecha-head', 'g:robot-helmet'], ['g:nanobot', 'g:swarm'], ['g:mecha-mask', 'g:robot-golem']],
  dragon: [['dragon'], ['g:ice-spell-cast', 'dragon-face'], ['g:wyvern', 'dragon'], ['snake'], ['dragon-face'], ['g:dragon-head', 'sauropod'], ['g:sun', 'dragon'], ['g:double-dragon', 'dragon-face'], ['g:spiked-dragon-head', 'dragon'], ['crocodile'], ['g:dragon-breath', 'dragon'], ['t-rex']],
  animal: [['cat-face', 'cat'], ['dog-face', 'dog'], ['owl'], ['rabbit'], ['ram'], ['eagle'], ['panda'], ['turtle'], ['honeybee'], ['frog'], ['monkey'], ['raccoon']],
  fish: [['blowfish'], ['shark'], ['squid'], ['fish'], ['g:manta-ray', 'fish'], ['crab'], ['g:eel', 'snake'], ['jellyfish'], ['tropical-fish'], ['g:angler-fish', 'fish'], ['whale'], ['spouting-whale']],
  mermaid: [['g:mermaid'], ['g:trident'], ['g:trident-shield', 'g:mermaid'], ['g:wave-surfer', 'g:mermaid'], ['g:mermaid'], ['g:shell', 'spiral-shell'], ['g:witch-face', 'g:mermaid'], ['g:siren', 'g:mermaid'], ['g:mermaid'], ['g:crown', 'g:mermaid'], ['g:crystal-ball', 'g:mermaid'], ['g:queen-crown', 'g:mermaid']],
  drone: [['g:delivery-drone', 'helicopter'], ['flying-saucer'], ['g:medical-drip', 'helicopter'], ['g:laser-turret', 'satellite'], ['g:bombing-run', 'bomb'], ['g:shield-reflect', 'satellite'], ['g:eyeball', 'eye'], ['g:swarm', 'flying-saucer'], ['satellite'], ['g:gravity', 'flying-saucer'], ['g:pulse', 'satellite'], ['g:halo', 'flying-saucer']],
  spirit: [['ghost'], ['phoenix-bird'], ['diya-lamp', 'ghost'], ['woman-fairy'], ['glowing-star'], ['fire'], ['snowman-without-snow', 'snowflake'], ['sun-with-face'], ['butterfly'], ['g:spectre', 'ghost'], ['water-wave'], ['milky-way']],
};
const creatures = {};
for (const [fam, list] of Object.entries(SPECIES)) {
  creatures[fam] = list.map((cands) => {
    for (const c of cands) {
      if (c.startsWith('g:')) {
        if (gi.icons[c.slice(2)]) return c;
      } else if (fl.icons[c]) return c;
    }
    return 'g:paw-print';
  });
}

// ---- bosses (fluent colour art) ----
const BOSSES = pickAll(fl, ['dragon', 'dragon-face', 't-rex', 'ogre', 'troll', 'alien-monster', 'ghost', 'goblin', 'man-vampire', 'man-zombie', 'octopus', 'spider', 'scorpion', 'sauropod', 'man-genie', 'man-mage']);

// ---- gear shapes per slot (game-icons) ----
const GEAR = {
  hat: ['visored-helm', 'black-knight-helm', 'crested-helmet', 'horned-helm', 'viking-helmet', 'samurai-helmet', 'spartan-helmet', 'centurion-helmet', 'crown', 'imperial-crown', 'jewel-crown', 'laurel-crown', 'tiara', 'magic-hat', 'pointy-hat', 'pirate-hat', 'top-hat', 'western-hat', 'robin-hood-hat', 'warlock-hood', 'hood', 'ninja-mask', 'robot-helmet', 'astronaut-helmet', 'dwarf-helmet', 'elf-helmet', 'overlord-helm', 'warlord-helmet', 'jester-hat', 'heavy-helm'],
  gloves: ['gauntlet', 'gloves', 'mailed-fist', 'boxing-glove', 'winter-gloves', 'thor-fist', 'fist', 'baseball-glove', 'armor-punch', 'cooking-glove'],
  armor: ['breastplate', 'chest-armor', 'armor-vest', 'leather-armor', 'leather-vest', 'mail-shirt', 'layered-armor', 'spiked-armor', 'ninja-armor', 'robe', 'cloak', 'cape-armor', 'heart-armor', 'kevlar-vest', 'trench-body-armor', 'fur-shirt', 'wing-cloak', 'shoulder-armor', 'spiked-shoulder-armor', 'abdominal-armor', 't-shirt', 'polo-shirt'],
  pants: ['armored-pants', 'greaves', 'leg-armor', 'metal-skirt', 'skirt', 'trousers', 'armor-cuisses', 'belt-armor'],
  shoes: ['boots', 'leather-boot', 'metal-boot', 'cowboy-boot', 'fur-boot', 'ski-boot', 'steeltoe-boots', 'tabi-boot', 'walking-boot', 'running-shoe', 'converse-shoe', 'sandal', 'sonic-shoes', 'wingfoot', 'rubber-boot', 'chelsea-boot', 'ballerina-shoes'],
  bag: ['backpack', 'knapsack', 'light-backpack', 'quiver', 'duffel-bag', 'gym-bag', 'school-bag', 'shoulder-bag', 'hand-bag', 'pouch-with-beads', 'swap-bag', 'beach-bag', 'sleeping-bag'],
  sword: ['broadsword', 'katana', 'battle-axe', 'flanged-mace', 'halberd', 'reaper-scythe', 'bow-arrow', 'crossbow', 'crystal-wand', 'pistol-gun', 'rifle', 'laser-gun', 'energy-sword', 'rune-sword', 'flaming-trident', 'ice-spear', 'lightning-saber', 'plain-dagger', 'bowie-knife', 'flail', 'relic-blade', 'piercing-sword', 'ancient-sword', 'croc-sword', 'crescent-staff', 'magic-axe', 'magic-trident', 'minigun', 'ray-gun', 'north-star-shuriken', 'lunar-wand', 'orb-wand', 'fairy-wand', 'hook-swords', 'daggers', 'bolter-gun', 'fire-axe', 'bone-mace', 'war-axe', 'spear-head', 'wizard-staff', 'scythe', 'sai'],
  vehicle: ['battle-tank', 'f1-car', 'city-car', 'helicopter', 'jet-fighter', 'motorcycle', 'dutch-bike', 'aero-bike', 'chariot', 'broom', 'caravel', 'fishing-boat', 'rocket', 'ufo', 'submarine', 'hovercraft', 'skateboard', 'kick-scooter', 'horse-head', 'sports-car', 'race-car', 'jeep', 'apc', 'spaceship', 'space-shuttle', 'flying-carpet', 'hot-air-balloon', 'sailboat', 'jetpack', 'unicycle'],
};
const gear = Object.fromEntries(Object.entries(GEAR).map(([k, v]) => [k, pickAll(gi, v)]));

// ---- skill effect shapes (game-icons) for the skill animation engine ----
const FX = pickAll(gi, ['fire', 'flame', 'lightning-bolt', 'lightning-arc', 'snowflake-1', 'snowflake-2', 'ice-bolt', 'water-drop', 'wave-crest', 'tornado', 'whirlwind', 'poison-bottle', 'skull-crossed-bones', 'sparkles', 'star-swirl', 'moon', 'sun', 'leaf', 'vine-whip', 'rock', 'stone-sphere', 'heart-plus', 'shield', 'magic-shield', 'energy-shield', 'meteor-impact', 'explosion-rays', 'bright-explosion', 'claw-slashes', 'sword-slice', 'crossed-slashes', 'beam-wake', 'laser-blast', 'portal', 'black-hole-bolas', 'vortex', 'magic-swirl', 'wind-slap', 'feather', 'crystal-growth', 'ice-spell-cast', 'fire-spell-cast', 'lightning-tear', 'spiral-bloom', 'radial-balance', 'sun-radiations', 'aura', 'drop', 'shuriken', 'arrow-cluster', 'missile-swarm', 'bullets', 'bomb', 'mine-explosion', 'heavy-arrow', 'fist', 'punch-blast', 'chain-lightning', 'sonic-boom', 'ringing-bell', 'gravity']);

// ---- map decorations (fluent colour art) per campaign world ----
const DECOR = {
  neon: ['cityscape-at-dusk', 'night-with-stars', 'high-voltage', 'sparkles', 'satellite-antenna'],
  crossfire: ['cactus', 'desert', 'tumbleweed', 'rock', 'sun'],
  pillars: ['classical-building', 'deciduous-tree', 'evergreen-tree', 'herb', 'rock'],
  fortress: ['castle', 'crossed-swords', 'shield', 'japanese-castle', 'brick'],
  lava: ['volcano', 'fire', 'rock', 'comet', 'dragon-face'],
  maze: ['crescent-moon', 'mushroom', 'deciduous-tree', 'owl', 'milky-way'],
  crypt: ['skull', 'coffin', 'headstone', 'ghost', 'bat'],
  glacier: ['snow-capped-mountain', 'snowflake', 'snowman', 'polar-bear', 'ice'],
};
const decor = Object.fromEntries(Object.entries(DECOR).map(([k, v]) => [k, pickAll(fl, v)]));
const GIFTS = pickAll(fl, ['wrapped-gift', 'gem-stone', 'money-bag', 'crystal-ball', 'trophy', 'key', 'crown', 'star']);

// ---- collect bodies ----
const used = { fl: new Set(), gi: new Set() };
const take = (n) => (n.startsWith('g:') ? used.gi.add(n.slice(2)) : used.fl.add(n));
Object.values(creatures).flat().forEach(take);
BOSSES.forEach((n) => used.fl.add(n));
Object.values(decor).flat().forEach((n) => used.fl.add(n));
GIFTS.forEach((n) => used.fl.add(n));
Object.values(gear).flat().forEach((n) => used.gi.add(n));
FX.forEach((n) => used.gi.add(n));

const body = (pack, n) => {
  const i = pack.icons[n];
  return [i.width ?? pack.width ?? 16, i.height ?? pack.height ?? 16, i.body];
};
const FLB = Object.fromEntries([...used.fl].sort().map((n) => [n, body(fl, n)]));
const GIB = Object.fromEntries([...used.gi].sort().map((n) => [n, body(gi, n)]));

const out = `// GENERATED by scripts/gen-art.mjs. Do not edit.
// Fluent Emoji Flat (c) Microsoft, MIT License. game-icons.net icons by Lorc, Delapouite and contributors, CC BY 3.0.
export type Art = [number, number, string];
export const FL: Record<string, Art> = ${JSON.stringify(FLB)};
export const GI: Record<string, Art> = ${JSON.stringify(GIB)};
export const CREATURE_ART: Record<string, string[]> = ${JSON.stringify(creatures)};
export const BOSS_ART: string[] = ${JSON.stringify(BOSSES)};
export const GEAR_ART: Record<string, string[]> = ${JSON.stringify(gear)};
export const FX_ART: string[] = ${JSON.stringify(FX)};
export const DECOR_ART: Record<string, string[]> = ${JSON.stringify(decor)};
export const GIFT_ART: string[] = ${JSON.stringify(GIFTS)};
`;
writeFileSync('client/src/art/packs.gen.ts', out);
console.log('fluent', used.fl.size, 'game-icons', used.gi.size, 'bytes', out.length);
console.log('gear', Object.fromEntries(Object.entries(gear).map(([k, v]) => [k, v.length])), 'fx', FX.length, 'bosses', BOSSES.length);
console.log('decor', Object.fromEntries(Object.entries(decor).map(([k, v]) => [k, v.length])), 'gifts', GIFTS.length);
console.log('creature fallbacks', Object.values(creatures).flat().filter((n) => n === 'g:paw-print').length);
