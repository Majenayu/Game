# Elementick: final report

**Play:** https://majenayu.github.io/orb-arena-play/stickbound/ (build 3)
**Power Lab (every power on a dummy, with frame-step):** https://majenayu.github.io/orb-arena-play/stickbound/?powers=1
**Code:** https://github.com/Majenayu/Game, folder `Stickbound/` (branch `main`)
**Studio:** majen. The working title "Stickbound" clashed with existing games and was changed to **Elementick** (docs/DECISIONS_LOG.md D1).

Every number below comes from a test run on 2026-11-22 on the build machine (Windows, Chrome). **Nothing was tested by a human: not the feel of the controls, not a real phone, not Local 2P with two people.**

## What was built

- **Fight:** deterministic 60 Hz simulation, best of 3 rounds with a 60 s timer, squads of 2 with tag swap (about 0.5 s animation, no cooldown), HP / MP / guard stamina, perfect guard, no power cooldowns, 7 statuses, bots at 5 levels (Rookie to Legend).
- **Elements:** 10, on a wheel found by search where each beats exactly 2 and loses to exactly 2. All 9 preferred pairs are hit; a test proves the wheel is regular.
- **Fighting styles (upgrade M1):** every element has 3 styles (Vanguard all-rounder, Striker close range, Warden defense and control), each with its own 3 powers: **90 powers** with unique names, unlocked at levels 1, 8 and 20, 5 ranks each, Power III a super. New mechanics: rains from above, fans, orbiting shields, counter stances, decoys, self-buffs, life drains, boomerangs, staggered strikes and wall prisons. 59 of the 60 new powers use a mechanic the element's other styles do not.
- **Effects (upgrade M2):** one layered effects system for the fight and every preview: per-power charge-up, cast burst, travel with additive glow, floor light and decals, impact flash, shockwaves, debris, freeze-frames, shake, lingering statuses, afterimages, per-power poses with squash/stretch and line-weight pulses, and a cinematic cut-in for the player's own supers. A Power Lab page renders frame-exact contact sheets of every power.
- **Lobby (upgrade M3):** a living hero stage (dusk rooftop, parallax, spotlights, motes, podium, the squad idling, tap a fighter to see a real power), illustrated mode tiles with small animated scenes that tint the stage light, level ring, coin count-up, streak flame and chest, news banner, transitions, confetti, Low graphics setting.
- **Avatars:** roster of 10 to 20, each levels on its own to 50; perks at 15, 30 and 45; style picker with a live preview; a "Fighting style" button on every avatar; a warning when both squad avatars share element and style; Avatar Forge with 10 look options and a live power preview.
- **Modes:** Champion Road (40 champions + Null, story, 2 endings), Ranked Ladder (AI rivals labeled AI, normalized stats), Zombie Survival, Training, Local 2P.
- **Meta, platforms, accessibility:** as in build 2 (coins only, quests, streak, saves with backup and save codes; CrazyGames SDK v3 per current docs; reduced motion, reduced flashing, one-handed touch, large text, high contrast, key remapping, Low graphics).

## Upgrade Definition of Done

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Same element, different styles: different power names, mechanics and visuals; squad picker and bots handle it; old saves migrate | **Met** | Tests: no shared power between styles, 59/60 unique mechanics, v1 save migrates to two different styles, starter squad differs, sim specs differ. Screenshots `docs/shots/*-06-avatars.png` (Fire Vanguard) and `*-06b-avatars-partner.png` (Fire Striker), `*-06c-style-picker.png`. Bots: counters and decoys as reactions, buffs, orbits and walls as setups (`src/sim/ai.ts`). |
| 2 | Contact sheets for all powers, videos for 10 flagship powers | **Met** | `docs/powers-sheet/` (90 sheets + README), `docs/videos/power-*.mp4` (10 clips). I reviewed all sheets and fixed what looked wrong (delayed strikes that never landed, a tower-shaped mountain, a sky-sized glow, storm clouds drawn off screen, strips that stalled). |
| 3 | Lobby screenshots at 4 sizes, mp4 of the lobby and of a Power III cut-in | **Met** | `docs/shots/*-05-lobby.png` at 1366x768, 1920x1080, 390x844, 844x390; `docs/videos/lobby.mp4`, `docs/videos/cutin.mp4` (Storm Mark, from a real player-controlled fight). |
| 4 | Typecheck, unit, determinism, banned words, 10,000-match balance (elements and styles), walkthrough, smoke, first-run; first win under 60 s | **Met** | 34 unit tests; balance elements 46.7 to 51.9% (45 to 55), all 30 element:style pairs 44.8 to 54.6% (42 to 58), rounds 40.6 s; walkthrough clears all 41 fights; smoke and first-run pass; first win 19.1 s local, 20.4 s on the live build. |
| 5 | fps normal and 4x throttle, size, no console errors, no softlocks | **Met** | Busiest power fight (4 Legend bots, MP kept full), Chrome with GPU at 1366x768: 143.6 fps (monitor cap); 4x CPU throttle 94.3 fps average, 71.4 fps at the 95th percentile, one 389 ms frame when the throttle switched on. Size 1.76 MB initial (437 KB gzipped). No console errors in any e2e run; memory soak of 100 matches flat (heap 10.3 to 11.2 MB, DOM 183 nodes). |
| 6 | Rebuild zip, covers, screenshots, preview videos; publish; update docs; be honest | **Met** | `release/elementick-crazygames-1.0.0.zip` (0.44 MB, 7 files); `store/` covers, 5 screenshots, 2 preview videos (3.0 and 3.4 MB); build 3 on Pages; PROGRESS entry 3; this file. |

## Balance notes

- Damage tuning per element and style sits between 72 and 150%. The lowest values (72 to 76%) are Lightning and Time Vanguard and the Fire, Leaf, Light and Time Wardens: their strength comes from control (stuns, roots, freezes, shields) more than damage. I shortened those effects first, then tuned damage. A designer pass on control durations could let their damage come back up.
- Fixing the delayed-strike bug made Storm Mark, Anchor Drop and every new rain or drop actually land, so the build 2 balance numbers are no longer comparable.
- Champion Road: **Grand Marshal Oda (fight 40) took the walkthrough bot 30 tries and Null 21.** That is a wall worth judging by playing.

## Not done or open

- **M9 online play:** not started (stretch goal).
- **Poki:** the adapter is a stub; no Poki zip.
- **CrazyGames account integration:** not built; only needed at Full Launch. The SDK has not run inside the CrazyGames QA tool; only the owner can do that.
- **Unverified by a human:** how the new powers feel to play, whether the counters and decoys read clearly in a real fight, the lobby on a real phone, touch controls on a real phone. The fps numbers are from a desktop GPU; a slow phone may need the Low graphics setting.
- **Crazy Combos** was never opened, so nothing from it was studied or used.

## How to run everything

```
cd Stickbound
npm install
npm run typecheck
npm test                  # unit tests
npm run balance           # 10,000 bot matches + Champion Road walkthrough + wheel (about 4 minutes)
npm run build             # also prints the size report
npm run e2e               # smoke + first-run (Playwright, about 5 minutes)
npm run shots             # screenshots at the 4 sizes into docs/shots/
npm run perf              # fps and 100-match memory soak in a visible Chrome window (about 25 minutes)
npx playwright test --project=powersheet   # 90 contact sheets into docs/powers-sheet/
npx playwright test --project=videos && node tools/make-clips.mjs   # docs/videos/ (needs ffmpeg)
npm run package           # CrazyGames and web zips into release/
npm run media             # covers, screenshots and preview videos into store/ (needs ffmpeg)
```

## Documents

- `docs/GDD.md`: game design (section 5: fighting styles and powers)
- `docs/STORY.md`: story and all 41 champions
- `docs/DECISIONS_LOG.md`: every choice made without the owner (D1 to D37)
- `docs/PROGRESS.md`: milestone entries with test results
- `docs/ASSETS.md`: assets and licences (no third-party assets; Phaser is MIT)
- `docs/SUBMISSION_GUIDE.md`, `docs/STORE_TEXT.md`: portal submission
- `docs/powers-sheet/README.md`: all 90 contact sheets on one page
