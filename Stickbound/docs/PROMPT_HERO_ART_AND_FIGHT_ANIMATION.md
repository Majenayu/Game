HERO ART AND FIGHT ANIMATION DIRECTIVE for Elementick (folder Stickbound/). Autonomous: never ask me questions, decide and log
in docs/DECISIONS_LOG.md, commit after each milestone, keep every test green, revert anything that breaks the build. Do not stop
until the Definition of Done is met. Gameplay, sim, frame data, determinism and balance must NOT change. This is render-only work.

================================================================================================================================
0. WHY THE LAST TWO ART PASSES FAILED (read this first and do not repeat it)
================================================================================================================================
Compare docs/reference-art/compare/hero-fire-2.png and hero-lightning-2.png. The game heroes do not look like the Gemini sheets
(Stickbound/gemini/, inventory in docs/reference-art/INVENTORY.md). The concrete gaps:

 a. The body reads orange-brown, not black. In src/render/rig.ts the default body is tinted toward the element (tint 0.12), the
    aura glow sits behind the pelvis at radius 62*s, and the chest-core glow (radius up to 48*s, additive) is drawn ON TOP of the
    torso. Together they wash the body. Reference: the fill is near-black and stays near-black; only the outline and core glow.
 b. Limbs are straight segments with visible kinks at elbows and knees, drawn as Phaser Graphics lines. Reference limbs are smooth
    rounded tubes that bend in soft curves, with mitten-like round hands and rounded feet.
 c. The faces are wrong. Fire: reference has two big slanted glowing eye slits under a red headband with long flowing tails.
    Game has a thin bar. Lightning: reference has a big wraparound yellow visor with a cyan frame and a bolt emblem, a cyan ear
    disc, a wide toothy grin and big swept spiky hair. Game has a small bar and small spikes.
 d. Signature pieces are far too small and static. Reference flame hair is a big organic flame about as tall as the head that
    flickers; headband tails are long ribbons. Game has a small crown of spikes and short tails.
 e. Poses are stiff and nearly identical. Reference poses have weight shifts, curved spines, wide stances, chambered back arms.
 f. Effects are tiny. Reference Power III engulfs the hero in flame or lightning about 2x the hero's height. Game shows sparkles.
 g. Vanguard, Striker and Warden look almost the same (small blades, small shoulder pads).
 h. Process: the compare images show the game heroes at about half the size of the reference, so detail cannot be judged, and the
    review accepted "close enough". Self-review was too lenient and kept tweaking numbers inside the same drawing approach.

================================================================================================================================
1. MEASURED STYLE SPEC (taken from the fire and lightning sheets; apply to all 10 heroes)
================================================================================================================================
Express everything as a fraction of standing height H (feet to top of head, not counting hair).
 - Head: circle, diameter 0.22 to 0.24 H. Neck hidden (head sits directly on the torso top).
 - Torso: a tapered capsule, chest width 0.13 H narrowing to 0.10 H at the hips, length 0.27 H, slight S-curve allowed.
 - Limbs: tubes 0.070 to 0.080 H thick, constant width, upper and lower segments equal. Arms reach mid-thigh when hanging.
 - Hands: round mitts, diameter 1.35x limb width. Feet: rounded capsules 1.6x limb width long, pointing forward.
 - Outline: bright element-colour stroke 0.018 H around every part, with a thin hotter inner line (element light colour) 0.006 H
   just inside it. Outer glow: soft, radius about 0.05 H, max 35% opacity. Outline is continuous around each part, and parts in
   front of the torso show their own outline (exactly as the sheets).
 - Fill: near-black (#0B0B14 to #12121C). Element tint at most 4%. Nothing additive may be drawn over the fill except the chest core,
   eye glow and active power effects. The chest-core glow radius is at most 0.07 H when idle, 0.14 H while casting.
 - Chest core: small white-hot centre with a 6 to 8 ray burst in the element colour, placed at 35% down the torso.
 - Eyes or visor: the brightest thing on the head, readable at 60 px hero height.
 - Shadow: a soft dark ellipse under the feet, width 0.45 H.
 - Contrast: hero outline must be brighter than any background pixel near it (rim light if needed).
Put these numbers in one file, src/render/heroSpec.ts, and use them everywhere (fight, lobby, previews, Power Lab, covers).

================================================================================================================================
2. RENDERING APPROACH (change technique, do not just retune numbers)
================================================================================================================================
Build a new hero renderer, src/render/hero/, and keep the old rig.ts drawing only as a fallback until the new one passes.
 - Skeleton: keep the existing 14-joint solver and poses from rig.ts as the input (same joints, same sim), but add a smooth
   limb curve: draw shoulder -> elbow -> hand and hip -> knee -> foot as ONE path each, a quadratic or Catmull-Rom curve
   through the joints with round caps and round joins. No visible kinks.
 - Draw order per depth group (back limbs, torso and head, front limbs, front accessories): glow pass, outline pass, inner hot
   line pass, dark fill pass. This keeps each part outlined like the sheets.
 - Technique decision (log it as a decision with screenshots and fps numbers): prototype both and choose:
     A) Canvas 2D per fighter: draw paths on an offscreen canvas at devicePixelRatio (lineJoin and lineCap round, real curves,
        clean anti-aliasing), glow via wide low-alpha strokes (High quality may add shadowBlur), then upload as a Phaser
        CanvasTexture each frame. Budget: 4 fighters at about 256x320 px.
     B) Baked vector parts: author each part (head per element, torso, limb tube, hand, foot, every accessory, flame hair in 4
        flicker frames) as SVG path strings written by you, rasterize at load into one atlas at 2x with glow baked in, and place
        them on the bones each frame (cutout animation). Limbs bend using two tube sprites with round joint caps.
   Choose the one that matches the reference better at fight size while keeping 60 fps (see section 7). Either way the art is
   code-authored; never ship any file from gemini/.
 - Render heroes at an internal resolution of at least 1x device pixels, never upscale a small texture.
 - Fighter on-screen height: 30 to 36% of the viewport height on desktop fights and at least 26% at 844x390.

================================================================================================================================
3. THE 10 HEROES (base look = Vanguard; match each sheet in gemini/, see INVENTORY.md for file ids)
================================================================================================================================
For every element read its sheet image directly (do not rely on the text below alone). Build head, face, signature and aura:
 - Fire (R01): red headband across the brow, two long ribbon tails (rope physics, 8 points, flow behind on movement); big flame
   hair the height of the head, 3 to 5 tongues, animated flicker (yellow core, orange, red tips); angry slanted glowing eye
   slits; small embers rising.
 - Lightning (R15): big swept spiky hair, 5 to 6 spikes with yellow outline; wraparound yellow visor with cyan frame and a bolt
   emblem; cyan ear disc; wide toothy grin under the visor; crackling cyan and yellow arcs that jump across the limbs.
 - Water (R21): wavy flowing hair of water ribbons, visor, wrist bands, droplets, calm smile.
 - Ice (R13): crystal spikes on the head, eye strip visor, frost shoulder spikes, frost mist and glints.
 - Wind (R17): long flowing scarf (rope physics), visor or goggles, swirling air streaks and small leaves.
 - Earth (R19): rock shoulder plates and rock fist armour, helmet visor, floating pebbles and dust.
 - Leaf (R03): laurel crown of leaves, vine armbands that sway, glowing petals.
 - Light (R05): floating halo above the head, white cape (cloth physics), visor, light rays.
 - Gravity (R07): a ring orbiting the head, dark cape, visor, warped light rings and floating debris.
 - Time (R09): gear crown, visor, hourglass detail, clock-tick marks and ghost afterimages.
Fighting styles must differ by silhouette at a glance, not by small details:
 - Vanguard: the sheet look.
 - Striker: 10% slimmer limbs, longer stride, forward-leaning stance, glowing bladed forearm guards (clear triangles 0.35 H long),
   sharper visor or eye shape, motion streak trails behind fists and feet.
 - Warden: 15% thicker torso and limbs, large shoulder plates (each about the size of the head), a glowing orbiting barrier or a
   floating hex shield on the front arm, a lower, wider stance.
Champions, zombies (R11) and the final champion Null (R12) use the same renderer with their own heads and accessories; zombies keep
dark bodies with neon green or red cracks, the brute is 1.3x size.

================================================================================================================================
4. FIGHT ANIMATION (render only; keep sim timing)
================================================================================================================================
Recreate the poses on the sheets as keyframes and make motion read like a good 2D fighting game:
 - Pose library: idle (contrapposto, fists up, weight on back leg, breathing 1.5 s), walk and run cycles with arm swing and head
   bob, dash (lean 35 degrees, afterimages), jump (anticipation crouch, stretch, tuck, land squash), guard (forearms crossed in
   front of the face), perfect guard (flash plus a pushed-back pose), 3-hit basic combo (jab, cross, kick, each with chamber and
   full extension), heavy (big wind-up, overshoot), hurt light and heavy, knockdown, get up, victory per pose option, taunt.
 - Every power gets its own cast pose matching its type: projectile (one-arm thrust with the back arm chambered), beam (two-hand
   push), dash strike (lunge), area or super (wide horse stance, arms flexed, head up, as the fire and lightning super panels).
 - Motion principles: anticipation, easing (ease-out on strikes, ease-in on wind-ups), 1 to 2 frame overshoot, follow-through on
   hair, tails, scarves and capes (rope or spring physics), squash and stretch on jumps and big hits, smear frames on fast
   strikes (stretched limb plus a motion arc), hit-stop already in the sim must be shown with a freeze plus a small shake.
 - Accessories react: headband tails and scarves flow with velocity, flame hair grows when casting, lightning hair sparks.
 - Faces react: eyes narrow on attack, widen on hit, close on knockdown, grin on victory.
 - Use the frame counters from the sim to pick poses, so a replay always renders identically.

================================================================================================================================
5. POWER EFFECTS (match R27 and the super panels on the hero sheets)
================================================================================================================================
 - Scale: Power I effects at least 0.5 H, Power II at least 0.8 H, Power III supers at least 2 H tall around the hero.
 - Fire: layered flame shapes (tongue polygons that flicker and rise, not only particles): white-yellow core, orange body, red
   tips, additive; embers; heat ring on the floor. Fireball: comet with a long tapered trail.
 - Lightning: branching jagged bolts (midpoint displacement, regenerated every 2 to 3 frames), cyan outer glow with yellow core,
   arcs crawling over the hero, sparks at the feet, short white screen flash on supers (respect reduced flashing).
 - Every other element: same quality bar in its own shape language (see the hero sheets): water ribbons and splashes, ice
   crystals growing, wind crescents and tornado, rock chunks, vines and petals, light rays and starbursts, gravity rings and
   pulled debris, time clock rings and ghost trails.
 - Effects never hide the hero: the hero is drawn above the back half of the effect and under the front half.
 - Keep the existing sim hitboxes; the visual must cover the hitbox but may be larger.

================================================================================================================================
6. COMPARE AND REVIEW LOOP (strict, mandatory)
================================================================================================================================
 - Build tools/hero-compare: for each element and each pose on its sheet, render the game hero in the same pose, at the SAME
   height as the reference figure, on the same dark background, and write three images to docs/reference-art/compare-v3/:
   side by side, a 50% overlay, and a fight-size version at 1366x768 and 844x390.
 - Review as a strict art director. For each hero list every visible difference (proportions, outline weight, glow, fill
   darkness, face, hair or signature, accessory size, pose, effect size). Score each of these 1 to 5:
   silhouette and proportions, outline and glow, body darkness, face or visor, signature pieces, pose, power effect,
   style difference (Vanguard vs Striker vs Warden), readability at fight size.
 - A hero passes only when every score is 4 or 5 and you can list no difference bigger than "slightly". Do at least 3 iterations
   per hero. Write the scores per iteration in docs/reference-art/REVIEW.md. Be harsh: if in doubt, score lower.
 - If after 3 iterations the chosen technique (2A or 2B) still scores below 4 on outline, fill or face for any hero, switch to the
   other technique and log why.

================================================================================================================================
7. PERFORMANCE, QUALITY, LIMITS
================================================================================================================================
 - 60 fps at 1366x768 with a desktop GPU, and at least 60 fps average with 4x CPU throttle on Medium quality, on the busiest fight.
 - Low quality for weak phones: no shadowBlur, fewer glow passes, fewer particles, same silhouettes and faces.
 - First download stays under 5 MB. No per-frame allocations in the hero renderer; pool effect objects.
 - Respect reduced motion, reduced flashing and screen shake settings.

================================================================================================================================
8. ROLL OUT
================================================================================================================================
Order: Fire and Lightning first (they have the clearest references) until both pass section 6; then the other 8 elements; then
Striker and Warden for all; then champions, zombies and Null; then effects for all 90 powers; then the lobby, avatars, forge,
versus, results and level-up screens, the covers and store screenshots (all use the new renderer).

================================================================================================================================
9. DEFINITION OF DONE
================================================================================================================================
 1. docs/reference-art/compare-v3/ has side by side, overlay and fight-size images for every hero and pose; REVIEW.md shows every
    hero at 4 or 5 on every score.
 2. All 10 heroes in 3 styles, champions, zombies and Null use the new renderer everywhere.
 3. Typecheck, unit tests, determinism, banned-word scan, 10,000-match balance (unchanged results), Champion Road walkthrough,
    Playwright smoke and first-run, memory soak and fps (normal and 4x throttle) all pass. First win still under 60 s.
 4. Old saves load and keep their looks.
 5. Power Lab contact sheets regenerated; 10 flagship power videos regenerated; CrazyGames zip, covers and screenshots rebuilt;
    build published to /stickbound/; PROGRESS.md and FINAL_REPORT.md updated with honest notes, including what still differs.
Never publish to CrazyGames, create accounts or spend money. Start with section 2 on Fire and Lightning now.
