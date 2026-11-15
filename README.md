# Orb Arena

Free real-time multiplayer top-down arena game for the browser, built for CrazyGames.
Up to 8 orbs per room, 90 second rounds, bots fill empty seats.

## Quick start

```bash
npm install
npx playwright install chromium   # once, for e2e
npm run dev                       # server :2567 and client :5173
```

| Command                             | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                       | Server and client together                                       |
| `npm test`                          | Vitest: shared simulation, client prediction/interpolation, room |
| `npm run e2e`                       | Playwright: two browsers join one room, offline bots, SDK mode   |
| `npm run build:zip`                 | `dist/orb-arena.zip` (index.html at root), prints size and files |
| `npm run covers`                    | Renders the three CrazyGames cover images to `e2e/covers/`       |
| `npm run lint`, `npm run typecheck` | Static checks                                                    |

## Test two players locally

Run `npm run dev`, open <http://localhost:5173> in two tabs (or a normal and a private window), press Play in both.
Both land in the same room; the leaderboard shows both names. "Practice offline" runs the same simulation locally with bots, no server.
To test from a phone on the LAN open `http://<your-pc-ip>:5173`; the client rewrites `localhost` to that host.

## Architecture

```
shared/  constants, input validation, nickname sanitizer, movement and the full game Sim (pure TS)
server/  Colyseus ArenaRoom: runs Sim at 20 ticks/s, copies state into @colyseus/schema, /health and /ping
client/  Phaser 3 renderer, DOM UI, Colyseus client, CrazyGames wrapper
e2e/     Playwright tests and cover renderer
```

- The `Sim` class in `shared/` is the single game implementation. The server uses it online; the client uses it offline.
- Server is authoritative: positions, bullets, hits, respawns, scores, rounds, bots, pickups.
- Client sends `{moveX, moveY, aimAngle, shooting, seq}` about 20 times a second. The server validates, clamps and rate limits (60 msg/s).
- Client predicts its own movement and reconciles with the server using `seq`. Other players are interpolated 100 ms behind.
- `joinOrCreate("arena")`, max 8 humans, bots are removed as humans join. Room reconnection window: 15 s.
- Server list comes from `VITE_SERVER_URLS`; the client measures `/ping` round trip and picks the fastest.
- Per IP connection limit (`MAX_CONN_PER_IP`), CORS open to any origin (CrazyGames iframe).

## CrazyGames integration

`client/src/platform/crazygames.ts` loads SDK v3 only on CrazyGames or with `?crazygames=1`; otherwise a no-op stub is used.
It handles `init`, `loadingStart/Stop`, `gameplayStart/Stop` (live round only, stops on scoreboard, menu and hidden tab),
`muteAudio` and `disableChat` settings (and the local `?muteAudio=true` override), username lookup, room data (`updateRoom`,
`leftRoom`, join listener), invite params (`roomId`, `server`) and instant multiplayer.
`showMidgameAd()` and `showRewardedAd()` exist behind `VITE_ENABLE_ADS` (default off) and are called at round end.

## Roadmap

1. Tutorial hint overlay, more screen shake and sounds
2. Cosmetics (colors, trails) saved with the SDK data module
3. Invite button and friend join UI using the room data already reported
4. Midgame and rewarded ads (set `VITE_ENABLE_ADS=true` after Full Launch approval)
5. More weapons, maps, power-ups
6. Ranked mode with ELO and leaderboards

See `DEPLOY.md` for hosting and `STORE_TEXT.md` for the store listing.

## What only you can do

1. Create a CrazyGames developer account, upload `dist/orb-arena.zip`, covers and videos, and submit.
2. Create a Fly.io (or Railway) account, run `fly auth login`, add a payment method, then follow `DEPLOY.md`.
3. Review the generated covers and approve or replace them.
4. Build the zip with your production `VITE_SERVER_URLS` (wss://) before uploading.
5. Play-test with a friend on two devices and run the CrazyGames QA preview.
