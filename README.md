# Orb Arena

Free real-time multiplayer arena game for the browser, built for CrazyGames. Up to 8 orbs per room, bots fill empty
seats, so the game is never empty.

## What is in version 2

- **4 game modes:** Deathmatch, Team Battle (blue vs red), Coin Rush, King of the Hill.
- **6 arenas:** Neon Core, Crossfire, Pillar Park, Fortress, Lava Flats (damage zones), Cyber Maze. Quick Play rotates mode and map every round.
- **7 characters** with different HP, speed, fire rate and passives (regeneration, faster skills, fast bullets).
- **7 skills** (2 equipped): Dash, Bubble, Pulse, Mine, Blink, Burst, Repair. Space and E on desktop, buttons on mobile.
- **1,008 unique powerups:** 12 effects x 4 rarities x 21 modifiers (rapid fire, triple shot, piercing, ricochet, frost, vampire, magnet, overdrive, guard, heal, speed, big shot). A collection page tracks discoveries.
- **Progression:** coins, XP, levels 1 to 50, shop (characters, skills, colors, trails, bullet styles), loadout page.
- **Daily reward** (7 day streak), **daily and weekly quests**, **lucky draw** wheel (1 free spin a day, extra spins cost coins).
- **Campaign:** 12 offline levels vs bots with objectives, stars and a boss (The Overlord).
- Saves use the CrazyGames Data module when available and localStorage otherwise. No external services.

## Quick start

```bash
npm install
npx playwright install chromium   # once, for e2e
npm run dev                       # server :2567 and client :5173
```

| Command                             | What it does                                                         |
| ----------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                       | Server and client together                                           |
| `npm test`                          | Vitest: simulation, content, economy, prediction, server room (51)   |
| `npm run e2e`                       | Playwright: multiplayer, invite link, all pages, all modes, campaign |
| `npm run build:zip`                 | `dist/orb-arena.zip`, prints size and file count                     |
| `npm run covers`                    | Renders the three CrazyGames cover images to `e2e/covers/`           |
| `npm run videos`                    | Records the two preview videos (needs the client dev server running) |
| `npm run lint`, `npm run typecheck` | Static checks                                                        |

## Test two players locally

Run `npm run dev`, open <http://localhost:5173> in two tabs, press Quick Play in both. Both land in the same room.

## Architecture

```
shared/  constants, content tables (characters, skills, powerups, maps, levels), input validation, and the full game Sim (pure TS)
server/  Colyseus ArenaRoom: runs Sim at 20 ticks/s, syncs state, /health and /ping, rooms filtered by mode and map
client/  Phaser 3 renderer, DOM UI and pages, progression (save, economy, quests), campaign runner, CrazyGames wrapper
e2e/     Playwright tests, cover and video renderers
```

- `Sim` in `shared/` is the single game implementation. The server runs it online, the client runs it offline and for the campaign.
- The server is authoritative for positions, hits, skills, powerups, scoring and rounds. Players only send input and a validated loadout.
- Client prediction follows the server speed multiplier and the current map walls. Remote players are interpolated 100 ms behind.
- Rooms are created per (mode, map). Quick Play uses `mix` and `rotate`, so everyone lands in one lobby that cycles.

## Honest limits

- Coins, levels and unlocks live on the player's device. The server accepts any valid loadout, so unlocks are a progression feature, not an anti-cheat boundary. Competitive ranking needs accounts and a database (see `ROADMAP.md`, stage 5).
- Rewarded ads for extra spins exist behind `VITE_ENABLE_ADS` and only work after CrazyGames enables ads for the game.

## CrazyGames integration

`client/src/platform/crazygames.ts` loads SDK v3 only on CrazyGames or with `?crazygames=1`; otherwise a stub is used. It handles
init, loading and gameplay events, `muteAudio` and `disableChat`, username, room data (`updateRoom`, `leftRoom`, join listener),
invite links, instant multiplayer (creates a private room), and the Data module for saves.

See `DEPLOY.md` for hosting, `STORE_TEXT.md` for the store listing and `ROADMAP.md` for what comes next.
