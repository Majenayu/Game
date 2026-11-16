# Orb Arena phased presentation upgrade

## Direction

The approved purple/gold Starforge frontend remains the visual baseline. This
upgrade refines it rather than replacing it. Simulation authority, movement,
input, collision geometry, networking, saves, rewards, progression, Lucky Wheel
rules and CrazyGames behavior remain unchanged.

No account system, paid economy, shared inventory, real-money flow or new reward
source was added.

## Phase 1 — characters, weapons and feedback

- All seven existing character SVGs remain distinct and retain equipped gear.
- Arena sprites add restrained breathing, movement lean, low-health tint and
  casting light without changing hitboxes or movement.
- All six existing weapons render as a live aimed layer rather than being baked
  into a left/right sprite. Weapon families also have distinct procedural shots.
- Projectiles retain their cosmetic interior color and gain blue ally/local or
  red opponent edges and short directional trails.
- Hit, elimination, streak and three-row kill-feed feedback is presentation-only.
- Auto/low/medium/high visual budgets cap particles at 80/160/280.
- Music, effects and optional voice have independent volume controls. User and
  platform mute always override the mix.

## Phase 2 — skills, pickups and arenas

- All 20 real skill kinds have cast, active and end visual phases.
- Existing twelve element motifs remain secondary to kind and geometry.
- Generic duplicate skill rings were removed to reduce combat clutter.
- All twelve pickup effects have recognizable glyphs, rarity rings and pips.
- Arena art adds restrained architectural motifs, wall highlights, shadows and
  hazard markings without changing any collider or hazard rectangle.

## Phase 3 — frontend, accessibility and responsive play

- Existing menu hierarchy and ceremonial purple/gold identity are preserved.
- Shared card, tab, page-header, focus and modal refinements apply across all
  current destinations.
- Settings expose graphics, animation, shake, team-shape and audio preferences.
- Modal focus is trapped and restored; health and skills have accessible labels.
- Stale onboarding-name responses cannot overwrite newer validation.
- Skill detail controls are keyboard-operable without accumulating listeners.
- Touch cancellation, blur and visibility changes release held input.
- Portrait play uses a presentation-only smooth follow camera and bottom skill
  safe zone. World dimensions, simulation and aim authority are unchanged.

## Phase 4 — safe retention presentation

`Your Journey` is a compact, collapsed-by-default view of existing quests,
campaign stars and skill mastery. It grants nothing and introduces no new clock,
bonus, currency or progression rule. Pinning is a device-only preference.

## Verification

Run:

```sh
mise exec -- npm run typecheck
mise exec -- npm run lint
mise exec -- npm test
mise exec -- npm run build:zip
```

Browser validation must cover desktop, portrait touch, settings persistence,
all destinations, all modes and the authoritative local multiplayer fixture.
Headless software rendering is diagnostic only and must not be described as a
physical-device 60 FPS certification.

Current automated result: typecheck and lint passed; 16 Vitest files with 178
tests passed; the focused presentation suite passed 3 browser tests. The zip
build passed at 974,138 bytes across 20 files. The existing large-entry warning
remains. Live CrazyGames, production multiplayer, physical-device performance
and production cold-load testing remain external release checks.
