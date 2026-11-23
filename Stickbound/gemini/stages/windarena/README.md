# Wind Arena Lab

Wind Arena (the sky platform): the owner's picture arena.png with the floating islands bobbing on the wind, wind streaks and swirls sweeping across, leaves blowing past, light pulses running along the mag-rail tubes and the light shafts breathing. Strong gusts blow a flurry of leaves and streaks across now and then. Music: "Skyrail", a bright 124 BPM driving loop in D with an airy wind bed.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/windarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 605 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (whoosh) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs windarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
