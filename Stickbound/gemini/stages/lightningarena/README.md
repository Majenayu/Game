# Lightning Avatar Lab

A page where you control the Lightning avatar freely in a stadium and try every move on a sparring dummy.

**Open it:** start the dev server in `Stickbound/` (`npx vite`), then go to
http://localhost:5190/gemini/stages/lightningarena/

All arenas live in `gemini/stages/<element>arena/`; the code they share is in `gemini/stages/engine/`. The arena list in the panel switches between them. See `../README.md`.

In this folder: `arena.png`, `arena.ts` (floor detection and the arena definition), `arenafx.ts`, `index.html`, `shots/`. The other files in the table below are in `../engine/`.

## Files

| File | What it is |
| --- | --- |
| `image (1).png` | Source parts sheet (transparent, outlined parts). Owner-supplied, AI-generated with Gemini. |
| `cut.mjs` | Cuts the sheet into `parts/*.png`, fills each part's inside with the body colour (#141833). Run: `node gemini/stages/engine/cut.mjs` |
| `parts/` | The 11 cut parts. Only `head.png` is drawn now; the body is drawn as one silhouette in code (the cut limb pictures showed seams at every joint). |
| `rig.ts` | Rig: skeleton and a one-piece body drawn in code (limbs, torso, hands and feet share one glowing outline, so no joint shows as a separate piece), the head picture, chest core, expressions, crackles while charging. |
| `anims.ts` | All animations as data: idle, walk and run cycles, jump and fall, plus keyframed clips with frame data and hitboxes. |
| `arena.png` | The arena backdrop picture (owner's Gemini art, Volt City rooftop). `lab.ts` lines its yellow roof rail up with the floor (found by scanning for the brightest yellow row), scales it to fill the view and pans it at 20% of the camera. |
| `stage.ts` | A drawn-in-code city backdrop, used only when `arena.png` is missing. |
| `arenafx.ts` | Moving effects on the picture, placed in its own pixels: the painted clouds drift (two shifted copies of the cloud area, cross-faded), dark wisps cross the sky, lightning hits the tower spires on a fixed timetable (more often during Thunder God) and lights the clouds, sky and floor, beams pulse, billboards glow, scan and flicker, spire lights blink, sparks float up, small gold crackles. Render only, so the fight stays deterministic. |
| `audio.ts` | Arena sound made live with Web Audio (no files): an original 124 BPM synth loop in A minor (kick, claps, hats, bass, side-chained pad, arpeggio with echo, a lead on the second pass), storm wind, and thunder for every strike (crack plus rolling rumble, panned to the strike). Starts on the first click or key; panel has music, thunder and volume; M toggles music. |
| `arenashots.mjs` | Arena screenshots (calm, drift, strikes, cloud arc, ultimate, 4 screen sizes), frame rate and a sound check. |
| `fx.ts` | Lightning effects engine: branching bolts (glow, mid and white core, with forks), flares, floor aura flames, arcs crawling over the body, the hex lightning shield, storm clouds and sky pillars. All flicker comes from seeds, so the fight stays deterministic. |
| `lab.ts` | The lab: input, movement, combo queue, power cancels, shield and perfect guard, hits, hit-stop, shake, the ultimate camera, the dummy (it can fight back) and the panel. |
| `index.html` | The page. |
| `compare.mjs` | Side-by-side of the reference poses in `gemini/parts/lightning/kit.png` and the avatar (`shots/compare.png`). Body proportions are tuned to it: head about 32% of height sitting on the shoulders, broad shoulder yoke tapering to the crotch, wide fighting stance. Three body builds (Slim default, Medium, Bold) in the panel; `builds.mjs` writes `shots/builds.png`, rounded leg ends. |
| `shots.mjs`, `check.mjs` | Screenshot script and behaviour check (4-hit combo, every power hits, power cancel, block, perfect guard). |
| `fxshots.mjs` | Close-ups of every effect at its best frame (`shots/fx-*.png`). |
| `shots/` | Latest screenshots. |

## Moves (frame data at 60 frames per second)

| Key | Move | Startup | Active | Recovery | Damage |
| --- | --- | --- | --- | --- | --- |
| J | Jab | 6 | 4 | 10 | 6 |
| J J | Cross | 8 | 4 | 12 | 8 |
| J J J | Thunder Kick (also J in the air) | 10 | 5 | 19 | 11 |
| J J J J | Rising Volt (launcher, lifts the foe) | 8 | 5 | 21 | 10 |
| K | Volt Hammer (charged overhead slam, launches) | 19 | 5 | 28 | 18 |
| L | Bolt Dash (fast dash with after-images) | none | none | 8 | 0 |
| U | Spark Step (teleports behind the foe, back elbow) | 16 | 5 | 25 | 12 |
| I | Chain Bolt (3-hit lightning beam, 430 px reach) | 17 | 1 x 3 | 17 | 17 |
| O | Skyfall Strike (storm cloud gathers, marks the foe, bolt from the sky) | 44 | 1 | 25 | 22 |
| P | Thunder God, ultimate (2.5 s: arena dims, camera zooms in, 5 sky bolts, then a final pillar) | - | 6 hits | - | 36 |

After a normal attack lands, any power key cancels into that power ("CANCEL!").

S raises the lightning shield (a hex dome of arcs). A normal block takes 20% chip damage and never KOs. Raising it within 8 frames of the hit is a **perfect guard**: no damage, a gold flash, the attacker is stunned for 34 frames.

The dummy can fight back (panel checkbox): every 1.7 to 2.8 s it flashes red, then throws a jab or kick.

Also: Shift run, T taunt, V victory, H hurt, X KO fall, B bones, G hitboxes.
The panel can loop any animation and slow everything down (speed slider) to study it frame by frame.

## Checked

- `check.mjs`: the 4-hit combo deals 35 (all four land), Volt Hammer 18, Spark Step 12, Chain Bolt 17, Skyfall 22, Thunder God 36, jab into Chain Bolt cancel 23, early block 1 chip damage, late block a perfect guard (0 damage), no guard 6 damage, no page errors.
- Typecheck clean; project unit tests 34 of 34 pass.
- The sim runs at a steady 60 frames per second (headless Chrome; render about 48 fps without a GPU).
- Screenshots at 1366x768, 1920x1080, 844x390 and 390x844 in `shots/`. Phones get on-screen buttons and a ☰ panel.

## Known limits

- Side view only. The parts are drawn facing right; facing left is a mirror.
- One head picture. Attack, hurt and KO faces are painted over the mouth in code; better head pictures would look nicer (see PROMPTS.md).
- The lab is not part of the game build (ALLOW_AI_BACKGROUND_IMAGES = NO). `gemini/stages/` is in the repo as a dev tool; `shots/` folders are gitignored.
