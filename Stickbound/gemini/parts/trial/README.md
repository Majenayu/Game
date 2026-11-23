# Hero Trial (the other 9 heroes)
One lab for Fire, Water, Ice, Wind, Earth, Leaf, Light, Gravity and Time, built like the Lightning Avatar Lab:
move freely in a stadium and try every move on a sparring dummy that can fight back. Lightning keeps its own lab
(`../lightning/`), the hero menu links to it.

**Open it:** start the dev server in `Stickbound/` (`npx vite`), then go to
http://localhost:5190/gemini/parts/trial/?el=fire (or pick the hero in the panel; the choice is remembered).

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

## Looks (from the element reference sheets in gemini/)
All drawn in code, no images: one glowing silhouette body like Lightning, a code-drawn head per element with normal,
attack, hurt and knocked-out faces, and the sheet's signature pieces: fire flame hair, red headband with fluttering
tails and eye slits; water wave hair stream and visor; ice crystal crown, shoulder shards and crystal fist; wind
goggles and long scarf; earth helmet with visor slit and rock armour; leaf laurel, vines and a pink flower; light halo,
cape and shoulder pads; gravity slit visor, cape and orbit ring; time gear crown, gear pauldrons and visor.

## Files
| File | What it is |
| --- | --- |
| `kits.ts` | Element colours, names, powers and passives |
| `cut.mjs`, `picks.mjs` | Cut the heads and pieces out of the owner's sheets in `gemini/avatar/generated refernce/` into `parts/<el>/` and `parts/meta.json` (`node gemini/parts/trial/cut.mjs scan` shows the numbered parts; `picks.mjs` names them) |
| `heads.ts` | Code-drawn dummy head, plus flame and gear shapes for the effects |
| `rig.ts` | Skeleton and code-drawn body (from the Lightning rig); picture heads (4 faces) and pieces (capes, shoulder and wrist pieces, scarf wrap, time gear, chest emblems); charge energy |
| `base.ts` | Copy of the Lightning lab's base animations, so this lab does not change when that one is edited |
| `anims.ts` | Element clips: a hand-keyed clip for every power and ultimate (wind-up, strike, follow-through, recovery; per-key easing from `base.ts`) |
| `fx.ts` | Element effects: flames, waves, ice and rock spikes, swirls, clock rings, vines, lotus, wells, bubbles, projectiles, auras, shields |
| `stage.ts` | Training stadium in the element colour |
| `lab.ts` | The lab: input, combo, cancels, MP, statuses (Burn, Slow, Freeze, Root, Float, Bubble, Stop, Dazzle), walls, mines, fields, hits, guard, camera, dummy AI, panel |
| `shots.mjs` | Screenshots of every hero (`shots/`) |
| `film.mjs` | Frame-by-frame film strips of moves: `node gemini/parts/trial/film.mjs <el or all> <moves or all>` (`shots/film/`) |
| `check.mjs` | Behaviour check, frame-stepped (combo, heavy, each power, ultimate, block, perfect guard) |
| `vite.trial.config.mjs` | Check server on port 5191 without hot reload |

## Checked (2026-11-23)
- `check.mjs`: all 9 heroes pass. Each hero: 4-hit combo 35 damage, heavy 18, every power does its job (damage,
  status, wall, barrier, rewind or heal), ultimate 28 to 45, early block 1 chip damage, perfect guard 0. No page errors.
- Typecheck clean for these files.
- Screenshots in `shots/` (idle, heavy, each power, ultimate scene and finisher, guard, pose close-ups).

## Known limits
- Earth's boulder fists and forearm rocks, and the wind scarf tails, are still code-drawn (the sheet versions were joined or did not bend).
- Side view only; facing left is a mirror.
- The lab is not part of the game build. `gemini/` is gitignored, so these files are local only.
