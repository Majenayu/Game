# Orb Arena — four-phase upgrade

## Scope and invariants

All four requested implementation phases have been carried through, with Phase 4
limited to compatible presentation/retention work from `ROADMAP.md`.
This is not a claim of production service availability or physical-device certification.

- Shared simulation, balance, collisions, map geometry, server code and wire
  protocol are unchanged. Hit-stop affects presentation only, never ticks,
  position, input latency or authority.
- SaveData remains v2 under `orb.save3`; old-shaped saves still load through the
  existing parser. Visual/audio preferences live separately in `orb.presentation1`.
  Journey pin/expansion preferences use separate `orb.*` device keys.
- Existing modes, unlocks, rewards, fusion, inventory, summons, market, guilds,
  campaign, ranked and CrazyGames launch flags remain in place.
- Lucky Wheel remains **one destination, six top-level categories, ten shared free
  daily spins**. Look subcategories, odds, extra-spin costs and reward logic are unchanged.
- No new package, downloaded artwork/audio, account system, ranked database,
  real-money purchase, paid loot box, cash-out feature or external service was added.
- The existing casual confirmation lobby/countdown is retained. It was not
  silently removed to make Quick Play appear faster.

## Phase 1 — characters and combat feedback

- Seven original orb-core silhouettes: Nova, Bolt, Titan, Viper, Ghost, Medic and
  Sniper, with signature geometry, visors/expressions, blink and hurt variants.
  Existing gear layers and equipped cosmetic accents remain visible.
- Movement lean/hover, spawn materialization, animation-only impact hold, hit
  tint, weapon recoil and core-collapse death feedback.
- Six distinct weapon profiles, muzzle flashes, projectile ownership outlines
  and trails. Cosmetic projectile effects are retained inside the ownership cue.
- Damage text, bounded floating-text reuse, three-row kill feed, elimination
  streak notifications, restrained camera shake and a local-only respawn beacon
  using the position already chosen by the authoritative simulation.
- Blue local/allied ownership and red opponents; optional circle/triangle cues
  and differentiated skill-feed edges supplement color.
- Weapon/skill-sensitive procedural sounds; separate music, effects and voice
  volumes. User/platform mute still overrides the mix. Voice defaults off.
- Fixed particle slots, per-frame emission budgets, texture cleanup, optional
  reduced animation/shake and auto/low/medium/high visual-quality preferences.
- Shadow Duel also honors the animation/shake settings for camera impacts,
  knockouts and skill flashes, with a browser regression through the settings UI.

## Phase 2 — skill identity, pickups and arenas

- Cast, active and end treatments for all **20 existing skill kinds**, with
  distinct directional, defensive, support, stealth, summon, control and movement
  signatures. Existing element motifs and rank/unique scaling remain secondary cues.
- Persistent shields, zones, summons and statuses continue to follow actual
  snapshots. Decorative release animations do not invent extra duration or damage.
- Strike telegraphs use the existing event's radius and delay. Zone boundaries
  and mines retain authoritative geometry; quality reduction never hides danger.
- Recognizable pickup/status glyphs with rarity rings/pips and restrained status
  orbits, rather than relying solely on tiny colored dots.
  All twelve pickup effects have distinct monochrome glyph signatures.
- Cached procedural surfaces, quiet architectural motifs, highlighted walls,
  shadow separation and hazard stripes for the six core maps; common lighting
  and readability treatment across all **25 maps**, without moving a collider.

## Phase 3 — shared UI, all destinations and touch

- Starforge tokens, type hierarchy, original line navigation icons, shared card,
  tab, reward, focus and modal treatment; a redesigned lobby with hero/loadout
  preview and the existing champion challenge.
- All 15 hub destinations and nine grouped tabs use the shared page hierarchy:
  Arenas; Campaign; Hero/Loadout/Gear/Profile; Skills/Collection/Fusion/
  Encyclopedia; Shop/Market/Auction; Daily; Quests; Lucky Wheel; Summons;
  Powerups; Bestiary; Ranked; Chests; Guilds; Training. Existing secondary Tower
  access is preserved without adding a new hub tile.
- Optional page builders are lazy-loaded, with cancellation and load-error
  handling; Play and the zero-click tutorial do not wait for those builders.
- Reorganized HUD safe zones, blue-left/red-right skill feeds, explicit health
  and skill accessible labels, clearer reward surfaces and a dismissible tutorial.
- Starter rewards still grant normally but no longer queue five reveals over
  the first tutorial or fighter creation.
- Playable portrait and landscape touch layouts replace the rotation blocker.
  Portrait arena play uses a player-following cropped viewport for readable
  combatants, not a miniature full-arena letterbox. World bounds remain unchanged;
  the normal viewport is restored when leaving or rotating.
  Stick coordinates account for their actual container; pointer cancellation,
  blur and visibility reset held movement. Key mobile controls have 44px targets.
- Modal labels, Tab trapping, Escape close and focus restoration through Credits.
  Native keyboard class choices and explicit keyboard skill-detail controls.
- Entering a new destination or tab resets its scroll position so the page
  introduction/navigation is not skipped; same-page updates retain scroll.
- Stale name-availability responses cannot overwrite newer input validation.
  Re-rendering pages no longer accumulates delegated skill-click handlers.
- Credits/license surface and distributable font/engine/Fluent notices.

## Phase 4 — implemented ROADMAP selection

After the Phase 1–3 gate (178 unit tests and 35 browser tests), implemented
**Your Journey** as a compact, collapsible view of existing progression:

1. Daily/weekly focus: closest-to-completion default, optional pinned quest,
   actual progress/rewards and a working link to Quests.
2. Campaign milestone: current world/next encounter and actual eight-world star
   total, excluding unrelated champion/tower records.
3. Signature mastery: the most-practiced owned skill, using the existing mastery
   XP thresholds, with a working link to Skills.

This is the safe presentation selection from ROADMAP stages 3–4. It does not
create a new reward calendar, season economy, skill bonus or backend obligation.
The pure model and browser tests verify that opening, pinning and navigating it
grant nothing and do not mutate game progress.

## Verification

Exact repository checks, under the mise-managed toolchain:

```sh
mise exec -- npm run typecheck
mise exec -- npm run lint
mise exec -- npm test
mise exec -- npm run build:zip

cd e2e
ORB_E2E_URL=http://localhost:3000 ORB_E2E_LOCAL=1 \
ORB_CHROMIUM_PATH=/usr/bin/chromium mise exec -- npx playwright test
```

Final static/unit checks: **typecheck passed; lint passed; 17 Vitest files /
183 tests passed**. The complete **38-test Playwright suite passed** (3.3 minutes),
including nine presentation regressions. Zip build passed: **986,898 bytes,
22 files**.

The E2E backend is the real existing Colyseus/HTTP server with disposable memory
storage on a separate test port. Only the test browser's development module
configuration is routed to it; no shipped endpoint, server response, authority
check or credential is bypassed. Multi-browser contexts are closed after each
test so old Phaser loops cannot contaminate later tests.

Coverage includes old saves, audio preferences, modal focus, tutorial/reward
ordering, mute/chat flags, touch cancellation, 44px targets, all destinations/
tabs, all twenty visual kinds/elements, all seven heroes, six weapons, all
25 arena drawings, local respawn rendering, bounded particles/text, actual
copied-invite joining, online local-server modes, rewards and wheel invariants.

An existing randomized reward assertion was corrected to account for coin
passives that a match can already drop. No reward formula was changed.

Capture/measurement reproduction (after browser tests, not concurrently):

```sh
cd e2e
ORB_CHROMIUM_PATH=/usr/bin/chromium mise exec -- node capture-upgrade.mjs
```

Evidence is written to `docs/audit/after/`; baseline evidence remains in
`docs/audit/before/`. Measurements and release qualifications are recorded below.

### Final capture and measurements

The capture command completed successfully, producing **43 fresh screenshots**
and `docs/audit/after/measurements.json`, with no recorded page errors. The
manifest was checked against file timestamps and the final zip size. Visual
review covered desktop combat/menu, portrait and landscape combat, first-run
instructions, campaign entry, settings, Journey and the portrait destination grid.

Headless Chromium used **ANGLE / SwiftShader software rendering**:

| Fixture | Sample | Mean FPS | p95 frame interval |
| --- | --- | --- | --- |
| Four combatants, low | 10 seconds | 25.15 | 50.1 ms |
| Four combatants, medium | 10 seconds | 24.30 | 50.1 ms |
| Four combatants, high | 10 seconds | 25.93 | 50.1 ms |
| Eight combatants, high | 60 seconds | 21.69 | 50.1 ms |

The stress fixture explicitly verified eight combatants using the existing
offline source and simulation. Its observed peaks were 96 active particles
within 280 preallocated slots, nine text objects, eleven transient effects,
eight rendered images and fifteen bullets. These observations are not a
physical-device performance pass or a long-duration memory-leak certification.
The samples do not establish a quality-tier speed ranking.

Three fresh-context cold loads of the local, uncompressed production build
reached the menu in **734, 729 and 712 ms** without requesting the optional
page-builder chunk. This is unthrottled localhost sampling, not production
cold-load/TTI certification and not comparable to the development baseline.

The main JavaScript asset is **2,521,476 bytes raw / 745,031 bytes gzip**; optional
page builders are **73,306 bytes raw / 24,778 bytes gzip**. The final zip is
986,898 bytes, versus the 958,347-byte baseline (28,551 additional bytes).
The large-entry warning remains; **60 FPS has not been demonstrated here**.

## Release qualifications

- Live/default server availability is separate from local authoritative-server
  regression coverage. The preview's default `localhost:2567` service was not
  reachable; local-server success does not certify production multiplayer.
- `BASIC_IMPLEMENTATION` and `ENABLE_ADS` are unchanged. Real CrazyGames SDK,
  account/device settings, invite hosting and lifecycle integration require
  testing in its supported dashboard/host, not only the stub.
- Headless Chromium here uses software rendering. Physical mid-range laptop,
  phone GPU, audio-device and actual multi-finger usability testing remain
  necessary; do not call a screenshot a 60 FPS pass.
- Individual Game Icons author provenance remains a release-review item from
  the original inventory. No new third-party pack was imported.
- A large entry-chunk warning remains. The optional page chunk is deferred,
  but engine/art payload work and on-device profiling are the next engineering
  priorities, not additional economy or service features.
