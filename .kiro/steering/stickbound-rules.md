---
inclusion: always
---

# Stickbound project rules (studio: majen)

- The active project is `Stickbound/` (stickman elemental 1v1 fighting game). `Talewild/`, `Lanternfall/` and `orb arena/` are paused; reuse their code only as plain engine pieces (saves, platform layer, debug tools), never their design.
- Before any task read `Stickbound/docs/KIRO_MASTER_PROMPT.md` and follow its phases and rules.
- Stack: Phaser 3, TypeScript, Vite. The fight simulation is pure TypeScript, deterministic, fixed 60 Hz, seeded RNG, no Date or Math.random inside it.
- Original only. No names, designs, powers, sounds or story from BoBoiBoy, Pokemon, Crazy Combos or any other work. Elements are generic.
- Only original or free-for-commercial-use assets. Record each in `Stickbound/docs/ASSETS.md`. Never use CC-BY-SA, GPL or NC assets.
- No real-money items, no loot boxes. Ads only through the platform SDK, only at natural breaks or as opt-in rewards.
- Run typecheck and tests after changes. Do not report done without fresh screenshots and a playable build link.
- Do not add features the current phase does not ask for.
- Never publish, submit to a portal, or handle payments. The owner does that.
- Check current CrazyGames docs (https://docs.crazygames.com) before SDK, online and release work.
