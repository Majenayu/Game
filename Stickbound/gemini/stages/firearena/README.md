# Fire Arena Lab

Fire Arena (the foundry): the owner's picture arena.png with moving lava falls, welding-spark showers from the robot arms, rising embers, a flickering ceiling lamp and glowing floor reflections. Lava bursts from the pool now and then. Music: "Forge Heart", a heavy 150 BPM half-time loop in D minor with a fire roar underneath.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/firearena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 640 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (crackle) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs firearena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
