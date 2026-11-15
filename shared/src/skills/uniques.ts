import type { Category, Kind } from './catalog';

/** The 100 unique skills. Only one copy of each exists in the world. */
export interface UniqueDef {
  /** 1 to 100 */
  n: number;
  name: string;
  category: Category;
  kind: Kind;
  desc: string;
  /** Meta power that changes game rules for the owner. */
  perk?:
    | 'skillGenesis'
    | 'infiniteFusion'
    | 'appraiser'
    | 'merchant'
    | 'fortune'
    | 'forger'
    | 'sixthSlot'
    | 'vault'
    | 'archive'
    | 'timeWeaver';
}

type Row = [string, Category, Kind, string, UniqueDef['perk']?];

const ROWS: Row[] = [
  // world-changing (out of battle)
  ['Skill Genesis', 'world', 'world', 'Create a custom skill from three owned skills.', 'skillGenesis'],
  ['Infinite Fusion', 'world', 'world', 'No weekly fusion limit.', 'infiniteFusion'],
  ["Appraiser's Eye", 'world', 'world', 'See exact rolls and the fair price of any skill.', 'appraiser'],
  ['Merchant King', 'world', 'world', 'No auction fees and see hidden reserve prices.', 'merchant'],
  ['Fortune Loom', 'world', 'world', 'Better luck on drops, draws and loot.', 'fortune'],
  ['Skill Forger', 'world', 'world', 'Reroll one stat of an owned skill each day.', 'forger'],
  ['Soul Ledger', 'world', 'world', 'Unlock a sixth loadout slot.', 'sixthSlot'],
  ['Vault Warden', 'world', 'world', 'Your skills never return to the world through inactivity.', 'vault'],
  ['Echo Archive', 'world', 'world', 'Copy the look of any skill you have seen as a cosmetic.', 'archive'],
  ['Time Weaver', 'world', 'world', 'One extra daily claim and one extra weekly fusion.', 'timeWeaver'],
  // attack
  ['Worldsplitter', 'attack', 'beam', 'A beam that cuts the arena in half for 3 seconds.'],
  ['Meteor Verdict', 'attack', 'projectile', 'Marks a target, then a meteor lands there.'],
  ['Thousand Thorns', 'attack', 'nova', 'Thorns burst out of every wall in line of sight.'],
  ["Dragon's Last Breath", 'attack', 'beam', 'A huge cone that gets wider with each kill.'],
  ['Starfall Sovereign', 'attack', 'volley', 'Homing stars from above, one per second.'],
  ['Gravity Maw', 'attack', 'pull', 'Pulls everyone to a point, then explodes.'],
  ['Crimson Eclipse', 'attack', 'beam', 'Each hit steals life and grows the beam.'],
  ['Phantom Cannon', 'attack', 'projectile', 'A shot that passes through walls.'],
  ['Tempest Crown', 'attack', 'projectile', 'Lightning that chains endlessly while you keep hitting.'],
  ['Quake Titan', 'attack', 'nova', 'Slams the ground, creating moving walls.'],
  ['Blood Moon Lance', 'attack', 'beam', 'A piercing lance that returns to you.'],
  ['Solar Judgment', 'attack', 'beam', 'Charges for 3 seconds, then fires one huge shot.'],
  ['Omega Barrage', 'attack', 'volley', '30 shots across the screen.'],
  ['Chrono Bullet', 'attack', 'projectile', 'A bullet that rewinds the target 3 seconds.'],
  ['Void Spear', 'attack', 'beam', 'Ignores shields and invulnerability.'],
  // defence
  ['Unbreakable Bastion', 'defence', 'barrier', 'A fortress wall that absorbs 10 hits.'],
  ['Mirror Aegis', 'defence', 'shield', 'Reflects all bullets for 3 seconds.'],
  ['Immortal Oath', 'defence', 'shield', 'Survive one lethal hit per match with 1 HP.'],
  ['Phoenix Veil', 'defence', 'heal', 'Revive once with full HP.'],
  ['Rune Barrier', 'defence', 'shield', 'A rotating shield that blocks one attack per second.'],
  ['Thorn Mantle', 'defence', 'shield', 'Attackers take damage when they hit you.'],
  ['Stoneheart', 'defence', 'buff', 'Huge HP, very slow.'],
  ['Soul Anchor', 'defence', 'buff', 'Cannot be knocked back or pulled.'],
  ['Dimensional Cloak', 'defence', 'stealth', 'Shots pass through you while you stand still.'],
  ['Cursed Plate', 'defence', 'buff', 'Take less damage the lower your HP.'],
  ['Sanctuary Field', 'defence', 'aura', 'Allies inside the field cannot die.'],
  ['Ironwill', 'defence', 'buff', 'Immune to slows and stuns.'],
  // support
  ["Angel's Choir", 'support', 'aura', 'Heals the team every second.'],
  ['War Banner', 'support', 'aura', 'Allies gain speed and damage in a field.'],
  ['Lifeline', 'support', 'buff', 'Share your HP with an ally.'],
  ['Rally Cry', 'support', 'heal', 'Revive a fallen ally instantly.'],
  ['Blessing of Haste', 'support', 'buff', "Your team's cooldowns drop 30%."],
  ['Prism Link', 'support', 'buff', 'Share your best buff with your team.'],
  ['Cleansing Rain', 'support', 'aura', 'Removes all negative effects from allies.'],
  ["Shepherd's Light", 'support', 'aura', 'Guides allies and reveals hidden enemies.'],
  ['Mana Spring', 'support', 'buff', "Refund the cooldown of an ally's skill."],
  ['Guardian Spirit', 'support', 'shield', 'An ally takes your next hit.'],
  // shadow
  ['Night Dancer', 'shadow', 'stealth', 'Invisible while moving in shadows.'],
  ['Silent Execution', 'shadow', 'ambush', 'Huge damage from behind.'],
  ['Umbral Clone', 'shadow', 'summon', 'Leaves a shadow double that fights for you.'],
  ['Shadow Step', 'shadow', 'blink', "Teleport to any enemy's shadow."],
  ['Eclipse Grip', 'shadow', 'slow', 'Roots all enemies near you in darkness.'],
  ['Dusk Blade', 'shadow', 'cleave', "Slices through an enemy's shield."],
  ['Whisper of Fear', 'shadow', 'slow', 'Enemies in view cannot use skills for 1 second.'],
  ['Black Mirror', 'shadow', 'blink', 'Swap places with a target.'],
  ['Nightfall', 'shadow', 'stealth', 'Darkens the arena. Only you see clearly.'],
  ["Assassin's Mark", 'shadow', 'ambush', 'A marked target takes triple damage.'],
  ['Phantom Hunt', 'shadow', 'ambush', 'You vanish, then reappear next to your mark.'],
  ['Lord of Silence', 'shadow', 'slow', 'Nearby enemies cannot use emotes or skills.'],
  // weapon
  ['Excalibur Orb', 'weapon', 'cleave', 'A sword of light that grows with kills.'],
  ['Thousand Blades', 'weapon', 'summon', 'Orbiting blades protect and strike.'],
  ['Hellfire Gun', 'weapon', 'volley', 'A rapid-fire cannon that overheats.'],
  ['Storm Bow', 'weapon', 'projectile', 'Arrows split on impact.'],
  ["Executioner's Axe", 'weapon', 'cleave', 'Instant kill under 20% HP.'],
  ['Scythe of Souls', 'weapon', 'cleave', 'Collects souls to power other skills.'],
  ['Gravity Hammer', 'weapon', 'cleave', 'Smashes and pulls targets in.'],
  ['Chain Whip', 'weapon', 'pull', 'Grabs and drags a target.'],
  ['Twin Fangs', 'weapon', 'projectile', 'Two daggers that return.'],
  ['Glass Katana', 'weapon', 'cleave', 'One hit kills, but breaks on the first block.'],
  ['Plasma Lance', 'weapon', 'beam', 'Charges through enemies.'],
  ['Siege Cannon', 'weapon', 'projectile', 'Shots destroy walls.'],
  // boost
  ['Overclock', 'boost', 'buff', 'All stats up for 8 seconds, then exhausted.'],
  ['Berserker Core', 'boost', 'buff', 'Damage grows as HP falls.'],
  ['Hyper Dash', 'boost', 'dash', 'Infinite dashes for 5 seconds.'],
  ['Focus Mind', 'boost', 'slow', 'Slow time around you for 4 seconds.'],
  ['Giant Form', 'boost', 'buff', 'Bigger, tougher and slower.'],
  ['Tiny Terror', 'boost', 'buff', 'Smaller, faster and harder to hit.'],
  ['Adrenaline Wave', 'boost', 'buff', 'A kill refunds all cooldowns.'],
  ['Lucky Star', 'boost', 'buff', 'Critical hits are doubled.'],
  ["Warrior's Pride", 'boost', 'buff', 'Stronger with each ally nearby.'],
  ['Final Form', 'boost', 'buff', 'All stats up when you are the last one standing.'],
  // summon
  ['Spirit Wolf', 'summon', 'summon', 'A wolf that hunts the nearest foe.'],
  ['Orb Legion', 'summon', 'summon', 'Five mini-orbs fight beside you.'],
  ['Dragon Whelp', 'summon', 'summon', 'A young dragon that breathes fire.'],
  ['Golem Guardian', 'summon', 'summon', 'A tank that blocks shots.'],
  ['Phoenix Familiar', 'summon', 'summon', 'Heals you over time.'],
  ['Slime King', 'summon', 'summon', 'Splits into smaller slimes when hit.'],
  ['Turret Swarm', 'summon', 'mine', 'Deploys three auto-turrets.'],
  ['Ghost Army', 'summon', 'summon', 'Summons phantom fighters that explode.'],
  // control, space and time
  ['Time Stop', 'control', 'slow', 'Freezes everyone but you for 2 seconds.'],
  ['Rewind', 'movement', 'blink', 'Return to your position and HP from 4 seconds ago.'],
  ['Black Hole', 'control', 'pull', 'A slow hole that drags enemies in.'],
  ['Spatial Cut', 'movement', 'portal', 'Opens a portal pair.'],
  ['Domain Expansion', 'control', 'aura', 'A zone where only your skills work.'],
  ['Mind Swap', 'control', 'slow', 'Control an enemy for 2 seconds.'],
  ['Gravity Well', 'control', 'pull', 'Pulls bullets toward a point.'],
  ['Banish', 'control', 'slow', 'Removes a target from play for 3 seconds.'],
  ['Dimensional Lock', 'control', 'slow', 'No teleports or dashes for anyone nearby.'],
  ['World Reset', 'control', 'aura', "Restore the arena and everyone's cooldowns once per match."],
  [
    'Skill Devourer',
    'control',
    'summon',
    'Take a random skill from a defeated enemy for the rest of the match.',
  ],
];

export const UNIQUES: UniqueDef[] = ROWS.map(([name, category, kind, desc, perk], i) => ({
  n: i + 1,
  name,
  category,
  kind,
  desc,
  perk,
}));

export const UNIQUE_COUNT = UNIQUES.length;
/** Unique skills have ids 1,000,001 to 1,000,100 so they never collide with generated ones. */
export const UNIQUE_BASE_ID = 1_000_000;

export function uniqueIdOf(n: number): number {
  return UNIQUE_BASE_ID + n;
}

/** Tracks which account owns each unique skill. In-memory for now; later it lives in the database. */
export class UniqueRegistry {
  private owners = new Map<number, { account: string; lastActive: number }>();

  ownerOf(skillId: number): string | null {
    return this.owners.get(skillId)?.account ?? null;
  }

  isClaimed(skillId: number): boolean {
    return this.owners.has(skillId);
  }

  unclaimed(): number[] {
    const out: number[] = [];
    for (let n = 1; n <= UNIQUE_COUNT; n++) if (!this.owners.has(uniqueIdOf(n))) out.push(uniqueIdOf(n));
    return out;
  }

  /** Gives the skill to an account. Fails when it is already owned. */
  claim(skillId: number, account: string, now = Date.now()): boolean {
    if (skillId <= UNIQUE_BASE_ID || skillId > UNIQUE_BASE_ID + UNIQUE_COUNT || this.owners.has(skillId))
      return false;
    this.owners.set(skillId, { account, lastActive: now });
    return true;
  }

  /** Moves a unique between accounts (trade). The skill can never be duplicated. */
  transfer(skillId: number, from: string, to: string, now = Date.now()): boolean {
    const cur = this.owners.get(skillId);
    if (!cur || cur.account !== from) return false;
    this.owners.set(skillId, { account: to, lastActive: now });
    return true;
  }

  touch(account: string, now = Date.now()): void {
    for (const v of this.owners.values()) if (v.account === account) v.lastActive = now;
  }

  /** Reincarnation: uniques of accounts inactive for `days` return to the world. Returns the freed ids. */
  releaseInactive(now: number, days = 60, protectedAccounts: Set<string> = new Set()): number[] {
    const freed: number[] = [];
    for (const [id, v] of this.owners) {
      if (protectedAccounts.has(v.account)) continue;
      if (now - v.lastActive > days * 86400000) {
        this.owners.delete(id);
        freed.push(id);
      }
    }
    return freed;
  }

  /** Public list for the Hall of Uniques. */
  hall(): Array<{ id: number; name: string; owner: string | null }> {
    return UNIQUES.map((u) => ({ id: uniqueIdOf(u.n), name: u.name, owner: this.ownerOf(uniqueIdOf(u.n)) }));
  }
}
