# Elementick assets and licences

Elementick ships **no third-party art, sound, music or font files.**

| Asset | Source | Licence |
| --- | --- | --- |
| Stick figures, faces, hats, effects, arenas, icons | Drawn in code (`src/render/*`, `src/ui/preview.ts`) by majen / Kiro | Original, owned by majen |
| Sound effects and 6 music loops | Synthesized live with WebAudio (`src/audio/synth.ts`) | Original, owned by majen |
| Fonts | The player's system UI font (`system-ui`, Segoe UI, Roboto, Arial). No font files are bundled. | n/a |
| Phaser 3.90.0 (game engine, bundled) | https://github.com/phaserjs/phaser | MIT |
| Dev-only tools, not shipped: Vite, Vitest, TypeScript, Playwright, archiver | npm | MIT / Apache-2.0 |

No CC-BY-SA, GPL or NC material is used anywhere.

- gemini/code/ElementalStickRig.ts (not shipped, not saved in the repo): AI-assisted code reference (Gemini), adapted. Only ideas were used (round-capped capsule limbs, glow/outline/fill pass order, fill colour #0B0D17). Our renderer is src/render/hero/.

## Shipped image parts (owner decision ALLOW_AI_HERO_PARTS = YES)
- public/parts/lightning.webp (+ lightning.json): head_normal, head_attack, head_ko, hair, ear, core, fist, foot, hurt_body. AI-generated (Gemini), edited: cut from gemini/parts/lightning/kit.png by tools/cut-parts.mjs (green key, despill, trim, scale to 128 px, WebP). The kit sheet itself and arena images are not shipped.
- gemini/stages/engine/parts/*.png (lab only: in the repo as a dev tool, not in the game build; moved from gemini/parts/lightning/parts/): head, torso, pelvis, upperArm, forearm, hand, fist, thigh, shin, foot, ear. AI-generated (Gemini) by the owner, sheet gemini/stages/engine/image (1).png. Edited: cut by gemini/stages/engine/cut.mjs (box crop, inside filled with #141833, trimmed). Used by the arena labs (gemini/stages/). Checked 2026-11-16.

## Arena lab pictures (lab only: in the repo as a dev tool, not in the game build, ALLOW_AI_BACKGROUND_IMAGES = NO)
All 1376x768, AI-generated (Gemini) by the owner, copied unedited into gemini/stages/<element>arena/arena.png. The labs change them only in memory at load time (moving pieces lifted out, holes filled). Music and sounds for every arena are synthesized live with Web Audio (gemini/stages/engine/audio.ts), original, owned by majen. Checked 2026-11-23.
- lightningarena: Volt City rooftop, from gemini/Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (5).png (moved from gemini/parts/lightning/arena.png). Has the Gemini sparkle mark bottom right.
- Sources in gemini/ (byte-identical copies, matched by MD5): firearena Gemini_Generated_Image_g99hyvg99hyvg99h (1).png; waterarena t3a6... (1); icearena (3); windarena (7); eartharena (9); leafarena (11); lightarena (13); gravityarena (15); timearena (17); shadowarena (19), all Gemini_Generated_Image_t3a6tbt3a6tbt3a6 (n).png.
- shadowarena: the painted stickman in the middle is removed in code. icearena: the painted "Cryo Lab" logo is removed in code. Neither is part of any other work; they were removed so the fighters stand alone.
