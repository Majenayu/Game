# Arena labs

One folder per arena, built from the owner's Gemini pictures. Each arena is the picture unchanged, the Lightning fighter and a sparring dummy on its floor, moving effects matching the picture, and original music made live with Web Audio (no audio files).

**Open:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to http://localhost:5190/gemini/stages/ for the list, or straight to `http://localhost:5190/gemini/stages/<element>arena/`.

Dev tool only. The arenas are not part of the game build (ALLOW_AI_BACKGROUND_IMAGES = NO).

## Layout
| Folder | What it is |
| --- | --- |
| `engine/` | Shared code: fighter rig and moves (`rig.ts`, `anims.ts`, `fx.ts`), the lab (`lab.ts`, `shell.ts`, `lab.css`), the arena definition type and helpers (`arena.ts`), the effects kit (`fxkit.ts`: cut-outs, lifted pieces, particles, light shafts, bursts), the music and sound engine (`audio.ts`), and the test scripts (`arenashots.mjs`, `check.mjs`, `shots.mjs`, `fxshots.mjs`, `compare.mjs`, `builds.mjs`, `plateshots.mjs` for the picture with its effects at chosen frames, `songcheck.mjs` to render each song to `shots/song.wav` and print its levels). |
| `lightningarena/` | Volt City rooftop. Floor found from the yellow roof rail. Storm effects in `arenafx.ts`. |
| `firearena/`, `waterarena/`, `leafarena/`, `lightarena/`, `eartharena/`, `windarena/`, `gravityarena/`, `timearena/`, `shadowarena/`, `icearena/` | One arena each: `arena.png`, `arena.ts`, `index.html`, `README.md`. |

The Lightning hero kit (`kit.png`, `parts.json`, `PROMPTS.md`), his body parts sheet and the cut body parts are in `gemini/characters/lightning/` (`tools/cut-parts.mjs` reads the kit for the game). Every arena page runs `engine/main.ts`, which looks the folder up in `engine/registry.ts`; the Trial Ground (`gemini/trial/`) uses the same registry and `engine/backdrop.ts`, so every arena is also playable there with the other 9 heroes. The lab's Hero list opens them.

## Adding an arena
1. Make `gemini/stages/<element>arena/` with the picture as `arena.png` and an `index.html` like the others.
2. Write `arena.ts`: an `ArenaDef` with the floor line in picture pixels, `bake` (one-time picture edits), `draw` (effects as a function of the frame), `sounds` (events on a timetable) and the `Song`/`Air` music spec, and export it.
3. Add it to `ARENAS` in `engine/arena.ts`, to `ARENA_DEFS` in `engine/registry.ts`, to `index.html` here and to `gemini/index.html`, and give its folder an `index.html` like the others (it loads `../engine/main.ts`).
4. Check: `npx tsc --noEmit`, then `node gemini/stages/engine/arenashots.mjs <element>arena` (screenshots, frame rate, sound counts).

## Checked (headless Chrome without a GPU; fps varies by about 10 between runs)
| Arena | Floor (y of 768) | fps | Sound events in 60 s | Music: lead / arp / bass and extras | Song length, peak, rms |
| --- | --- | --- | --- | --- | --- |
| Lightning | yellow rail | 39 to 57 | thunder 85 | synth (unchanged) | 33.0 s, 0.54, 0.058 |
| Fire | 640 | 52 to 60 | crackle 51 | brass / synth / drive, taiko, anvil | 27.6 s, 0.67, 0.062 |
| Water | 640 | 60 | splash 16 | glass / drop / synth, wobble | 36.3 s, 0.37, 0.054 |
| Leaf | 650 | 60 | whoosh 6, chime 11 | flute / marimba / synth | 42.0 s, 0.50, 0.075 |
| Light | 640 | 60 | chime 9 | choir / harp / synth | 32.0 s, 0.57, 0.067 |
| Earth | 630 | 58 to 60 | rumble 6, crackle 10 | brass / koto / synth, taiko | 40.4 s, 0.70, 0.072 |
| Wind | 605 | 60 | whoosh 13 | flute / harp / synth, rising wind | 33.0 s, 0.52, 0.065 |
| Gravity | 630 | 50 to 60 | hum 8, chime 4 | choir / synth / synth, falling sweep | 47.7 s, 0.47, 0.081 |
| Time | 612 | 60 | tick 7, creak 8 | glass / music box / pizzicato, tick-tock at 120 BPM | 34.0 s, 0.44, 0.044 |
| Shadow | 560 | 54 to 60 | hum 6, crackle 10 | synth / synth / drive, glitch | 29.4 s, 0.59, 0.070 |
| Ice | 660 | 46 to 60 | whoosh 9, chime 13, creak 1 | glass / music box / synth | 44.7 s, 0.41, 0.059 |

No page errors in any arena, no silent gaps in any song (both passes rendered offline). Not yet checked on a real GPU or a phone, and the music has only been checked by its levels, not by ear.
