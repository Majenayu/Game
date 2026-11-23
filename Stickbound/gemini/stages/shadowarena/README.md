# Shadow Arena Lab

Shadow Arena (the dark platform over the glitch city): the owner's picture arena.png. The stickman painted in the middle of the picture is removed (the fighters stand there instead) and a turning shadow vortex covers the place where its feet were. Smoke drifts on both sides, the circuit lines on the platform pulse with light, the city below glitches and flickers, and every few seconds the vortex surges with a burst of dark sparks. Music: "Null Signal", a fast 140 BPM driving loop in F# minor.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/shadowarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 560 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (hum, crackle) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs shadowarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
