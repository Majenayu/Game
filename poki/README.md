# Poki upload folder

| Folder | What it is for |
| --- | --- |
| `files/` | The game build. Upload the contents (`index.html` at the top). 2.7 MB, under Poki's 5 MB initial / 8 MB total guide. |
| `photos/` | `screenshot-1..3.png`: the 3 gameplay screenshots the submission form asks for (1920x1080 PNG, each under 5 MiB). |
| `videos/` | `preview-landscape-1920x1080.mp4`: 19 s gameplay video (for the "Build or video link" field, after you put it online). `thumbnail-1080x1080.mp4`: square animated thumbnail, needed from Soft Release on. |

## Submission form answers

**Build or video link (required).** Use the live build: **https://majenayu.github.io/orb-arena-play/**
It is this `files/` folder published from the public repo `Majenayu/orb-arena-play` (GitHub Pages), talking to
`wss://orb-arena-server.onrender.com`. To update it after `npm run poki`, replace that repo's files with the new
`files/` contents and push; Pages redeploys in about a minute.

Other options if you ever need them:
- a hosted browser build of `files/` that opens without a login (see "Hosting the build" below), or
- `videos/preview-landscape-1920x1080.mp4` uploaded as an unlisted YouTube video or a shared Google Drive link.

**Show us what it looks like (required).** Upload `photos/screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png`.

**Why do you think your game is a good fit for Poki? (required)**

> Orb Arena is a fast arena shooter that puts you in a fight within one click: no sign-up, no download, and bots
> fill every empty seat, so a match is always ready, even at 3 a.m. Rounds last a few minutes, which suits short
> web sessions, but there is a lot to come back for: 4 modes, 6 arenas, a 12-level campaign with boss fights,
> hundreds of skills to collect and fuse, daily rewards and a Lucky Wheel. Controls are simple (move, aim, shoot,
> press a skill) and work with keyboard and mouse or touch. Up to 8 players share a room and friends can join with
> an invite link. The build is 2.7 MB, loads fast, and uses the Poki SDK for gameplay events, commercial breaks
> and rewarded breaks.

## Hosting the build
Any static host works; the folder only needs to be served as-is.
- **Netlify Drop (quickest, free):** open app.netlify.com/drop and drag the `files` folder onto the page. You get a
  public link in under a minute.
- **itch.io:** zip the *contents* of `files/`, create an HTML project, set it to "Restricted" or "Draft" and share
  the secret link.
Multiplayer needs your game server online. Offline practice, training and the campaign work without it.

## What the Poki build does
- Loads the Poki SDK v2 (`game-cdn.poki.com/scripts/v2/poki-sdk.js`) and calls `PokiSDK.init()`.
- `gameLoadingFinished()` once the game is ready, `gameplayStart()` / `gameplayStop()` when a match is played or paused.
- `commercialBreak()` between rounds and before every new match except the first one of a session.
- Audio is muted and input is off while an ad plays, then both come back.
- The rewarded spin on the Lucky Wheel uses `rewardedBreak()` (the button says it is an ad).
- Invite links use `PokiSDK.shareableURL()`; incoming links are read with `getURLParam()`.
- The CrazyGames SDK is never loaded. If an ad blocker stops the Poki SDK, the game still runs.
- Progress is saved in localStorage (Poki has no cloud save).

## Before release on Poki
1. **Server approval.** Poki blocks all third-party requests unless they are approved. The game talks to your
   game server (`VITE_SERVER_URLS`, also used for `/ping` and the account API). Ask Poki to approve that domain,
   or multiplayer and ranked will not connect.
2. **Static thumbnail.** Poki wants one clear foreground object, ideally the main character in its default skin, in
   a dynamic pose. This folder has no static thumbnail yet; the old orb cover no longer matches the hero characters.
3. Check the build in the Poki Inspector after upload (loading time, file size, SDK events).

## Rebuild after code changes
```powershell
$env:VITE_SERVER_URLS = "wss://YOUR-SERVICE.onrender.com"
npm run poki:media   # needs the client dev server: npm run dev -w client
npm run poki
```
