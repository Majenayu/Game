# Orb Arena — art direction proposal

**Implemented direction.** The original proposal is retained below as the design
record. See `UPGRADE_IMPLEMENTATION.md` for scope, checks, evidence and release limits.

## North star: refined Starforge

An original cosmic arena toybox: collectible, expressive orb-core champions in
small readable armor silhouettes. Keep the existing indigo/gold identity and
bundled fonts, but make the battlefield more restrained than the reward screens.
Premium means hierarchy and response, not a glow on every edge.

No stock photography, franchise references, downloaded character packs, new
font service or animation dependency is needed.

## Visual priority

1. Local player and aim direction.
2. Opponent fire and authoritative danger boundaries.
3. Objective, health and cooldown readiness.
4. Character/weapon identity.
5. Element, rank, cosmetic detail and ambience.

Never enlarge the apparent gameplay hitbox for a cosmetic. A stable ground ring
identifies the actual orb footprint even when a hat, cape or weapon extends out.
All silhouettes must work at combat scale, not only in a large inventory preview.

## Palette and lighting

| Role | Proposed color | Rule |
| --- | --- | --- |
| Void | `#080B18` | Quiet negative space and arena shadow |
| Indigo surface | `#121A32` | Panels and raised architecture |
| Elevated surface | `#1D2947` | Cards/selected regions, not full-screen bloom |
| Main text | `#EDF3FF` | High-contrast UI and numeric readouts |
| Secondary text | `#ACBBD6` | Readable, not low-opacity text |
| Me / allies | `#66B3FF` | Ownership rim, ally projectile edge, left skill feed |
| Opponents | `#FF657A` | Enemy rim, danger perimeter, right skill feed |
| Reward gold | `#F4C76A` | Primary Play/reward/champion emphasis only |
| Interactive cyan | `#63E1EB` | Focus, secondary interaction, selected controls |

Retain blue/red meaning in colorblind mode, supplemented by solid-circle/diamond
markers, labeled teams, differentiated edge patterns and high luminance contrast.
Do not substitute rarity color for owner/team information.

Use a common upper-left key light, a dark silhouette outline and one crisp rim.
Cache static gradients/shadows in textures. Strong glow is reserved for active
power, valuable rewards and skill impact; background bloom stays subdued.

## Seven immutable identity signatures

| Hero | Silhouette | Face / movement | Signature |
| --- | --- | --- | --- |
| Nova | Round core, small orbital fins | Curious eyes, buoyant idle | Split halo / orbital arc |
| Bolt | Lean teardrop with swept fins | Focused eyes, quick lean | Forked lightning crest |
| Titan | Broad armored hexagonal shell | Determined brow, weighty settle | Heavy shoulders / central plate |
| Viper | Narrow angular shell | Slit eyes, coiled anticipation | Twin swept horns / fang vents |
| Ghost | Floating tapered cloak-core | Bright visor, soft drift | Broken trailing hem / spectral tail |
| Medic | Soft rounded capsule and side pods | Warm expression, gentle hover | Original healing diamond / plus motif |
| Sniper | Low asymmetric cowl and scope | Monocular focus, steady idle | Long sight line / offset lens |

These are **visual** shapes only; preserve character stats, IDs and collision
radii. Retain equipped hats, armor, weapons, bags and vehicles as stylized layers.
Permanent signatures must survive those layers. Prefer reusing hero SVG/Phaser
texture infrastructure and a few animated parts over replacing the art pipeline.
Avoid a red cross on a white field; use an original medical emblem.

Each hero needs: idle breath/blink; directional movement lean; recoil; brief
nonflickering hit response; a readable core-collapse death; materialization spawn.
The local respawn beacon remains its own strong persistent presentation.

## Weapons and projectiles

| Weapon | Readable form | Shot feel |
| --- | --- | --- |
| Blaster | Compact emitter | Bright bead, short tapered trail, tight impact |
| Scatter Gun | Wide triple mouth | Cluster of angular shards, broad short muzzle |
| Rail Lance | Long split barrel | Thin needle and narrow afterglow; precise recoil |
| Buzz SMG | Short vented chassis | Small paired-dash tracers; restrained rapid flash |
| Orb Mortar | Heavy circular chamber | Slow dense core, rotating shell and heavy settle |
| Twin Pistols | Two clearly separated emitters | Paired bolts and offset flash |

Ownership rim is blue/red; inner color may reflect cosmetics/element. Ricochet
sparks and pierce streaks are decorative confirmation from known state, never
client collision detection or a promise of extra damage.

## Skill grammar

- **Cast:** anchored glyph and directional/area anticipation tied to existing
  cast duration. No added gameplay delay for instant actions.
- **Active:** distinctive silhouette/motion by kind, actual affected geometry
  where replicated; restrained transparent fill and crisp ownership boundary.
- **End:** dissolve, break, retract or settle distinctive to the kind.
- **Rank:** adds trim, glyph complexity and short impact layers, not false range.
- **Unique:** signature secondary flourish within the same frame/particle cap.

### Element motifs

Preserve the active table colors; centralize presentation lookups rather than
creating inconsistent new per-page colors.

| Element | Shape/motion motif |
| --- | --- |
| Flame | Upward tongues, ember triangles |
| Frost | Faceted shards, branching crystals |
| Storm | Branched zigzags, rapid segmented arcs |
| Void | Broken spirals, negative-space core |
| Light | Fine radial rays, ascending prisms |
| Shadow | Dissolving wisps, interrupted contour |
| Toxin | Bubbles, stippled pools |
| Metal | Facets, rotating blade ticks |
| Wind | Open swept arcs, ribbons |
| Blood | Abstract crimson motes; no gore |
| Star | Four-point sparks, constellation trails |
| Gravity | Flattened orbital rings, inward tick motion |

### Rarity mapping

Skills/gear: preserve current `RANK_INFO` colors and rank letters:
F `#7C84A8`, E `#6BCB77`, D `#4DA8FF`, C `#35E0C2`,
B `#B77DFF`, A `#FF8A3C`, S `#FFC93C`, U `#FF4DA6`.
Use corner pips, frame detail and the printed rank, not color alone.

Powerups have a **separate four-tier** scale from `RARITIES`:
Common `#B0B8D8`, Rare `#4DD2FF`, Epic `#B77DFF`,
Legendary `#FFC93C`. Do not conflate it with the eight skill ranks.
The inconsistent existing gear trim lookup should be consolidated client-side
against the canonical rank table without changing item data.

## UI typography and layout

- Keep bundled Cinzel for logo/short ceremonial headings, not dense controls.
- Rajdhani remains the primary interface and numeric face; use tabular numerals.
- Bangers is reserved for brief impact/reward callouts, not paragraph text.
- Target 16–18px body, 14px minimum secondary text, 44px minimum touch hit areas.
- Use 4/8/12/16/24/32 spacing, quiet surfaces, consistent 8–14px corners.
- Gold = primary call to action/value; cyan = focus; red = danger/destructive.
- One top-level Play action, with preparation and collection navigation grouped.
- Large hero art belongs on the hub/detail screen; compact it when editing gear.
- Keep menu page content scrollable inside a stable header and predictable Back.

## Motion, audio and accessibility

Controls 120–180ms; panels 180–240ms; rewards have anticipation, reveal and settle.
Never gate gameplay on a flourish. Queue rewards away from combat/tutorial hints.
Reduced motion replaces translations/shake with short fades and outline changes;
reduce flash luminance and expose separate shake/voice controls.

Extend current procedural WebAudio; no new audio library. Distinct weapon and
element families, separate music/effects/voice gains, no sound-dependent mechanics.
CrazyGames mute always wins. No music files or voice service.

## Performance budgets to validate, not claims

- Auto quality starts conservatively and samples frame time; settings persist.
- Proposed Low/Medium/High live-particle caps: 80 / 160 / 280.
- Proposed per-frame cosmetic emission caps: 8 / 16 / 24, using a reusable pool.
- Required telegraphs/ownership outlines are outside cosmetic degradation.
- Reuse text/effect slots and bound texture caches; avoid per-projectile polygons
  allocated every frame.
- Prefer original SVG/canvas/Phaser primitives, generated/cached once where static.
- Validate 16.7ms frame budget on target hardware before adding more effects.
- Keep archive well under 50 MB; baseline is under 1 MiB. New dependencies require
  an explicit size/license justification and approval.
