# Sunfetch: third-party assets and credits

Every third-party asset is recorded here **before** it is used. If a license is unclear, the asset is not used.

Allowed: CC0, CC-BY (with credit), SIL OFL fonts, original work.
Never: CC-BY-SA, GPL, non-commercial (NC), ripped or unlicensed assets, other games' names, characters, music or story,
or AI tools whose terms forbid commercial use.

## Register

| Asset | Author | URL | License | Date checked | Where used | Edits | Credit needed |
| ----- | ------ | --- | ------- | ------------ | ---------- | ----- | ------------- |
| (none yet) | | | | | | | |

Phase 0 mockups (`docs/mockups/`) are original SVG drawn in code and use only system fonts.

## Original names (checked, not third-party)

These names are our own. They are listed so that a later rename is easy to track.

| Name | What it is | Replaces (brief name) | Why |
| ---- | ---------- | --------------------- | --- |
| Sunfetch | Game title | Lanternfall | Lanternfall is used by several existing games |
| Tindle | Starter Spirit (hero) | Wick | Hushlight uses a hero named Wick |
| The Quiet | Antagonist | The Hush | Hushlight uses "the Hush" |
| Clinker | Coal golem Spirit | Ember | Clashed with the Embers currency |
| Flare | Star Spirit | Nova | Nova is a character in Orb Arena |
| Time Still | Charm | Time Hush | Follows the Quiet rename |

Before launch, the owner runs a trademark search on "Sunfetch" (see DECISIONS.md).

## Credits plan

The in-game Credits page (reached from Settings and after the ending's credits scroll) is generated from this file at
build time, so it cannot drift from the register.

| Section | Content |
| ------- | ------- |
| Title | Sunfetch |
| Made by | `{studio}` from the locale key `credits.studio`. The owner supplies the name (DECISIONS.md, D8c). Until then the build check fails for release builds and shows "Studio name" in dev builds |
| Design, code, art, music and writing | "Made with Kiro" |
| Fonts | Every font row in the register, with author and license (SIL OFL fonts list the font name and the OFL) |
| Art, sounds and music | Every row where "Credit needed" is yes (CC-BY requires author, title, license and link). CC0 rows are listed too, as a courtesy |
| Privacy | One short paragraph: no personal data collected; saves stay on the device or the portal's save system |
| Thanks | "Thank you for playing. Keep a little light for someone else." |

The story's credits scroll (STORY.md) uses the same data, shown over the lit-windows scene.
