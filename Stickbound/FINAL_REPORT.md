# Elementick: final report

**Play:** https://majenayu.github.io/orb-arena-play/stickbound/
**Code:** https://github.com/Majenayu/Game, folder `Stickbound/` (branch `main`)
**Studio:** majen. The working title "Stickbound" clashed with existing games and was changed to **Elementick** (docs/DECISIONS_LOG.md D1).

Every number below comes from a test run on 2026-11-22 on the build machine (Windows, Chrome). Nothing was tested by a human on a real phone.

## What was built

- **Fight:** deterministic 60 Hz simulation, best of 3 rounds with a 60 s timer, squads of 2 with tag swap (about 0.5 s animation, no cooldown), HP / MP / guard stamina, perfect guard, 30 powers (3 per element, unlocked at levels 1, 8 and 20, 5 ranks each), no power cooldowns, 7 statuses, bots at 5 levels (Rookie to Legend).
- **Elements:** 10, on a wheel found by search where each beats exactly 2 and loses to exactly 2. All 9 preferred pairs are hit; a test proves the wheel is regular.
- **Avatars:** roster of 10 to 20, each levels on its own to 50 (stats, combo length, guard window, power ranks); perks at 15, 30 and 45 (pick 1 of 2); Avatar Forge with 10 look options; level-up and perk screens.
- **Modes:** Champion Road (40 champions in 8 districts, the masked champion Null, story panels, 2 endings), Ranked Ladder (rating, 6 tiers, monthly seasons, 25 AI rivals labeled AI, stats normalized to about +15% for level), Zombie Survival (waves, 7 zombie kinds, boss every 5th wave, local leaderboard, revive), Training (dummy behaviours, hitboxes), Local 2P on one keyboard or two gamepads.
- **Meta:** coins only (no real money, no loot boxes), shop, 7-day streak, 3 daily and 5 weekly quests, player level and tiers, save with backup and export / import code.
- **Presentation:** 8 arenas, code-drawn stick figures with 9 expressions, particles and screen shake, 6 synthesized music loops and element sound palettes, HUD, touch controls, gamepad and remappable keys, accessibility options (shake, reduced motion, reduced flashing, damage numbers, one-handed touch, large text, high contrast, timer length).
- **Platforms:** one platform layer for plain web / itch.io, CrazyGames (SDK v3, checked against the current docs) and Poki (stub).

## Definition of Done

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Page load to a first win in under 60 s | **Met** | First-run e2e with plain key mashing: 22.0 s local, 22.4 s CrazyGames build, 24.3 s on the live Pages build |
| 2 | Every feature works | **Mostly met** | Smoke e2e opens every screen, plays a fight in every mode, claims the streak, uses the Forge, toggles a setting and uses the Zombie revive, with no console errors. Not covered by automation: gamepad input, key remapping, save-code import, a real two-person Local 2P match, Forge purchases. |
| 3 | Every test passes | **Met** | Typecheck; 27 unit tests (sim, 10,000-frame determinism hash, content, wheel, banned-word scan with word boundaries, profile, save); balance; walkthrough; smoke and first-run e2e; memory soak; fps |
| 4 | 60 fps on desktop, plus a 4x CPU throttle run | **Met** | Chrome with GPU, busy bot fight at 1366x768: 144 fps (monitor cap), 95th percentile 140.8. With 4x CPU throttle: 86.3 fps, 95th percentile 71.4, worst single frame 389 ms when the throttle switched on. Before a drawing fix the throttled number was 22 fps. Headless Chrome with software rendering gives about 11 fps; that is not a device number. |
| 5 | No placeholder rectangles, overlapping UI, console errors or softlocks | **Met with notes** | Screenshots at 1366x768, 1920x1080, 390x844 and 844x390 were reviewed and the issues fixed (docs/PROGRESS.md). No console errors in any e2e run. The walkthrough bot never got stuck. Note: at 844x390 the fighters are small. |
| 6 | Initial download under 5 MB | **Met** | 1.67 MB (409 KB gzipped), 6 files |
| 7 | CrazyGames zip and SUBMISSION_GUIDE.md | **Met** | `npm run package` → `release/elementick-crazygames-1.0.0.zip` (0.41 MB); `docs/SUBMISSION_GUIDE.md`; covers, videos and screenshots in `store/`; text in `docs/STORE_TEXT.md` |
| 8 | FINAL_REPORT.md | **Met** | This file |

## Balance (M7)

- 10,000 bot matches (level 20, Veteran bots, random squads): every element wins 47.3% to 53.8% of its non-mirror matches (target 45 to 55). Rounds average 43.0 s (target 25 to 45); 3.7% of rounds time out; no draws.
- Reaching the target needed a per-element power damage table. Time needed the largest cut (60%), which suggests its stun powers are the strong part. Worth a design look.
- Champion Road walkthrough bot (Elite-level bot, real XP and unlock rules, 3 practice fights after 3 losses in a row): all 41 fights cleared in 158 champion fights plus 93 practice fights. The squad ended at level 38 with all 10 elements unlocked. **Grand Marshal Oda (fight 40) took 41 tries**, a difficulty wall the owner should judge by playing.
- Memory soak: 100 bot matches in the browser; heap 9.1 to 9.9 MB after garbage collection, DOM steady at 158 nodes.

## Not done or open

- **M9 online play:** not started (stretch goal).
- **Poki:** the adapter is a stub that behaves like plain web; no Poki zip.
- **CrazyGames account integration** (username, avatar, progress linked to the account): not built; only needed at Full Launch. Saves already go through the SDK data module.
- **The SDK has not run inside the CrazyGames QA tool.** The integration follows the current docs and the CrazyGames build plays locally, but only the owner can run it on the Developer Portal.
- **Crazy Combos** was never opened, so nothing from it was studied or used.
- Not tested by a person: feel of the controls, touch play on a real phone, Local 2P with two people.

## How to run everything

```
cd Stickbound
npm install
npm run typecheck
npm test                  # unit tests
npm run balance           # 10,000 bot matches + Champion Road walkthrough + wheel (about 4 minutes)
npm run build             # also prints the size report
npm run e2e               # smoke + first-run (Playwright, about 4 minutes)
npm run shots             # screenshots at the 4 sizes into docs/shots/
npm run perf              # fps and 100-match memory soak in a visible Chrome window (about 12 minutes)
npm run package           # CrazyGames and web zips into release/
npm run media             # covers, screenshots and preview videos into store/ (needs ffmpeg)
```

## Documents

- `docs/GDD.md`: game design
- `docs/STORY.md`: story and all 41 champions
- `docs/DECISIONS_LOG.md`: every choice made without the owner (D1 to D25)
- `docs/PROGRESS.md`: milestone entries with test results
- `docs/ASSETS.md`: assets and licences (no third-party assets; Phaser is MIT)
- `docs/SUBMISSION_GUIDE.md`, `docs/STORE_TEXT.md`: portal submission
