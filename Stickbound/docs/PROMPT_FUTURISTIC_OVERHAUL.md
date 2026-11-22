AUTONOMOUS VISUAL OVERHAUL for Elementick (folder Stickbound/): FUTURISTIC LOOK. Same operating rules as before: never ask
me questions, decide and log in docs/DECISIONS_LOG.md, commit and publish after each milestone, keep all tests green, revert
anything that breaks the build. I am asleep. Do not stop until the Definition of Done is met.

PROBLEM (verify in docs/shots/): the fight arenas look plain and childish: pale flat colors, copy-pasted round trees, a flat
brown floor, low contrast. The stickmen are thin black lines with little detail. UI panels are generic. Nothing says "futuristic".
I want a stunning, futuristic, high-energy look that would stand out on the CrazyGames front page. Gameplay, sim rules and the
90 powers stay exactly as they are (sim untouched, determinism test must still pass). Use the existing power effects system
(render/fx.ts, Power Lab) and make it look better in the new world.

ART DIRECTION ("neon arena-tech"), all code-drawn or baked at load, no big downloads (initial download stays under 5 MB):
- Palette: dark deep-space navy and violet bases, bright element-colored neon accents, white-hot cores. High contrast. The
  FIGHT PLANE must stay readable: backgrounds are darker and less detailed than the fighters, fighters get a bright rim light,
  and nothing busy sits behind the action. Fighters, hitboxes and telegraphs must remain clear at 844x390.
- Depth: 5 to 7 parallax layers per arena (far sky or void, mega-structures, mid structures, near props, floor plane, foreground
  light shafts and drifting particles). Baked to textures at load, with a few animated elements (moving traffic and drones,
  blinking signs, scrolling holo-ads, rotating rings, steam, energy conduits pulsing).
- Floor: glossy reflective floor with a soft mirrored reflection of the fighters and lights (cheap fake reflection by drawing
  fighters flipped and faded), glowing grid lines or lane markings, light pools under fighters, per-arena decals.
- Lighting: volumetric light beams, colored rim lights, bloom-like glow (baked radial sprites with additive blending),
  vignette, subtle scanline or film grain option, and slight camera parallax.

ARENAS (replace the current 8 with 10 new futuristic ones, each with its own color story, silhouette and animated life; log
how each maps to the old ids so saves and Champion Road still work):
 1. Neon Rooftop Grid: towering holo-billboards, rain-slick roof, flying traffic lanes.
 2. Orbital Station Deck: planet and stars through glass, rotating ring, docking arms, warning lights.
 3. Reactor Core: giant glowing core, energy conduits, steam and sparks, pulsing light.
 4. Cryo Lab: frozen specimen pods, frosted glass, cold blue mist.
 5. Bio-Dome Garden: glowing alien flora, glass dome, bioluminescent plants (replaces the forest).
 6. Plasma Foundry: molten energy flows, robotic arms, sparks (replaces the lava cave).
 7. Sky-Rail Terminal: floating platform among megacity towers, maglev trains passing in the distance.
 8. Ancient Tech Ruins: crumbled monoliths with glowing runes and floating shards (replaces the ruins).
 9. Data Void: abstract cyber-space, floating geometry, streaming data columns, glitch effects.
10. Gravity Well Arena: warped ring-shaped arena around a dark singularity with lensing light.
Each arena gets a distinct ambient sound layer (synthesized) and a music tint.

ARENA REACTS TO POWERS (this is where it must feel alive; do it for all 90 powers through the existing FX system, element-wise):
 - Fire: floor and nearby surfaces flash orange, heat shimmer rings, panels flicker. Water: ripples across the glossy floor,
   light refracts. Ice: frost creeps over glass and floor edges. Lightning: whole-screen flash, background lights strobe,
   brief glitch line. Wind: loose particles and banners whip, light streaks. Earth: floor cracks, dust, the camera shakes the
   structures. Leaf: glowing vines climb props. Light: lens flare and rays. Gravity: background warps and objects drift toward
   the effect. Time: background desaturates and ghost-trails. Super (Power III) moves also pulse the arena lights and trigger a
   brief color-graded zoom. Everything respects reduced motion and low graphics.

CHARACTERS: still stickmen (thick rounded line figures, round heads), but clearly futuristic and premium:
 - Glowing line work: dark core line with a bright element-colored rim, subtle outer glow, and an energy core in the chest
   that glows with the element and flares when casting.
 - Light-strip joints and bands on arms and legs that pulse with MP level; a visor or glowing eye-line for the face; keep
   the expressive faces (angry, hurt, determined, etc.) readable through the visor style.
 - Movement trails, speed afterimages on dashes, ground impact rings on landings, footstep light flicks on the floor.
 - Forge options (all cosmetic, code-drawn): 12 headgear (visors, helmets, antennas, halo rings, cyber crowns, hoods with
   light edges), 8 back pieces (capes of light, jet fins, drone companion, energy wings), 8 suit patterns, 10 aura styles, 6
   weapon-less hand effects, 8 win poses. Cosmetics never change stats. Champions, bosses and zombies get matching looks (cyber
   zombies with exposed circuits, boss silhouettes with larger rigs and glowing cores).
 - Keep silhouettes readable at small size.

UI AND SCREENS:
 - HUD: holographic angled bars with segmented HP and MP, glow, smooth drain animations, element emblem, combo counter with
   neon style, timer in a hex frame, round pips, a slick KO banner and a cinematic "ROUND 1, FIGHT!" intro with light sweeps.
 - Lobby: upgrade to a sci-fi hangar or skyline hub with animated holograms, neon signs, a podium with energy ring, glass-morphism
   panels with glowing borders, animated tile backgrounds, tasteful sound. Keep the layout that works on phone and desktop.
 - Menus: Avatars, Forge, Shop, Settings, Ranked, Champion Road map (futuristic district map with glowing nodes and paths),
   results and level-up screens all restyled to match, with smooth transitions.
 - Versus screen with both squads, big element emblems, light sweeps, and name plates.
 - Typography: pick an OFL futuristic display font plus a readable body font via Fontsource (for example Orbitron or Exo 2 for
   titles and Rajdhani or Inter for body). Record fonts and licenses in docs/ASSETS.md and include license files. Text stays
   readable (contrast, size) and works for all supported languages in the current build.
 - Settings: Graphics quality (High, Medium, Low), bloom, reflections, particles, reduced motion, reduced flashing, screen shake.
   Auto-select quality by measuring frame time on the first fight, and keep adaptive quality at runtime.

PERFORMANCE AND LIMITS:
 - 60 fps at 1366x768 on a desktop GPU, and at least 60 fps average with the 4x CPU throttle on the busiest fight on Medium
   quality; Low quality must run well on weak phones. Bake backgrounds, pool particles, no per-frame allocation.
 - Initial download under 5 MB. Lazy-load per-arena assets if needed.
 - The sim, determinism test and all balance results must not change.

REVIEW LOOP (mandatory, do not skip):
 For each major screen (fight in every arena, lobby, avatars, forge, champion road, versus, results) take screenshots at 1366x768,
 1920x1080, 390x844 and 844x390, critique them honestly against this checklist: Is there a clear focal point? Is the fight plane
 readable? Is there depth? Is the look consistently futuristic? Would it stand out on a portal front page? Is anything flat,
 empty, muddy or generic? Fix and re-shoot. Do at least 3 improvement iterations on the fight screen and the lobby. Save
 before/after images in docs/visual-overhaul/. Also render a Power Lab contact sheet of 12 flagship powers inside the new arenas
 (a mix of elements and styles) and fix any power that gets lost against its background.

DEFINITION OF DONE:
 1. All 10 arenas implemented, distinct, animated, with power reactions for every element, and both quality modes work.
 2. Futuristic characters, cosmetics, HUD, lobby and menus done, consistent, and readable on phone landscape.
 3. Typecheck, unit tests, determinism, banned-word scan (including all new names and text), 10,000-match balance, Champion Road
    walkthrough, Playwright smoke and first-run, memory soak, fps (normal and 4x throttle) all pass. First win still under 60 s.
 4. Old saves still load (avatars, looks and arena choices map correctly).
 5. Rebuild the CrazyGames zip, covers, screenshots (futuristic ones!), preview videos; publish to /stickbound/; update
    PROGRESS.md, FINAL_REPORT.md and STORE_TEXT.md.
 6. Be honest about anything unverified (real phone feel and fps). Never publish to CrazyGames, create accounts or spend money.
Start now and keep going until done.
