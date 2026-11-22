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
