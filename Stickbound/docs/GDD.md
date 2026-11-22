# Elementick: game design document

Studio: majen. Working title in the master prompt: "Stickbound" (renamed, see DECISIONS_LOG D1).
Engine: TypeScript + Vite + Phaser 3. All art is drawn in code, all sound is synthesized live.
Play: https://majenayu.github.io/orb-arena-play/stickbound/

## 1. Pitch

A 1v1 stick-figure fighting game with 10 elements, 30 powers and a tag team of two. Easy to pick up (a first win in under a minute), deep enough to climb: matchups, MP management, perfect guards, tag swaps, and avatars that level up on their own.

## 2. Look

- Thick rounded black (or white on dark arenas) line figures with round heads and expressive faces (9 expressions).
- Clean flat backgrounds, 8 arenas: Old Gym, Rooftop, Green Hollow, Magma Works, Frozen Lake, Sky Platform, Sun Ruins, Night City.
- Bright element-coloured effects, particles, smear trails, hit-stop, screen shake (can be turned off), damage numbers (can be turned off).
- Menus: dark blue and white, thick outlines, 48 px minimum touch targets.

## 3. Fight rules

- Best of 3 rounds, 60 s timer (45 / 60 / 90 in Settings). A timeout goes to the team with more total HP percentage.
- Each side has a squad of 2 avatars. Each avatar has its own HP and MP. **Tag swap** (Q / Tab / TAG): about 0.5 s animation, no cooldown, a short commit so it cannot be spammed. The partner on the bench slowly recovers MP and a little HP. When the active fighter is knocked out, the partner comes in; the round ends when a whole squad is down.
- Bars: HP, MP (blue), guard stamina (yellow). Guarding drains stamina; empty stamina means a guard break.
- **Perfect guard:** guarding in the last frames before a hit (8 to 10 frames, wider with level) takes no damage, gives 6 MP and stuns a melee attacker for 24 frames.
- **No power cooldowns.** MP cost plus wind-up and recovery frames are the only limits.
- Moves: basic combo (3 hits, 4 from level 15, 5 from level 35), heavy attack, air attacks, dash (also by double tap), jump (double jump for Wind), guard, 3 powers.
- Statuses: burn, slow, freeze, shock, root, weak, float.
- The simulation is pure deterministic TypeScript: fixed 60 Hz steps, integer maths, a seeded RNG kept in the state, inputs as bit masks. Same inputs give the same state hash on every machine (rollback-ready for a later online mode).

## 4. Elements

Each element is strong against exactly 2 (125% damage) and weak against exactly 2 (80%). The wheel was found by an exhaustive search that hits all 9 preferred pairs (DECISIONS_LOG D3). A unit test proves it is regular.

| Element | Strong vs | Passive |
| --- | --- | --- |
| Fire | Ice, Leaf | Burns last 1 second longer. |
| Water | Fire, Light | Damage you deal also refills a little MP. |
| Ice | Wind, Leaf | Basic hits slow the foe a little. |
| Lightning | Water, Gravity | Dashes are faster. |
| Wind | Lightning, Time | Double jump. |
| Earth | Lightning, Fire | Guard takes 10% less damage. |
| Leaf | Earth, Water | Slowly heals when not hit for 3 seconds. |
| Light | Time, Ice | Projectiles fly faster. |
| Gravity | Light, Wind | Knockback pulls foes a little closer. |
| Time | Earth, Gravity | Faster MP regen after a perfect guard. |

Base stats differ a little per element but every element has the same stat total. Power damage is tuned per element from bot balance runs (DECISIONS_LOG D17).

## 5. Fighting styles and powers

Every element has 3 fighting styles, and every style has its own 3 powers (90 powers in all), unlocked at levels 1, 8 and 20. Power III of each style is a super move with a cinematic cut-in. Each power has 5 ranks that rise on their own with level: more damage, less MP, stronger status, and a bigger hitbox at rank 5. Two avatars of the same element but different styles share no power.

- **Vanguard (all-rounder):** the set below.
- **Striker (close range):** flurries, dash-cuts, invincible launchers, fans, rains from above, self-buffs.
- **Warden (defense and control):** orbiting shields, counter stances, decoys, traps, wall prisons, life drains, wide areas.

The full list of all 90 powers with their mechanics is in `src/content/archetypes.ts` and, as pictures, in `docs/powers-sheet/` (6 frames each from the Power Lab, `?powers=1`). The style is picked when an avatar is made (with a live preview of its 3 powers) and can be changed any time; it never changes stats.

### Vanguard powers

| Element | Power I (Lv 1) | Power II (Lv 8) | Power III (Lv 20) |
| --- | --- | --- | --- |
| Fire | Hot Shot: a fireball that burns | Scorch Dash: dash through the foe, leave a burning trail | Furnace Rise: a fire column that launches |
| Water | Jet Lance: a fast jet that pushes far | Undertow: a ground wave across the arena | Bubble Lock: a slow bubble that traps in the air |
| Ice | Rime Dart: a quick dart that slows | Glacier Gate: an ice wall that blocks projectiles | Permafrost: freeze everything around you |
| Lightning | Volt Hop: teleport behind and strike | Arc Lash: a multi-hit beam | Storm Mark: a delayed bolt under the foe |
| Wind | Breeze Shove: a strong push | Whirl Kick: a moving multi-hit spin | Razor Draft: a fast blade of air |
| Earth | Boulder Lob: an arcing boulder | Granite Fist: an armored punch | Groundbreak: a floor shockwave (jump it) |
| Leaf | Vine Snare: a vine that pulls the foe in | Burr Mine: a mine that roots | Thicket Rise: roots along the floor that heal you |
| Light | Bright Dart: a fast dart that weakens | Sunlance: a beam across the arena | Shine Shield: blocks the next hit and heals |
| Gravity | Grav Well: drags the foe toward it | Anchor Drop: slam from above | Weightless: a field that makes the foe float |
| Time | Rewind Step: return to where you stood 2 s ago | Tick Field: slows anyone inside | Freeze Frame: freezes the foe for over a second |

## 6. Avatars and leveling

- Roster of 10 slots (+1 every 5 player levels up to 20, or bought for 500 coins). Each avatar has a name, an element, a look and its own level (1 to 50).
- XP to next level: `100 + level × 40`. Stats (basic attack, defense, special attack, special defense, speed, HP) grow about 60% from level 1 to 50, every level a little.
- Perks at levels 15, 30 and 45, pick 1 of 2 (changeable): Hard Hitter / Steady Guard, Flow / Element Shield, Finisher / Iron Body.
- **Avatar Forge:** head, eyes, mouth, body colour, line thickness, hat or hair, back (scarf, cape), extra, aura colour, win pose. Looks never change stats. Some options cost coins.
- **Starter:** the player picks 1 free element and gets 2 avatars of it, so tag swap works from the first fight. Other elements unlock through Champion Road district bosses or 800 coins in the Shop.

## 7. Modes

- **Champion Road:** 40 champions in 8 districts, then Null. Story panels, tag partners, rising bot difficulty, first-win bonuses, element unlocks, two endings (STORY.md).
- **Ranked Ladder:** rating (Elo, K = 32), 6 tiers (Bronze 0, Silver 1100, Gold 1250, Platinum 1400, Diamond 1550, Champion 1700), monthly seasons (rating moves halfway back to 1000, tier reward paid), leaderboard of 25 **AI ranked rivals, clearly labeled AI** everywhere. Stats are normalized: level gives at most about +15%. Quitting counts as a loss.
- **Zombie Survival** (solo): endless waves of 7 zombie kinds (walker, runner, spitter, brute, bomber, shield, boss every 5th wave), health / MP / boost drops, local leaderboard of best runs, one revive per run at half health (150 coins or an opt-in rewarded ad).
- **Training:** dummy element and behaviour (stand, guard, jump, fight back), no timer, the dummy heals, hitbox view.
- **Local 2P:** two players on one keyboard (or two gamepads), any elements, even level 20 with normalized stats.

## 8. Meta and economy

- Coins only, earned by playing. No real money, no loot boxes: every shop item shows exactly what you get.
- 7-day login streak (50, 75, 100, 125, 150, 200, 400 coins).
- 3 daily and 5 weekly quests from fixed pools (win, play, powers, hits, perfect guards, swaps, zombie waves, Champion Road wins, damage, ranked matches).
- Player level and tiers (Rookie, Fighter, Veteran, Elite, Legend) from total play.
- Results screen: rounds, hits, damage, best combo, powers, perfect guards, XP and coins; optional rewarded ad doubles the coins. Level-up and perk screens follow.

## 9. Controls

- Keyboard (solo, remappable): move A D / arrows, jump W / Up / Space, attack J / Z, heavy K / X, guard L / C, powers U I O / 1 2 3, tag Q / Tab, dash Shift or double tap, pause Esc / P.
- Gamepad: A attack, X heavy, B dash, Y tag, LT guard, LB / RB / RT powers, d-pad or stick to move. Menus work with d-pad, A and B.
- Touch: floating stick on the left, 10 big buttons on the right (5 × 2), one-handed layout option.

## 10. Accessibility

Screen shake, reduced motion, reduced flashing, damage numbers, one-handed touch, large text, high contrast, key remapping, round timer length. Element icons have distinct shapes, so the matchup chart works without colour vision.

## 11. Platforms and ads

One platform interface (web / itch.io, CrazyGames, Poki). Gameplay start / stop events around fights and pauses; the game pauses and mutes on tab hide and during ads. Midgame ads only at natural breaks (results screens); rewarded ads only when the player asks, never more than every 5 minutes for double coins, always with a non-ad alternative. New players land in gameplay: one click on an element starts the first fight. Saves in local storage with a backup copy and an export / import save code.

## 12. Targets

- First win in under 60 s from page load (measured 19 to 24 s).
- Initial download under 5 MB (measured 1.67 MB, 407 KB gzipped).
- 60 fps on desktop (measured 144 fps, capped by the monitor; busiest power fight with 4x CPU throttle: 94 fps average, 71 fps at the 95th percentile); balance: every element 45 to 55% and every element:style 42 to 58% over 10,000 bot matches (measured 46.7 to 51.9% and 44.8 to 54.6%), rounds 25 to 45 s (measured 40.6 s).
