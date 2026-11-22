# Elementick: CrazyGames submission guide (for the owner)

Kiro never submits or publishes to a portal. This guide lists what is ready and the steps for the owner to take.
CrazyGames docs were checked on 2026-11-22: intro, requirements (intro, technical, gameplay, ads, game covers), SDK game, video ads, user.

## 1. Files

| What | Where | Notes |
| --- | --- | --- |
| Game zip (CrazyGames build) | `Stickbound/release/elementick-crazygames-1.0.0.zip` (run `npm run package` to rebuild) | 0.41 MB, 6 files, `index.html` at the root, relative paths only. Not in git (release/ is ignored); rebuild it from the repo. |
| Web zip (itch.io or any host) | `Stickbound/release/elementick-web-1.0.0.zip` | Same game without the SDK. Ads off unless `?fakeads=1`. |
| Cover landscape 16:9 | `Stickbound/store/cover-landscape-1920x1080.png` | Title only, no other text, no border, no icons. |
| Cover portrait 2:3 | `Stickbound/store/cover-portrait-800x1200.png` | |
| Cover square 1:1 | `Stickbound/store/cover-square-800x800.png` | |
| Preview video landscape | `Stickbound/store/preview-landscape-1920x1080.mp4` | 17.6 s, 1.6 MB, no sound, opens on the cover frame. |
| Preview video portrait | `Stickbound/store/preview-portrait-1080x1620.mp4` | 2:3, 2.1 MB. |
| Screenshots | `Stickbound/store/screenshot-1..5-*.png` | 1920x1080: two fights, lobby, avatars, Champion Road. |
| Title, description, controls, tags | `Stickbound/docs/STORE_TEXT.md` | |

## 2. Steps on the Developer Portal

1. Developer Portal → Submit a game → upload the CrazyGames zip as an **HTML5** game.
2. Open the **Preview / QA tool** and play: the first screen is the element pick; one click starts the first fight (requirement: land in gameplay within 1 click).
3. In the QA tool check that it reports: `loadingStart`/`loadingStop`, `gameplayStart` when a fight starts, `gameplayStop` on results, pause and menus, `happytime` on wins, `reportGameCompletedPercentage` for Champion Road progress.
4. Orientation: landscape (desktop and mobile). Portrait works too, but the fight is best in landscape.
5. Paste the title, description and controls from `STORE_TEXT.md`. Upload the 3 covers and 2 videos.
6. Basic Launch: ads are disabled by CrazyGames. The game handles that: the SDK answers `adsDisabled`, the rewarded buttons disappear, and Zombie revive still works with coins.

## 3. What the build does for each requirement

| Requirement | How Elementick meets it | Checked by |
| --- | --- | --- |
| Initial download ≤ 50 MB (≤ 20 MB for the mobile homepage) | 1.67 MB before the first gameplay start (407 KB gzipped) | `tools/size-report.mjs` on every build |
| ≤ 1500 files, ≤ 250 MB | 6 files, 1.68 MB | `tools/package.mjs` |
| Relative paths | Vite `base: './'`; the packager rejects absolute paths in `index.html` | `tools/package.mjs` |
| Chrome / Edge, mouse + keyboard + touch | Keyboard, gamepad and touch controls | smoke e2e, screenshots at 4 sizes |
| Touch controls from CrazyGames device info, not touch detection | `user.systemInfo.device.type` decides; outside CrazyGames a fine pointer keeps keyboard layout | code review (`src/ui/touchPad.ts`) |
| `user-select: none` | Set on `body` | `src/ui/styles.css` |
| iOS audio resume | AudioContext resumed on `touchend` / click when suspended or interrupted | code review (`src/main.ts`, `src/audio/synth.ts`) |
| Same physics at 144 / 165 Hz | Fixed 60 Hz simulation with an accumulator | determinism test, fps test at 144 Hz |
| Land in gameplay (≤ 1 click) | Element pick → fight | first-run e2e: first win 22 s after load |
| No custom fullscreen button, no cross-promotion, no external links | None in the game | code review |
| PEGI 12 | Cartoon stick figures, no blood, no chat | content review |
| English | All text in English | banned-word test reads all of it |
| gameplayStart / Stop | Fight start and resume → start; results, menus, pause, ads → stop; not on focus loss | smoke e2e checks the platform log |
| muteAudio priority | SDK mute is a separate mute reason the in-game volume cannot undo | code review (`src/audio/synth.ts`) |
| Midgame ads only at natural breaks | After the results screen, never on menu buttons; the SDK limits frequency | code review (`src/ui/screens/results.ts`) |
| Pause + mute during ads, input blocked while requesting | `adStarted` pauses and mutes, input blocked until `adFinished` / `adError` | smoke e2e with `?fakeads=1` |
| Unfilled / disabled / adblock handled | Game continues; rewarded buttons hidden after `adsDisabled` or `adblock` and when an adblocker is detected at start | code review (`src/platform/crazygames.ts`) |
| Rewarded: optional, clear, not too often, an alternative | Video icon and "Watch an ad" text; double coins at most every 5 minutes; Zombie revive once per run with an equal "150 coins" option and an equal "End the run" option; no midgame ad after a run that offered a revive | smoke e2e (revive), code review |
| Adblock users can play everything | Nothing is locked behind ads | code review |
| Progress saving | SDK data module (local storage API) on CrazyGames, local storage elsewhere, with a backup copy | profile/save unit tests |

## 4. Known gaps (owner decision needed later)

- **Account integration** (CrazyGames username and avatar, progress linked to the account) is not built. The SDK data module already saves progress per CrazyGames user when they are logged in. If CrazyGames asks for username use at Full Launch, it can be added to the profile name.
- **Poki:** the adapter is a stub that behaves like plain web. No Poki zip is made. Poki's SDK must be read and wired before a Poki submission.
- **Esc key:** browsers also use Esc to leave fullscreen. Pause is also on P and on the on-screen pause button, so nothing depends on Esc.
- The SDK calls were written against the docs and the CrazyGames build was played locally (where it falls back to plain web if the SDK has no portal). They have **not** run inside the CrazyGames QA tool; that is step 3 above.
