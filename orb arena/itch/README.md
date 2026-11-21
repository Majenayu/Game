# itch.io upload folder

| Folder | What it is for |
| --- | --- |
| `files/` | `orb-arena-html5.zip`: the browser build (index.html at the root of the ZIP, 22 files, 0.9 MB). Upload this ZIP. |
| `photos/` | `cover-630x500.png`: the cover image (itch's recommended size). `screenshot-1..3.png`: page screenshots (1920x1080). |
| `videos/` | `preview-landscape-1920x1080.mp4`: 19 s gameplay. itch only takes a YouTube or Vimeo link, so upload it there first. |

## Field by field ("Create a new project")

| Field | Value |
| --- | --- |
| Title | `Orb Arena` |
| Project URL | `orb-arena` |
| Short description or tagline | `Fast online arena shooter. Skills, bosses and bots, playable in one click.` |
| Classification | Games |
| **Kind of project** | **HTML** (not "Downloadable") |
| Release status | Released, or "In development" if you want feedback first |
| Pricing | **No payments** (your account has no payment set up, and the game is free) |
| Uploads | Upload `files/orb-arena-html5.zip`, then tick **"This file will be played in the browser"** |
| Embed options | Viewport 1280 x 720. Tick **Mobile friendly** (orientation: Landscape) and **Fullscreen button**. Leave "Automatically start on page load" off. |
| Genre | Action |
| Tags (max 10) | `multiplayer`, `arena-shooter`, `top-down-shooter`, `io`, `pvp`, `bots`, `boss-fight`, `skills`, `free`, `2d` |
| AI generation disclosure | Your choice, see below |
| Community | Comments |
| Visibility | Draft first. Open the page, play it, then switch to Public. |
| Cover image | `photos/cover-630x500.png` |
| Gameplay video or trailer | Your YouTube or Vimeo link for `videos/preview-landscape-1920x1080.mp4` |
| Screenshots | `photos/screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` |

### Description (paste into "Description")

**Orb Arena** is a fast online arena shooter for up to 8 players. Move, aim, shoot and fire your skills to win the round.
Bots fill every empty seat, so a match is always ready.

- **4 modes:** Deathmatch, Team Battle, Coin Rush and King of the Hill. Quick Play rotates mode and arena every round.
- **6 arenas** with walls, mazes and lava.
- **Hundreds of skills** to collect, level up and fuse. Unique skills drop from bosses.
- **12-level campaign** against bots, with boss fights.
- **Progression:** coins, XP, gear, summons, daily rewards, quests and a Lucky Wheel (free in-game coins only).
- **Play with friends:** one click invite link.

**Controls**
- Desktop: WASD or arrows to move, mouse to aim, left click to shoot, 1-5 (or Space / E) for skills, X for auto mode, P to pause.
- Mobile (landscape): left stick moves, right stick aims and fires, buttons use skills.

No sign-up, no download. Progress is saved in your browser.

Credits: fonts Cinzel, Rajdhani and Bangers (SIL OFL), Fluent Emoji by Microsoft (MIT), icons from game-icons.net
(CC BY 3.0), Phaser (MIT). License texts are inside the game build in `licenses/`.

### AI generation disclosure
itch.io asks you to say **Yes** if any part of the project was produced by generative AI tools such as LLMs, even if
you edited it afterwards. Much of this game's code and text was written with an AI coding assistant, so **Yes** is the
honest answer for that. The emoji and icon art comes from the human-made packs listed in the credits. It's your call;
itch.io can hide or flag projects with a wrong disclosure.

## Notes
- Multiplayer talks to `wss://orb-arena-server.onrender.com`. Offline practice, training and the campaign work without it.
- itch.io runs the game in an iframe on its own domain. This build was tested that way: the tutorial starts, Quick Play
  joins an online room, no errors.
- The cover is the old orb artwork. It still reads well at small sizes, but a cover with one of the hero characters
  would match the game better.

## Rebuild after code changes
```powershell
$env:VITE_SERVER_URLS = "wss://orb-arena-server.onrender.com"
npm run itch
```
Then upload the new ZIP on the project's edit page and delete the old one.
