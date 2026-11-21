# Mythwake (working title): Game Design Document, Phase 0 draft

Status: concept draft, waiting for the owner's decisions in [DECISIONS.md](DECISIONS.md).
"Mythwake" and "Veyra" are working names only: both clash with existing games (D1, D2).
Names that break the "no reuse" rule are already replaced in these docs: **Nib** (was Pip), **Tobin** (was Bram) and
**the Pale Ink** (was the Quiet Ink). See D3.

Companion documents: [STORY.md](STORY.md) (story outline), [ECHOES.md](ECHOES.md) (70 Echo families),
[MOTIFS.md](MOTIFS.md) (type wheel), `mockups/` (art styles, Motif chart, island sketches, titles).

---

## 1. Overview

| Item | Value |
| ---- | ----- |
| Genre | Single-player creature-adventure RPG: explore, bind creatures, turn-based team battles, story |
| Platform | Web browser, desktop and phone (landscape and portrait). Built for CrazyGames; Poki and itch.io builds later |
| Audience | Age 7 and up. Easy to start, deep team building for older players |
| Length | Episode 1: 3 to 4 hours. Full game target: 25 to 35 hours across 8 chapters plus post-game (see section 14, scope) |
| Business | Free. Platform ads only (natural breaks and optional rewarded ads). No real-money items, no loot boxes |
| Network | None. Single player, client only |

**Pitch.** The world is a living storybook, and something is erasing its pages. You are a young Scribe who can bind
legends that have taken creature form, the Echoes. Travel eight islands, win the Keepers' Pages, stop the Redactors and
decide how the story ends.

### Pillars

1. **Every creature is a character.** Each Echo family has a personality, a short Tale quest and a cry. Bonding matters
   more than grinding.
2. **Teams, not single moves.** 3v3 battles with front and back rows and the Chorus meter: Verses that fit together build
   a shared Crescendo. Planning a team is the fun.
3. **A storybook you walk through.** Warm art, short scenes, a reward or story beat every 3 to 5 minutes.
4. **Kind to every player.** Story difficulty, auto-battle for easy fights, undo before confirming, fast battles,
   no random-encounter frustration (Echoes are visible).

### The first 5 minutes (portal hook)

| Time | What happens |
| ---- | ------------ |
| 0:00 | Title screen. "New story" goes straight into a 30-second illustrated prologue (skippable) |
| 0:30 | Name and look (one screen, sensible defaults, "Start" is always visible) |
| 1:00 | Quill Harbor at sunset. Nib wakes up in Grandmother Elowen's empty study and follows you |
| 1:30 | First wild Echo visible on the beach. First battle, 2v2 with Nib, under 60 seconds, one hint at a time |
| 2:30 | First Binding Rite (a 10-second rhythm tap). You keep the Echo you bound |
| 3:30 | The sky turns pale for a moment. A Redactor scout erases a signpost in front of you. Kest arrives |
| 4:30 | Mara Tidewright gives you your first Folio page and points you to Inkreach Meadows. Objective shown |

---

## 2. World and vocabulary

All terms are original to this game. Never use another franchise's words (rule 3).

| Term | Meaning |
| ---- | ------- |
| Veyra (working name) | The world: an archipelago of 8 islands, each shaped by an old legend |
| Story-bridges | Drifting paths in the sky between islands, crossed by boat, glider-kite and later a sky-beast |
| Scribe | The player: an apprentice who records legends and bonds with them |
| Echo | A creature: a legend given form |
| Binding / Rite | Catching an Echo through a short skill mini-game |
| Troupe | Your active party (up to 6) |
| Folio | Echo storage and the collection book |
| Motif | Type (9: Ember, Tide, Bloom, Gale, Stone, Spark, Dusk, Dawn, Plain) |
| Verse | A move. Each Echo knows up to 4 |
| Chorus / Crescendo | Team meter / the big shared move it unlocks |
| Legend Path | An evolution branch |
| Tale | An Echo's personal side story |
| Keeper / Keeper Trial | Island champion / puzzle dungeon plus boss duel |
| Page | The reward for beating a Keeper (8 in total) |
| Ink / Sigils | Coins / rare crafting material |
| Charms / Tools | Items an Echo holds / items you use in battle |
| Redactors | The faction that erases legends |
| The Pale Ink | The force blanking the world's pages |

---

## 3. Core loops

```
Explore -> meet a visible Echo -> battle -> Bind (Rite) -> grow (level, Bond, Tale, Legend Path)
   ^                                                                           |
   +-- story beat <- Keeper Trial <- puzzle and secret <- side quest <---------+
```

- **Explore:** top-down tile world, 4-direction grid movement with smooth tweening, run toggle, one interact button.
  Day and night cycle (one in-game day = 24 real minutes) and weather per island.
- **Meet Echoes:** wild Echoes wander visibly. In **Murmur Fields** they shimmer in the grass; you choose whether to
  approach. Some Echoes only appear at night, in rain or after a Tale.
- **Battle and Bind:** see sections 4 and 5.
- **Grow:** XP and levels (1 to 60), Bond (1 to 10), Verses learned by level, by Tale and by Verse Scrolls.
- **Solve and discover:** environmental puzzles per island, 20 secret places, 120 lore pages, optional boss Echoes.
- **Story:** 8 chapters plus post-game, outlined in STORY.md.

---

## 4. Battle: the Chorus system

### 4.1 Format

- 3v3. Each side has a **front row** (2 slots) and a **back row** (1 slot). The other Troupe members wait on the bench.
- Front row: deals +15% and takes +15% damage. Back row: deals −15%, takes −30%, and support Verses work fully from it.
- Swapping a front and back Echo costs no turn once per round; bringing in a bench Echo costs that Echo's turn.
- Each round every active Echo picks 1 of up to 4 Verses. Order by Tempo (ties broken by a seeded RNG, shown in a
  turn-order bar at the top so it is never a surprise).
- **Undo:** every choice can be undone until the player presses "Go".

### 4.2 Chorus meter (the original hook)

- One meter per side, 0 to 100, shown as a musical staff under the turn bar.
- It fills when Verses in the same round **harmonise**:

| Harmony | Fill |
| ------- | ---- |
| Two Verses of the same Motif in one round | +20 |
| A learned complementary pair (for example Tide then Spark: "Stormwater") | +30 |
| Three Verses that harmonise | +45 instead of the sum |
| Plain Verse in a round with any harmony | +10 extra |
| Being hit by a strong-against Verse | −10 |

- At 100 the player may cast a **Crescendo**: a team move with a 2-second animation, chosen from the Crescendos the
  current trio knows (unlocked by Motif combinations, Tales and Keeper Pages). The meter resets to 0.
- Enemies (Keepers, Redactors, boss Echoes) build their own Chorus. A visible "crescendo is coming" telegraph appears at
  80. Interrupt Verses (any Verse with the *Break* tag) knock the enemy meter down by 30.
- 30 Complementary pairs and 24 Crescendos in the full game. Episode 1: 8 pairs and 6 Crescendos.

### 4.3 Stats and formulas (first tuning, verified by the battle simulator in Phase 2)

Stats: **Vigor** (HP), **Might** (attack), **Ward** (defence), **Spirit** (special power and resistance),
**Insight** (critical and status chance), **Tempo** (speed).

```
damage = floor( (power × (atk / def) × (level × 0.4 + 2) / 6 + 2)
                × motif multiplier × row multiplier × same-Motif bonus (1.2) × random(0.9–1.0) × crit (1.4) )
atk/def = Might/Ward for Strike Verses, Spirit/Spirit for Song Verses
crit chance = 4% + Insight / 25 (cap 25%)
```

### 4.4 Status effects (8)

| Status | Effect | Shape cue |
| ------ | ------ | --------- |
| Hush | Cannot use Song Verses for 2 rounds | Closed mouth icon |
| Burn | Loses 6% Vigor each round, Might −20% | Flame-tongue icon |
| Soak | Tempo −30%, Spark Verses against it +25% | Drop icon |
| Root | Cannot swap rows or leave | Root knot icon |
| Daze | 30% chance to fail an action | Spiral icon |
| Gloam | Hidden from targeting for 1 round, then −15% Ward | Half-moon icon |
| Glow | Next Verse +25% power | Star icon |
| Mend | Regains 6% Vigor each round | Plus-leaf icon |

Weather and terrain per island change these (rain makes Soak last longer; Gloamwood night boosts Dusk).

### 4.5 Speed and kindness

- Battle speed ×1, ×2, ×3. "Skip animations" option. Wild fights aim for under 60 seconds.
- **Auto-battle** for wild Echoes and replays (uses a simple good-move AI). Off in Keeper Trials by default.
- Matchup hint: press and hold an enemy to see "Strong / Weak / Normal" for each of your Verses.
- **Difficulty:** Story (enemies −30% damage, free retries), Normal, Hard (smarter AI, enemy Chorus fills faster).
- Losing a battle: you wake at the last Lantern Post (save point) with all Echoes healed and lose 10% of carried Ink.
  Never lose Echoes or progress.

### 4.6 Charms and Tools

- **Charms** (held by Echoes, 40 in the full game): for example *Tidepearl* (+10% Tide), *Quiet Bell* (immune to
  Hush), *Kite Ribbon* (always acts first in round 1, once per battle).
- **Tools** (used by the Scribe, 1 per round instead of your back-row Echo's action): healing Salve, Revive Feather,
  Focus Tea (+1 Verse priority), Smoke Ink (escape wild fights).

---

## 5. Binding and Bond

### 5.1 The Rite

Binding is a short mini-game chosen by the Echo's **temperament**. Success depends on skill, the Echo's remaining
Vigor and the offering used. Never pure luck: a perfect Rite on a weakened Echo always succeeds.

| Temperament | Rite | Input |
| ----------- | ---- | ----- |
| Shy | Match a rhythm (4 to 8 taps) | Tap / Space in time with a heartbeat |
| Bold | Hold and release inside a moving zone | Hold and release |
| Playful | Follow a moving pattern with the cursor or finger | Drag |
| Wary | Pick the right one of 3 offerings from clues in its Folio entry | Choose |

```
chance = base (by rarity: common 0.5, uncommon 0.35, rare 0.2, legendary 0.05)
       + (1 − Vigor%) × 0.4 + Rite score (0 to 1) × 0.45 + offering bonus (0 to 0.15)
Perfect Rite on an Echo below 25% Vigor = 100%
```

Failure is soft: the Echo stays in battle; you may try again next round. Legendary Echoes need a story item first.

### 5.2 Bond

- Bond 1 to 10. Grows by battling together, giving its favourite gift, walking with it as the follower, and Tales.
- Bond 4: the Echo can "hold on" at 1 Vigor once per battle. Bond 7: unlocks its Tale's final chapter. Bond 10:
  a Crescendo variant and a cosmetic glow.

### 5.3 Tales

- Every **family** has a Tale (70 in the full game, 22 in Episode 1): a 1 to 3 minute side story told through the
  family's legend (STORY.md has the format). Completing it unlocks a signature Verse and one Legend Path option.
- Scope note: the brief asks for a Tale per Echo. One Tale per family keeps Episode 1 buildable; see D7.

### 5.4 Legend Paths

- Each family has up to 3 forms. Families with a branch choose at the second form, by Bond, a Tale choice and the held
  Charm (for example Nib's final form follows the Motif of the Charm it holds when it reaches Bond 7).
- Forms keep the family's silhouette rule (ECHOES.md) so a player recognises the family at a glance.

---

## 6. Islands and chapters

| # | Island | Look | Mechanic | Keeper | Episode |
| - | ------ | ---- | -------- | ------ | ------- |
| 1 | Quill Harbor and Inkreach Meadows | Warm seaside, sunsets | Basic puzzles: push crates, read signs, tide pools | Mara Tidewright | 1 |
| 2 | Gloamwood | Twilight forest, glow plants | Light and shadow: carry glowcaps, cast shadows to open paths | Odric Hollowfen | 1 |
| 3 | Cinderpeak | Volcanic forge island | Heat vents, rolling boulders, cooling with Tide Echoes | Tamsin Brass | 2 |
| 4 | Skyreach Steppe | Wind plains | Wind currents and kite gliding | Ilyas Windrun | 3 |
| 5 | The Salt Library | Sunken book city | Water level and pressure puzzles | Auberon Page | 4 |
| 6 | Thunder Spine | Storm cliffs | Conductive rails and timing | Yara Stormcall | 5 |
| 7 | Moonlit Orchard | Dream garden | Time echoes: replay your past steps to hold switches | The Gardener | 6 |
| 8 | The Blank Isle | Erased land | Restore the world tile by tile as you walk | Maren Vale | 7 |

Island sketches: `docs/mockups/islands.png`. Each island has a town, a Keeper Trial, at least one Murmur Field, a
secret and a lore site.

**Post-game: the Unwritten Wing.** Roguelike endless dungeon with a weekly seed, the rare Echo-Legends, a Keeper rematch
rush and a ladder of offline AI masters.

---

## 7. Echoes

- Full game: 70 families, 180 Echoes (12 legendary single forms). Episode 1: 22 families, 60 Echoes.
- The full list with Motif, temperament, habitat, form count and design brief is in [ECHOES.md](ECHOES.md).
- Each family stores: forms (max 3), Motif, temperament, habitat, Tale, base stats, learnset, cry parameters, lore,
  silhouette rule, shape language and signature feature, all in `content/echoes/*.ts`.

---

## 8. Characters and story

Outline in [STORY.md](STORY.md): premise, 8 chapters, main cast with arcs, the twist, 3 endings, side content plan.

---

## 9. Art direction (DECISION D4)

Mockups of the same scene in three styles: `docs/mockups/style-A.png`, `style-B.png`, `style-C.png`.

| Style | Description | Pros | Cons |
| ----- | ----------- | ---- | ---- |
| **A. Storybook pixel-painterly** (recommended) | 32 px tiles, painted pixel flecks, dark outlines, warm coloured light, limited palette per island | Small files, crisp on phones, fits procedural generation, timeless | Needs care to avoid looking like generic pixel RPGs |
| B. Ink and watercolour | Washes on paper, loose ink lines, parchment UI | Most "storybook", unique | Heavier textures, harder to read small sprites on phones |
| C. Bold papercraft | Flat cut-paper layers, thick outlines, bright colours | Very readable, cheap to render | Looks like many mobile games |

**Procedural creature builder** (all styles): parts (bodies, heads, ears, tails, wings, horns, patterns, eyes) combined
by family rules and palette rules, with hand-tuned variations per family; tween rigs for idle, walk, attack, hit,
faint, emote and evolve flash; front, back and icon sprites baked at load. Legendary Echoes and Keepers get extra
hand-made layered art.

**Characters:** layered builder (body, hair, outfit, accessory), 4-direction walk cycles, 6 portrait emotions per main
character. **UI:** storybook parchment kit, 9-slice panels, OFL fonts. No placeholder rectangles in a release build.

---

## 10. Audio

- 30+ tracks: title, a town and route theme per island, dungeon themes, battle (wild, Keeper, Redactor, boss), victory,
  sad scene, finale theme. Battle music adds layers as the Chorus meter rises.
- Procedural WebAudio composition and/or CC0 music, OGG, lazy-loaded per chapter, under 15 MB for the full game.
- SFX per surface, per Motif hit, Crescendo stingers; a synthesised cry per family with pitch and formant variation.
- Separate sliders for music, SFX and cries. Mute during ads.

---

## 11. Retention, ads and accessibility

**Ad slots (never on first load, never blocking progress, never a fake button):**

| Slot | Type |
| ---- | ---- |
| After saving at a Lantern Post (at most once every 10 minutes) | Midgame |
| After a Keeper Trial | Midgame |
| Returning to the title screen | Midgame |
| Heal the whole Troupe anywhere | Rewarded, optional |
| Double Ink after a battle | Rewarded, optional |
| One revive in a boss fight | Rewarded, optional |
| Hint token for a puzzle | Rewarded, optional |
| 15 minutes of +50% XP | Rewarded, optional |

The exact SDK calls (`gameplayStart`, `gameplayStop`, ad calls, data module) are checked against
https://docs.crazygames.com before any SDK work (rule 5).

**Retention:** daily gift, Tale of the Day, weekly Unwritten Wing seed, 80 achievements, collection book (Echoes, lore,
places), seasonal events, cosmetic outfits earned by play, new chapters.

**Saves:** 3 slots, auto-save at Lantern Posts and every 2 minutes, atomic writes with one backup, export/import code,
platform cloud sync for signed-in players.

**Accessibility:** Motif icons with distinct shapes (`mockups/motif-chart.png`), text size, dyslexia-friendly font
option, reduced motion and flashes, one-handed touch layout, remapping, battle speed, difficulty, captions for sounds.

**Safety:** age 7+, no gambling, no chat, no links off-site, name input filtered.

**Analytics (anonymous):** time to first battle, first Binding, chapter completion, quit points.

---

## 12. Technical plan (DECISION D5)

- **Engine:** Phaser 3 + TypeScript + Vite (recommended in the brief; Godot's web export is about 34 MB of wasm before
  compression according to a forum report, which makes the 20 MB mobile target hard).
- **Rules in pure TypeScript** (battle, damage, statuses, Chorus, Binding, evolution, loot, quests, flags, shops,
  seeded RNG), unit-tested and runnable headless for the battle simulator.
- **Maps:** Tiled JSON format written by code and generators; no editor needed.
- **Event scripts:** a small JSON format for dialogue, choices, camera, flags, items and battles.
- **Modules:** core (loop, scenes, input, save, i18n, loader), world, rules, scripting, UI, dev tools (map validator,
  quest graph validator, battle simulator, save inspector, debug teleport and flags, performance overlay), platform
  layer (CrazyGames, Poki, itch, web).
- **Size budget:** initial download under 20 MB (CrazyGames mobile homepage limit as of 2026-11-21,
  [technical requirements](https://docs.crazygames.com/requirements/technical/); hard limit 50 MB), each chapter bundle
  under 8 MB, lazy-loaded. A build check fails the build when a limit is passed.
- **Performance:** 60 fps desktop, 30+ fps on a low-end phone (unverified until tested on a real device), object pools,
  atlases, adaptive effects, no memory growth over a 2-hour session.

---

## 13. Content targets

| Content | Episode 1 | Full game |
| ------- | --------- | --------- |
| Islands / Keepers | 2 / 2 | 8 / 8 |
| Echo families / Echoes | 22 / 60 | 70 / 180 |
| Verses | 80 | 260 |
| Complementary pairs / Crescendos | 8 / 6 | 30 / 24 |
| Side quests | 15 | 40 |
| Tales | 22 | 70 |
| Lore pages | 30 | 120 |
| Secret places | 5 | 20 |
| Mini-games | 4 (fishing, kite race, cooking, puzzle boxes) | 15 |
| Music tracks | 10 | 30+ |
| Achievements | 25 | 80 |

---

## 14. Scope honesty (rule 8)

- **Episode 1 is the real target.** It is buildable as described above in Phases 1 to 8. Chapters 3 to 8 are planned
  but not promised; each one is its own phase and gets re-scoped after Episode 1 data comes in.
- **25 to 35 hours for the full game is not realistic for one AI-built release.** A more honest target is about
  15 to 20 hours for all 8 chapters plus the post-game, reached over many updates.
- **Tales:** one per family, not one per Echo (60 Tales in Episode 1 would double the writing and testing).
- **180 creatures need the procedural builder to be good.** If the builder's results look samey in Phase 4, the plan is
  fewer families with more hand-tuning, not more weak designs.
- **Translations** come after the English text is final; machine-quality text in 8 languages is not acceptable, so each
  language ships only after a review pass.

---

## 15. Not verified yet

- Real phone performance.
- Current CrazyGames SDK and ad rules (fetched before SDK work and before release).
- Name availability beyond web searches (no trademark search done).
- Whether each of the 70 Echo family names is free of conflicts (only a spot check so far; a full check is planned
  before art production in Phase 4).
- Review outcome and revenue.
