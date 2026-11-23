# Time Arena Lab

Time Arena (the clockwork hall): the owner's picture arena.png, brought to life in time with a clock. Every second the clock ticks: the painted minute hands step on, the big copper gears in the corners kick forward and settle, and the pendulum reaches the end of its swing (one swing per second). The copper gears in the middle turn all the time, meshing in opposite directions, the hour hands creep round and the small dial sweeps. Only the real gear and hand pixels move (they are lifted off the picture by colour), so the wall behind their gaps stays still. Every 25 seconds the great clock strikes three deep bells, a wave of light runs over the dials and the gears jolt harder. Music: "Clockwork Hall", 120 BPM (two beats per second, so the music's tick-tock falls on the clock's seconds), B minor, a music-box melody over pizzicato bass and a soft tick-tock.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/timearena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 612 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (tick, creak) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs timearena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
