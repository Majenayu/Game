# Ice Arena Lab

Ice Arena (the cryo lab): the owner's picture arena.png. The painted "Cryo Lab" logo and badge in the top left corner are removed. Snow falls, cold fog rolls across the floor, the ceiling lamp's cone of light shimmers, the cryo tubes glow, steam puffs out of the pipe and frost glints on the ice. Music: "Cryo Drift", a calm 90 BPM loop in B minor with bells.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/icearena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 660 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (whoosh, chime, creak) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs icearena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
