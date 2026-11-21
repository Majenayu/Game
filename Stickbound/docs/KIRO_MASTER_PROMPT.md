# STICKBOUND (working title): master build prompt for Kiro

Studio: **majen**. A stickman elemental fighting game for CrazyGames (also exportable to Poki and itch.io).
This replaces the Talewild plan (paused) and the Orb Arena plan. Reuse your own earlier engine code only where it fits
(save system, platform/SDK layer, i18n, debug tools from `Talewild/`), as plain code you own, never as design.
Paste PART A into Kiro first. Then send one phase (PART J) per message.

---

## PART A. Mission (paste this)

You are the game director, lead engineer, fighting-game designer, animator, VFX artist, sound designer, UI designer,
network engineer, QA lead and release manager for **Stickbound**. No human writes code or art. The owner reviews
playable builds and screenshots and answers questions marked **DECISION**.

The game in one line: *collect and level up elemental stickmen, take two into a 1v1 fight, and climb from the lobby to
ranked champion.* It mixes three ideas: the monster-raising loop of creature RPGs (collect, level, matchups), elemental
power-fighters (hero designs built around elements), and the fast, readable fun of stickman fighting games.

Targets:
- Instantly understood (stick figures, three buttons), deep enough to master (matchups, MP management, combos, tag swap).
- Fights that feel great: tight controls, snappy hits, readable powers, big juicy effects.
- Many reasons to return: levels per avatar, daily and weekly quests, streaks, a champion ladder, zombie survival, ranked seasons.
- Tiny download (target under 5 MB), runs on phones and low-end laptops, accepted on CrazyGames.
- 100% legal and original (Part B).

Rules for every task:
1. Read this file and `docs/GDD.md` first. Content is data-driven (typed tables), rules are pure TypeScript.
2. Small verified steps. The game must run after every step. Run typecheck, unit tests and a Playwright smoke test.
   Check fresh screenshots at 1366x768, 1920x1080, 390x844 and 844x390 before calling visual work done.
3. The fight simulation is **deterministic** (fixed 60 Hz timestep, integer or fixed-point math, seeded RNG, no
   Date/Math.random inside the sim). Rendering reads sim state and never changes it.
4. Record every third-party asset in `docs/ASSETS.md` (name, author, URL, license, date checked, where used, edits).
   Never use CC-BY-SA, GPL, non-commercial or ripped assets. Prefer none: stickmen and effects are drawn by code and sound
   is synthesized.
5. Do not guess CrazyGames rules. Fetch https://docs.crazygames.com before SDK work and before release.
6. Never publish, pay or submit. The owner does that.
7. After each phase write `docs/phases/PHASE_N.md` (changes, screenshots, test output, risks, next step), commit, and
   publish a playable build link so the owner can try it in a browser.
8. Be honest about scope and about anything unverified (real phone fps, online latency, revenue, review outcome).

---

## PART B. Legal and originality (non-negotiable)

- Elements (fire, water, lightning, wind, earth and so on) are generic ideas and are free to use. **Do not copy any
  anime, cartoon, game or creature franchise**: no character names, power names, catchphrases, costume designs, logos,
  music or sounds from BoBoiBoy, Pokemon, or any other work. The owner used them as inspiration for the *idea* of
  element-based forms and creature raising. Create your own original names, designs, powers and story.
- Study "Crazy Combos" (a stickman game on CrazyGames) only for **structure**: lobby with stats, level bar, daily and
  weekly goals, streak, region and ping, modes list, 2 players on one keyboard, play with friends. Do not copy its art,
  UI skin, name, card system or text. Our identity is elemental avatars, not cards.
- Do not use real people, real brands, or other games' names anywhere in the game or store text.
- Run a web name check on the title (CrazyGames, Steam, itch.io, Google Play, Google) in Phase 0 and offer 3 options.

---

## PART C. Core design

### C1. Avatars
- An **Avatar** is a stickman with one **Element**, a name, a look, a level (1 to 50), stats and 3 powers.
- Players can **build any avatar** in the **Avatar Forge**: choose Element, head shape, eyes, mouth, body color, line
  thickness, headgear, scarf or cape, weapon-less accessories, aura color, win pose and name. Cosmetics never change stats.
- Roster: up to 10 avatars at the start (more slots by playing). Each avatar levels **individually**. Avatars of the
  same Element can differ by their chosen perks (C5).
- Before a match you choose a **Squad of exactly 2 avatars**. You can swap between them during the fight (C3).
- Basic stickman design only for now: clean round head, line body, expressive eyes and mouth, thick outlines, small
  element details (a flame tuft, a leaf, a bolt). Silhouettes must be readable at small size on phones.

### C2. The 10 Elements (original vocabulary, generic ideas)
Fire, Water, Ice, Lightning, Wind, Earth, Leaf, Light, Gravity, Time.

Matchups: design a thematic wheel in `content/elements.ts` where **every element is strong against exactly 2, weak
against exactly 2, and neutral to the rest**. Strong = +25% damage dealt and a small status bonus, weak = -20% damage
dealt. An easy valid structure: put the 10 elements in a ring and let each beat the next two. Starting order to adjust for
theme: Fire, Leaf, Earth, Lightning, Water, Ice, Wind, Gravity, Light, Time (then back to Fire). Reorder or swap pairs if a
matchup feels wrong in play, but keep every element at exactly 2 wins and 2 losses and never let two elements beat each
other. A unit test must prove it. Show an in-game chart with icons that work by **shape**, not only color.

Each element has: a signature color pair, a stick-body accent, a trail, hit sparks, an aura, a sound palette and a
passive (small, for example Fire: burns last 1 second longer; Wind: double jump; Ice: hits slow a little; Earth: guard
takes 10 percent less; Lightning: dashes are faster; Water: heals 1 percent of damage dealt as MP; Leaf: slow HP regen
out of combat; Light: projectiles move faster; Gravity: knockback pulls slightly toward you; Time: MP regenerates a bit
faster after a perfect guard).

### C3. Fight rules (1v1)
- Side-view 2D arena, left and right walls, floor, a few arena themes (gym, rooftop, forest, lava cave, ice lake, sky
  platform, ruins, night city) that change only the look, plus 2 with a small hazard for Champion mode.
- Match: best of 3 **rounds**. Round timer 60 seconds (setting 45 to 99). If time runs out, the higher total HP percent
  wins. Show the round timer, both players' names, the active avatar's **HP bar** and **MP bar**, and the benched
  avatar's small HP bar.
- Each avatar has its own HP and MP. A round ends when both of one side's avatars are down, or on time-out.
- **Tag swap**: press Swap to bring in the other avatar (about 0.5 second invulnerable animation). The benched avatar
  slowly regenerates MP and a little HP. Swap has no cooldown and is not a power, but it has short commit frames so it
  cannot be spammed to dodge everything. This is a **DECISION** (alternative: choose a lead and fight until down).
- Controls: Move, Jump, Dash, **Basic attack** (3-hit combo), **Heavy attack**, **Guard**, **Power 1, 2, 3**, **Swap**.
  Desktop: WASD plus J K L U I O style keys, fully remappable, and a second keyboard layout for local 2 players on one
  keyboard. Touch: left stick, right-side buttons with large targets. Gamepad supported.
- **No cooldowns on powers.** The limit is **MP**: each power costs MP (10 to 60), MP max is 100, it regenerates slowly
  (about 6 per second), grows when you land hits (+3 per hit) and when you guard (+2), and drops when you are hit
  (-0 to -3 only in tag fights, never to zero). Powers also have **wind-up and recovery frames**, so spamming a power is
  punished by being hit during recovery. There is no per-skill cooldown number anywhere.
- **Defense**: Guard reduces damage 70 percent and drains guard stamina (a thin bar under HP). **Perfect guard** (guard
  within 8 frames of a hit) takes no damage, grants MP and briefly stuns the attacker. Guard break stuns you. Dash has
  invulnerable start frames and a recovery.
- **Combos and hit rules**: hitstun, blockstun, knockback, juggle limit (damage scaling after 4 hits), anti-infinite
  rules, throw-free (no grabs in v1). Clear frame data in `content/moves.ts`.
- **Status effects (7)**: Burn, Slow, Freeze (short), Shock (interrupt), Root, Weak (damage down), Float. Always show an
  icon over the stickman and in the HUD.
- Every move defined as data: startup, active, recovery frames, hitboxes, damage, hitstun, knockback, MP cost, effects,
  projectile properties, animation keys. A debug view draws hitboxes and hurtboxes.

### C4. Powers (2 or 3 per avatar, designed per Element)
Every avatar has **Power I (Lv 1), Power II (Lv 8) and Power III (Lv 20)**. Costs shown are starting values to tune.
Each power has 5 upgrade ranks that improve it as the avatar levels (damage, speed, range, extra effect, lower MP cost).

| Element | Power I | Power II | Power III |
| --- | --- | --- | --- |
| Fire | **Ember Shot** (fireball, applies Burn, 20 MP) | **Flame Rush** (dash with a fire trail that hurts, 30) | **Pillar of Cinders** (fire column launches the target, 50) |
| Water | **Aqua Bolt** (pushing water jet, 20) | **Tide Roll** (ground wave that travels the arena, 35) | **Bubble Cage** (traps the target briefly, 50) |
| Ice | **Frost Shard** (fast projectile, Slow, 20) | **Ice Wall** (blocks projectiles for a few seconds, 25) | **Deep Freeze** (area freeze around you, 55) |
| Lightning | **Spark Step** (teleport-strike behind the foe, 25) | **Chain Bolt** (short beam that arcs, 30) | **Skyfall Strike** (delayed bolt where the foe stands, 50) |
| Wind | **Gust Push** (shove with knockback, 15) | **Cyclone Kick** (spinning multi-hit, 30) | **Air Blades** (3 fast long-range cuts, 40) |
| Earth | **Rock Throw** (arcing boulder, 20) | **Stone Fist** (armored heavy punch, 30) | **Quake** (shockwave that hits grounded foes, 50) |
| Leaf | **Vine Lash** (long reach pull, 20) | **Seed Trap** (hidden mine that roots, 25) | **Overgrowth** (roots across the floor and heals you a little, 55) |
| Light | **Flash Orb** (projectile that briefly blurs the foe screen edge, 20) | **Radiant Beam** (piercing beam, 35) | **Sun Aegis** (barrier that blocks one hit and heals a little, 50) |
| Gravity | **Pull Well** (drags the foe toward you, 25) | **Heavy Press** (slams the foe to the ground, 30) | **Zero-G** (floats the foe, low defense, 55) |
| Time | **Echo Step** (return to where you were 2 seconds ago, 20) | **Slow Field** (area that slows, 35) | **Stillness** (freezes the foe for 1.2 s, no damage, 60) |

Rules: powers must be readable (clear telegraph, color and shape), fair (counterplay for each), and fun to chain. Each
power gets its own animation, VFX and sound. Add a unit test that every power has data, an animation key and a sound.
**Basic attack, defense, special attack and special defense** also improve with levels (C5).

### C5. Leveling (each avatar individually)
- Max level 50 at launch. XP needed grows smoothly (about 12 hours of play to reach 50 on a single avatar).
- Stats: **Vitality** (HP), **Might** (basic and heavy damage), **Spirit** (power damage and MP), **Guard** (defense),
  **Resolve** (special defense: lower damage from elemental powers and status duration), **Speed**.
- What improves with level:
  - **Basic attack**: damage, combo grows from 3 to 4 hits (Lv 15) and 5 hits (Lv 35), better reach, faster recovery.
  - **Defense**: guard strength, perfect-guard window grows from 8 to 10 frames, guard stamina.
  - **Special attack**: power ranks (5 ranks per power), lower MP costs, new effects at ranks 3 and 5.
  - **Special defense**: element resist and status resist, a small element shield at Lv 30.
- **Perks** at Lv 15, 30, 45: choose 1 of 2 per tier (for example Offense: powers hit harder; Defense: guard drains less;
  Flow: faster MP regen). This makes two avatars of the same element play differently.
- In **Ranked**, stats are normalized so a level 50 is at most about 15 percent stronger than a level 1 (DECISION).
  Levels still unlock powers and give matchup knowledge, but skill matters more than grind.
- XP sources: any mode. Winning gives more. Level-up shows an animated reward screen.

### C6. Modes
1. **Lobby (home)**. Your avatar stands in a cozy stage, idling with its element aura. Reference structure: left
   panel with player stats (Wins, Losses, Matches, Win rate, KOs, Falls, K/D, Rounds won, Best streak, Favorite power),
   a level bar with a tier name (Rookie, Fighter, Veteran, Elite, Legend), a **7-day streak**, **daily 3** and **weekly 5**
   quests, region and ping, a News card, and buttons: **Play, Modes, Avatars, Shop, Settings**. Add Play with Friends
   (private room code) in a later phase.
2. **Avatars**. Roster grid, Forge (build or edit), level, stats, powers with upgrade ranks, perk picks, squad selection
   (choose 2), matchup chart, cosmetics.
3. **Ranked 1v1** (online). Squad of 2, best of 3. ELO-style rating with tiers Bronze, Silver, Gold, Platinum, Diamond,
   Champion, monthly seasons with rewards, a leaderboard, region choice, rematch, report and mute tools. **DECISION**: when
   the queue is empty after 8 seconds, offer a clearly labeled **Practice Match vs Bot** that gives reduced XP and no
   rating change, so the game never feels dead.
4. **Zombie Survival** (offline, solo). Endless waves in an arena with stick zombies (walker, runner, spitter, brute,
   bomber, shield, boss every 10 waves). Zombies have Element variants that teach matchups. Earn XP and coins per wave,
   best wave on a leaderboard, pickups (health, MP, temporary power boost). Optional 2-player co-op later.
5. **Champion Road** (offline story ladder). 8 regions, 5 champions each (40 fights), each champion has an element, a
   squad, a personality line before and after, and a reward (avatar skin, coins, a new element unlock, perks). Includes the
   story (C7). First-time clears give big XP, so this is the main leveling path for new players.
6. **Training** (dummy, frame data view, combo practice) and **Local 2P** (one keyboard).

### C7. Story (short, funny, original)
World: **The Inkline**, a flat world drawn by one long line. Elements are the "sparks" that live in the line. A mysterious
**Eraser** (final boss) is scribbling the sparks out of the world. The player is a nameless blank stick who finds a spark
and must beat the 8 regional champions to enter the Grand Arena and face the Eraser. Each champion is a character
with a goal, a flaw and a funny line. Write `docs/STORY.md`: premise, 8 regions, 40 champions with 2-line intros, the
Eraser reveal and 2 endings. Panels are short comic frames drawn from stick poses, skippable.

### C8. Economy and shop (no real money, no loot boxes)
- **Coins** earned by playing. Spend on cosmetics, extra roster slots, element unlocks (also unlockable by Champion Road).
- A **free Starter**: pick 1 element avatar for free, unlock others by Champion progress or coins.
- Rewarded ads (player chooses): double XP after a match, extra daily coins, revive once in Zombie Survival. Never
  force an ad, never block progress. No real-money purchases in v1.

---

## PART D. Art and animation (all code-drawn, original)

- Stick rig: a skeleton of 14 joints (head, neck, spine, pelvis, shoulders, elbows, hands, hips, knees, feet), drawn with
  thick rounded lines and a round head with a face. Poses are keyframed data. Use easing and smear frames for attacks.
- Procedural animation layer (idle breathe, walk, run, jump, fall, land squash, dash, hit reaction, guard, KO fall,
  victory, taunt) plus per-move keyframes. Secondary motion for scarves, capes and hair using simple spring physics.
- Faces: 8 eye shapes, 6 mouths, 8 expressions (angry, scared, happy, determined, hurt, dizzy, smug, shocked) that react
  to events.
- VFX per Element: projectile, trail, hit spark, aura, status icons, screen flashes. All made of lines, circles and
  particles with a global cap. Every power has telegraph, impact and end frames.
- Fight juice: hit-stop (3 to 8 frames), camera shake scaled to damage, slow-motion on the final KO, zoom pulses on
  big moves, damage numbers (toggle), combo counter, "K.O." and "Perfect guard" banners, round intro with an announcer text.
- Arenas: layered parallax backgrounds drawn in code, each with a clear floor line and a safe visual area.
- UI: clean dark-blue and white style (original, not copied), big readable fonts (SIL OFL), icons by shape and color,
  min touch target 48 px, animated transitions.
- Performance: 60 fps on a mid phone, particle caps, cached gradients, no per-frame allocations in the sim.

## PART E. Audio
All synthesized with WebAudio, no files needed: punchy hit sounds (light, medium, heavy), guard clinks, whooshes, per-Element
power sounds, UI clicks, announcer-free text banners, crowd ambience, and 6 short music loops (lobby, fight, ranked fight,
zombie, boss, victory), adaptive tension as HP gets low. Separate sliders for music and SFX, mute during ads and when the
tab is hidden, safe default volume. Optional CC0 samples only if recorded in `docs/ASSETS.md`.

## PART F. Technical plan

- Stack (**DECISION**, recommended): TypeScript, Vite, Phaser 3 for rendering and input, pure-TS deterministic sim in
  `src/sim`, content in `src/content`. Fixed 60 Hz sim step, render interpolation.
- Structure: `src/core` (loop, input, save, i18n, audio), `src/sim` (fight rules, hitboxes, statuses, AI), `src/content`
  (elements, moves, powers, avatars, champions, quests), `src/render` (stick rig, VFX, arenas), `src/scenes` (lobby, forge,
  fight, results), `src/ui`, `src/net`, `src/platform` (CrazyGames, Poki, itch behind one interface), `server/`, `tests/`.
- **Bot AI** with 5 difficulty levels (Rookie to Legend): reads spacing, uses guard, perfect-guard attempts, manages MP,
  picks counters by element, and never cheats with frame-perfect inputs. Used by Champion, Zombie, Practice and training.
- **Saves**: versioned schema, 3 profiles, auto-save after every match, backup copy, export and import code, CrazyGames
  data module sync for signed-in players. Never lose progress.
- **Online ranked** (Phase 7): because the sim is deterministic, use **rollback netcode with input delay** over WebSocket
  through a small relay server (Node, Colyseus or plain ws), with desync detection via state hashes, matchmaking by rating
  and region, reconnect handling, rate limits and simple abuse protection. **DECISION**: relay-plus-rollback (cheap,
  recommended) versus a fully authoritative server (more cheat-proof, higher cost). Prove playability with a latency
  simulator at 50, 100 and 200 ms and 5 percent packet loss. Use your existing deploy knowledge (see `orb arena/DEPLOY.md`)
  but keep this server separate. CrazyGames requires its own player identity for online features: fetch the docs before building.
- Analytics (anonymous): time to first fight, first win, first level-up, match length, quit points, day-1 return.
- Performance and size: under 5 MB initial download, no memory growth over 100 matches, 60 fps target.
- Accessibility: colorblind-safe elements by shape, reduced flashes and shake, text size, remappable keys, hold-to-toggle
  guard, one-handed touch layout, high-contrast HUD.

## PART G. Retention and revenue (CrazyGames-safe)
Revenue comes from ads the portal places and from long engagement. Good ad moments: after a match result, after a
level-up, on returning to the lobby, and optional rewarded ads from C8. Never on first load, never mid-fight. Use SDK
`gameplayStart` and `gameplayStop` correctly, pause and mute during ads. Retention: daily and weekly quests, 7-day
streak, XP tiers, collection of avatars, season ranks, weekly Zombie challenge seed, achievements (60), cosmetic unlocks.

## PART H. Balance and quality
- Headless simulator: bots play thousands of matches. Report win rate by Element, by power, by matchup, average match
  length, average combo, and MP spent. Targets: no Element above 55 percent or below 45 percent win rate at equal level,
  average round length 25 to 45 seconds, no infinite combos, no unblockable setups.
- Automated tests: determinism (same inputs give the same hash after 10,000 frames), frame data checks, element
  wheel regularity, save migration, input remap, and a full Champion Road walkthrough bot.
- Playtest checklist for the owner: does it feel responsive, can a new player win a first fight within 60 seconds, are
  powers readable, is guard fun, does leveling feel rewarding.

## PART I. DECISIONS to ask the owner in Phase 0
1. Title (3 options after a name check). 2. Tag-swap versus lead-until-down. 3. Rating normalization strength in ranked.
4. Empty-queue Practice Match vs Bot. 5. Netcode choice (relay plus rollback vs authoritative). 6. Starting element
unlocks. 7. Art accent palette (3 mockups). 8. Whether Zombie co-op comes in v1 or later.

## PART J. Phases (one per message, each ends with a playable build link)

**Phase 0. Concept lock.** `docs/GDD.md`, `docs/STORY.md` outline, the element wheel (with proof script), all 30 powers
with frame data drafts, the 40 champions list, 3 art mockups (fight screen, lobby, forge), 3 title options with name
checks, the DECISIONS list. No game code.

**Phase 1. Fight engine foundation.** Project setup (reuse the platform, save and debug tools from `Talewild/` as your own
code), deterministic sim, stick rig and animation system, movement, jump, dash, basic combo, heavy, guard, perfect guard,
hit-stop, HP and MP bars, round timer, a training dummy, keyboard and touch input, and 2 local players. The fight must
already feel good.

**Phase 2. Elements and powers.** 10 Elements, 30 powers with VFX and sounds, MP rules, status effects, matchup
damage, the Swap mechanic, a bot of difficulty 1 to 3, the matchup chart screen.

**Phase 3. Avatars and leveling.** Avatar Forge, roster, stats, XP and levels to 50, power ranks, perks, squad select,
save and load, level-up screens.

**Phase 4. Lobby and meta UI.** Lobby with stats, level bar, quests, streak, region and ping placeholder, Modes screen,
Shop with coins and cosmetics, Settings, tutorial in the first fight.

**Phase 5. Champion Road and Zombie Survival.** Both offline modes with rewards and leaderboards (local), full story
panels, 40 champions, bosses, the Eraser.

**Phase 6. Polish and balance.** Juice pass, audio pass, 5 bot difficulties, balance simulator runs and fixes, performance on
phone, accessibility.

**Phase 7. Online ranked.** Server, rollback netcode, matchmaking, rating, seasons, leaderboard, reconnect, Practice
fallback, latency tests, abuse protection.

**Phase 8. Retention, ads, localization.** Daily and weekly systems, rewarded and midgame ads through the SDK,
analytics, languages after English is final.

**Phase 9. Legal and portal package.** Re-fetch CrazyGames docs, evidence checklist, assets audit, credits, privacy note,
size report, store text, screenshots, trailer capture, covers. Portal-tester self review.

**Phase 10. Launch support and post-launch plan** (weekly content: new elements, champions, arenas, events).

---

## PART K. Honest limits
CrazyGames reviewers decide approval, and income depends on traffic and ad share. Online play needs a running server
(a monthly cost) and enough players, which is why the bot fallback and offline modes matter. A fighting game depends on
feel: if it does not feel good at the end of Phase 1, stop and fix it before adding content.
