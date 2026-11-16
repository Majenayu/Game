# Orb Arena — asset and license ledger

## Scope

Inventory for the upgrade audit. **No third-party assets or dependencies were
added in this audit.** Do not treat the user's suggested resource list as a
cleared license list. Check each selected asset's actual license/version before
any future import.

This is an engineering inventory, not a legal opinion or a new license grant for
repository-authored work.

## Existing original/procedural assets

| Asset | Location / origin | Rights / action |
| --- | --- | --- |
| Hero bodies, hair, faces and assembly | `client/src/art/hero.ts` | Repository-authored vector construction; gear silhouettes can incorporate the licensed pack below |
| Champion and bestiary vector figures | `client/src/art/bestiary.ts`, `docs/art/*.svg` | Repository-authored; preserve provenance/history |
| Skill motions, rings, element motifs, particles | `client/src/art/skillanim.ts`, `skillfx.ts`, `game/GameScene.ts` | Repository-authored procedural art |
| UI/world rendering and icons | `art/icons.ts`, `icons2.ts`, `render.ts`, `meta/worldmap.ts`, CSS | Repository-authored code; inspect imports for embedded pack artwork |
| Sound effects and music | `client/src/audio.ts` | Repository-authored WebAudio synthesis; no downloaded audio files |
| Spoken skill names | Browser `speechSynthesis` in `audio.ts` | Platform voice availability/terms vary; not a bundled CC0 recording. Preserve mute; provide voice-off setting |
| Audit screenshots | `docs/audit/before/*.png` | Generated from this repository in the audit; documentation only, not runtime assets |

## Existing third-party art

Verified against installed package metadata and `info.json`, plus the extraction
script headers. Upstream license links below are the declared source links; this
audit did not download a fresh upstream license page.

| Pack | Installed version | License | Used by | Source / required handling |
| --- | --- | --- | --- | --- |
| Microsoft Fluent Emoji Flat | `@iconify-json/fluent-emoji-flat` 1.2.6 | MIT | Extracted creature, boss and scenery artwork in `client/src/art/packs.gen.ts` | [Project](https://github.com/microsoft/fluentui-emoji), [license](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE). Retain copyright and permission notice with redistributed portions; a short menu credit alone is not the full MIT notice |
| Game Icons | `@iconify-json/game-icons` 1.2.4 | CC BY 3.0 | Extracted weapon, gear, skill and creature silhouettes in `packs.gen.ts` | [Project](https://github.com/game-icons/icons), [license](https://github.com/game-icons/icons/blob/master/license.txt), [license deed](https://creativecommons.org/licenses/by/3.0/). Credit Lorc, Delapouite and applicable contributors, link source/license, indicate tinting/scaling/assembly modifications; verify selected icons' individual author mapping before release |

Generation path: `scripts/gen-art.mjs` extracts only selected pack SVG bodies and
records the pack names/license in `packs.gen.ts`. Runtime composites recolor,
scale and assemble some of those shapes. Existing menu credit names Microsoft,
Lorc, Delapouite and contributors, but does not provide complete linked license
notices. **Shipping gate:** add an accessible in-game Credits/Licenses surface
and distributable notices; preserve selected-art author provenance.

Do not remove attribution merely because a pack is “free.” Microsoft artwork is
MIT, not CC0; Game Icons is attribution-required, not public domain.

## Existing fonts

| Font / package | Installed version | Verified license | Existing use |
| --- | --- | --- | --- |
| `@fontsource/cinzel` | 5.3.0 | OFL-1.1, installed `LICENSE` file | Display, weights 700/900, imported by `main.ts` |
| `@fontsource/rajdhani` | 5.3.0 | OFL-1.1, installed `LICENSE` file | UI, weights 500/600/700 |
| `@fontsource/bangers` | 5.3.0 | OFL-1.1, installed `LICENSE` file | Impact lettering, weight 400 |

Fonts are bundled locally. Preserve font copyright/OFL notices in distributions;
no external font fetch or replacement is proposed.

## Existing engine

Phaser 3.90.0 is MIT (installed package metadata). It is already the renderer,
not a new upgrade dependency. Preserve required distribution notices.

## Candidate sources: not imported or approved

Kenney, OpenGameArt, Quaternius, Poly Pizza, Freesound, Lucide, Tabler, GSAP,
Howler, Lottie and Rive are suggestions only. No download-page license has been
verified here; no asset from those sources was imported.

Preferred implementation: original procedural/vector work using the existing
engine and WebAudio. In particular, do not assume all animation libraries use MIT
or that an animation's license follows its player's license.

## Checklist for every future addition

Record exact name, author, source URL, version/download date, license URL/text,
attribution, modification notes, files used and compressed byte cost. Confirm
commercial redistribution and CrazyGames embedding rights. Reject untraceable
assets, copied franchise art/audio and unlicensed music. Keep license notices in
the shipped archive, not only this repository.
