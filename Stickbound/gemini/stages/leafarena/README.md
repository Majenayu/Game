# Leaf Arena Lab

Leaf Arena (the glass-dome greenhouse): the owner's picture arena.png with falling leaves and petals, drifting glowing spores, breathing mushroom lights, swaying light shafts and a gust that blows a flurry of leaves across now and then. Music: "Greenhouse Bloom", a gentle 96 BPM tribal loop in G major.

**Open it:** start the dev server in `Stickbound/` (`npx vite --port 5190`), then go to
http://localhost:5190/gemini/stages/leafarena/

Controls, moves and the panel are the same as the Lightning arena (see `../lightningarena/README.md`). The arena list in the panel switches to any other arena.

## Files
| File | What it is |
| --- | --- |
| `arena.png` | The owner's Gemini picture (1376x768), copied unedited. All edits (removing painted parts, lifting moving pieces) happen in code at load time. |
| `arena.ts` | This arena: floor line (y 650 of 768 in picture pixels), the moving effects drawn in picture pixels, the sound events (whoosh, chime) and the music spec. Effects are pure functions of the frame number, so the fight stays deterministic. |
| `index.html` | The page. |
| `shots/` | Screenshots from `node gemini/stages/engine/arenashots.mjs leafarena` (not committed). |

Shared code (fighter, moves, effects kit, Web Audio music) is in `../engine/`.
