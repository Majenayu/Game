# Hero art review (compare-v3)

Method: `e2e/herocmp.spec.ts` renders the game hero at the same height (270 px = 1.9x rig scale) and panel positions as the Gemini sheet
(1376x768). `tools/herocompare3.ps1 <element> <style>` writes `<el>-<style>-side.png` and `-overlay.png` here. Scores 1 to 5, harsh.
Only Fire and Lightning, Vanguard style, are reviewed so far. Striker and Warden are built but not yet reviewed.

## Iteration 1 -> 4 (new renderer `src/render/hero/`, technique A-lite: smooth sampled curves through the existing Pen)

| Score | Fire it.1 | Fire it.4 | Lightning it.1 | Lightning it.4 |
| --- | --- | --- | --- | --- |
| Silhouette and proportions | 2 | 3 | 2 | 3 |
| Outline and glow | 3 | 4 | 3 | 4 |
| Body darkness | 4 | 4 | 4 | 4 |
| Face or visor | 2 | 3 | 3 | 4 |
| Signature pieces (hair, band, tails) | 2 | 3 | 2 | 3 |
| Pose | 2 | 2 | 2 | 2 |
| Power effect (super) | 2 | 3 | 2 | 3 |
| Style difference | n/a | n/a | n/a | n/a |
| Readability at fight size | 3 | 4 | 3 | 4 |

Result: NOT PASSED. Remaining differences larger than "slightly":
- Poses: the sim keyframes are stiff straight columns; the sheets use wide stances, bent knees, curved spines, chambered back arms.
- Fire: hair tongues are polygon teardrops with a stair-stepped edge; the sheet's flame is rounder with curling tongues. Ribbon tails are thinner than the sheet's.
- Fire super: flame is a jagged polygon pile 1.75 H tall; the sheet's is softer, with many small inner tongues.
- Lightning: hair is a comb of 5 spikes; the sheet has a bolder swept shape. Super bolts are evenly spread; the sheet's cluster at the sides and have glow bursts.
- Torso is a straight tapered tube; the sheets have a slight S-curve.
- Not yet done: motion streaks, smear frames, squash and stretch, face reactions beyond eye shape, per-pose keyframes from the sheets.
