# Earth Arena Lab

Earth Arena (the ruined rune temple): the owner's picture arena.png with the floating rocks bobbing in the air, the carved runes pulsing with light, warm light shafts, drifting dust and the floor circuits glowing. Every so often the ground trembles: the rocks shake, a dust cloud rolls up from the floor and pebbles fall. Music: "Rune Quake", a 100 BPM tribal loop in E with a Phrygian F and a deep earth drone underneath.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/eartharena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 630 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (rumble, crackle) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs eartharena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
