# Sunfetch: Game Design Document (Phase 0, decisions locked)

Status: concept locked. The owner's answers are recorded in [DECISIONS.md](DECISIONS.md).
All numbers below are first-pass tuning values; Phase 6 balance bots will change them.

---

## 1. Overview

| Item         | Value                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| Genre        | Top-down action roguelite, single player                                                    |
| Platforms    | Web browser (desktop and mobile). Builds for CrazyGames, Poki and itch.io                   |
| Audience     | Age 7 and up, casual to mid-core. No reading needed to play                                 |
| Session      | A run lasts 6 to 10 minutes, with a natural stopping point about every 2 minutes             |
| Controls     | Mouse follow, WASD/arrows, touch drag, gamepad. Attacks are automatic                       |
| Business     | Free, platform ads only (midgame break after a run, optional rewarded ads). No purchases     |
| Network      | None. Client only, works offline after loading                                              |

**Pitch.** The sun has gone out. You are a small lantern spirit. Your light is both your health and your weapon.
Shadows flee from bright light and swarm when it dims. Fight through five glowing worlds, rescue lost souls, relight the
Great Beacon, and decide what to do with the last sun.

**Store line.** *Your light is your life. Burn bright, grow strong, bring the sun home.*

### Design pillars

1. **One rule, felt every second.** Light is health, attack range and safety at the same time. Every choice
   (push into the dark, return to a Well, take a risky Flame) goes through it.
2. **Readable at a glance.** Round warm shapes are friends. Spiky shapes with red-orange hatching are danger. Cool
   tones are safe. Icons and animation explain everything.
3. **Short runs, long goals.** A run fits in a coffee break. The Lighthouse, the star map, the collection book and
   the story give reasons to come back.
4. **Kind to beginners, deep for experts.** Soft death, Cozy mode and quiet assist for new players. Builds,
   positioning and Radiant mode for experts.

---

## 2. Core mechanic: Light

### 2.1 Rules

| Rule                  | First tuning value                                                                     |
| --------------------- | -------------------------------------------------------------------------------------- |
| Light meter           | 0 to 100. Start of a room: 70 (Cozy 85, Radiant 60)                                    |
| Light radius          | `R = 70 + 2.3 × Light` px at the 1280×720 reference view (Light 100 → 300 px, 30 → 139) |
| Aura damage           | 10 per second to every shadow inside R, in 5 ticks per second                          |
| Drain in darkness     | 0.8 per second while moving, 0.4 while standing still. Bigger radius Flames add drain  |
| Wells                 | Within 90 px of a Well: +12 per second up to max. Wells are the only passive refill    |
| Hits                  | Contact or projectile: −8 to −20 depending on the enemy                                |
| Restores              | Weak kill +2, elite kill +5, Light Mote pickup +6, Lost Soul rescue +20                 |
| Fear                  | At Light 60 or more, weak shadows will not enter the inner half of the radius           |
| Swarm                 | Below Light 30, shadows gain +25% speed and Bellringers call more of them               |
| Out of the light      | Shadows outside the radius are drawn as eyes only                                      |

The tension arc: high Light means a big safe zone and fast kills but faster drain. Low Light means a small zone,
faster enemies and higher risk. The player keeps choosing between pushing for rewards and retreating to a Well.

### 2.2 Soft death

- When Light reaches 0 you fade to a spark for 2 seconds, then wake at the last Well you touched with Light 50.
- You keep your Flames and your **banked** Embers. Embers you carry but have not banked drop by half.
- Embers are banked at Wells, at the Hearth and when the run ends.
- Each run has a number of Sparks (lives): Cozy 5, Normal 3, Radiant 1. The run ends when the last Spark is used.
  Decided in D5.
- Rewarded ad option: once per run, revive in place at Light 50 without using a Spark.

### 2.3 Readability rules (never broken)

- The player's hitbox is a small bright core ring that never changes size or colour.
- Every enemy attack shows a telegraph of 0.4 s or more on Normal (0.6 s on Cozy, 0.3 s on Radiant).
- Danger uses red-orange **and** a diagonal hatch pattern, so it reads without colour vision.
- Safe things (Wells, bubbles, Hearth) use cool tones **and** a soft rounded outline.

---

## 3. Controls

| Action        | Mouse                  | Keyboard            | Touch                          | Gamepad           |
| ------------- | ---------------------- | ------------------- | ------------------------------ | ----------------- |
| Move          | Hold button, follow    | WASD / arrows       | Drag anywhere (floating stick) | Left stick        |
| Charm (skill) | Right click            | Space               | Charm button (bottom right)    | A / Cross         |
| Dash (if any) | Double click           | Shift               | Swipe                          | B / Circle        |
| Pause         | Pause button           | Esc / P             | Pause button                   | Start             |

Attacks (the aura and Spark Flames) are automatic. All keys are remappable. The game pauses on tab blur and when an
ad starts. One-handed mode puts the Charm on a long-press of the move finger.

---

## 4. Run structure

### 4.1 One run = one world (decided in D4)

The brief asks for runs of 6 to 10 minutes **and** five worlds of six stages, which cannot fit in one run. Decision:
a run covers one world. The five worlds form the campaign on the star map. Endless Dusk later
chains worlds into one long run.

| Step | Stage                                | Target time | Notes                                                   |
| ---- | ------------------------------------ | ----------- | ------------------------------------------------------- |
| 0    | Pick Spirit and Charm                | 15 s        | Remembers the last choice                               |
| 1    | Room 1                               | 60–90 s     | Pick 1 of 3 Flames after                                |
| 2    | Door choice, then Room 2             | 60–90 s     | Two doors: Combat, Elite, Event, or Shop (icons on doors) |
| 3    | Room 3                               | 60–90 s     |                                                         |
| 4    | Door choice, then Room 4             | 60–90 s     | A secret room with a Lost Soul can hide in rooms 2–4    |
| 5    | Mini-boss                            | 90 s        | Drops a Relic                                           |
| 6    | Hearth                               | 30–60 s     | Heal, swap one Flame, talk, story beat, bank Embers     |
| 7    | World boss                           | ≤ 3 min     | Ends the run, world outro panels                        |

A run is about 8 to 10 minutes. Clean stopping points: after rooms 2 and 4, at the Hearth and after the boss.

### 4.2 Room objectives (each room has one)

Clear the shadows, Rescue the Soul (escort it to a Well), Light the Lanterns (touch 3 to 5 lanterns),
Hold the Well (survive 45 s), Chase the Thief (catch a Glint Thief), Carry the Star (bring a falling star to a Well).

### 4.3 After the campaign

- **Endless Dusk:** worlds in sequence, enemies +12% health per world, a Mythic Flame offer every third room,
  leaderboard by depth.
- **Daily Run:** the same seed, Spirit and Charm for everyone that day. One bonus reward. Leaderboard through the
  platform SDK if it supports it (unverified, check before Phase 7).
- **Weekly Challenge:** a fixed seed with a twist (for example "no Wells", "double speed shadows").

---

## 5. Spirits (playable characters)

| # | Spirit   | Shape and feel              | Max Light | Speed | Signature passive                                              | Unlock          |
| - | -------- | --------------------------- | --------- | ----- | -------------------------------------------------------------- | --------------- |
| 1 | Tindle     | Round candle flame, curious | 100       | 100%  | Wells refill 30% faster                                        | Start           |
| 2 | Sparrow  | Bird-shaped flame, quick    | 80        | 120%  | Light is a narrow beam in the move direction; tap to dash       | Clear World 1   |
| 3 | Clinker  | Heavy coal golem, slow      | 130       | 80%   | Huge slow aura; contact deals damage                           | 400 Embers      |
| 4 | Prism    | Crystal sprite              | 90        | 100%  | Light splits into 3 orbiting shards steered by movement         | Clear World 2   |
| 5 | Moth     | Ghost moth, fragile         | 75        | 110%  | Passes through weak shadows; steals 3 Light per kill            | Find 6 Souls    |
| 6 | Flare*   | Pulsing star                | 100       | 100%  | Light pulses on a beat; hits on the beat deal double damage     | Finish the game |

\* Called "Nova" in the brief; renamed because Nova is a character in Orb Arena. See D3.

Every Spirit has idle, move, attack, hit, death, special and win animations, 4 emotes (happy, scared, proud, sleepy),
and a one-paragraph bio (in STORY.md).

---

## 6. Companions and story cast

| Character   | Role                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| Old Lamp    | Mentor at the Hearth. Gentle and funny, explains the world in short lines                    |
| Cinder      | Rival spirit who wants the last sun for herself. Meets you 3 times, is the World 4 boss      |
| Tolliver    | Shy moth shopkeeper. Sells Charms and Relics for Embers at the Hearth and in Shop rooms       |
| The Quiet    | The antagonist. A quiet, lonely darkness that wants light so it can finally see its own shape |

---

## 7. Worlds

| # | World            | Palette idea                     | Hazards                                          | Mini-boss      | Boss            |
| - | ---------------- | -------------------------------- | ------------------------------------------------ | -------------- | --------------- |
| 1 | Hollow Meadow    | Soft greens, fireflies           | Thorn patches; fog banks (shrink your radius)   | Big Mossback   | Thornback       |
| 2 | Glass Caverns    | Violet and ice blue crystals     | Falling shards; mirror walls that bounce beams  | Geode Golem    | Mirror Queen    |
| 3 | Drowned Bell     | Teal water, brass bells          | Currents push you; tolling waves (bubbles are safe) | Lantern Fish | The Tide Choir |
| 4 | Ash Orchard      | Charcoal and ember orange        | Fire spreads if your radius is wide; ash clouds | Charred Stag   | Cinder's Crown  |
| 5 | The Silent Spire | Monochrome; colour returns as you win | Silence zones (no Charms); grey zones (extra drain) | Hollow Jester | The Quiet |

Each world: 6 stages, at least 10 room layouts, 5 enemy types plus shared ones, 2 hazards, 1 secret room with a Lost
Soul, its own music loop and a boss variant.

### 7.1 Bosses

| Boss            | Phases | Main patterns (all telegraphed)                                                         | Teaches                    |
| --------------- | ------ | --------------------------------------------------------------------------------------- | -------------------------- |
| Thornback       | 2      | Rolls in a line (hatched lane shows first), drops thorn rings, curls up when lit too long | Dodging telegraphs         |
| Mirror Queen    | 3      | Splits into 3 copies; only the real one casts a shadow; shard fans; mirror beam sweep   | Reading light and shadow   |
| The Tide Choir  | 2      | Wave rings from three singers; safe bubbles appear; current changes direction           | Rhythm and safe pockets    |
| Cinder's Crown  | 2      | Cinder races around lighting fires; phase 2 she steals your radius for 5 s              | Managing radius size       |
| The Quiet        | 3      | Darkness rings, silence zones, mirrored Charms; final phase is a light puzzle (see STORY) | Everything, then mercy     |

---

## 8. Enemies (30 types)

Every enemy has: a telegraph, a clear counter or weak point, a death animation (dissolving into motes) and its own
sound. Elites add one modifier: Fast, Armoured (first hit blocked), Explosive (bursts on death, hatched circle first),
Bright-proof (ignores Fear) or Twin (splits once).

| World      | Enemy           | Behaviour                                         | Counter / weak point                    |
| ---------- | --------------- | ------------------------------------------------- | --------------------------------------- |
| 1 Meadow   | Creeper         | Walks straight at you                             | Any aura                                |
| 1 Meadow   | Dimling         | Fast, weak, comes in swarms                       | Keep Light above 60 (Fear)              |
| 1 Meadow   | Gloom Lobber    | Throws slow dark orbs that land on a marked circle | Step out of the circle                 |
| 1 Meadow   | Thistle Pup     | Short rolling charge after a wiggle               | Side-step, hit while it is dizzy        |
| 1 Meadow   | Mossback        | Slow tank that shields smaller shadows            | Kill it first or go around              |
| 2 Caverns  | Veil            | Invisible outside light, shimmer when close       | Wide radius or Spark Flames             |
| 2 Caverns  | Shard Mite      | Bounces off walls in straight lines               | Predict the bounce                      |
| 2 Caverns  | Prism Beetle    | Front shell reflects sparks                       | Hit from behind (Shielder type)         |
| 2 Caverns  | Echo Bat        | Copies your last dash direction                   | Dash in a feint direction               |
| 2 Caverns  | Glint Thief     | Steals carried Embers and runs                    | Catch it before it leaves the room      |
| 3 Drowned  | Leech           | Sticks on contact and drains Light                | Dash or Pulse to shake it off           |
| 3 Drowned  | Bellringer      | Rings a bell to call more shadows                 | Kill first (bell glows before ringing)  |
| 3 Drowned  | Bubble Eel      | Charges along currents                            | Stand inside a bubble                   |
| 3 Drowned  | Drift Jelly     | Floats and pulses a ring every 3 s                | Stay out of the ring's edge             |
| 3 Drowned  | Barnacle Maw    | Stationary, pulls you in                          | Move against the pull, hit from range   |
| 4 Orchard  | Ash Knight      | Shield immune from the front                      | Circle around (Shielder)                |
| 4 Orchard  | Cinderling      | Splits into two smaller ones on death             | Area damage                             |
| 4 Orchard  | Wraith Hound    | Charges after a hatched lane telegraph            | Step out of the lane                    |
| 4 Orchard  | Smoke Wisp      | Leaves smoke that hides your radius edge          | Kill it before the smoke spreads        |
| 4 Orchard  | Ember Imp       | Lights fires on the ground                        | Keep the radius small near fires        |
| 5 Spire    | Hollow Mime     | Copies your movement mirrored                     | Use the mirror to trap it in hazards    |
| 5 Spire    | Grey Choir      | Sings a silence zone (no Charms)                  | Leave the zone or kill the singer       |
| 5 Spire    | Null Eye        | Charges a laser line (long telegraph)             | Move sideways                           |
| 5 Spire    | Echo Knight     | Repeats your last Charm against you, weaker       | Use Charms when it is far               |
| 5 Spire    | Void Moth       | Eats Light Motes before you reach them            | Grab motes fast or kill it              |
| Mini-boss  | Big Mossback    | Shields, slam with a ring telegraph               | Break the shield with Sparks            |
| Mini-boss  | Geode Golem     | Throws crystal pillars that refract your light    | Use the pillars to hit it               |
| Mini-boss  | Lantern Fish    | Fake light lure, bite from the dark               | Do not chase the lure                   |
| Mini-boss  | Charred Stag    | Charges through burning trees                     | Lead it into fire                       |
| Mini-boss  | Hollow Jester   | Swaps places with shadows                         | Watch for the real one's colour return  |

Plus 5 bosses (section 7.1) for 35 enemy designs in total.

---

## 9. Flames (upgrades)

After each room the player picks 1 of 3 Flames. One reroll per room through a rewarded ad (optional), plus Relic
rerolls. Rarity is shown by colour **and** border shape:

| Rarity  | Border shape     | Base weight |
| ------- | ---------------- | ----------- |
| Dim     | Plain circle     | 60          |
| Bright  | Circle with rays | 30          |
| Radiant | Star             | 9           |
| Mythic  | Sun with crown   | 1           |

Tags: **Radiance** (aura), **Spark** (projectiles), **Flow** (movement), **Ward** (defence), **Bond** (allies and
Souls), **Gamble** (high risk, high reward).

### 9.1 Flame list (60)

| #  | Flame             | Tag      | Rarity  | Effect                                                                 |
| -- | ----------------- | -------- | ------- | ---------------------------------------------------------------------- |
| 1  | Wide Glow         | Radiance | Dim     | +25% radius, +10% drain                                                |
| 2  | Hot Core          | Radiance | Dim     | +20% aura damage in the inner half of the radius                       |
| 3  | Steady Flame      | Radiance | Dim     | Aura ticks 20% faster                                                  |
| 4  | Sunspot           | Radiance | Bright  | Every 4 s a flare hits a random lit enemy for 30                       |
| 5  | Lightning Thread  | Radiance | Bright  | Aura chains to the nearest enemy outside the radius for 40% damage     |
| 6  | Halo              | Radiance | Bright  | The outer edge of the radius deals double damage                       |
| 7  | Kindling          | Radiance | Bright  | Enemies lit for 2 s catch fire (burn 3 s)                              |
| 8  | Flash Bloom       | Radiance | Radiant | Every 8 s the radius doubles for 0.5 s                                 |
| 9  | Dawn Heart        | Radiance | Radiant | Radius never shrinks below 60% of maximum                              |
| 10 | Corona            | Radiance | Mythic  | Aura damage +60%, drain +30%                                           |
| 11 | Firefly Shot      | Spark    | Dim     | Fire a spark at the nearest enemy every 1.2 s                          |
| 12 | Twin Sparks       | Spark    | Dim     | +1 spark per volley                                                    |
| 13 | Homing Glow       | Spark    | Dim     | Sparks curve towards enemies                                           |
| 14 | Ricochet          | Spark    | Bright  | Sparks bounce once                                                     |
| 15 | Lantern Seeds     | Spark    | Bright  | Sparks leave small light patches for 3 s                               |
| 16 | Piercing Ray      | Spark    | Bright  | Sparks pass through 2 enemies                                          |
| 17 | Starfall          | Spark    | Bright  | Every 6 s, 5 sparks fall on lit enemies                                |
| 18 | Comet Tail        | Spark    | Radiant | Sparks are bigger and leave a damaging trail                           |
| 19 | Prism Burst       | Spark    | Radiant | Spark kills split into 3 small sparks                                  |
| 20 | Sunbeam           | Spark    | Mythic  | Every 10 s, a 1 s beam fires in your move direction                    |
| 21 | Quick Wick        | Flow     | Dim     | +12% move speed                                                        |
| 22 | Light Step        | Flow     | Dim     | Moving drains 15% less                                                 |
| 23 | Glide             | Flow     | Dim     | Dash cooldown −20%                                                     |
| 24 | Afterimage        | Flow     | Bright  | Dashing leaves a damaging trail                                        |
| 25 | Slipstream        | Flow     | Bright  | After a dash, +30% speed for 2 s                                       |
| 26 | Phase             | Flow     | Bright  | Dash invulnerability lasts 0.3 s longer                                |
| 27 | Spark Wake        | Flow     | Bright  | Every third dash fires a ring of sparks                                |
| 28 | Comet Dash        | Flow     | Radiant | Dashing through enemies hits them for 40                               |
| 29 | Double Dash       | Flow     | Radiant | +1 dash charge                                                         |
| 30 | Lightspeed        | Flow     | Mythic  | While moving, aura damage +40%; standing still −20%                    |
| 31 | Cradle Light      | Ward     | Dim     | Stand still 1.5 s to build a shield that blocks one hit                |
| 32 | Thick Wax         | Ward     | Dim     | Hits take 15% less Light                                               |
| 33 | Glow Shell        | Ward     | Dim     | +10 max Light                                                          |
| 34 | Ward Ring         | Ward     | Bright  | 30% chance that projectiles fade at the radius edge                    |
| 35 | Second Wind       | Ward     | Bright  | Once per room, regain 15 Light when below 20                           |
| 36 | Mirror Skin       | Ward     | Bright  | Reflect 50% of contact damage back as aura damage                      |
| 37 | Lantern Glass     | Ward     | Bright  | The first hit in each room deals nothing                               |
| 38 | Hearthstone       | Ward     | Radiant | Wells refill twice as fast and give a 3 s shield                       |
| 39 | Borrowed Time     | Ward     | Radiant | Once per run, revive at 40% Light, but all Flames lose 10% power       |
| 40 | Unfading          | Ward     | Mythic  | Light cannot drop below 1 for 3 s after reaching 1 (every 30 s)        |
| 41 | Soul Lantern      | Bond     | Dim     | Rescued Souls orbit you and attack (5 damage per second each)          |
| 42 | Kind Words        | Bond     | Dim     | Rescuing a Soul restores 10 more Light                                 |
| 43 | Firefly Friend    | Bond     | Dim     | A firefly follows you and collects motes                               |
| 44 | Guardian Soul     | Bond     | Bright  | Orbiting Souls block one projectile every 5 s                          |
| 45 | Chorus            | Bond     | Bright  | +5% aura damage per orbiting Soul                                      |
| 46 | Moth Pact         | Bond     | Bright  | A moth ally steals Light from enemies for you                          |
| 47 | Old Lamp's Gift   | Bond     | Bright  | Start each room with +10 Light                                         |
| 48 | Beacon Call       | Bond     | Radiant | Every 20 s, a small beacon shines beside you for 5 s                   |
| 49 | Shared Flame      | Bond     | Radiant | Souls copy your Spark Flames at 50% power                              |
| 50 | Choir of Dawn     | Bond     | Mythic  | With 3+ Souls orbiting, they form a ring that doubles edge damage      |
| 51 | Burn Bright       | Gamble   | Dim     | Below 30% Light, double damage                                         |
| 52 | Risky Wick        | Gamble   | Dim     | +30% Embers, −10 max Light                                             |
| 53 | Dark Bargain      | Gamble   | Bright  | Enemies drop twice the motes; you take 15% more damage                 |
| 54 | Glass Cannon      | Gamble   | Bright  | +40% damage, −25% max Light                                            |
| 55 | Coin Flip Flame   | Gamble   | Bright  | Each room: 50% chance of +30% damage, otherwise −15%                   |
| 56 | Ember Tax         | Gamble   | Bright  | +1% damage per 10 carried Embers; lose 10% of carried Embers per hit   |
| 57 | Moonshot          | Gamble   | Radiant | The first hit you deal in each room does 5× damage                     |
| 58 | Last Candle       | Gamble   | Radiant | On your last Spark, all damage +50%                                    |
| 59 | Double Down       | Gamble   | Radiant | Skip this pick; the next choice shows 5 Flames and you take 2          |
| 60 | Supernova         | Gamble   | Mythic  | When Light reaches 100, explode for big damage and drop to 50          |

### 9.2 Resonances (12)

Three Flames of one tag unlock the first Resonance of that tag, five unlock the second. Each one has a name banner,
a unique visual and a sound sting.

| Tag      | 3 Flames: Resonance                                               | 5 Flames: Resonance                                                   |
| -------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Radiance | **Midday**: the aura visibly pulses, +25% aura damage             | **Sun Crown**: a halo crown; lit enemies are slowed 30%               |
| Spark    | **Constellation**: sparks link with lines that damage            | **Meteor Shower**: every 12 s, meteors rain on the whole room          |
| Flow     | **Wind Dancer**: each dash leaves 3 afterimages that fight briefly | **Comet Form**: while moving fast you become a comet with contact damage |
| Ward     | **Lantern Keep**: a one-hit shield that returns every 12 s        | **Bastion of Dawn**: no single hit can take more than 10 Light         |
| Bond     | **Family of Light**: +1 Soul slot; Souls heal 1 Light per second  | **Festival**: Souls dance around you firing sparks                    |
| Gamble   | **Lucky Star**: 10% chance that any hit deals triple damage       | **Jackpot**: every 100 carried Embers gives a free Flame pick          |

---

## 10. Charms (20 starting skills)

The player takes one Charm into a run. Four are unlocked at the start (Pulse, Dash, Lantern Toss, Sanctuary); the rest
come from Tolliver and the Lighthouse.

| Charm            | Cooldown | Effect                                                                 |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| Pulse            | 8 s      | A light blast that pushes shadows back and deals 30                    |
| Dash             | 3 s      | A short dash with brief invulnerability                                |
| Lantern Toss     | 10 s     | Throw your lantern; it lights the landing area for 4 s                 |
| Sanctuary        | 20 s     | Place a small Well for 6 s                                             |
| Time Still        | 25 s     | Shadows slow to 30% for 3 s                                            |
| Flare Burst      | 12 s     | Three quick bursts around you                                          |
| Beam             | 14 s     | A 1.5 s beam in the move direction                                     |
| Glow Rope        | 12 s     | Pull nearby enemies into your radius                                   |
| Mirror Ward      | 15 s     | Reflect projectiles for 2 s                                            |
| Firefly Swarm    | 18 s     | Release 8 fireflies that hunt enemies                                  |
| Sun Seed         | 16 s     | Plant a seed that grows into a small light turret for 8 s              |
| Blink            | 6 s      | Teleport a short distance                                              |
| Star Anchor      | 20 s     | Mark a spot; use again within 6 s to return to it                      |
| Bloom            | 14 s     | Regain 15 Light over 3 s                                               |
| Ember Rain       | 18 s     | Embers fall in a circle, hurting shadows                               |
| Lighthouse Sweep | 16 s     | A rotating beam around you for 3 s                                     |
| Moth Cloak       | 20 s     | Shadows lose track of you for 2 s                                      |
| Candle Clone     | 22 s     | A decoy that shadows chase for 4 s                                     |
| Prism Split      | 16 s     | Three beams in a fan                                                   |
| Dawn Call        | 40 s     | Big room-wide light flash (once per room)                              |

---

## 11. Relics (25)

Found in Elite chests and mini-boss drops, or bought from Tolliver. Each has a trade-off or a joke.

| Relic               | Effect                                                         | Line                                   |
| ------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Grandma's Teacup    | Wells refill 50% more                                          | "Still warm. Somehow."                 |
| Squeaky Boots       | +10% speed; shadows notice you from further away              | "Squeak. Squeak. Oh no."               |
| Lucky Pebble        | +1 Flame reroll per run                                        | "It is just a pebble. A very lucky one."|
| Heavy Wick          | +20 max Light, −8% speed                                       | "Thick, slow and proud of it."         |
| Night Owl Feather   | See shadow eyes from further; Veils shimmer at the edge        | "Hoo goes there?"                      |
| Rusty Key           | Secret rooms show on the map                                   | "Opens one door. Probably."            |
| Glass Jar           | Store one Light Mote and use it when you want                  | "Keep a little sunshine for later."    |
| Moth Snack          | Moth-type enemies drop 2 motes                                 | "Do not ask what is in it."            |
| Sundial Shard       | Boss telegraphs last 0.2 s longer                              | "Time is on your side. Slightly."      |
| Cracked Lens        | Aura damage +15%, radius −10%                                  | "Sharper, smaller, a bit broken."      |
| Paper Crown         | +25% Embers; shadows have 10% more health                      | "Royalty is tiring."                   |
| Echo Shell          | Charms repeat once at 40% power after 1 s                      | "Hello, hello, hello."                 |
| Patchwork Cloak     | Hits take 3 less Light                                         | "Made from 41 old socks."              |
| Spare Match         | One extra Spark this run                                       | "For emergencies only. This is one."   |
| Bellows             | Dash cooldown −25%; each dash costs 3 Light                    | "Huff. Puff. Zoom."                    |
| Ink Pot             | Shadows leave no hazards when they dissolve                    | "Spills are now somebody else's job."  |
| Star Map            | Door icons show the exact event                                | "X marks the... wait, all of them?"    |
| Honey Lamp          | Motes fly to you from further away                             | "Sweet light is sticky light."         |
| Thorn Ring          | Shadows that touch you take 10 damage                          | "Look, but do not hug."                |
| Sleepy Cat          | Stand still 3 s to regain 1 Light per second, even in the dark | "Purrs at exactly the right pitch."    |
| Bent Compass        | Rooms are 10% shorter, Embers −10%                             | "It points to 'later'."                |
| Chalk Circle        | Start each room with a one-hit shield                          | "Safe zone. Do not erase."             |
| Old Kite            | Knockback you take is halved                                   | "Still wants to fly."                  |
| Tin Drum            | Every 10th kill releases a free Pulse                          | "Ba-dum. Boom."                        |
| Wish Coin           | Once per run, turn a Dim Flame offer into a Radiant one        | "Make it count."                       |

---

## 12. Events (15)

Event rooms appear behind doors marked with a question mark.

1. **Wishing Well**: pay 30 Embers for a random Flame, or nothing. The well giggles either way.
2. **A Stranger's Deal**: lose 15 max Light for a Mythic Flame.
3. **Lost Lantern Race**: light 5 lanterns in 20 seconds for a chest.
4. **Rhythm Shrine**: a 20-second tap-to-the-beat mini game. More hits, better reward.
5. **Dark Trial**: your radius is tiny for 30 s. Survive for a Radiant Flame.
6. **Tolliver's Stall**: a shop with 3 items.
7. **Firefly Garden**: catch fireflies for motes and Embers.
8. **Mirror Pool**: copy one of your Flames, but lose another at random.
9. **Sleeping Giant**: sneak past a sleeping shadow to reach a chest. Waking it starts a fight.
10. **Soul Echo**: a short memory panel of a Lost Soul, plus 20 Light.
11. **Gambling Moth**: the three-cups game for Embers.
12. **Broken Beacon**: stand on 3 points under attack to repair it. Reward: Light refill and a Relic.
13. **Bridge of Candles**: light candles in the right order to cross (a small puzzle).
14. **Fallen Star**: carry a star to a Well while it slowly drains you. Big Ember reward.
15. **Cinder's Challenge**: race the rival to a shard (Worlds 2 to 4 only). Win for a Relic and a story line.

---

## 13. Meta progression: the Lighthouse

The hub is a tall lighthouse. Each floor lights up as you progress.

| Floor          | What it holds                                                        |
| -------------- | -------------------------------------------------------------------- |
| Ground: Hearth | Pick Spirit and Charm, start a run, daily and weekly runs            |
| Tolliver's Nook| Buy Charms, Relics for the pool, cosmetics                           |
| Star Room      | The star map of 5 worlds, mastery stars, Endless Dusk                |
| Memory Shelf   | Collection book: enemies, Flames, Relics, Souls, story panels        |
| Lamp Room      | Permanent upgrades                                                   |

**Permanent upgrades** (total cap +10%, so skill still matters): Max Light +2% ×2, Aura damage +2% ×2, Well refill +2%
×1. Five upgrades of 2% each.

**World mastery:** 3 stars per world: clear it, beat the boss without being hit, clear the world in under 8 minutes.

**Unlocks:** Spirits (table in 5), 16 more Charms, 20 Flames that start locked, Relics added to the pool, 3 skins per
Spirit, lantern trails, Hearth decorations.

---

## 14. Retention

- Daily Run (one seed a day), 3 daily quests, a daily chest (free once a day, or open now with a rewarded ad), a weekly
  challenge seed.
- Collection book with completion bars. 60 achievements (story, skill, collection and silly ones).
- Always show one clear next goal on the Hearth screen ("Beat Thornback", "Find 2 more Souls").
- First session target: 10 to 15 minutes without hitting a wall. World 1 is clearable by a new player in 2 or 3 tries.

---

## 15. Ads and revenue (CrazyGames-safe)

| Slot                     | Type      | Rule                                                                |
| ------------------------ | --------- | ------------------------------------------------------------------- |
| After a run ends         | Midgame   | Never before the first run is finished, never on first load         |
| Revive in place          | Rewarded  | Optional, once per run                                              |
| Double Embers after a run| Rewarded  | Optional                                                            |
| Reroll Flame choices     | Rewarded  | Optional, once per room                                             |
| Daily chest now          | Rewarded  | Optional                                                            |

Rules: never force an ad, never fake a button, mute audio and pause the game during ads, call `gameplayStart` and
`gameplayStop` at the right moments. The exact SDK calls get checked against the CrazyGames docs before any SDK work
(working rule 4). No real-money items, no loot boxes.

---

## 16. Difficulty and assist

| Mode    | Start Light | Enemy speed | Telegraph | Sparks | Rewards |
| ------- | ----------- | ----------- | --------- | ------ | ------- |
| Cozy    | 85          | 80%         | 0.6 s     | 5      | 80%     |
| Normal  | 70          | 100%        | 0.4 s     | 3      | 100%    |
| Radiant | 60          | 115%        | 0.3 s     | 1      | 150%    |

**Dynamic assist:** after 3 quick deaths in a row, quietly add +10% Light regen until the next room clear. It is never
announced.

**First run guidance:** one icon hint at a time, only at the moment of need (first low Light: Well icon pulses; first
Flame pick: the cards wiggle; first telegraph: a short slow-motion).

---

## 17. Art and audio direction

**Art: "paper lantern diorama."** Layered paper-cut silhouettes with glowing edges, soft gradients and warm light
against deep indigo and teal. Round friendly forms for allies, jagged spiky forms for shadows. Everything is drawn in
code (SVG and Canvas) and baked into textures at load. Tween-based animation with squash, stretch and secondary motion.
Lighting is the hero: the world is dark, your light reveals it, shadows outside the light are eyes only. The palette is
palette A, Paper Lantern (D2, mockup in `docs/mockups/palette-A.png`).

**Juice:** hit-stop 40 to 80 ms on heavy hits, screen shake (can be turned off), bloom flicker on damage, damage numbers,
combo counter, camera zoom pulses on boss phase changes, particles under a global cap, squash on button press, number
tweens and smooth transitions.

**UI kit:** one set of buttons, panels, badges and icons. Touch targets 48 px or more. Fonts from Fontsource (SIL OFL).

**Audio:** procedural WebAudio music (pentatonic, layered pads, adaptive layers that fade in as danger rises) for the
hub, the 5 worlds, boss variants and the Hearth. Layered, pitch-randomised SFX with a voice limit. Music follows Light
level and enemy count, ducks under big hits, mutes on ads and tab blur. Separate music and SFX sliders. Total audio
under 5 MB, lazy-loaded.

---

## 18. Accessibility

Colour-blind-safe palettes with shape cues, reduced motion, reduced flashing, text size, one-handed mode, hold or
toggle options, captions for sound-based cues, high-contrast mode, full keyboard navigation in menus, remappable
controls.

---

## 19. Technical plan (decided in D6)

- **Stack:** TypeScript, Vite, Phaser 3. A pure TypeScript simulation (`src/sim`) for combat, loot and
  balance, so it can be unit-tested and run headless for balance bots.
- **Structure:** `src/core` (loop, input, save, i18n, audio), `src/sim` (rules), `src/content` (typed data tables for
  Spirits, enemies, Flames, worlds, story), `src/render` (art generation and effects), `src/scenes`, `src/ui`,
  `src/platform` (CrazyGames, Poki, itch behind one interface), `tests/`.
- **Light rendering:** one darkness RenderTexture per frame with light "holes" erased into it. No per-pixel shaders on
  mobile unless the fallback is tested.
- **Performance targets:** 60 fps on a mid laptop, 30+ on a low-end phone (unverified until tested on a real phone).
  Object pools, particle caps, baked atlases, adaptive quality, no memory growth over 20 runs.
- **Saves:** versioned schema with migrations; export/import code for backup. Platform data module for signed-in
  users, localStorage for guests.
- **Size budget:** our own target is under 8 MB initial download. CrazyGames today requires an initial download of
  50 MB or less, and 20 MB or less for the mobile homepage
  ([CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical/)), and 250 MB in total.
  Worlds, music and story art lazy-load from folders named `lazy/`.
- **Build size check:** `scripts/check-size.mjs <build-dir>` fails the build (exit code 1) when the initial download
  is over 8 MB (our limit), 20 MB (CrazyGames mobile homepage) or 50 MB (CrazyGames hard limit), or the total is over
  250 MB. Phase 1 runs it after every build for every platform folder and saves the size report next to the build.
- **Builds:** `dist/crazygames`, `dist/poki`, `dist/itch`, each with its SDK wrapper and a size report.

---

## 20. Analytics (anonymous)

Local debug panel, plus platform events only if allowed: time to first move, first kill, first death, first Flame
pick, first boss, run length, quit points, day-1 return. No personal data.

---

## 21. Risks

| Risk                                                         | Plan                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Name clashes (title and main characters)                     | Renamed in D1 and D3; owner does a trademark check before launch  |
| Content volume (60 Flames, 30 enemies, 5 bosses) is large    | Data tables, shared behaviours, build World 1 fully first         |
| Darkness and glow cost on low-end phones                     | One render texture, quality levels, test early on a real device   |
| Auto-attack games can feel passive                           | Positioning, Light risk and Charms carry the skill; bots measure it |
| Story panels could slow the first 30 seconds                 | Prologue is skippable and under 20 s; first room starts right after |
| Daily leaderboard depends on the SDK                         | Local "best today" as a fallback                                  |

---

## 22. Not verified yet

- Whether the CrazyGames SDK offers leaderboards a single-player web game can use for the Daily Run.
- The current CrazyGames ad and SDK rules (to be fetched before Phase 8 and before SDK work, per working rule 4).
- Frame rate on a real low-end phone.
- Name availability beyond a web search (no trademark search was done).
