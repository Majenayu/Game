# Elementick progress

**Play the latest build:** https://majenayu.github.io/orb-arena-play/stickbound/
Repo: https://github.com/Majenayu/Game (folder `Stickbound/`). Newest entry last.

## Entry 1: playable build (M0 to M5 core)

Pushed: `de34c74` (snapshot), `540b939`, `0669087`, then this docs commit. Published to Pages: `cc90bdc` in orb-arena-play.

**What is in the build**
- Title, starter element pick, tutorial fight, lobby (squad, Play, modes, 7-day streak, 3 daily and 5 weekly quests).
- Fight engine: deterministic 60 Hz sim, best of 3, tag swap, HP / MP / guard stamina, perfect guard, 30 powers, statuses, 5-level bots.
- Modes: Champion Road (40 champions + Null, story, two endings), Ranked Ladder (AI rivals labeled AI, Elo, 6 tiers, monthly seasons), Zombie Survival (waves, bosses, rewarded revive), Training (dummy modes, hitboxes), Local 2P.
- Avatars (roster, stats, powers and ranks, perks, squad), Forge (looks), matchup chart, Shop (coins only), Settings (sound, accessibility, key remapping, save code).

**Checks run (all fresh for this entry)**
| Check | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`) | pass |
| Unit tests (`vitest run tests`) | 14 / 14 pass (sim incl. 10,000-frame determinism hash, content, element wheel regularity) |
| First-run e2e, local build | pass: page load to "First win!" in 27.8 s with plain key mashing |
| First-run e2e, **live Pages build** | pass: 24.1 s |
| Smoke e2e (every screen, a fight in every mode, no console errors, gameplayStart/Stop sent) | pass (4.4 min) |
| Build size | initial 1.67 MB (407 KB gzipped), target 5 MB: pass |
| Screenshots at 1366x768, 1920x1080, 390x844, 844x390 | `docs/shots/` (13 per size) |

**Fixed in this entry**
- Crash "Cannot read properties of undefined (reading 'setZoom')" when a fight ended: the scene was stopped inside its own update and the camera code ran afterwards. Resize listeners are now named and removed on shutdown.
- Screenshot review: lobby nav pushed off-screen (now pinned, middle scrolls); touch buttons covering the fighters at 844x390 (camera floor raised, 5 × 2 button grid); knocked-down fighter's head below the floor; VS layout on phones; Avatars header crowding; Forge arrows had no accessible name.

**Known open items**
- Balance run (10,000 bot matches, element win rates 45 to 55%, rounds 25 to 45 s), Champion Road walkthrough bot, 100-match memory soak, fps (normal and 4x CPU throttle): next entry.
- Banned-word scan test and profile / save tests: next entry.
- CrazyGames SDK check against current docs, portal zips, store text, covers, SUBMISSION_GUIDE.md: after that.
- On 844x390 the fighters are small (the whole arena fits the short screen). Readable, but a closer camera is worth testing.

## Entry 2: balance, performance, CrazyGames rules, portal package (M6 to M8)

Pushed: `933abd8` and the docs/media commit after it. Published to Pages: `154b5ab` in orb-arena-play (build 2).

**Changes**
- Balance: per-element power damage tuning fitted from bot matches (DECISIONS_LOG D17).
- Performance: filled circles drawn as triangle fans, arenas baked into one texture (D22).
- CrazyGames rules (docs read 2026-11-22): new players land in gameplay with one click (title screen removed); midgame ads only after results with input blocked; rewarded double coins at most every 5 minutes with a video icon; Zombie revive once per run with equal "End the run / 150 coins / Watch an ad" choices; rewarded buttons hidden after `adsDisabled` / `adblock` and when an adblocker is detected; touch controls from the portal's device type; iOS audio resume on touch; Champion Road progress reported to the SDK.
- Bugs fixed: the Zombie run ended behind the revive dialog; revive was never offered again in the same session; the revive dialog promised full health (it is half); the benched partner was left in the wrong state after a revive; "Stand still" in Training (banned word, now "Just stand"); test labels in bot fights.
- Portal package: `npm run package` (CrazyGames zip and web zip, 0.41 MB each, 6 files), 3 covers, 5 screenshots, 2 preview videos, `STORE_TEXT.md`, `SUBMISSION_GUIDE.md`.

**Checks run (all fresh for this entry)**
| Check | Result |
| --- | --- |
| Typecheck | pass |
| Unit tests (sim, determinism, content, wheel, banned words, profile, save) | 27 / 27 pass |
| Balance: 10,000 bot matches | every element 47.3 to 53.8% (target 45 to 55), rounds 43.0 s average (target 25 to 45), 3.7% of rounds time out, 0 draws: pass |
| Champion Road walkthrough bot | all 41 cleared in 158 champion fights + 93 practice fights, squad level 38, all 10 elements unlocked: pass |
| Smoke e2e (every screen and mode, Zombie revive with an ad, no console errors) | pass |
| First-run e2e | local 22.0 s, CrazyGames build 22.4 s, **live Pages build 24.3 s**: pass |
| Memory soak: 100 bot matches in the browser | heap 9.1 to 9.9 MB after GC, DOM 158 nodes throughout: pass |
| fps (Chrome with GPU, 1366x768, busy bot fight) | 144 fps (monitor cap), 95th percentile 140.8; 4x CPU throttle 86.3 fps, 95th percentile 71.4, one 389 ms frame when the throttle switched on |
| fps headless (software rendering) | 11 fps before the drawing fix; not a real-device number, kept only as a note |
| Build size | 1.67 MB initial (409 KB gzipped) |
| Screenshots at 4 sizes | `docs/shots/` refreshed |

## Entry 3: upgrade directive (fighting styles, effects, lobby)

Pushed: `9e29c8d` and the final docs/media commit after it. Published to Pages: `cb39938` in orb-arena-play (build 3).

**M1 Distinct powers.** Every element has 3 fighting styles (Vanguard, Striker, Warden), each with its own 3 powers: 90 powers, all with unique names. New sim mechanics (rains, fans, orbiting shields, counters, decoys, buffs, drains, boomerangs, staggered strikes); 59 of 60 new powers use a mechanic the element's other styles do not. Save migration v1 → v2 (tested with a hand-written v1 save). Style picker with a live preview of the 3 powers when making an avatar, a "Fighting style" button on every avatar, a warning when both squad avatars share element and style. Starter squad and AI squads (Champion Road, Ranked rivals) use mixed styles. Bot AI uses counters and decoys as reactions, buffs, orbits, walls and traps as setups.

**M2 Effects.** New effects system (`src/render/fx.ts`) used by the fight and every canvas preview: per-power charge-up (ground rune, glowing hands, gathering element particles, spotlight with dim), cast burst, layered travel visuals with additive glow, floor light, decals, impact flash, two shockwaves, element debris, freeze-frames and shake scaled to damage, lingering statuses (embers, growing ice crystals, static arcs, vines, bubbles, sand, drips), afterimages on dashes and blinks, per-power wind-up and strike poses, squash/stretch and line-weight pulses, Power III cut-ins (0.65 s, skippable, off with reduced motion). Element languages differ by shape and motion, not only colour. Power Lab at `?powers=1` with pause and frame-step; `docs/powers-sheet/` has a 6-frame sheet for every power; `docs/videos/` has 10 flagship power clips.

**M3 Lobby.** Hero stage with a dusk rooftop, parallax skyline, swaying spotlights, motes and a glowing podium; the two squad avatars breathe, blink, look around and taunt, and a tap plays one of their real powers. Illustrated mode tiles with small animated scenes; hovering one tints the stage and the backdrop. Level ring with XP fill, tier badge, streak flame, coin count-up, news banner, streak chest that opens with sparkles, screen transitions, element swirl into fights, level-up confetti, a Low graphics setting. New players still land straight in the element pick and their first fight.

**Bugs found and fixed:** delayed strikes expired during their warning (Storm Mark, Anchor Drop never landed); the lobby refresh after claiming the streak could override the screen the player had moved to; Power Lab strips stalled for powers that hit on their cast frame.

**Checks run (all fresh for this entry)**
| Check | Result |
| --- | --- |
| Typecheck | pass |
| Unit tests | 34 / 34 (incl. 90 unique names, no shared powers between styles, mechanic variety, save migration, banned words over all names, 10,000-frame determinism hash) |
| Balance: 10,000 bot matches, random elements and styles | elements 46.7 to 51.9% (45 to 55), all 30 element:style pairs 44.8 to 54.6% (42 to 58), rounds 40.6 s, 0 draws |
| Champion Road walkthrough bot | all 41 cleared: 171 champion fights + 105 practice fights, squad level 40, all 10 elements unlocked |
| Smoke e2e | pass (every screen, every mode, Zombie revive, no console errors) |
| First-run e2e | local 19.1 s, live Pages 20.4 s |
| fps, Chrome with GPU, busiest power fight (4 Legend bots, MP kept full) | 143.6 fps (monitor cap), 95th percentile 140.8; 4x CPU throttle 94.3 fps, 95th percentile 71.4, one 389 ms frame when the throttle switched on |
| Memory soak, 100 bot matches with the new effects | heap 10.3 to 11.2 MB after GC, DOM 183 nodes throughout |
| Build size | 1.76 MB initial (437 KB gzipped), Power Lab is a separate lazy chunk |
| Screenshots at 4 sizes | `docs/shots/` (incl. both squad avatars' power lists and the style picker) |
