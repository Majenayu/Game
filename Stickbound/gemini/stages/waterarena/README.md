# Water Arena Lab

Water Arena (the flooded harbour): the owner's picture arena.png with rain, rising bubbles, swaying light shafts, flickering holo screens, glints on the water behind the dock, rain ripples on the wet floor and a wave that splashes over the dock edge now and then. Music: "Tide Engine", a 112 BPM flowing loop in E minor.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/waterarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 640 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (splash) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs waterarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
