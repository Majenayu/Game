# Motifs (types)

Nine Motifs. The wheel is original: two three-way loops, six bridges between them, a mutual day-and-night pair, and a
neutral Plain Motif with its own Chorus role. Multipliers are x1.5 (strong) and x0.67 (weak), not the x2 / x0.5 used by
some other games.

Chart: `mockups/motif-chart.png`. This table becomes `content/motifs.ts` in Phase 2.

## Structure

- **Life loop:** Blaze → Bloom → Tide → Blaze (burns, drinks, douses).
- **Sky loop:** Stone → Spark → Gale → Stone (grounds, rides, wears down).
- **Bridges:** Tide → Stone (erodes), Bloom → Spark (grounds), Blaze → Gale (eats the air), Stone → Blaze (smothers),
  Spark → Tide (charges), Gale → Bloom (strips).
- **Day and night:** Dawn and Dusk are strong against each other. Dawn +10% by day, Dusk +10% by night.
- **Plain:** neutral to every Motif. Plain Verses deal +25% while your Chorus meter is at 50 or more, and a Plain Verse
  in a harmonising round adds +10 Chorus. Plain is the "glue" of a team.
- **Same Motif against itself:** x0.8 (Plain against Plain stays x1).

Every loop Motif is strong against exactly 2 Motifs and weak against exactly 2, so no loop Motif is better than another.

## Attack table (row = attacking Verse, column = defending Echo)

| Attacker \ Defender | Blaze | Tide | Bloom | Gale | Stone | Spark | Dusk | Dawn | Plain |
| ------------------- | ----- | ---- | ----- | ---- | ----- | ----- | ---- | ---- | ----- |
| **Blaze** | 0.8 | 0.67 | **1.5** | **1.5** | 0.67 | 1 | 1 | 1 | 1 |
| **Tide** | **1.5** | 0.8 | 0.67 | 1 | **1.5** | 0.67 | 1 | 1 | 1 |
| **Bloom** | 0.67 | **1.5** | 0.8 | 0.67 | 1 | **1.5** | 1 | 1 | 1 |
| **Gale** | 0.67 | 1 | **1.5** | 0.8 | **1.5** | 0.67 | 1 | 1 | 1 |
| **Stone** | **1.5** | 0.67 | 1 | 0.67 | 0.8 | **1.5** | 1 | 1 | 1 |
| **Spark** | 1 | **1.5** | 0.67 | **1.5** | 0.67 | 0.8 | 1 | 1 | 1 |
| **Dusk** | 1 | 1 | 1 | 1 | 1 | 1 | 0.8 | **1.5** | 1 |
| **Dawn** | 1 | 1 | 1 | 1 | 1 | 1 | **1.5** | 0.8 | 1 |
| **Plain** | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

## Icons (shape first, colour second)

| Motif | Shape | Colour |
| ----- | ----- | ------ |
| Blaze | Three-tongued flame | Red-orange |
| Tide | Water drop | Blue |
| Bloom | Leaf | Green |
| Gale | Three wind lines | Pale teal |
| Stone | Hexagon | Grey-brown |
| Spark | Lightning bolt | Yellow |
| Dusk | Crescent moon | Violet |
| Dawn | Sun with rays | Orange |
| Plain | Plain circle | Cream |

## Unit tests planned for Phase 2

- Every loop Motif has exactly two x1.5 and two x0.67 entries as attacker and as defender.
- No pair is strong in both directions except Dusk and Dawn.
- Plain row and column are all x1.
