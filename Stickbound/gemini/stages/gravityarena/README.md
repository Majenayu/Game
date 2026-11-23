# Gravity Arena Lab

Gravity Arena (the space platform at the black hole): the owner's picture arena.png with the accretion disks turning, matter spiralling into the black hole and the two smaller vortices, the gyroscope ring spinning, debris orbiting, the light pillars pulsing and stars twinkling. Every few seconds the black hole pulses: a ring of light spreads out and the platform shimmers. Music: "Event Horizon", a slow 84 BPM loop in A minor with a deep drone.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/gravityarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 630 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (hum, chime) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs gravityarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
