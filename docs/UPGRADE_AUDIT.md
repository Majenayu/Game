# Orb Arena — upgrade audit and proposed delivery plan

## Status and scope

**Audit stage; implementation approval pending.** No gameplay, frontend, save,
server, balance, protocol, dependencies, or Make lifecycle files have been changed.
The recommendations below are proposals, not completed upgrades.

The current request supersedes speculative features in older plans. This project
already has a multiplayer backend; it does not need a framework migration, CMS,
new account system, or replacement renderer.

## Evidence and method

- Read `README.md`, `ROADMAP.md`, `DEPLOY.md`, `STORE_TEXT.md`,
  `docs/MASTER_PLAN.md`, and `docs/SKILLS.md`. Sampled the generated rank catalogs
  in `docs/skills/` rather than manually reading their 115,000 generated rows.
- Inspected the existing Starforge theme export and live screenshots; older Figma
  exports are historical references, not new implementation specifications.
- Traced `GameScene.ts`, `sprites.ts`, `hero.ts`, `skillanim.ts`, `skillfx.ts`,
  `audio.ts`, `ui.ts`, `touch.ts`, menu routing, save handling, network reads, and
  the original asset generator.
- Used the existing supervised preview at `http://localhost:3000`. No second dev
  server was started.
- System Chromium with Playwright drives real browser input. Seeded contexts are
  disposable test saves, not user saves. Arena access testing uses a high-XP
  fixture because the normal level-one save cannot select most maps.
- Browser evidence and machine-readable results live in `docs/audit/`.
  Opening pages is a navigation smoke test, not proof that every purchase,
  reward, guild, ranked, boss, or campaign-completion flow works.
- The standard e2e config launches client/server processes on 5173/2567. For this
  supervised environment, tests run with a temporary config pointing to port
  3000, system Chromium, no `webServer`, and output under `/tmp`. Repository test
  files/config are unchanged. Environment-dependent failures must remain visible.

### Important differences between the brief, documentation, and code

| Topic | Current evidence | Upgrade decision |
| --- | --- | --- |
| Characters | Seven identities exist, but the current primary renderer uses full-body SVG heroes; expressive circles are a loading fallback | Keep identities, equipped gear and the orb gameplay footprint; strengthen silhouettes instead of deleting the existing gear renderer |
| Arenas | 25 selectable map definitions, not just six; most are level-gated | Give the original six bespoke art first; all 19 extras retain working layouts and inherit theme improvements |
| Campaign | Eight worlds and 88 encounters in current tables, not just the original 12 | Retain all encounters, unlocks, rewards and saves |
| Skills | Twenty kinds, twelve elements, five equipped slots, 108 uniques | Improve visual coverage by kind/element/rank; do not author thousands of independent effects |
| Wheel | One tile, six category tabs, Looks subtabs, ten shared free daily spins | This is a hard regression invariant, not a feature to rebuild differently |
| Social/ranked | Existing server/API integrations plus local progression | Preserve behavior; no new account or database scope |
| Historical plan | Earlier sections say features are not built; later appendices describe implemented versions | Use active code as the source of truth |
| Arena access | Existing level gates contradict an older “all maps unlocked” proposal | Do not remove gates under a visual-only brief |

## Additional complaints

- The first-run reward reveal competes with the controls tutorial for the same
  screen space.
- Cosmetic/element colors can be mistaken for team affiliation.
- Characters' visible bodies and gear do not clearly communicate the circular
  gameplay footprint.
- Nearly every menu tile has equal weight, making the feature-rich game feel
  harder to understand than it is.
- Persistent zones, temporary bursts, and harmless decoration use similar rings.
- Small HUD text and repeated uppercase skill names compete with the fight.
- The phone portrait viewport is blocked by a mandatory landscape overlay.
- Page code and the packed SVG library are downloaded before they are needed.

## Impact-ranked findings

Priority: **P0** blocks reliable validation or core comprehension; **P1** directly
improves moment-to-moment play; **P2** improves polish and discovery. Within each
area, the first proposed fix is the highest impact.

| Rank / area | What is weak and why | Proposed fix | Evidence / acceptance |
| --- | --- | --- | --- |
| 1 · P0 · First-time-player experience | Fresh players enter training immediately, but skill-gain cards overlay the instruction panel. Training notes advertise Q while active auto control is X. A confirmation lobby adds another action after Quick Play | Serialize noncritical reward reveals outside the first instruction; introduce move, aim/fire, then one skill as short contextual hints; remove stale control copy; review whether existing automatic ready timing can satisfy one-click play without changing server rules | Fresh-session live capture, `main.ts`, `GameScene.ts`, `lobby.ts`. New player sees action and one useful instruction within ten seconds; no blocking customization step before play |
| 2 · P1 · Characters | Primary sprites share one construction, mostly differ by hair/outfit, and bob/flip rather than animate poses. Gear can hide identity. Character art extends well above the circular footprint; fallback alone has aim-following eyes and low-health expression | Seven identity-locked silhouettes with an orb/energy core, permanent signature feature, directional face/weapon, stronger outline, and ground footprint; layer gear without losing identity; idle/move/hit/death/spawn states | `hero.ts`, `sprites.ts`, `render()`. Seven silhouettes recognizable in grayscale at actual combat size, including with hats/armor; visual bounds never claim a larger hitbox |
| 3 · P1 · Bullets and weapons | Six weapons exist, but the visible held weapon is baked into the sprite and the aimed procedural barrel only renders while the sprite is unavailable. Bullet variants are cosmetic shape switches; newly observed shots currently trigger sound, not a dedicated muzzle sequence. Owner cosmetic color is not reliable team information | Separate aimed weapon presentation, short recoil and muzzle flash; blaster bead, scatter shards, rail needle, SMG tracer, mortar core and twin paired bolts; team rim plus cosmetic/element core; event-driven impact bursts and bounded ricochet/pierce accents | `drawWeapon`, `drawBullet`, `detectShots`, `BulletView`. Use only information already replicated. Do not invent a collision when a bullet merely disappears |
| 4 · P1 · Skill effects | Kind motions and element motifs already exist, but many share generic double rings, default muzzle effects, and large particle bursts. Cast warning is a generic 70-unit circle; release art often scales by fixed visual constants rather than actual affected geometry. End states are usually a fade, not distinct expiration | Explicit cast → active → end presentation by kind; element glyphs/motion secondary to team edges; actual zone/range geometry remains authoritative; rank adds detail not misleading danger size; unique spectacle kept translucent and budgeted | `handleEvent`, `skillanim.ts`, `skillfx.ts`, snapshot zone/mine data. All battle kinds have three-stage visual coverage; do not add an artificial cast delay to instantaneous skills |
| 5 · P1 · HUD | HP, mana, skills, notes, objectives and floating text have separate positioning rules. Baseline first-run screenshot has bottom notes crossing the skill row. Names and repeated uppercase skill text consume space. Team color logic is not consistently local-player-relative | Reserve HUD safe zones around the canvas; health/mana together, compact objective/score/timer, icon-first cooldowns with accessible details; keep blue-left/red-right skill columns and cap announcements; local team always blue regardless of numeric team index | `ui.ts`, `index.html`, `GameScene.ts`. No HUD/control overlap at all three requested sizes; in-game text stays legible; local-only respawn beacon stays strong |
| 6 · P1 · Mobile layout | 390×844 touch is deliberately covered by `#rotate`; desktop FIT canvas plus right skill strip targets landscape. Several compact controls are below the desired 44px touch size | Responsive portrait-aware shell, safe-area-aware thumb zones and scrollable menu/page layout; landscape remains first-class; separate input hit areas from visual button sizes; keep two-pointer movement/aim cancellation behavior | `touch.ts`, CSS portrait/coarse media queries. Test 390×844 and 844×390 with simultaneous sticks, five skills and thumb-safe HUD |
| 7 · P1 · Powerups and pickups | Arena pickups are mostly colored circles; active effects are tiny color dots. Players cannot rapidly infer effect, rarity or remaining usefulness | Reuse existing effect icons: silhouette communicates effect, rim/pips communicate rarity; add readable on-body frost shell, guard facets, vampire wisps, magnet arcs and overdrive vents; compact timer/progress UI only when duration is genuinely available | `snap.pickups`, `p.fx`, shield/slow state. All twelve base effects distinguishable without relying only on color |
| 8 · P1 · Audio and game feel | Procedural sound, generated music, hit/K.O. pops, shake and respawn cues already exist. Newer skill kinds mostly fall back to one tone; no separate music/effects/voice volume UI; full-screen flashes and generic HIT text can dominate | Extend existing WebAudio: weapon attack/body/tail layers, elemental cast/release/end cues, voice toggle and separate buses/sliders; tame shake/flash; pooled damage feedback, kill feed and streak banners; use visual-only hit emphasis, never stop network prediction or Sim | `audio.ts`, `handleEvent`, `pop`. SDK mute overrides every audio bus and voice; optional reduced motion and shake; avoid claiming exact damage attribution from snapshots that cannot supply it |
| 9 · P1 · Performance | Main imports pages, duel scene and packed SVG art eagerly. Packed art source alone is 585,610 bytes. Particle array is capped at 400 after allocation, but each burst allocates; expired particles use splice; text pops allocate objects/tweens. No quality tiers or per-frame spawn budget found | First establish frame-time trace; reusable visual-effect slots and text pool; per-frame and total caps; reuse bullet draw data rather than allocating point arrays; cache/bound generated textures; Auto/Low/Medium/High tiers; lazy-load pages/optional assets at existing boundaries | `burst`, `drawEffects`, `pop`, `sprites.ts`, imports. No quality setting may hide telegraphs, health or team readability. Device auto-detect uses frame sampling, not just a user-agent guess |
| 10 · P2 · Menus and pages | Starforge identity already exists, but gold/glow is applied too evenly; fifteen similar navigation tiles, browser-native symbol variation, long stat-heavy rows and inline styles dilute hierarchy. Hero preview consumes large vertical space | Refine the existing DOM, not replace with React/Preact: shared tokens/components for buttons, cards, tabs, fields, dialogs, reward reveals; clear Play/Prepare/Collect groups; consistent icon language; responsive hero stage; preserve every destination and grouped tab | `index.html`, `Pages`, `MorePages`. One primary action per surface; keyboard focus, dialog semantics and tooltips; no new runtime dependency |
| 11 · P2 · Arenas and backgrounds | Maps mostly use a flat grid, rounded walls and palette swaps. Hazard pulse is weak and generic. Decorative themes risk competing with projectiles if simply made brighter | Cached layered floor textures, wall bevel/shadow, boundary lighting, theme-specific restrained ambience; hazard hatching, clear border and warning pulse; keep floors low contrast. Original six: neon circuit, crossfire foundry, pillar garden, fortress bastion, lava forge, cyber maze | `applyMap`, map themes and hazards. Collision/cover geometry unchanged, no decoration resembling pickup or attack |
| 12 · P2 · Animations and transitions | Reward/card animations exist, but panel transitions, tab behavior, overlays and announcements are not coordinated. No reduced-motion media handling found in the current CSS | Small shared motion vocabulary: 120–180ms controls, 180–240ms panels, reward anticipation/payoff/settle; one overlay/reveal queue; focus restoration; reduced-motion alternatives without losing feedback | CSS keyframes, `Ui.modal`, `showSkillGain`, `showForm`. No animation blocks input, steals aim, or hides danger |

## Preserve and regression-test

1. **Authority:** visual listeners consume existing events/snapshots. No new
   client-trusted combat, drops, currency or ranking logic.
2. **Network:** unchanged 20Hz server, predictor, wall collision and 100ms
   interpolation. Never pause Sim or network sends for hit-stop.
3. **Save compatibility:** retain `orb.save3` and current normalization. Do not
   use the historical “fresh start” practice. Prefer additive visual preferences;
   test old and partial saves. Any schema change needs an explicit migration.
4. **Wheel:** exactly one tile; six categories; shared ten free spins; correct
   prize stop/reveal; in-game currency only; ad controls remain gated.
5. **Skill feeds:** mine/allies left blue; opponents right red in every mode,
   including when the local player belongs to numeric team 1.
6. **Respawn:** pillar, ring, ghost orb, arrow and countdown remain visible only
   to the dead local player; no enemy-location disclosure.
7. **CrazyGames:** retain SDK v3 init/loading/gameplay events, platform mute,
   disableChat, username, invites, instant multiplayer, Data/local fallback and
   existing ad gating; no external art, audio or runtime service added.
8. Preserve every mode, all maps, encounters, gear, summons, chests, quests,
   collection, fusion, market, guild and ranked flows. Do not silently simplify
   the game to the old README content counts.

## Baseline measurements and limitations

Measured before any upgrade code:

| Check | Baseline |
| --- | --- |
| `npm run typecheck` | Passed, all workspace typechecks |
| `npm run lint` | Passed |
| `npm test` | Passed: 13 files, 170 tests |
| `npm run build:zip` | Passed: **958,347 bytes (0.91 MiB), 15 files** |
| Main production JavaScript | **2,567.60 kB**, gzip **757.47 kB** |
| Production HTML | 55.27 kB, gzip 10.03 kB |
| Extracted production CSS | 1.27 kB, gzip 0.33 kB; most styles are inline in HTML |
| Build warnings | Large chunk; account module mixed static/dynamic import |
| Isolated sandbox frame sample | 20.32 mean rAF FPS, 66.7ms P95; SwiftShader software renderer, not target hardware |
| Playwright baseline | 18 passed, 10 failed; three timing failures also reproduce in isolation |
| Browser coverage / FPS / load | See `audit/BASELINE_RESULTS.md` and `audit/baseline.json` |
| After values | Not applicable: no visual implementation yet |

Initial shell checks could not locate npm; rerunning the exact npm scripts under
the repository's mise toolchain succeeded. The initial Playwright bundled browser
was absent; the available system Chromium was used instead. These are toolchain
conditions, not application failures.

Headless `requestAnimationFrame`/Phaser FPS is a diagnostic, not evidence of 60 FPS
on a mid-range phone. Development-navigation timing is not production cold load.
Physical-device 60 FPS and production cold-cache load remain explicit release
gates. Do not fabricate before/after numbers.

## Proposed small, reviewable phases

### Phase 1 — identity, readability and feedback

1. Approve `ART_DIRECTION.md`; use existing font wiring and an asset/license
   ledger. Capture comparison shots at identical sizes/scenes.
2. Add shared client presentation preferences and effect budgets first, then
   identity silhouettes/pose layers for all seven heroes without removing gear.
3. Separate aimed weapons, add bounded shot/impact treatment, team-relative
   ownership outlines and readable projectile shapes.
4. Refine hit/death/spawn feedback, kill feed/streak UI and layered audio buses.
   No global simulation pause; motion/flash options are honored.

**Gate:** seven-character sheet at actual combat size; six weapon demonstrations;
no respawn/feed regression; all checks below and an agreed effect-stress trace.

### Phase 2 — skills, pickups and environments

1. Cover each battle kind with cast/active/end states tied to existing event
   timing. Audit what geometry/state is available before promising precise
   telegraphs. Ask before any protocol change if data is insufficient.
2. Add twelve element motifs as secondary cues and rank/unique detail under the
   same effect budget. Enhance active effects and pickup silhouettes.
3. Art-pass the original six arenas; apply common lighting/readability primitives
   to the additional nineteen without modifying collision or map definitions.

**Gate:** visual matrix for every kind/element/rank family, matching danger
geometry, grayscale readability, six arena comparison shots, all checks.

### Phase 3 — one UI language, every page

1. Extract reusable tokens and DOM primitives incrementally; preserve IDs/hooks
   where possible and update tests where semantics intentionally improve.
2. Upgrade menu and arena/mode selection; Hero (loadout/gear/profile); Skills
   (collection/fusion/encyclopedia); Shop & Market (including auction).
3. Upgrade quests/daily, campaign, summons, chests, guilds, ranked, bestiary,
   training and powerup collection; one Lucky Wheel with existing tabs and odds.
4. Finish responsive HUD, contextual tutorial, nonblocking reward queue,
   round/results summaries and mobile input. Lazy-load page/optional art bundles.

**Gate:** all destinations and reward/save flows checked, one-click play decision
resolved, desktop/phone screenshots, keyboard/touch accessibility, all checks.

### Phase 4 — recommendation only until Phases 1–3 are solid

First prioritize better presentation of existing campaign/boss milestones and
cosmetic mastery goals. Consider a local cosmetic season-track concept only
after retention/playtime evidence exists. Do not build accounts, shared unique
ownership, real-money systems, new ranked databases or new boss mechanics under
this audit approval.

## Verification required after every implemented phase

- Run `npm run typecheck`, `npm run lint`, `npm test`.
- Update Playwright selectors/expectations for intentional UI changes. Run
  `cd e2e && npx playwright test` against the correct supervised server without
  spawning another dev server; distinguish backend outages from regressions.
- Add regressions for wheel categories/shared spins, local-team color mapping,
  local-only beacon, quality settings, old saves, platform mute/chat flags,
  modal focus, touch inputs and first-run overlay ordering.
- Run `npm run build:zip`; report exact bytes and archive file count.
- Capture 1920×1080, 1366×768, 390×844 touch and supplemental landscape touch.
- Use repeatable bot-heavy combat and simultaneous skills to measure mean/P95
  frame time, object counts and GC; test all quality tiers on representative
  physical hardware. Aim for 16.7ms frame budget; record misses rather than
  claiming “60 FPS” from a screenshot.
- Production cold-load measurements: same browser/device/network/cache setup,
  navigation-to-interactive and click-to-gameplay; compare transfer and bundle
  bytes to this baseline. Do not compare dev-module requests to release chunks.
- Summarize changes, green checks, failures and residual risks before proceeding.

## Approval requested

Proceed with **refined Starforge**: cosmic indigo, selective gold, clean
blue/red ownership edges, original compact orb-core heroes with readable gear,
less visual noise and more precise action feedback. Keep all gameplay rules.

### Phase 1 continuation status

Direction approved. Implementation restarted from this audit baseline after the
later wholesale redesign was rejected. The original purple/gold Starforge UI,
arena composition and movement/camera behavior are the visual reference and must
not be replaced.

The first reviewable slice separates the aimed weapon from the loaded character
texture. Character and gear art stay unchanged, while the existing procedural
weapon layer now follows the live aim angle above the sprite. No simulation,
input, movement, camera, networking, save, reward or economy behavior changed.

One UX decision needs confirmation before implementation: Quick Play currently
opens an explicit confirm/loadout lobby. Recommend immediate ready for casual
Quick Play (if supported by the existing confirm path), while keeping deliberate
loadout confirmation in ranked/custom flows. Do not remove the lobby or change
server timing silently.
