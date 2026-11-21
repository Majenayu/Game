# Owner decisions for Phase 0

Answer each one (for example "D1: 1, D2: A, D3: yes, ..."). Recommendations are marked **(recommended)**.
Nothing gets coded until D1 to D6 are answered.

---

## D1. Game title

A web search shows **"Lanternfall" is already used by at least five games**: two on Steam, one on Google Play
(Lanternfall: Dungeon Town), several on itch.io, and the site playlanternfall.com. Using it would make the game hard to
find and could cause trademark trouble.

Mockup: `docs/mockups/names.png`

| Option | Title | Search result |
| ------ | ----- | ------------- |
| 1 | **Sunfetch** (recommended) | No game with this name found. Short, says the goal ("fetch the sun"), easy to spell |
| 2 | **Glowmote** | No game with this name found. Cute, fits the "small light" feel |
| 3 | **Brightling** | No game found. Also the surname of a villain in Rainbow Six, so a little less clean |
| 4 | Keep **Lanternfall** | Not recommended, see above |

A web search is not a trademark search. Before launch, the owner should also check the trademark database for their
country.

## D2. Palette

Mockups: `docs/mockups/palette-A.png`, `palette-B.png`, `palette-C.png` (same scene, three palettes).

| Option | Name | Feel |
| ------ | ---- | ---- |
| A | **Paper Lantern** (recommended) | Warm amber light, deep indigo and teal. Closest to the brief, cosiest, best contrast for the light mechanic |
| B | Moonlit Ink | Cool silver-cyan light, plum and ink black. Calm and mysterious, less warm |
| C | Festival Dusk | Rose-gold light, teal and magenta dusk. Most colourful on a portal grid, slightly busier |

Each world will still shift the palette (green Meadow, violet Caverns and so on). This choice sets the base light
colour, the UI and the shadow colours.

## D3. Character and term renames

The brief's main names overlap with an existing itch.io game, **Hushlight**, whose hero is named **Wick**, whose
darkness is called **the Hush**, and whose **Ember** is the hero's health and weapon. "Nova" is also a character in
Orb Arena in this workspace, which the brief forbids reusing.

| Brief name | Problem | Proposed name |
| ---------- | ------- | ------------- |
| Wick (hero) | Same hero name as Hushlight | **Tindle** (search found only a minor merchant in Aground and a fan-made Pokémon; "Glim" was rejected because Spiritfarer and another lantern game use it) |
| The Hush (antagonist) | Same antagonist name as Hushlight | **The Quiet** (no game antagonist with this name found) |
| Nova (Spirit 6) | Used in Orb Arena | **Flare** (already used in the docs) |
| Ember (Spirit 3) | Same word as the currency, confusing | **Clinker** |
| Embers (currency) | Generic, but also used by Hushlight and Wickborn | Keep "Embers", or use **Glints** |
| Time Hush (Charm) | Follows the Hush rename | **Time Still** |

Answer: "yes to all", "no, keep the brief names", or pick per row. The docs currently use the brief names (except
Flare) so that nothing is lost; the rename is a find-and-replace once you decide.

## D4. Run length (conflict in the brief)

The brief wants runs of 6 to 10 minutes and five worlds of six stages each. Both cannot be true in one run.

| Option | Run covers | Length | Notes |
| ------ | ---------- | ------ | ----- |
| A | **One world per run** (recommended) | 8 to 10 min | Fits portal sessions. Worlds unlock in order on the star map. Endless Dusk chains them later |
| B | All five worlds per run | 40 to 50 min | Classic roguelite, but long for a portal, and losing late hurts more |

## D5. What ends a run

The brief says death is soft (wake at the last Well, keep banked Embers) but does not say when a run ends.

| Option | Rule |
| ------ | ---- |
| A | **Sparks (lives) per run: Cozy 5, Normal 3, Radiant 1** (recommended). Out of Sparks ends the run |
| B | Never ends; each soft death only costs carried Embers (very easy, little tension) |
| C | One death ends the run, except Cozy (hard for kids) |

## D6. Tech stack

**TypeScript + Vite + Phaser 3**, with a pure TypeScript simulation for rules and balance bots **(recommended)**.
Alternatives: plain Canvas with no engine (smaller, more work), or PixiJS (renderer only, more to build).

## D7. Where the project lives in git

`Lanternfall/` is inside `D:\Vectorflow\cray\Crazy shi\games`, which is the git repo for
`https://github.com/Majenayu/Game` (the `orb arena` folder). Options:

| Option | Setup |
| ------ | ----- |
| A | **Its own new GitHub repo** (recommended). Phase 0 is committed to a local repo inside `Lanternfall/` for now; you create an empty repo and give me the URL |
| B | Commit it into the `Game` repo next to `orb arena` |
| C | Local only, no GitHub yet |

## D8. Small confirmations

- D8a. Cinder's finale choice (ally or leave) is a **player** choice in the story. OK?
- D8b. The secret ending needs **all 12** Souls. Keep 12, or allow 10 of 12 to be kinder?
- D8c. Is the owner's studio name for the credits known?
