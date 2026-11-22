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
