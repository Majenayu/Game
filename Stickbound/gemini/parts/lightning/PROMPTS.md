# Prompts for better Lightning avatar parts

The lab already works with the current sheet (`image (1).png`). These prompts are for an image AI that can take
reference pictures, to get cleaner and richer parts. Attach `image (1).png` (parts) and `kit.png` (poses and
heads) as references with every prompt. Then put the new sheet in this folder and run `cut.mjs` (update its BOXES if
the layout changes).

## Rules for every sheet

- Transparent background (PNG with alpha), not green and not white.
- Each part separate, with at least 40 px of empty space around it. Nothing touches or overlaps.
- Same style as the references: flat dark-navy body (#141833), thick glowing yellow outline (#FFE27A, about 6 px
  at this size), cyan electric details (#7FE9FF), soft outer glow. No text, no watermark, no shadows on the ground.
- Side view, character facing RIGHT.
- Sheet size 2048 x 1152 or larger.
- Original design only. Do not copy any existing character, anime, game or brand.

## Prompt 1: heads with expressions (most useful)

> Using the attached references for style, draw 6 separate heads of the same original lightning-element stickman
> hero, side view facing right, on a transparent background, laid out in a 3 x 2 grid with wide spacing. Each head:
> round dark-navy head, spiky yellow hair swept back, cyan ear-ring headphone on the left side, a yellow-and-cyan
> visor with a small lightning bolt symbol, thick glowing yellow outline. Expressions, one per head:
> 1 confident grin (default), 2 shouting attack face with open mouth and gritted teeth, 3 hurt face with a squeezed
> wavy mouth and the visor knocked slightly up, 4 knocked-out face with a cracked visor and a flat mouth,
> 5 happy victory smile, 6 focused calm mouth (charging a power). Keep the head shape, hair and visor identical
> in all six so they can be swapped in an animation.

## Prompt 2: limbs from the side, with a clean joint at each end

> Using the attached references for style, draw these separate body parts of the same original lightning stickman
> on a transparent background, all horizontal and pointing right, with wide spacing: upper arm, forearm, upper leg
> (thigh), lower leg (shin). Each part is a rounded capsule with a dark-navy fill and a thick glowing yellow
> outline, with a small round joint circle at the LEFT end (shoulder, elbow, hip or knee). Add thin cyan lightning
> crackles on the upper arm and thigh only. Draw each part twice: once normal, and once brighter with stronger cyan
> crackles (charged version).

## Prompt 3: hands and feet

> Using the attached references for style, draw separate hands and feet for the same original lightning stickman,
> side view facing right, transparent background, wide spacing: closed fist, open palm, pointing hand (index finger
> out, for casting), clawed spark hand (fingers spread with small sparks between them), standing foot (sneaker
> shape), pointed foot (toes down, for kicks and jumps). Each piece has a small round joint circle where it attaches
> (wrist or ankle) on the left. Dark-navy fill, thick glowing yellow outline.

## Prompt 4: torso and pelvis

> Using the attached references for style, draw the torso and pelvis of the same original lightning stickman, side
> view facing right, transparent background, separated: 1 torso upright with a short neck stub on top and a glowing
> lightning core emblem on the chest, 2 the same torso twisted slightly toward the viewer (for punches),
> 3 pelvis piece (rounded hip shape). Dark-navy fill, thick glowing yellow outline.

## Prompt 5: lightning effects (optional, the lab draws its own)

> On a transparent background, draw separate glowing electric effect sprites in a cyan, white and yellow palette,
> wide spacing, no characters: a small hit spark burst, a large impact burst, a horizontal lightning beam segment
> that can repeat, a vertical sky bolt, a ground scorch ring seen from the side, 3 small spark particles, and a round
> charge aura. Soft glow edges, no text.

## How I use them

- New heads replace the painted expressions in `rig.ts` (one picture per face).
- Charged limbs swap in while a power is charging.
- Pointing and spark hands go in Chain Bolt and Skyfall.
- The twisted torso goes in the cross and Volt Hammer.
