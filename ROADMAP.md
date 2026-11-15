# Orb Arena: roadmap to the big version

Version 1 (current) is a simple 8 player arena with bots. Every stage below ships as a new build and keeps working
without the next stage. Data-driven content (JSON/TS tables) is the base for everything: powerups, skills,
characters, maps, quests and rewards are entries in tables, not new code each time.

## Rules that shape the plan

- CrazyGames wants a game that is quick to understand. Each stage must keep "Play" to gameplay in one click.
- Anything that changes combat (powerups, skills, characters) must be decided by the server, never the client.
- Saves: CrazyGames Data module for logged-in players, localStorage for guests. For competitive items (ranked, trading)
  we need our own database and CrazyGames user token verification. Plan for it in stage 5, not before.
- Ads (rewarded and midgame) only after CrazyGames moves the game to Full Launch. The wrappers already exist.
- Lucky draw uses free in-game currency only. No real money, no paid loot boxes. Check CrazyGames rules before building it.
- "1000 powerups" is built as about 25 base effects x rarity tiers x modifiers (for example Shield, Shield+, Shield of Fire),
  which gives hundreds of distinct items without hundreds of scripts. Quality over raw count.

## Stage 1: Retention basics (1-2 weeks)

- Coins earned per kill, per round and per win. Coins counter in the HUD and on the scoreboard.
- Daily login reward (7 day streak) saved with the SDK Data module.
- Cosmetics shop: orb colors, trails, bullet effects (client side only, no combat effect).
- Better feedback: screen shake, hit sounds, kill streak banners.
- Tutorial hint polish, first-match guidance.

## Stage 2: Powerups and skills

- Arena pickups (server spawned): shield, speed boost, triple shot, heal, mine, freeze, magnet, bomb, slow field, etc. Start with 10.
- Active skills with cooldown (dash, shield bubble, pulse, mine). Players equip 2 before a match.
- Characters: orb types with different HP, speed, fire rate and one passive trait.
- Powerup rarity and modifiers (the "1000 items" table).
- Balance pass using bot-vs-bot simulations (the shared `Sim` makes this testable and fast).

## Stage 3: Progression

- XP and player levels, unlocks per level.
- Daily and weekly quests (for example "get 20 kills", "win 3 rounds").
- Lucky draw: free daily spin, extra spins from rewarded ads (Full Launch only), prizes are coins, cosmetics, powerup shards.
- Season track with rewards.

## Stage 4: Arenas, modes and levels

- Several arena maps (obstacle layouts, hazards, moving walls). Maps are data.
- Modes: Deathmatch (now), Team Deathmatch, King of the Hill, Coin Rush (collect coins on the map), Survival.
- Single player "Quest levels": campaign vs bots with objectives, stars and boss orbs. Runs on the same `Sim`.
- Arena select page and mode select page.

## Stage 5: Accounts, ranked and social

- Our own database (for example Postgres on Render) and CrazyGames user token verification.
- Ranked mode with ELO, leaderboards (SDK leaderboard submit), match history.
- Friends: invite links already exist. Add party flow and rematch.

## Engineering work this needs

1. Move powerup, skill, character, map and quest definitions into `shared/src/content/` tables.
2. Extend `Sim` with effects, cooldowns, modes and map selection. Keep it pure TypeScript so tests stay fast.
3. Add an economy module on the server for coins, rewards and the lucky draw. Rewards are granted server side.
4. Client UI pages: shop, loadout, quests, daily reward, lucky draw, arena select. Keep them skippable and light.
5. Keep the first load small. Lazy-load pages. The zip stays far below the 50 MB limit.

## Suggested order

Stage 1, then Stage 2, then check CrazyGames dashboard data (playtime, retention) before investing in Stages 3 to 5.
