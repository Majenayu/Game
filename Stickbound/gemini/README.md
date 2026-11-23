# gemini/: the owner's Gemini pictures and the labs built from them

Dev resources only. Nothing here is part of the game build (`ALLOW_AI_BACKGROUND_IMAGES = NO`); the game redraws
everything in code. Start page: http://localhost:5190/gemini/ (dev server in `Stickbound/`: `npx vite --port 5190`).

| Folder | What is in it |
| --- | --- |
| `index.html` | Trial Ground start page: pick a hero and an arena, then enter |
| `characters/` | One folder per hero: `reference.png` (the hero sheet), and for the 9 Trial heroes `parts-sheet.png` (the generated parts sheet) and `parts/` (heads and pieces cut from it by `trial/cut.mjs`). `hero-parts.json` holds their sizes and head circles. `lightning/` also has the parts kit for the game (`kit.png`, `parts.json`, `out/`, cut by `tools/cut-parts.mjs`), `body-sheet.png` and the cut `body/` parts (by `stages/engine/cut.mjs`). `fire/powers-reference.png` is the fire power sheet. `PROMPT.txt` is the prompt used for the parts sheets |
| `stages/` | The 11 arenas, one folder each (`arena.png`, `arena.ts`, `index.html`, `README.md`), and `engine/`: the shared arena code and the Lightning lab. See `stages/README.md` |
| `trial/` | The Trial Ground: every hero in every arena. See `trial/README.md` |
| `extra/` | Every other picture (screens, menus, HUDs, key art, icons, logo, zombies), kept for the next phases. Not used yet |

## Where each original picture went (sorted 2026-11-23)
IDs are the ones in `docs/reference-art/INVENTORY.md`. 20 of the 39 files were exact copies (same MD5) of pictures
already kept in `characters/` or `stages/`; those copies were removed, as was `avatar/style-example-lightning-parts.png`
(a copy of `characters/lightning/kit.png`). The generated parts sheets came from `avatar/generated refernce/`.

| ID | Now | Original file |
| --- | --- | --- |
| R00 | stages/firearena/arena.png | Gemini_Generated_Image_g99hyvg99hyvg99h (1).png |
| R01 | characters/fire/reference.png | Gemini_Generated_Image_g99hyvg99hyvg99h.png |
| R02 | stages/waterarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (1).png |
| R03 | characters/leaf/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (10).png |
| R04 | stages/leafarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (11).png |
| R05 | characters/light/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (12).png |
| R06 | stages/lightarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (13).png |
| R07 | characters/gravity/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (14).png |
| R08 | stages/gravityarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (15).png |
| R09 | characters/time/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (16).png |
| R10 | stages/timearena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (17).png |
| R11 | extra/zombie-enemies-sheet.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (18).png |
| R12 | stages/shadowarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (19).png |
| R13 | characters/ice/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (2).png |
| R14 | stages/icearena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (3).png |
| R15 | characters/lightning/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (4).png |
| R16 | stages/lightningarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (5).png |
| R17 | characters/wind/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (6).png |
| R18 | stages/windarena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (7).png |
| R19 | characters/earth/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (8).png |
| R20 | stages/eartharena/arena.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (9).png |
| R21 | characters/water/reference.png | Gemini_Generated_Image_t3a6tbt3a6tbt3a6.png |
| R22 | extra/lobby.png | Gemini_Generated_Image_yb1vnkyb1vnkyb1v.png |
| R23 | extra/shop-screen.png | Gemini_Generated_Image_186n3n186n3n186n (1).png |
| R24 | extra/pause-menu.png | Gemini_Generated_Image_186n3n186n3n186n (2).png |
| R25 | extra/logo-wordmark.png | Gemini_Generated_Image_186n3n186n3n186n (3).png |
| R26 | extra/zombie-survival-hud.png | Gemini_Generated_Image_186n3n186n3n186n.png |
| R27 | characters/fire/powers-reference.png | Gemini_Generated_Image_nf4h8rnf4h8rnf4h (1).png |
| R28 | extra/key-art-landscape.png | Gemini_Generated_Image_nf4h8rnf4h8rnf4h (2).png |
| R29 | extra/key-art-portrait.png | Gemini_Generated_Image_nf4h8rnf4h8rnf4h (3).png |
| R30 | extra/element-icons.png | Gemini_Generated_Image_nf4h8rnf4h8rnf4h.png |
| R31 | extra/customise-screen.png | Gemini_Generated_Image_vdreb1vdreb1vdre (1).png |
| R32 | extra/champion-road-map.png | Gemini_Generated_Image_vdreb1vdreb1vdre (2).png |
| R33 | extra/rank-ladder.png | Gemini_Generated_Image_vdreb1vdreb1vdre (3).png |
| R34 | extra/hero-roster.png | Gemini_Generated_Image_vdreb1vdreb1vdre.png |
| R35 | extra/versus-screen.png | Gemini_Generated_Image_vip298vip298vip2 (1).png |
| R36 | extra/victory-screen.png | Gemini_Generated_Image_vip298vip298vip2 (2).png |
| R37 | extra/level-up-popup.png | Gemini_Generated_Image_vip298vip298vip2 (3).png |
| R38 | extra/fight-hud.png | Gemini_Generated_Image_vip298vip298vip2.png |

| Hero | Parts sheet (from `avatar/generated refernce/`) |
| --- | --- |
| fire, water, ice, wind | Gemini_Generated_Image_tom1c9tom1c9tom1.png, (1), (2), (3) |
| earth | Gemini_Generated_Image_bf0oa0bf0oa0bf0o.png |
| leaf | Gemini_Generated_Image_yjevtiyjevtiyjev.png |
| light, gravity, time | Gemini_Generated_Image_nyu90nnyu90nnyu9.png, (1), (2) |
