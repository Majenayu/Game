# Orb Arena: Master Plan (v3, "Skill World")

Status: plan for review. Nothing in this file is built yet, except the bot pathfinding fix in section 0.
Open decisions that need an answer from the owner are marked **DECISION**.

---

## 0. Fixed already

- **Bots getting stuck.** Measured before the fix: bots stalled up to 75% of the time on Cyber Maze, about 50% on Fortress and Lava.
  Cause: they steered straight at their goal and slid along walls. Now: grid pathfinding (A*) with waypoint smoothing, plus stuck detection
  that picks a new route after one second without movement. After: at most about 1% stalls on every map and mode. A test (`shared/src/bots.test.ts`) keeps it that way.

---

## 1. Vision

An anime-inspired power-fantasy arena RPG. You start as a tiny glowing orb in a huge world of skills. You collect, merge, trade and master skills,
climb a worldwide ranked ladder, fight bosses in an open world, and try to dethrone the world champion.

Inspirations (tropes only, no copied names or art): the "reborn as something weak who devours skills" isekai, the overpowered
hero who hides their strength, the world's best assassin, and pirate-style bounties, crews and one-of-a-kind awakened powers.

Pillars:

1. **Skills are the game.** Everything you earn is a skill, a skill upgrade, or a way to trade skills.
2. **Easy to start, deep to master.** Start in 10 seconds, still discover new things after 100 hours.
3. **Fair.** Server decides everything. Ranked uses a power budget so money or luck cannot buy a win.
4. **Alive world.** Champion changes, rare drops, boss spawns and trades are announced to everyone.

---

## 2. Hard constraints (read first)

| Topic                             | Reality                                                                                                                                                                                                             | Plan                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real money for skills**         | "Sell skills for money" is real-money trading. It needs payment processing, cash-out, taxes, age checks and anti-fraud. CrazyGames is a PEGI 12 portal and I expect it to reject cash-out. It cannot be built free. | **DECISION (recommended):** trade with an in-game currency only (call it Crowns). No cash-out ever. If you later want real money, use only the payment tools CrazyGames offers, for buying Crowns. |
| **Betting**                       | Wagering things of value is gambling-like.                                                                                                                                                                          | Auction bidding with Crowns is fine. "Wager duels" use Crowns with low caps. No real-money bets.                                                                                                   |
| **Global accounts and ownership** | Unique skills, trading, ranked and chat cannot live in the browser. They need a server database.                                                                                                                    | Add a backend (section 12).                                                                                                                                                                        |
| **Login**                         | CrazyGames forbids external login options.                                                                                                                                                                          | Identity is the CrazyGames account (verified server side). Guests can play but cannot own unique skills or trade.                                                                                  |
| **Chat**                          | CrazyGames needs a moderation filter and respect for `disableChat`.                                                                                                                                                 | Section 10.                                                                                                                                                                                        |
| **"Free"**                        | Always-on game servers and a database cost money at scale.                                                                                                                                                          | Beta runs on free tiers (section 12). Real scale needs paid plans.                                                                                                                                 |
| **Download size**                 | 50 MB at first load for Basic, 250 MB total for Full.                                                                                                                                                               | Skills are generated by code, not shipped as files. Art is vector or CC0 sprites.                                                                                                                  |

---

## 3. Skill system

### 3.1 Ranks

| Rank  | Rarity name | Definitions in the world                    | How you get it                                                       |
| ----- | ----------- | ------------------------------------------- | -------------------------------------------------------------------- |
| **U** | Unique      | 100 hand-made, **one owner worldwide each** | 1% chance in rare sources, fusion recipes, champion and raid rewards |
| **S** | Legendary   | 1,000                                       | Raid bosses, legendary monsters, top ranked rewards, very rare draws |
| **A** | Epic        | 10,000                                      | Bosses, ranked season rewards, rare draws                            |
| **B** | Rare        | 30,000                                      | Open world, campaign, draws                                          |
| **C** | Uncommon    | 30,000                                      | Everything                                                           |
| **D** | Common      | 20,000                                      | Everything                                                           |
| **E** | Poor        | 12,000                                      | Everything (mostly merge fodder)                                     |
| **F** | Junk        | 12,000                                      | Everything (merge fodder)                                            |

That is about 115,000 skill definitions. Counts per rank follow your ratio (100 / 1,000 / 10,000). **DECISION:** confirm the B to F counts.

### 3.2 How 115,000 skills exist without 115,000 scripts

A skill is built from data:

`Skill = Archetype (about 120) x Element (12) x Modifier (about 80) x Rank`

- **Archetype** = the mechanic written once in code (for example Projectile, Beam, Orbit Blades, Dash Strike, Shield Dome, Mine, Heal Pulse, Summon, Clone, Chain Lightning, Time Slow, Pull Field).
- **Element** = status and look (flame burns, frost slows, storm chains, void pierces, light heals, shadow hides, toxin stacks, metal bounces, wind pushes, blood leeches, star homes in, gravity pulls).
- **Modifier** = numbers and a twist (more projectiles, shorter cooldown, longer range, ricochet, delayed explosion, and so on).
- A hash of the skill id picks all three, so the full list is computed in code. Nothing big is downloaded.
- Names come from a grammar, for example "Crimson Flame Lance" or "Hollow Frost Dome". 120 x 12 x 80 gives 115,200 unique names.
- **Each owned copy is an instance with rolled stats** inside the band of its rank, so two players with the same skill still differ a little.
- Icons: free vector icon sets, tinted per element and framed per rank. The icon set license requires credit, which the credits page will give.

### 3.3 Categories (every skill belongs to one)

Attack, Defence, Support, Boost, Shadow, Weapon, Summon, Control, Movement, Space and Time, Creation (works outside battle), Utility (works outside battle).

- **Battle skills** are used in matches.
- **World skills** work in the hub and open world, outside battle: Creation, Appraise, Forge, Scout, Loot Magnet, Teleport Home and similar. They are how you "deal with" the economy.

### 3.4 Your 5-skill loadout

- You pick **5 skills** before each match from your collection (keys 1 to 5, five buttons on phones).
- Saved loadout presets (3 to start).
- In 2v2 ranked there is a short draft: both teams reveal loadouts, each team may ban one enemy skill, then lock.

### 3.5 Levels, mastery and stat merging

- **Skill level (1 to 20).** Raised by merging. Higher level multiplies base stats.
- **Auto-merge of duplicates.** If you obtain a skill you already own, it merges into your copy automatically. Level and stats go up with diminishing returns. No duplicates clog your inventory.
- **Mastery (1 to 10).** Rises by using the skill in matches. Unlocks cosmetic effects and small perks (shorter cooldown, a visual evolution). Mastery is separate from level, so veterans feel progress even with common skills.
- **Fusion (manual).** Once per week you may fuse skills into a stronger or new skill. Fusion needs skill level thresholds. About 15 secret **recipes** exist that create skills nobody can drop. The unique "Infinite Fusion" skill removes the weekly limit for its owner. **DECISION:** confirm this reading of "one merge a week".

### 3.6 Unique skills

- Exactly one copy exists in the whole world. The owner's name is public on the **Hall of Uniques**, so other players can message and make offers.
- The owner can trade, but cannot duplicate it or merge it away.
- **Reincarnation rule:** if the owner is inactive for 60 days, the skill returns to the world and drops from a legendary monster. Uniques never die forever.
- Some uniques are out-of-battle meta skills (section 3.7). Others are battle skills no other skill can match.
- 100 uniques are listed in appendix A.

### 3.7 World-changing unique skills (examples)

Skill Genesis (create a custom skill from three owned skills), Infinite Fusion (no weekly limit), Appraiser's Eye (see exact stats and fair price of any skill), Merchant King (no auction fees), Fortune Loom (better luck on drops and draws).
These can be won, traded or contested, so they create a real economy and real stories.

### 3.8 Starter skills

You asked every player to start with 5 random skills, one each of S, A, B, C, D, and a 0.01 chance (1%) of a unique one.
If everyone owns an S skill, "S" stops meaning rare. **DECISION (recommended):** starter skills are shown with ranks S to D but are **"Starter-grade"**: stats capped lower, bound to you (cannot be sold), and they upgrade into normal skills through merging. The 1% unique chance stays, and a unique found this way is real and tradeable. Alternative: give real S rank to everyone and accept that S is common.

### 3.9 Daily skills

- One free daily skill claim (ranks F to B, small chance higher).
- A featured daily rotation (6 skills at reduced shop price).
- Daily login streak gives skill fragments that complete a skill.

---

## 4. Game modes

| Mode                        | Players                     | Notes                                                |
| --------------------------- | --------------------------- | ---------------------------------------------------- |
| **Ranked 2v2**              | 4                           | Worldwide ladder, skill draft, power budget, seasons |
| Team matches                | 3v3, 4v4                    | Casual, skills enabled                               |
| Solo free-for-all           | up to 8                     | What exists now, plus 5-skill loadouts               |
| Coin Rush, King of the Hill | up to 8                     | Exist now                                            |
| **Story**                   | 1 (co-op later)             | Staged chapters (section 7)                          |
| **Open world**              | shared instance of about 20 | Bosses, loot, exploring (section 8)                  |
| **Boss raids**              | 1 to 4                      | Scheduled legendary encounters                       |
| **Champion challenge**      | 1v1                         | Fight the reigning champion (section 6)              |

Loot sources: every mode can drop skills, with rank odds that depend on mode difficulty. Team, solo and story all feed the same collection.

---

## 5. Ranked 2v2 (worldwide)

- **Rating:** Glicko-2 (handles uncertainty) with 10 placement matches. Tiers: Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Mythic.
- **Seasons:** about 8 weeks. Soft rating reset, rewards by tier (skills, cosmetics, titles, Crowns).
- **Worldwide matchmaking:** queue in your nearest region first. If nobody is found in 20 to 30 seconds, widen to other regions with a latency cap. One global ladder.
- **Fairness:** a **power budget**. The total rank value of your 5 skills may not exceed a ladder-set number. A team of five S skills cannot out-buy a smart team of cheaper skills. Starter-grade and levels count toward the budget.
- **Anti-abuse:** the server holds all results, rating changes and loadouts. Win-trading checks (same pairs repeatedly) and leave penalties.
- **Duo:** invite a friend (invite links already exist) or queue with a random partner.
- **Leaderboards:** global, per region, per friends, per season.

---

## 6. The champion and criteria bosses

- **The Champion is "Majen"**, a bot with an overpowered kit. It is the first champion of the world.
- **Rule for dethroning:** reach a rating threshold (for example top 100 worldwide in ranked, or Master tier) to unlock the **Crown Challenge**, a 1v1 duel in a special arena. Majen is hard but beatable.
- **If you win:** you become Champion. Your name is announced worldwide, you get the Crown title, a champion aura and a reward. Majen returns as a roaming boss you can hunt.
- **When a player is champion** the throne can be challenged by the next player who qualifies. A time-limited cooldown avoids endless spam.
- **Criteria bosses (unique-skill bots).** These are the toughest enemies. They cannot be damaged until a condition is met, and the condition is discoverable, so they are hard but never impossible. Examples:
  - Mirror King: immune until all your equipped attack skills are different elements.
  - The Silent Tide: takes no damage while any enemy is moving. Stand still when it charges.
  - Hollow Sovereign: needs three weak points hit in a fixed order, shown by faint glows.
  - Eclipse Warden: only vulnerable at night phase; break its lantern to force night.
  - Chain of Ten: dies only if ten different skills hit it within 20 seconds.
  - Paradox Monk: reflects the first skill type you use; use a new type each time.
  - Stormbreaker: immune until you destroy four pylons across the map within one minute.
  - Ledger Beast: wounds heal fully unless you trade (give away) a skill into its offering circle first.
  - Echo Twins: both must die within 3 seconds of each other.
  - The Last Star: invulnerable until your team holds the hill for 60 seconds.
- A beaten criteria boss can drop its unique skill if that skill is currently in the world. If it is already owned, the drop becomes a high-rank S skill.

---

## 7. Story mode

- Isekai-style prologue: you are a nameless slime-orb in a ruined arena world, and your first skill lets you devour the skills of monsters you defeat.
- 8 chapters at first (about 12 stages each). Each stage has underlings, then a mini-boss, then a boss. Bosses appear in stages, and special legendary monsters appear at random.
- Chapter rewards: skills of a rank that rises each chapter, Crowns, cosmetics, story-only titles.
- Stages use the generated maps (section 9) and the same skill engine, so the story trains you for ranked play.
- Co-op story (2 players) is a later add-on.

---

## 8. Open world

- A shared overworld, one instance per region and about 20 players, with biomes (meadow, ruins, swamp, ice, volcano, shadow forest, sky ruins).
- Roaming monsters, camps, treasure, **boss dens** and **legendary monsters that spawn at random times** and are announced on the world feed.
- Loot: coins, skills, crafting fragments, cosmetics. Legendary monsters drop rank S items.
- World skills work here (Scout, Loot Magnet, Teleport Home, Appraise).
- Safe hub town with the auction hall, trader, skill forge, Hall of Uniques, champion statue and the global board.
- Shared kills split loot by contribution, to avoid steal-the-boss griefing.

---

## 9. Maps (at least 25, always varied)

- 25 hand-tuned templates across themes, plus a **seeded generator** that mixes rooms, corridors, pillars, lava, water, bridges and moving hazards. The same seed always gives the same map, so every player in a match sees the same arena.
- Ranked maps are mirrored for fairness. Story and open-world maps are asymmetric.
- All maps are unlocked from the start (as you asked), with no level gate. Playing them earns map mastery stamps for cosmetic rewards.

---

## 10. Social: chat, notifications, trade

### Chat

- In matches: **quick-chat and emotes only** (no free text), which avoids moderation problems and works for all languages.
- In the hub, world and trade hall: text chat with a profanity filter, rate limits, mute and report, a chat-off setting, and respect for the CrazyGames `disableChat` flag. If CrazyGames complains, chat can be switched off completely.
- Direct messages only between friends or people who trade with each other.

### Notifications and the world feed

- Live ticker: "X got the unique skill Y", "Z defeated the Champion", "A legendary monster appeared in the Ice Biome", "Skill Y is now for sale".
- Inbox for personal events: outbid, auction won, trade offer, friend invite, season rewards.
- You choose which events appear.

### Trading and the Auction Hall

- Skills are sold only for Crowns (see section 2).
- **Auction Hall:** timed English auctions with a starting price, minimum raise, buy-now and an anti-sniping extension. Rarity sets the minimum start price band and the listing fee.
- **Occasions:** weekly Grand Auction, season-end auctions and festival auctions with featured lots. Each is announced worldwide.
- **Fees:** 5% to 10% of the sale price is burned. This keeps Crowns from inflating.
- **Hall of Uniques:** a public list of unique skills and owners. You can open the owner's profile and send an offer or message.
- **Safety:** the server holds the skill and the bid in escrow. Both transfers happen in one database transaction. Full trade history, price history charts, and a cooldown on newly received skills reduce scams. Bound skills (starter-grade, quest rewards) cannot be traded.

---

## 11. Frontend and design (the biggest quality gap today)

Problem today: the UI is hand-built DOM with default-looking controls, the characters are plain circles, and the screens do not feel like a game.

### 11.1 Art direction (DECISION)

Recommended: **neon anime fantasy.** Glowing creature-orbs, vivid gradients, bold outlines, big readable UI, soft particle FX. Alternatives: cute slime world, dark fantasy.

### 11.2 Design system

- Design tokens (colors, spacing, radius, shadows), a type scale, components (button, card, tab, modal, toast, tooltip, progress bar, skill card, rank badge, currency pill).
- **Fonts:** several bundled free fonts (open licenses, self-hosted, no external requests) for display, UI and number text. Players pick a **name style** (font, color, effect).
- Skill cards in rank colors (F grey, E green, D blue, C teal, B purple, A orange, S gold, U animated rainbow), with an icon, name, rank, level and mastery.
- Responsive layout for 16:9 desktop and landscape phones. Large touch targets.
- Smooth animations: panel slides, count-up numbers, reward reveals, card flips, wheel and draw effects.

### 11.3 Characters (not only a bubble)

- A layered avatar: **body form** (orb, slime, cat, fox, robot, ghost, dragon whelp, mushroom, star, and more), **face/expression**, **eyes**, **hat/ears/horns**, **aura**, **trail**, **kill effect**, **victory pose**, **title**.
- Drawn in code with vector shapes plus free CC0 art where it helps, so the download stays tiny.
- Forms can be unlocked by story, ranked tiers, events and the shop.

### 11.4 Emotes and emoji

- An emote wheel of about 40 emotes. A bundled emoji sprite sheet from an open-licensed set (credit needed), plus custom animated emotes.
- Players choose 8 equipped emotes. Emotes show above the character and can be used in matches.

### 11.5 Screens to design and build

Splash and loading, home hub (character stage, quick actions, news), skill collection (filters, search, sort by rank, category, element), skill detail (stats, mastery, history), loadout editor (5 slots, presets), fusion lab, draw and reward reveal, shop, auction hall, Hall of Uniques, ranked lobby and draft, match HUD, results with MVP and rating change, story map, open-world HUD with minimap, profile (K/D, wins, win rate, rating, favorite skills), leaderboards, crews, settings, tutorial.

### 11.6 How to get there

- Build the design in **Figma first** (screens and components), then implement from it. **DECISION:** do you have a free Figma account? If yes, I can generate designs and implement them from the file.
- Rebuild the UI with a small component library (Preact) so screens are consistent and fast. Keep Phaser for the world and match rendering.
- Add polish systems: screen shake, hit pause, damage numbers, skill cast telegraphs, camera zoom, ambient music and layered SFX.

---

## 12. Architecture and backend

### 12.1 Services

- **Game servers** (Colyseus, as today): `ArenaRoom` (ranked, casual), `WorldRoom` (open world), `BossRoom` (raids), `DuelRoom` (champion). All are server-authoritative.
- **API server** (Node) with a database: accounts, inventory, skill instances, fusion, auctions, trades, ratings, leaderboards, chat, notifications.
- **Real-time channel** for the world feed, auction updates and chat (WebSocket).

### 12.2 Accounts

CrazyGames login token (verified on the server). Guests get a local profile and cannot hold unique skills or trade. No other login option.

### 12.3 Free-tier plan for the beta

- Game and API server: Render (as today). The Starter plan keeps it awake.
- Database: a free hosted Postgres (for example Neon or Supabase). Free tiers have size and activity limits, so they suit a beta, not a launch with thousands of daily players.
- Cache and queues: in-process at first, a managed cache later.
- **DECISION:** are you fine with signing up for one free database account?

### 12.4 Data model (outline)

accounts, profiles, skill_instances (owner, skill id, rolled stats, level, mastery, bound flag), unique_registry (skill id, owner, since), loadouts, fusions, auctions, bids, trades, ledger (every Crowns movement), matches, ratings, seasons, leaderboard snapshots, chat_messages, reports, notifications, bounties, crews.

### 12.5 Security and fairness

All ownership and currency changes happen on the server in database transactions, with an append-only ledger for audits. Rate limits, input validation, idempotency keys on trades and bids, and bans. The browser can never grant itself skills or coins.

### 12.6 Engine changes

- Move the `Sim` to a data-driven skill engine: archetype code plus element and modifier data, per-skill cooldowns, status effects (burn, slow, stun, shield, mark, bleed), projectiles with properties, summons and areas.
- 5-slot input for keyboard and touch.
- Deterministic generation of any skill from its id.
- Bots get skills and use them with the same rules, scaled by difficulty. Criteria bosses are scripted behaviors with a visible condition.

---

## 13. Stats, ranks and progress tracking

Per account: K/D, win/loss, win rate, rating and tier, best streak, damage dealt, per-mode stats, per-skill usage and mastery, collection score, boss kills, auction profit, champion history, playtime.
Per match: full history with skills used, shown on the profile and used for anti-cheat review.
Global boards: rating, wins, kills, collection score, richest, boss slayers, top auction trades, champion hall of fame.

---

## 14. Other systems worth adding

- **Crews** (guilds): shared goals, crew chat, crew wars on the ladder.
- **Bounty board:** high kill streaks put a bounty on your head, paid in Crowns to whoever beats you.
- **Achievements and titles.**
- **Events:** weekend double-drop, themed maps, limited skill banners.
- **Replays** of ranked finals.
- **Spectate** a friend or the champion duel.
- **Localization** starting with English, ready for more.

---

## 15. Build order (each phase ships and is tested on its own)

| Phase | Scope                                                                                                                                                                                        | Size |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **0** | Bots fixed, tests (done). Art direction and Figma designs agreed                                                                                                                             | S    |
| **1** | New frontend: design system, hub, skill cards, avatar parts, fonts, emote wheel, polish                                                                                                      | XL   |
| **2** | Skill engine v3: archetypes, elements, modifiers, 5-slot loadout, ranks, levels, mastery, bot skills, 100 unique skills, procedural skills for ranks F to S. Works offline with a local save | XL   |
| **3** | Backend and accounts: database, token verification, server-side inventory, starter pack, 1% unique, daily skills, auto-merge, weekly fusion                                                  | L    |
| **4** | Maps (25 plus generator), story chapters, stage bosses, legendary monsters                                                                                                                   | L    |
| **5** | Open world: hub town, biomes, boss dens, loot, world skills                                                                                                                                  | XL   |
| **6** | Ranked 2v2: matchmaking, ratings, draft, power budget, seasons, leaderboards, stats pages                                                                                                    | L    |
| **7** | Champion Majen, criteria bosses, Crown Challenge                                                                                                                                             | M    |
| **8** | Social: chat, world feed, notifications, Hall of Uniques, Auction Hall with Crowns, trade safety                                                                                             | XL   |
| **9** | Crews, bounties, events, replays, spectate                                                                                                                                                   | L    |

Rough effort (sizes: S about 1 session, M 2 to 3, L 4 to 6, XL 7 to 12 working sessions). This is 50 to 80 sessions in total, which fits your "hundreds of hours" budget. Phases 1 and 2 give the most visible improvement and can ship before any backend exists.

CrazyGames review: each big release goes through their QA. Chat, trading and uniques will be checked, so Phase 8 is submitted last and with moderation in place.

---

## 16. Decisions needed from you

1. **Real money:** agree that skills trade for Crowns only, with no cash-out?
2. **Starter skills:** bound "Starter-grade" S to D skills (recommended), or real S for everyone?
3. **Rank counts:** confirm B 30k, C 30k, D 20k, E 12k, F 12k (about 115k total) or change.
4. **Weekly merge:** auto-merge of duplicates is free and automatic; manual fusion once a week. Right?
5. **Art direction:** neon anime fantasy (recommended)?
6. **Figma:** do you have a free account to design the new UI?
7. **Database:** OK to sign up for one free hosted Postgres account for the beta?
8. **Champion:** keep the name "Majen"?
9. **Where to start:** Phase 1 (new frontend) first, then Phase 2 (skill engine)?

---

## Appendix A: 100 unique skills

Each is a one-of-a-kind skill. Names are placeholders to refine.

### World-changing (out of battle) 1 to 10

1. Skill Genesis: create a custom skill from three owned skills.
2. Infinite Fusion: no weekly fusion limit.
3. Appraiser's Eye: see exact rolls and fair price of any skill.
4. Merchant King: no auction fees and see hidden reserve prices.
5. Fortune Loom: better luck on drops, draws and loot.
6. Skill Forger: reroll one stat of an owned skill each day.
7. Soul Ledger: unlock a sixth loadout slot.
8. Vault Warden: your skills cannot return to the world through inactivity.
9. Echo Archive: copy the look of any skill you have seen as a cosmetic.
10. Time Weaver: one extra daily claim and one extra weekly fusion.

### Attack 11 to 25

11. Worldsplitter: a beam that cuts the arena in half for 3 seconds.
12. Meteor Verdict: marks a target, then a meteor lands there.
13. Thousand Thorns: thorns burst out of every wall in line of sight.
14. Dragon's Last Breath: a huge cone that gets wider each kill.
15. Starfall Sovereign: homing stars from above, one per second.
16. Gravity Maw: pulls everyone to a point, then explodes.
17. Crimson Eclipse: each hit steals life and grows the beam.
18. Phantom Cannon: a shot that passes through walls.
19. Tempest Crown: a chain of lightning that never ends while you keep hitting.
20. Quake Titan: slams the ground, creating moving walls.
21. Blood Moon Lance: a piercing lance that returns to you.
22. Solar Judgment: charges for 3 seconds, then fires one huge shot.
23. Omega Barrage: 30 shots across the screen.
24. Chrono Bullet: bullet that rewinds the target 3 seconds.
25. Void Spear: ignores shields and invulnerability.

### Defence 26 to 37

26. Unbreakable Bastion: a fortress wall that absorbs 10 hits.
27. Mirror Aegis: reflects all bullets for 3 seconds.
28. Immortal Oath: survive one lethal hit per match with 1 HP.
29. Phoenix Veil: revive once with full HP.
30. Rune Barrier: a rotating shield that blocks any one attack per second.
31. Thorn Mantle: attackers take damage when they hit you.
32. Stoneheart: huge HP, very slow.
33. Soul Anchor: cannot be knocked back or pulled.
34. Dimensional Cloak: shots pass through you while you stand still.
35. Cursed Plate: take less damage the lower your HP.
36. Sanctuary Field: allies inside the field cannot die.
37. Ironwill: immune to slows and stuns.

### Support 38 to 47

38. Angel's Choir: heals the team each second.
39. War Banner: allies gain speed and damage in a field.
40. Lifeline: share your HP with an ally.
41. Rally Cry: revive a fallen ally instantly.
42. Blessing of Haste: your team's cooldowns drop 30%.
43. Prism Link: share your best buff with your team.
44. Cleansing Rain: removes all negative effects from allies.
45. Shepherd's Light: guides allies and reveals hidden enemies.
46. Mana Spring: refund cooldown of an ally's skill.
47. Guardian Spirit: an ally takes your next hit.

### Shadow 48 to 59

48. Night Dancer: invisible while moving in shadows.
49. Silent Execution: huge damage from behind.
50. Umbral Clone: leaves a shadow double that fights for you.
51. Shadow Step: teleport to any enemy's shadow.
52. Eclipse Grip: roots all enemies near you in darkness.
53. Dusk Blade: slices through an enemy's shield.
54. Whisper of Fear: enemies in view cannot use skills for 1 second.
55. Black Mirror: swap places with a target.
56. Nightfall: darkens the arena; only you see clearly.
57. Assassin's Mark: marked target takes triple damage.
58. Phantom Hunt: you vanish, then reappear next to your mark.
59. Lord of Silence: nearby enemies cannot hear or use emotes.

### Weapon 60 to 71

60. Excalibur Orb: a sword of light that grows with kills.
61. Thousand Blades: orbiting blades protect and strike.
62. Hellfire Gun: a rapid-fire cannon that overheats.
63. Storm Bow: arrows split on impact.
64. Executioner's Axe: instant kill under 20% HP.
65. Scythe of Souls: collects souls to power other skills.
66. Gravity Hammer: smashes and pulls targets in.
67. Chain Whip: grabs and drags a target.
68. Twin Fangs: two daggers that return.
69. Glass Katana: one hit kills, but breaks on first block.
70. Plasma Lance: charges through enemies.
71. Siege Cannon: shots destroy walls.

### Boost 72 to 81

72. Overclock: all stats up for 8 seconds, then exhausted.
73. Berserker Core: damage grows as HP falls.
74. Hyper Dash: infinite dashes for 5 seconds.
75. Focus Mind: slow time around you for 4 seconds.
76. Giant Form: bigger, tougher, slower.
77. Tiny Terror: smaller, faster, harder to hit.
78. Adrenaline Wave: kill refunds all cooldowns.
79. Lucky Star: critical hits are doubled.
80. Warrior's Pride: stronger with each ally nearby.
81. Final Form: all stats up when you are the last one standing.

### Summon 82 to 89

82. Spirit Wolf: a wolf that hunts the nearest foe.
83. Orb Legion: five mini-orbs fight beside you.
84. Dragon Whelp: a young dragon that breathes fire.
85. Golem Guardian: a tank that blocks shots.
86. Phoenix Familiar: heals you over time.
87. Slime King: splits into smaller slimes when hit.
88. Turret Swarm: deploys three auto-turrets.
89. Ghost Army: summons phantom fighters that explode.

### Control, Space and Time 90 to 100

90. Time Stop: freezes everyone but you for 2 seconds.
91. Rewind: return to your position and HP from 4 seconds ago.
92. Black Hole: a slow hole that drags enemies in.
93. Spatial Cut: opens a portal pair.
94. Domain Expansion: a zone where only your skills work.
95. Mind Swap: control an enemy for 2 seconds.
96. Gravity Well: pulls bullets toward a point.
97. Banish: removes a target from play for 3 seconds.
98. Dimensional Lock: no teleports or dashes for anyone nearby.
99. World Reset: restore the arena and everyone's cooldowns once per match.
100.  Skill Devourer: take a random skill from a defeated enemy for the rest of the match.

---

## 17. Owner decisions (confirmed) and added systems

### 17.1 Decisions confirmed

1. **Money:** skills are bought, sold and bid on only with in-game money (**Crowns**). Betting also uses Crowns only. No real-money cash-out.
2. **Starter pack:** no guaranteed S or A. Every new player gets **one skill each of rank B, C, D, E, F** (real, tradable skills).
   Lucky upgrades on that first pack (each rank slot rolls independently, and only the best result counts):
   | Result                                                                                 | Chance         |
   | -------------------------------------------------------------------------------------- | -------------- |
   | A rank instead of B                                                                    | 1 in 1,000     |
   | S rank instead of B                                                                    | 1 in 100,000   |
   | Unique (U) instead of B                                                                | 1 in 1,000,000 |
   | Rolls happen on the server. The unique can only be won while uniques remain unclaimed. |
3. **Rank counts:** B 30k, C 30k, D 20k, E 12k, F 12k (about 115k definitions).
4. **Fusion:** duplicate skills **auto-merge every time**. Manual fusion is **once per week**.
5. **Art:** original artwork. Direction is neon anime fantasy (see the Figma file).
6. **Figma:** connected. Designs live in Figma file `4VNOhvP13EGDnxffpeJ0pC` (Orb Arena - Skill World UI).
7. **Database:** a free hosted Postgres for the beta, upgraded when income arrives.
8. **Champion:** Majen. Anyone who qualifies can challenge him.
9. **Order:** the owner left it to me: Phase 2 (skill engine) and Phase 1 (new UI) run side by side, using the Figma designs.

### 17.2 Character stats, levels and penalties

- **Base stats:** HP, MP, ATK, DEF, SPD, MAG (skill power), LUCK (drop and draw luck).
- **Level up:** each level adds base stats and 3 free points to spend. Level cap 100 at first. EXP comes from kills, assists, objectives, bosses, quests and first-time discoveries.
- **MP:** every skill costs MP. MP regenerates slowly, faster out of combat. Potions and support skills restore it. The MAG stat scales skill power.
- **Defeat penalty (never harsh enough to feel bad):**
  - Ranked: only rating changes.
  - Casual and story: you lose some progress toward the next level (never a level), and a small amount of EXP boost for the next match.
  - Open world: you drop a small share of carried coins in a pouch that others can loot for a short time. You never lose skills.
  - A Revive Token (earned or bought with Crowns) cancels the penalty.

### 17.3 Skill stats (every skill has all of these)

Power, MP cost, **cast time** (activation), **cooldown**, range, area, duration, projectile speed, charges, status chance (burn, freeze, stun, bleed, mark), scaling stat (ATK, MAG, SPD), element, category, rank, level, mastery.
Skills can have passive effects and combo tags (for example Star + Gravity).

### 17.4 Skill families (all from original designs)

- **Weapons:** swords, guns, bows, hammers, spears, stones, missiles, bombs, drones.
- **Armies and summons:** zombie hordes, skeleton legions, spirit wolves, golems, drone swarms, dragon whelps, mech squads.
- **Elements and nature:** fire, water, ice, wind, earth, lightning, light, shadow, poison, metal, plants.
- **Space, time and mind:** time skip, time stop, rewind, gravity, portals, illusions, telepathy.
- **Magic:** curses, blessings, runes, summoning circles, barriers, spells of every school.
- **Myth-inspired god powers** (public-domain mythology): Greek (thunder, sea, underworld, sun chariot), Indian (celestial weapons, storm lord, destroyer's dance, divine bow), Norse (hammer, wolves, rainbow bridge), Egyptian (sun disk, desert sands, judgment scales), Japanese (storm and moon spirits), Chinese (dragon kings, monkey staff), Celtic, Aztec, Slavic and more. Names of gods are free to use. Their powers become original skill designs.
- **Tech and AI:** robots, mech armor, nanobots, hacking, drones, laser grids.
- **Hero-style abilities** written as original powers: armored inventor suit, super-soldier boosts, shapeshifting, energy bursts, mutant-style abilities. Original names and looks only.
- **Companions:** tameable creatures from boss drops (a creature-collecting system with original monsters).
- **Boosts, support and defence:** every classic RPG buff and shield.

### 17.5 What I will not copy

Pokemon, Marvel, Disney and other franchise characters, names, logos and designs are trademarked and copyrighted. CrazyGames requires original content and I cannot use them. The game gets the same _feelings_ (creature collecting, armored genius, team of heroes, mutant powers) with original names and art. Real mythology, history and public-domain legends are fine.

### 17.6 Sound and music

- Original, free and CC0 sources only, or generated in code (WebAudio). Credits page lists any attribution.
- **Music:** hub theme, open-world themes per biome, ranked theme, boss themes, champion theme, victory and defeat stings, layered so the music intensifies in fights.
- **SFX per skill:** each element has a signature sound family (cast, travel, impact). Cast telegraphs have a distinct "charging" sound, so players can hear **activation time** and react. Cooldown-ready ping. UI sounds for every button, reveal and trade.
- Mute and volume sliders for music, effects and voice cues. Honors the CrazyGames `muteAudio` setting.

### 17.7 The shared world (Plaza)

A big social hub where everyone can show off: practice dummies with damage meters, skill showcase stages, an emote square, duel rings with spectators, the Hall of Uniques, the champion statue and the Auction Hall. Players can display their equipped skills and titles above their heads.

### 17.8 Design files (Figma)

File: https://www.figma.com/design/4VNOhvP13EGDnxffpeJ0pC
Exports are in `docs/figma/`:

- `style-guide.png`: colors, rank colors, elements, type, buttons, bars.
- `skill-cards.png`: the Skill Card component with 8 rank variants.
- `home-hub.png`, `skill-collection.png`, `loadout.png`, `auction-hall.png`, `match-hud.png`.
  Still to design: ranked lobby and draft, avatar customization and emote wheel, story map, open-world HUD, profile and leaderboards, crews, settings, loading screen.

---

## 18. Starforge theme, fonts, champion and bosses (built)

The first UI was a plain dark panel set. It has been replaced by a custom theme named **Starforge**:

- **Look:** cosmic indigo backdrop with stars and nebula glow, ornate gold corner frames on every panel, gold-and-cyan beveled buttons, a gold crown-style Quick Play button.
- **Fonts (all open license, bundled in the game, no external requests):**
  - **Cinzel** (display): the title, headings, boss and skill names, timer.
  - **Rajdhani** (UI and numbers): buttons, labels, stats, HUD.
  - **Bangers** (impact): in-match "HIT!" and "K.O.!" pops and announcements.
- **Characters have faces:** eyes that follow the aim direction, blinking, a smile, and a worried face at low HP. Every character has an accessory: Nova a halo, Bolt a lightning antenna, Titan a helmet band, Viper horns, Ghost a wavy tail, Medic a red cross, Sniper a scope.
- **Champion Majen** appears on the main menu in his own card and in the Bestiary: a charming crowned golden orb with a red cape.
- **Bestiary page** with Majen and eight bosses, each with lore and a hint:
  Hollow Sovereign (ghost king), Mirror King (crystal monarch), Stormbreaker (storm giant), Eclipse Warden (one-eyed lantern keeper),
  Hydra of Ten Chains, The Gilded Maw (gold glutton), Echo Twins (dancing sisters) and The Last Star.
  The art is original vector SVG, authored once in `client/src/art/bestiary.ts` and imported into Figma as editable vectors.
- **Figma:** page "Bestiary (Starforge)" has the theme board (fonts, palette, buttons) and the Bestiary sheet. Exports: `docs/figma/starforge-theme.png` and `docs/figma/starforge-bestiary.png`. Art files: `docs/art/*.svg`.

Not built yet: boss fights themselves (needs the open-world and boss-room phases), the champion duel, and the remaining screens listed in section 17.8.

---

## 19. Skill engine core (built, not yet connected to matches)

Location: `shared/src/skills/`. Pure TypeScript, so the same rules run offline, in the browser and later on the server. 22 tests.

| File           | What it does                                                                                                                                                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.ts`   | Ranks F to U, 10 categories, 54 archetypes (the mechanics), 12 elements, 80 modifiers (8 twists x 10 strengths), base stats per behavior kind                                                                                                                                                              |
| `generate.ts`  | `getSkill(id)` builds any of the 115,000 generated skills from its id. A reversible mapping makes every skill a distinct archetype + element + modifier inside its rank, and lets fusion find an id from parts                                                                                             |
| `uniques.ts`   | The 100 unique skills as data, the 10 world-changing perks, and `UniqueRegistry` (one owner, trade, reincarnation after 60 inactive days, Hall of Uniques list)                                                                                                                                            |
| `instances.ts` | Rolled stats per owned copy, automatic duplicate merging (levels 1 to 20), mastery (10 levels), effective stats, weekly fusion (with rank-up chance), 15 secret recipes that create uniques, the starter pack and luck odds, drop tables per source, 5-slot loadout validation and the ranked power budget |

Rank counts: S 1,000, A 10,000, B 30,000, C 30,000, D 20,000, E 12,000, F 12,000 (115,000 generated) plus 100 unique.

Starter pack: one each of B, C, D, E, F. Luck on the first pack: A about 1 in 1,000 (tested), S 1 in 100,000, Unique 1 in 1,000,000 (and only while uniques remain unclaimed).

Names are unique within a rank. The UI always shows the rank badge, so the same adjective-element-mechanic name can appear at two different ranks.

Next step (Phase 2b): connect the engine to the match simulation (one behavior per kind), 5-slot input, bots that carry and use skills, and the Collection and Loadout screens with a local save.

## 20. Skill World update (built)

What is in the game now:

- **Skills in matches.** Five skill slots (keys 1-5, Space and E still work), mana, cast times and cooldowns. All 20 skill kinds work: shots, beams, volleys, novas, swings, shields, barriers, heals, auras, buffs, stealth, ambush, pets, mines, pull, slow, dash, blink and portal. Element effects (burn, poison, slow, knockback, pull) apply on hit. Bots carry five skills each.
- **Skill collection.** Starter pack (one B, C, D, E and F skill), one free skill a day, drops after matches and levels, automatic merging of duplicates, weekly fusion. Pages: Skills, Loadout (5 slots, power budget 3300) and Fusion Lab.
- **25 arenas.** The 6 hand-made arenas plus 19 new mirrored arenas (`shared/src/mapsExtra.ts`). A test checks that every open spot of every arena can be reached and bots do not get stuck.
- **Boss Tower.** Nine floors: the 8 bosses from the Bestiary, then the champion Majen. Each boss has its own HP, colour and five unique skills (`shared/src/bosses.ts`). Opens after campaign level 6. First clears pay a boss skill drop.
- **2v2 Ranked.** A separate `ranked` room on the server (four seats, team battle, rotating arenas, bots fill empty seats). Elo rating with tiers Bronze to Starforged, saved on the device. Every fifth ranked win pays a ranked skill drop.
- **Market.** A broker that sells 8 skills a day and buys your skills, for coins only. Starter skills are bound and cannot be sold. Uniques are never sold.
- **Quick chat.** 12 preset lines (no free text, so nothing to moderate). Press T or the chat button. Hidden when CrazyGames turns chat off. The server rate limits it.
- **Music.** An original generated music loop (no audio files), calm in menus and brighter in matches. The mute button mutes it too.

Still needs a backend (accounts and a database), so it is not built yet:

- Saving skills and rank on a server, so the same account works on every device and nobody can cheat.
- Real player-to-player auctions and trading (today the market is a broker).
- A worldwide ranked ladder (today the rating is saved on the device).
- The shared open world (Plaza) with many players.
- Unique skills owned by only one player in the world.

CrazyGames rules do not allow a separate login. The backend must use the CrazyGames user account (their SDK gives a user token) and a free database such as Postgres on a free tier.

## 21. Fixes and CrazyGames compliance (built)

- **Chests:** every won round pays a Wooden Chest (Silver every 5th win). Every campaign win pays a chest (Silver on the first clear, Wooden on replays). Every Boss Tower win pays one too (Gold first, Silver on replays). Majen pays a Legend Chest. A ranked duel win adds a Silver Chest.
- **Champion:** anyone can challenge Majen from level 1.
- **Fresh start:** the save key changed, so all local progress started over. The Profile page also has a Reset button.
- **Unique names:** the server checks names live while you type (3 to 16 letters, digits, _ or -, case-insensitive, offensive and reserved names are refused). Renaming is in Profile.
- **Skill details:** tap any skill card for damage, power, cooldown, mana, cast time, range, area, duration, your copies and level progress, the rolls, and whether it works in arena battles and duels.
- **Profile:** stats, loadout, passive bonuses, world rank, the world ranking table, how points work, and every skill you own grouped as starter, battle and out-of-battle.
- **Merging:** about 35% of drops are now copies of skills you own, so merging happens often. Each new or merged skill shows an animated card with the copies bar filling up and "LEVEL UP" when the level rises.
- **Layout:** in matches the skill buttons sit in a bar below the arena (on touch devices, a strip on the right), so they never cover the fight.
- **Respawn:** while you wait you see your respawn spot ("YOU RESPAWN HERE"). Enemies see nothing until you are back. You are protected for a moment after respawning.
- **Ranked duel:** fill opponents have normal player names. There is a separate duel loadout with duel-legal skills only, and your real owned skills are used.
  - Moves: a three-hit punch combo (jab, cross, uppercut), kick, flying kick in the air, low sweep that knocks down, and a strike for each weapon: blade slash, scatter blast, rail thrust, buzz flurry, unblockable mortar slam, twin strike.
  - Skills hit according to their real power and rank. Each skill has its own look (6 styles, varied points and spin, element colour) and grows with rank and power.
- **World ranking:** real players only. The server keeps the Elo ratings, updates them after every ranked duel and sends you your new rating and world rank.
- **Guilds:** create (name plus 2 to 4 letter tag), join and leave, up to 30 members. Guild power is the total of the members' ratings, and there is a world guild ranking.
- **Lucky Draw:** the wheel now stops on the prize you won. The Skills wheel has only skill prizes, and every wheel lists its odds.
- **CrazyGames rules:**
  - New players land straight in a tutorial match, with zero clicks.
  - "Create your fighter" comes after the tutorial and has a Quick start.
  - The controls are shown as keyboard keys.
  - Escape is not used (it closes fullscreen). P pauses and X toggles auto.
  - AZERTY (ZQSD) works.
  - Touch controls use the CrazyGames device type.
  - The bottom bar is smaller on small screens.
  - A privacy note explains the stored name and rating.
- **Skill descriptions:** they are readable sentences now, for example "Shoots a toxin laser that hits everything in a line that poisons enemies over time."

## 22. Skill World v3 (built)

- Campaign: 8 maps x (10 single enemies + that map's bestiary boss) = 88 levels, one enemy at a time, no time limit. Lose when your HP hits 0. Stars from HP left: >75% = 3, >50% = 2, any win = 1. Difficulty rises 0.15 -> 0.85. Each map has an arena effect (storm, toxic, void, fire, dark, snow) and an element bonus. Map star milestones at 10 / 20 / 33 stars. Bosses drop their own uniques (12% first clear, 2% replay).
- Level cap 1000; every level raises HP, MP, attack, defence, special attack, speed, reload and aim. Level-up panel shows the gains.
- Gear: 8 slots x 30 designs x 12 colours x 8 ranks = 23,040 items with stat buffs (U = 10x F), plus 10,000 cosmetic accessories. Gear stock in the market; market refresh costs 100 x (refreshes today + 1).
- Trails and bullet styles give buffs. Characters have avatar icons.
- Summons: 768 creatures (beasts, robots, dragons, animals, fish, mermaids, drones...), eggs, upgrades to level 50, skill cards. Not used in ranked.
- Lucky draw: 6 wheels; 1, 10 or 100 spins; prize cards appear after the wheel stops. No uniques on wheels.
- Fusion: fixed recipe per pair (order does not matter), never lower than the best parent, same-rank 20% rank-up, S+S 3% unique. One free per week, then 1 stone + 500 coins.
- Encyclopedia of every skill with how to get it.
- Ranked: arena deathmatch 1v1 (120 s) and 2v2 (150 s), separate ratings, tier leaderboards. Shadow duel stays as an unranked mode. World score = rating + rating2 + level; holding a bracket 30 days pays U / S / A / B / C / D.
- Max 4 players in every format. Slower game, skills hit 2x, skill name banner + voice, target lock (right-click / Tab).
- Guilds: 5 members, guild level, class buffs (Harmony for 5 classes, Legion for 5 of one class), shown in the lobby; daily raid boss; 5v5 guild war room.
- Majen: challenge from level 50; battle pauses on each form change and shows the new stats; final form is a golden dragon.
- Not built: champion replacement shared across all players (local only), real guild-vs-guild wars need two online guilds to test.

## 23. Real art, merged pages, auction (built)

- Art packs (free): Fluent Emoji Flat (MIT, Microsoft) and game-icons.net (CC BY 3.0, credited on the menu). `scripts/gen-art.mjs` extracts only the used pictures into `client/src/art/packs.gen.ts`.
- Character engine (`art/hero.ts`): full-body heroes per character (body, skin, face, hair) dressed in the equipped gear: armour, pants, shoes, gloves, hat, bag, weapon and vehicle each change the look (design = shape, colour = paint, rank = trim and glow). Bots get random outfits. Players and bosses are sprites in the arena (`game/sprites.ts`); gear syncs as `look`.
- Bosses change shape per form: bestiary figure grows and changes tint, final form is a monster; Majen's final form is a gold-repainted dragon. The whole battle freezes during a form change.
- Summons: real creature art; bigger with level, aura at 10, sparkles at 25, crown at 40, golden halo at 50. In battle they chase and attack enemies.
- Skill animation engine (`art/skillanim.ts`): a motion per skill kind plus a motif per element; uniques are 2.4x bigger with screen shake.
- Campaign map (`meta/worldmap.ts`): a different route, scenery, ground and weather per world, boss portraits, 3 gifts per world.
- Pages: Hero (Loadout + Gear + Profile, with a character preview), Skills (Collection + Fusion + Encyclopedia), Shop & Market (Shop + Market + Auction). Six separate wheel pages.
- Auction house (`meta/auction.ts`): 4 lots every 20 minutes against bot bidders with hidden limits.
- Campaign: enemies scale with player level, bosses far above; 2 min per enemy, 5 min per boss, time-up decided by HP %. Majen from level 1.
- 8 new uniques (108 total) with new effects: execute, HP drain, meteors, plus stronger nocd / venom / rage / stun / silence.
- Fusion stones drop from every match, level, boss, chest, map gift and the wheel.
