# Phase 1: Engine foundation

**Playable test build:** https://majenayu.github.io/orb-arena-play/talewild/
(add `?debug=1` for the debug panel: press F9 or click the bar in the top left)

## What changed

Decisions D1 to D9 applied first: folder renamed to `Talewild/`, title **Talewild**, world **Inkmere**, Motif
**Blaze**, **Keepsakes**, island **Forgepeak**, scope 15 to 20 hours, one Tale per family. Mockups re-rendered.

Engine (Phaser 3.90, TypeScript, Vite), all rules in pure TypeScript:

| Area | What exists | Files |
| ---- | ----------- | ----- |
| Loop | Fixed 60 Hz logic steps, capped after stalls, independent of frame rate | `src/core/fixedStep.ts` |
| Input | One action layer for keyboard (remappable table), touch d-pad and buttons, gamepad (standard mapping, stick dead zone); newest held direction wins; keys released on focus loss | `src/core/input.ts`, `src/ui/touch.ts` |
| Maps | Tiled JSON format, written by a generator from ASCII layouts; ground, decoration, collision and object layers | `src/world/tiled.ts`, `ascii.ts`, `mapData.ts` |
| Movement | 4-direction grid movement with smooth tweening, tap to turn, hold to walk, run (hold or toggle), smooth step chaining | `src/world/grid.ts` |
| Camera | Follows with smoothing, zoom in 0.5 steps that keep the pixel grid even, small rooms centred | `src/render/mapRender.ts` |
| NPCs | Still, wander (within a radius) and patrol, seeded so they repeat; stop and face you when you talk | `src/world/npc.ts` |
| Companion | Nib follows one tile behind you | `src/scenes/WorldScene.ts` |
| Dialogue | Typewriter text (3 speeds), portraits, speaker names, choices, keyboard, pad, mouse and tap | `src/ui/dialogue.ts` |
| Scripting | JSON event scripts: say, choice, flags, "!flag", variables, give items, camera pans, waits, face, emotes, end; static checker | `src/script/*` |
| Saves | Versioned schema with migrations, 3 slots, atomic writes with one backup, checksum, auto-save every 2 minutes and on every door, export and import code | `src/core/save.ts`, `src/game/context.ts` |
| Loader | Per-chapter lazy bundles (the test chapter is a separate 6 KB chunk) | `src/core/loader.ts` |
| Platform | One interface; plain web and CrazyGames SDK v3 (loading, gameplay start and stop, mute setting, data module saves), written against the docs read on 2026-11-21 | `src/platform/*` |
| UI | Title, story slots, character creation (name filter, 6 skins, 6 hair colours, 4 styles, 12 outfits), pause menu, bag, settings (text size, text speed, run mode, reduced motion), backup code, toasts, focus pause | `src/ui/*` |
| Debug | Hidden debug mode: performance overlay, map validator, teleport, flag toggler, save inspector, platform event log | `src/ui/debug.ts` |
| Art | Tileset and characters drawn in code in style A (painted pixel flecks, ink outlines), layered character builder with 4-direction walk cycles | `src/render/*` |
| Build checks | Size report from the Vite manifest; fails above 20 MB / 50 MB first download, 8 MB per chapter, 250 MB total | `tools/size-report.mjs` |

Test content: Elowen's study and the edge of Quill Harbor, with Nib, Mara Tidewright, a wandering child, a patrolling
sailor and a fisherman, signs, a door each way, 9 scripts, 2 items and a camera-pan scene.

## Screenshots (fresh, from `npm run shots`)

| | 1366x768 | 1920x1080 | 390x844 | 844x390 |
| - | -------- | --------- | ------- | ------- |
| Title | ![](phase1/1366x768-1-title.png) | ![](phase1/1920x1080-1-title.png) | ![](phase1/390x844-1-title.png) | ![](phase1/844x390-1-title.png) |
| Create | ![](phase1/1366x768-2-create.png) | ![](phase1/1920x1080-2-create.png) | ![](phase1/390x844-2-create.png) | ![](phase1/844x390-2-create.png) |
| Study | ![](phase1/1366x768-3-study.png) | ![](phase1/1920x1080-3-study.png) | ![](phase1/390x844-3-study.png) | ![](phase1/844x390-3-study.png) |
| Dialogue | ![](phase1/1366x768-4-dialogue.png) | ![](phase1/1920x1080-4-dialogue.png) | ![](phase1/390x844-4-dialogue.png) | ![](phase1/844x390-4-dialogue.png) |
| Harbour | ![](phase1/1366x768-5-harbor.png) | ![](phase1/1920x1080-5-harbor.png) | ![](phase1/390x844-5-harbor.png) | ![](phase1/844x390-5-harbor.png) |
| Pause | ![](phase1/1366x768-6-pause.png) | ![](phase1/1920x1080-6-pause.png) | ![](phase1/390x844-6-pause.png) | ![](phase1/844x390-6-pause.png) |

The screenshots were taken with `?debug=1` (used for teleporting), so the debug bar shows in the top left.

## Test output

```
npm run typecheck   -> no errors
npm test            -> 4 files, 41 tests passed (rng, fixed step, input, events, i18n, saves, migrations,
                       backup codes, grid movement, NPC wander/patrol/talk, ASCII maps, map validator,
                       script runner, chapter 0 script check)
npm run build       -> initial download 1.56 MB (Phaser 340 KB gzipped), chapter 0 bundle 6 KB, all size checks PASS
npm run e2e         -> 4 passed: title -> new story -> walk -> desk scene -> door -> Mara scene (choice and
                       camera) -> wall blocks -> save to slot 2 -> reload -> continue restores map, position,
                       facing, flags and bag; touch pad and A button; portal gameplay events; damaged save
                       falls back to its backup. No console errors.
npm run shots       -> 4 passed, 24 screenshots
```

## Bugs found and fixed during the phase

- Going through a door while holding a direction placed you on the wrong tile: the world kept writing the old
  position into the save during the fade. Fixed and covered by the end-to-end test.
- Full-screen UI wrappers blocked taps on menu buttons on touch screens (a CSS rule overrode `pointer-events: none`).
- Initial zoom showed only 14x8 tiles at 1366x768; now about 20x11.
- Study walls and the bed used repeating tiles that looked wrong; added a wall-top tile and a bed-foot tile.

## Risks and unverified items

- **Phone performance is unverified.** Headless Chrome uses software rendering and shows 36 to 42 fps on the harbour
  at 1366x768 and 60 fps on the phone sizes; this says little about a real device. A real phone test is needed.
- The CrazyGames adapter has not run on CrazyGames itself (only the plain web path and the event bookkeeping are
  tested). It will be checked in the CrazyGames developer preview before release.
- Key remapping is stored but has no settings screen yet (Phase 6, accessibility). Gamepad input is implemented but
  not tested with a physical pad.
- The name filter only allows letters, digits, spaces, apostrophes and hyphens; a word filter comes in Phase 6.
- Day and night, weather, chunk streaming and cave lighting are not in Phase 1 (planned for Phase 5 polish and the
  island chapters).
- Studio name (D9) is still empty.

## Next step

Phase 2: the battle system. Pure TypeScript battle engine with Motifs, stats, statuses, the Chorus meter and
Crescendos, the battle scene and UI, 12 Echoes, 30 Verses and a headless simulator.
