# Reference art inventory (owner's Gemini concept images)

Source folder: `Stickbound/gemini/` (23 PNG files, all 1376x768). `ALLOW_AI_BACKGROUND_IMAGES = NO`, so none of these
files ships in the game or the zip; everything is redrawn in code. The folder is git-ignored. Text inside the images is
ignored and never copied. IDs R00 to R22 follow the sorted file names and are used in `compare/`.

| ID | File | What it shows | Maps to |
| --- | --- | --- | --- |
| R00 | Gemini_Generated_Image_g99hyvg99hyvg99h (1).png | Furnace hall: two robotic arms, molten channels on both sides, a big orange light shaft from a ceiling vent, sparks, glossy orange floor | Fire arena: Plasma Foundry |
| R01 | Gemini_Generated_Image_g99hyvg99hyvg99h.png | Fire hero sheet: black body with thick orange neon outline, red headband with tails, flame hair, white eye slits, glowing chest core; idle, walk, punch, fireball, flame wall, super flame burst, victory pose, face and power icon | Fire hero |
| R02 | ...t3a6 (1).png | Night harbor: cranes, stacked lit containers, rain, two cyan light beams, a wet reflective dock floor | Water arena: Flooded Harbor Docks |
| R03 | ...t3a6 (10).png | Leaf hero sheet: green outline, laurel crown of leaves, vine whips, pink lotus flower shield, lotus super | Leaf hero |
| R04 | ...t3a6 (11).png | Glass bio-dome with ribbed panes, glowing mushrooms and plants, green light beams, reflective floor | Leaf arena: Bio-Dome Garden |
| R05 | ...t3a6 (12).png | Light hero sheet: pale gold outline, floating halo, white cape, visor, light shield, starburst super | Light hero |
| R06 | ...t3a6 (13).png | Space station hall: big octagonal window onto a planet with a bright sun flare, pale gold light beams, white glossy floor | Light arena: Orbital Station |
| R07 | ...t3a6 (14).png | Gravity hero sheet: magenta-violet outline, a ring orbiting the head, dark cape, visor, purple comet punch, swirl super with rocks | Gravity hero |
| R08 | ...t3a6 (15).png | A black hole with glowing accretion rings, purple light beams, a round violet platform floor | Gravity arena: Gravity Well |
| R09 | ...t3a6 (16).png | Time hero sheet: teal outline, a gear crown, visor, hourglass, clock-face rings shot, afterimage | Time hero |
| R10 | ...t3a6 (17).png | Clock hall: giant brass gears, a pendulum, clock faces, teal light beams, a teal stage floor | Time arena: Chrono Hall |
| R11 | ...t3a6 (18).png | Zombie sheet: walker, runner, brute (big rock-armoured), spitter, bomber, riot officer with shield, all dark bodies with neon green or red cracks | Zombie Survival enemies |
| R12 | ...t3a6 (19).png | A masked black figure on a dark tech platform with a violet vortex at its feet, magenta beams, glitchy neon city below | Final champion / Crown Arena |
| R13 | ...t3a6 (2).png | Ice hero sheet: ice-blue outline, crystal spikes on the head, eye strip, ice shard shot, ice spike wall super | Ice hero |
| R14 | ...t3a6 (3).png | Cryo lab: frosted cryo tubes, pipes, cold fog, one white light shaft from the ceiling, icy floor | Ice arena: Cryo Lab |
| R15 | ...t3a6 (4).png | Lightning hero sheet: yellow outline, swept spiky hair, goggles visor, lightning arcs around the body, storm super | Lightning hero |
| R16 | ...t3a6 (5).png | Neon rooftop at night in a storm: city towers, billboards, lightning bolts, yellow search beams, wet floor | Lightning arena: Neon Rooftop (storm) |
| R17 | ...t3a6 (6).png | Wind hero sheet: mint outline, long scarf, visor, wind slash, tornado super with leaves | Wind hero |
| R18 | ...t3a6 (7).png | Sky-rail station above the clouds: floating islands, rails, mint wind swirls, glass platform | Wind arena: Sky-Rail Terminal |
| R19 | ...t3a6 (8).png | Earth hero sheet: bronze outline, rock shoulder and fist armour, helmet visor, rock punch, boulder super | Earth hero |
| R20 | ...t3a6 (9).png | Jungle temple ruins: carved pillars with glowing runes, floating rubble, gold light beams, a circuit-traced stone floor | Earth arena: Ancient Tech Ruins |
| R21 | ...t3a6.png | Water hero sheet: cyan outline, wavy hair, visor, water whip, wave super | Water hero |
| R22 | Gemini_Generated_Image_yb1vnkyb1vnkyb1v.png | Lobby mockup: neon city night behind, two heroes (fire, lightning) on a round holo podium with name tags, a big gold PLAY button with the mode underneath, mode tiles with art (Champion Road, Ranked Ladder, Training, Local 2P), right column with Daily Streak (chest), Daily Quests, a news tile, an Avatars tile; top bar with an XP ring, a rank badge, a streak flame, coins, a settings gear | Lobby |

Not present: style-specific sheets (Striker, Warden), fight HUD, versus, results, shop, settings, power effect sheets,
store cover art. Those screens follow the lobby's style; Striker and Warden looks are derived (see DECISIONS_LOG D45 on).

## Shared style read from the sheets

- Heroes: solid near-black body, thick limbs, a bright neon outline in the element colour with a soft outer glow, a
  dark head with the same outline, glowing white eye slits or a visor instead of a drawn face, a star-shaped chest core.
  Each element has one signature head piece and sometimes a back or arm piece.
- Arenas: one strong light shaft or a few beams, a dark frame around a bright centre, a glossy floor that mirrors the
  scene, a clear empty fight plane in the lower third.
- UI: dark glass panels with cyan or magenta neon edges, a gold primary button, rounded tiles with art.
