# Trial Ground (every hero in every arena)
One place to try all 10 heroes in all 11 arenas or the training stadium: move freely and try every move on a
sparring dummy that can fight back, with the arena's moving effects, sounds and music.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to http://localhost:5190/gemini/
(pick a hero and an arena) or straight to http://localhost:5190/gemini/trial/?el=fire&arena=timearena.
- `el`: fire, water, ice, wind, earth, leaf, light, gravity, time or lightning.
- `arena`: an arena folder in `gemini/stages/` (lightningarena, firearena, waterarena, icearena, windarena,
  eartharena, leafarena, lightarena, shadowarena, gravityarena, timearena) or `stadium`. Default: the hero's own arena.
- Both can be changed in the panel; the choice is remembered.
- Lightning runs on his own lab engine (`gemini/stages/engine/lab.ts`, slim body and his own moves), so picking him
  opens `gemini/stages/<arena>/`; the Hero list there leads back here in the same arena.
- The arenas come from `gemini/stages/engine/registry.ts`, drawn by `engine/backdrop.ts`, with music and sounds from
  `engine/audio.ts`. An arena added there shows up in both places.

## Controls (same for every hero)
| Key | Move |
| --- | --- |
| A / D, Shift | walk, run |
| W / Space | jump (Wind: press again in the air for a double jump) |
| J x4 | jab, cross, element kick, rising launcher (air: kick) |
| K | element heavy (charged slam) |
| L | element dash with after-images |
| U / I / O | Power I / II / III (see below) |
| P | ultimate (2.5 s: arena dims, camera pushes in, 5 strikes and a finisher) |
| S | element shield; raise it within 8 frames of a hit for a perfect guard |
| T, V, H, X, B, G | taunt, victory, hurt, KO, bones, hitboxes |

After a normal hit lands, a power key cancels into that power. "Free MP" in the panel is on by default; untick it
to test MP costs (powers 15 to 60 MP, ultimate 100 MP, MP refills slowly and on hits).

## Powers (names and mechanics from the game's power table)
| Hero | U (Power I) | I (Power II) | O (Power III) | P (ultimate) | Passive |
| --- | --- | --- | --- | --- | --- |
| Fire | Hot Shot: fireball, Burn | Scorch Dash: flaming dash, burning trail | Furnace Rise: fire column under the foe, launches | Inferno Crown | Burn lasts longer |
| Water | Jet Lance: water jet, shoves | Undertow: wave across the arena | Bubble Lock: traps the foe in a bubble | Maelstrom | hits refill more MP |
| Ice | Rime Dart: fast shard, Slow | Glacier Gate: ice wall blocks the foe 4 s | Permafrost: ice spikes freeze the foe | Absolute Zero | hits slow a little |
| Wind | Breeze Shove: gust, big knockback | Whirl Kick: spinning kick, 6 hits | Razor Draft: 3 wind blades | Tempest | double jump |
| Earth | Boulder Lob: arcing boulder | Granite Fist: armoured punch (no flinch) | Groundbreak: rock-spike shockwave, grounded foes | Titan Quake | block chip halved |
| Leaf | Vine Snare: vine grabs and pulls | Burr Mine: hidden seed mine, Root | Thicket Rise: roots across the floor, heals 8 | Lotus Bloom (heals 15) | HP regen out of combat |
| Light | Bright Dart: very fast dart, Dazzle | Sunlance: piercing beam, 4 hits | Shine Shield: blocks the next hit, heals 6 | Dawnburst | projectiles faster |
| Gravity | Grav Well: well drags the foe in | Anchor Drop: mass slams the foe down | Weightless: foe floats, takes +25% | Event Horizon | knockback pulls toward you |
| Time | Rewind Step: back to 2 s ago | Tick Field: clock field slows the foe | Freeze Frame: stops the foe 1.2 s | Zero Hour | MP after a perfect guard |

The game's power names are used where the master prompt's names contain banned words (Ember Shot, Tide Roll,
Echo Step, Stillness, Flash Orb).

## Looks (from the hero sheets in gemini/characters/<el>/reference.png)
All drawn in code, no images: one glowing silhouette body like Lightning, a code-drawn head per element with normal,
attack, hurt and knocked-out faces, and the sheet's signature pieces: fire flame hair, red headband with fluttering
tails and eye slits; water wave hair stream and visor; ice crystal crown, shoulder shards and crystal fist; wind
goggles and long scarf; earth helmet with visor slit and rock armour; leaf laurel, vines and a pink flower; light halo,
cape and shoulder pads; gravity slit visor, cape and orbit ring; time gear crown, gear pauldrons and visor.

## Files
| File | What it is |
| --- | --- |
| `kits.ts` | Element colours, names, powers and passives |
| `cut.mjs`, `picks.mjs` | Cut the heads and pieces out of each hero's `gemini/characters/<el>/parts-sheet.png` into `gemini/characters/<el>/parts/` and `gemini/characters/hero-parts.json` (`node gemini/trial/cut.mjs scan` shows the numbered parts; `picks.mjs` names them) |
| `heads.ts` | Code-drawn dummy head, plus flame and gear shapes for the effects |
| `rig.ts` | Skeleton and code-drawn body (from the Lightning rig); picture heads (4 faces) and pieces (capes, shoulder and wrist pieces, scarf wrap, time gear, chest emblems); charge energy |
| `base.ts` | Copy of the Lightning lab's base animations, so this lab does not change when that one is edited |
| `anims.ts` | Element clips: a hand-keyed clip for every power and ultimate (wind-up, strike, follow-through, recovery; per-key easing from `base.ts`) |
| `fx.ts` | Element effects: flames, waves, ice and rock spikes, swirls, clock rings, vines, lotus, wells, bubbles, projectiles, auras, shields |
| `stage.ts` | Training stadium in the element colour (arena `stadium`) |
| `lab.ts` | The lab: input, combo, cancels, MP, statuses (Burn, Slow, Freeze, Root, Float, Bubble, Stop, Dazzle), walls, mines, fields, hits, guard, camera, dummy AI, panel |
| `shots.mjs` | Screenshots of every hero (`shots/`) |
| `film.mjs` | Frame-by-frame film strips of moves: `node gemini/trial/film.mjs <el or all> <moves or all>` (`shots/film/`) |
| `ground.mjs` | Opens every hero in every arena: page errors, frame rate, screenshots in `shots/ground/` (`node gemini/trial/ground.mjs all`) |
| `check.mjs` | Behaviour check, frame-stepped (combo, heavy, each power, ultimate, block, perfect guard) |
| `vite.trial.config.mjs` | Check server on port 5191 without hot reload |

## Checked (2026-11-23)
- `ground.mjs all`: 9 heroes x 12 arenas (108 pages), no page errors, 48 to 62 fps headless (no GPU). Lightning opens his lab in the chosen arena and its Hero list leads back.
- `check.mjs`: all 9 heroes pass. Each hero: 4-hit combo 35 damage, heavy 18, every power does its job (damage,
  status, wall, barrier, rewind or heal), ultimate 28 to 45, early block 1 chip damage, perfect guard 0. No page errors.
- Typecheck clean for these files.
- Screenshots in `shots/` (idle, heavy, each power, ultimate scene and finisher, guard, pose close-ups).

## Known limits
- Earth's boulder fists and forearm rocks, and the wind scarf tails, are still code-drawn (the sheet versions were joined or did not bend).
- Side view only; facing left is a mirror.
- The lab is not part of the game build.

## Screens (gemini/screens)
Every mock-up in `gemini/extra/` shown as the picture itself, with click areas over its buttons (`refs.ts`), linked
from the top of the trial panel. Add `&boxes=1` to see the click areas. The fight and Zombie Survival play on the
lightning arena picture, with the HUD strip and touch buttons cut from `fight-hud.png` and `zombie-survival-hud.png`
(`hudref.ts`, `play.ts`).
Open http://localhost:5190/gemini/screens/ (all screens) or `?page=<name>`: `title`, `lobby`, `road`, `roster`, `customise`,
`shop`, `ranked`, `versus`, `fight`, `pause`, `settings`, `victory`, `levelup`, `zombie` (add `&wave=10` to start later),
`bestiary`, `icons`, `keyart`, `poster`. The flow works end to end: lobby, Champion Road or Ranked, versus, a best-of-3
fight against the AI (or Local 2P), victory with XP and coins, level up, back to the lobby. Coins buy cosmetics in the
shop (earned in play only). Zombie Survival: endless waves of Walkers, Runners, Spitters, Officers (riot shield, hit
from behind) and Bombers, with a boss every 5th wave (Brute: slams shockwaves you jump over and charges; Toxic Titan:
acid volleys and calls up Walkers). Esc pauses. Heroes use this lab's rig, heads and clips; Lightning uses a
code-drawn visor head. These are dev pages, so they use the gemini/extra pictures; the `src/` game build does not.
`node gemini/screens/shots.mjs [pages] [outDir]` (check server on 5191) shoots every screen next to its mock-up.
