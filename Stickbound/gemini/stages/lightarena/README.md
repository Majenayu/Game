# Light Arena Lab

Light Arena (the sun-deck of a space station): the owner's picture arena.png with turning sun rays in the big window, a solar flare that flashes now and then, breathing light beams, flickering ceiling lamps, golden dust and a shine that sweeps across the floor. Music: "Solar Hall", a bright 128 BPM loop in C major.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/lightarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 640 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (chime) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs lightarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
