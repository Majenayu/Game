# Poki upload folder

| Folder | What to upload on developers.poki.com |
| --- | --- |
| `files/` | The game build. Upload the contents (`index.html` at the top). 2.7 MB, under Poki's 5 MB initial / 8 MB total guide. |
| `photos/` | `screenshot-1..3.png`: the 3 gameplay screenshots (1920x1080 PNG, each under 5 MiB). `square-800x800.png`: a draft static thumbnail. |
| `videos/` | `thumbnail-1080x1080.mp4`: square animated thumbnail (1:1, 1080x1080, no sound). Poki asks for it from Soft Release on. |

## What the Poki build does
- Loads the Poki SDK v2 (`game-cdn.poki.com/scripts/v2/poki-sdk.js`) and calls `PokiSDK.init()`.
- `gameLoadingFinished()` once the game is ready, `gameplayStart()` / `gameplayStop()` when a match is played or paused.
- `commercialBreak()` between rounds and before every new match except the first one of a session.
- Audio is muted and input is off while an ad plays, then both come back.
- The rewarded spin on the Lucky Wheel uses `rewardedBreak()` (the button says it is an ad).
- Invite links use `PokiSDK.shareableURL()`; incoming links are read with `getURLParam()`.
- The CrazyGames SDK is never loaded. If an ad blocker stops the Poki SDK, the game still runs.
- Progress is saved in localStorage (Poki has no cloud save).

## Before you submit
1. **Server approval.** Poki blocks all third-party requests unless they are approved. The game talks to your
   game server (`VITE_SERVER_URLS`, also used for `/ping` and the account API). Ask Poki to approve that domain,
   or multiplayer and ranked will not connect. Offline practice, training and the campaign work without it.
2. **Thumbnail.** Poki wants one clear foreground object, ideally the main character in its default skin, in a
   dynamic pose. The draft square cover shows plain orbs, which no longer match the hero characters in the game.
   Make a new thumbnail with a hero before the player fit test.
3. Check the build in the Poki Inspector after upload (loading time, file size, SDK events).

## Rebuild after code changes
```powershell
$env:VITE_SERVER_URLS = "wss://YOUR-SERVICE.onrender.com"
npm run poki:media   # needs the client dev server: npm run dev -w client
npm run poki
```

## Store text
Title, descriptions and controls: see `../STORE_TEXT.md` (written for CrazyGames, reusable here).
