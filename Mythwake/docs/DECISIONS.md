# Owner decisions for Phase 0

Answer each one, for example "D1: 1, D2: yes, D3: all, D4: A, ...". Recommendations are marked **(recommended)**.
No game code is written until D1 to D6 are answered.

---

## D1. Game title

**"Mythwake" is already used:** playmythwake.com is an online 2D RPG (same genre), Erebyte Games lists a colony sim
called Mythwake, a Steam developer and publisher is named "MythWake Games", and Steam has a game called "Mythawake".

Mockup: `docs/mockups/names.png`

| Option | Title | Store and web check (web search, 2026-11-21) |
| ------ | ----- | -------------------------------------------- |
| 1 | **Talewild** (recommended) | No game found on CrazyGames, Steam, itch.io or Google Play. Closest: an itch.io game named "Elsewild" (different word, similar sound) |
| 2 | Pagewild | No game found on any of the four stores |
| 3 | Echoquill | No game found; only a GitHub user with that name |
| 4 | Keep Mythwake | Not recommended (same genre online RPG uses it) |

A web search is not a trademark search; check your trademark office before launch.

## D2. World name

**"Veyra" is used** by "Chronicles of Veyra", a browser RPG on itch.io, plus a planet in an upcoming Steam game.
Proposed: **Inkmere** (recommended; no game or world found with this name, and it fits the ink and story theme).
Alternative: Vellumere (also no result).

## D3. Renames

Required by the brief's "no reuse" rule (already applied in the docs):

| Brief name | Problem | New name |
| ---------- | ------- | -------- |
| Pip (companion Echo) | "Pip" is a character in Orb Arena | **Nib** |
| Bram (blacksmith) | "Bram" is a character in Sunfetch | **Tobin** |
| The Quiet Ink | "The Quiet" is Sunfetch's antagonist | **The Pale Ink** |

Recommended but optional (not yet applied; answer yes or no per row):

| Brief name | Why change | Proposal |
| ---------- | ---------- | -------- |
| Ember (Motif) | Sunfetch uses "Embers" as its currency and had an "Ember" Spirit | **Blaze** |
| Charms (held items) | Sunfetch's skills are called Charms | **Keepsakes** |
| Cinderpeak (island 3) | "Cinder" is Sunfetch's rival character | **Forgepeak** |

## D4. Art style

Mockups (same scene, three styles): `docs/mockups/style-A.png`, `style-B.png`, `style-C.png`.

| Option | Style | Notes |
| ------ | ----- | ----- |
| A | **Storybook pixel-painterly** (recommended) | Small files, crisp on phones, best fit for the procedural creature builder |
| B | Ink and watercolour | Most bookish and unique, heavier, harder to read small sprites on phones |
| C | Bold papercraft | Most readable, but looks like many mobile games |

## D5. Engine

**Phaser 3 + TypeScript + Vite** with pure TypeScript rules (recommended in the brief). Alternatives in the brief:
Godot 4 web export, Unity/Unreal web, RPG Maker MZ (all weaker for a 20 MB mobile target).

## D6. Scope (rule 8, "keep scope honest")

| Item | Brief | Proposal |
| ---- | ----- | -------- |
| D6a. Full game length | 25 to 35 hours | **15 to 20 hours** over many updates is realistic; Episode 1 stays 3 to 4 hours |
| D6b. Tales | One per Echo | **One per family** (22 in Episode 1, 70 in total) |
| D6c. Translations | 8 languages | Only after the English is final, and each language ships after a review pass |

## D7. Where the project lives

Following your earlier rule, the project is in its own folder, `Mythwake/`, inside the `Game` repo
(https://github.com/Majenayu/Game) next to `orb arena` and `Lanternfall`. Rename the folder when the title is chosen
(for example `Talewild/`)? Yes or no.

## D8. The older projects

The brief says Mythwake "replaces the earlier Lanternfall/Sunfetch and Orb Arena plans". Nothing was deleted.

- D8a. Is Sunfetch (Lanternfall folder) paused, or cancelled? It stays in the repo either way.
- D8b. Orb Arena is live on the web and on GitHub Pages; it keeps running unless you say otherwise.

## D9. Studio name for the credits

Still open from Sunfetch. Needed before release, not before Phase 1.
