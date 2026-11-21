# Upgrade audit — baseline results

These results precede any visual implementation. There are no “after” values
yet. Audit outputs are documentation, not shipped game assets.

## Build and static validation

Exact repository scripts were run under the configured mise toolchain:

```sh
mise exec -- npm run typecheck
mise exec -- npm run lint
mise exec -- npm test
mise exec -- npm run build:zip
```

| Check | Result |
| --- | --- |
| Typecheck | Passed across shared/server/client |
| Lint | Passed |
| Vitest | 13 test files, 170 tests passed |
| Zip build | Passed: 958,347 bytes, 15 files; 0.91 MiB |
| Initial JavaScript chunk | 2,567.60 kB raw / 757.47 kB gzip |
| HTML | 55.27 kB raw / 10.03 kB gzip |
| CSS asset | 1.27 kB raw / 0.33 kB gzip, excluding inline HTML styles |

Build warnings: chunk larger than 2,000 kB and `account.ts` imported both
statically and dynamically. These are pre-existing.

## Browser/navigation smoke coverage

System Chromium, headless, Playwright, existing supervised Vite preview on port
3000; no new development server. Machine-readable output: `baseline.json`.

- All **15 menu destinations** opened successfully.
- All **nine grouped page tabs** opened: Hero's loadout/gear/profile,
  Skills' collection/fusion/encyclopedia, Shop's shop/market/auction.
- Lucky Wheel has **six category tabs**, remains one tile, and displays the
  shared ten-free-spin allowance. Every top-level wheel category was opened.
  The existing wheel prize and category e2e tests also passed.
- **43 arena/mode entry smoke checks:** Deathmatch on all 25 maps; Team Battle,
  Coin Rush and King of the Hill on each of the original six maps. Movement,
  shooting and skill inputs were issued briefly; these entry checks do not
  establish that each round completed or each input landed after countdown.
- A separate **nine-session state-ready probe** reached actual post-countdown
  gameplay on the six core arenas in Deathmatch plus Neon in the other three
  modes, then issued movement/fire/skill inputs. Its snapshot predicate waited
  for the local player's `hold <= 0`. This verifies active play entry, not match
  completion or every weapon/skill combination.
- Campaign encounter 1 launched offline with two players and the expected
  “Defeat one enemy” objective. This is not an 88-level completion run.
- No uncaught page errors were recorded by the main audit page.
- Arena tests used a disposable high-XP fixture to unlock existing gates. This
  changed no actual user's data, application source or progression rules.

### Two-tab Quick Play: blocked

Two separate pages pressed Quick Play with different nicknames. Both displayed
**“Could not reach the game server.”** Neither received an online room.
The full e2e run also observed offline name-check and leaderboard responses.

The configured variable's existence does not prove endpoint reachability or
correctness. Do not claim multiplayer, invites, online ranking, guild operations
or name reservation are verified. Check that the existing game service is up and
reachable from the browser, supports the current client/API, and permits its
origin. If the saved URL needs correction, use **Make settings → Secrets**;
do not paste credentials into chat or hardcode an endpoint.

No server, CORS, credential or protocol changes were made to bypass the failure.

## Existing Playwright suite

Ran from `e2e/`:

```sh
mise exec -- npx playwright test --config=/tmp/orb-playwright.config.cjs
```

Temporary configuration keeps the existing test directory, single worker, no
retries, points `baseURL` to the supervised port 3000, uses the installed system
Chromium, disables the original config's server-launch entries, and writes
artifacts under `/tmp`. Existing tests and repository configuration were not
edited. This differs from the normal local 5173/2567 server setup.

**Result: 18 passed, 10 failed.** Do not present the suite as green.

| Failure group | Tests | Evidence |
| --- | --- | --- |
| Online/API unavailable | First-run free-name lookup, duplicate-name lookup, combined profile/guild test, two-browser room join, online shadow duel, ranked 1v1, ranked 2v2 | Offline name/world-ranking messages, missing online room, connection overlay |
| Offline timing/readiness | Skill cooldown after fixed delay, lobby/countdown, offline shadow duel | Cooldown empty; countdown still `2` or `1`; duel phase still `countdown` |

The combined profile/guild test failed on the world-ranking assertion before it
reached its later guild/pause assertions; those later steps are not verified by
that test. The profile navigation test passed because it does not require a live
leaderboard response.

The three timing cases were rerun alone, after the concurrent capture run ended:
**all three still failed**. At low render FPS, `OfflineSource.update()` and
`OfflineDuel.update()` advance using `Math.min(dt, 0.05)`. Fixed 3.5–3.6 second
test sleeps can therefore run before the simulation countdown has finished.
This is evidence of an environment-sensitive timing path, not proof that skill
casting is broken on normal hardware.

Recommended follow-up: state-based Playwright readiness and frame-time work.
If changing simulation time integration becomes necessary, discuss it first:
this audit does not change Sim, balance, inputs or networking to make tests pass.

## Viewport findings

| Viewport | Observed |
| --- | --- |
| 1920×1080 desktop | Menu/HUD captured; no document horizontal overflow; four visible menu controls below 44px high |
| 1366×768 desktop | Menu/HUD/pages captured; no document horizontal overflow; four visible menu controls below 44px high |
| 390×844 touch | Fullscreen “Please rotate your phone to landscape” overlay blocks access; captured as a failure of the portrait requirement, not a playable phone pass |

“No document overflow” does not certify individual panel clipping or
accessibility. The 44px menu count is an inspection heuristic, not a full touch
target conformance audit. Landscape touch and real multi-pointer play remain
release checks.

## Performance and load measurements

Main audit-page development navigation:

- Navigation duration: **497 ms**.
- Time by the menu-ready sampling point: **1,440.7 ms**.
- Resources observed by that point: **77**.
- Phaser renderer type: **2 (WebGL)**.

These are one unthrottled development sample. “Menu-ready sampling point” is not
a formal time-to-interactive metric. Vite module loading and a warm sandbox cache
are not comparable to a production cold-cache CrazyGames load.

The first four-second in-combat animation-frame sample observed **11.86 mean
rAF FPS**, **100.1 ms P95 frame time**, and **12.41 Phaser FPS**, while another
browser test process was active. This sample is explicitly contention-affected;
it neither demonstrates target-device performance nor meets the 60 FPS goal.

An additional state-ready, single-audit-browser gameplay probe is recorded in
`active-play.json`:

| Metric | Isolated sandbox sample |
| --- | --- |
| Mean animation-frame rate, five seconds | **20.32 FPS** |
| P95 frame interval | **66.7 ms** |
| Phaser-reported rate | **21.00 FPS** |
| Renderer | ANGLE / Vulkan / **SwiftShader software rendering** |
| Fixture | 1366×768, four combatants, disposable high-XP local player |
| Countdown wall-time samples | First entry 4,865 ms; subsequent entries 2,840–2,892 ms |

The renderer identifies software rendering, not a mid-range GPU. Neither probe
is a mid-range laptop/phone hardware benchmark. Random starter skills/outfits
and the short window also make these preliminary diagnostics, not a deterministic
performance regression suite. The 60 FPS target is **not verified**.

Still required before a visual phase can claim its performance target:
repeatable production cold-load runs, long combat traces and physical mid-range
laptop/phone tests at all quality tiers. Report actual regressions and misses.

## Screenshot index

- `before/first-run-1280.png`: initial tutorial and reward overlay collision.
- `before/menu-1366.png`, `menu-1920.png`: hub hierarchy baseline.
- `before/menu-390.png`: portrait rotation blocker.
- `before/loadout-1366.png`: grouped Hero screen, captured after its Profile tab.
- `before/campaign-1366.png`: campaign route and panel baseline.
- `before/bestiary-1366.png`: boss roster baseline.
- `before/spin-1366.png`: single wheel and category tabs.
- `before/match-1366.png`, `hud-1366.png`, `hud-1920.png`: entry/countdown HUD
  captures, not all settled gameplay.
- `before/campaign-match-1366.png`: encounter 1 presentation.
- `before/active-match-1366.png`, `active-match-1920.png`: separate state-ready
  gameplay probe captures, without relying on a fixed countdown sleep.

## Remaining audit limits

This is automated visual/interaction inspection, not a human playtest of every
encounter, item combination, boss form, reward source or accessibility device.
Online shared-room play was attempted and failed. Portrait play was blocked.
All-page navigation and offline arena entry are verified; whole-game completion,
all online services and real-device 60 FPS are not.
