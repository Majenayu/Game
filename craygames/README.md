# CrazyGames upload folder

| Folder | What to upload |
| --- | --- |
| `files/` | The game. Upload the contents (index.html must be at the top level). No zip. |
| `photos/` | Covers: landscape 1920x1080, portrait 800x1200, square 800x800 |
| `videos/` | Previews: landscape 1920x1080 and portrait 1080x1620, about 19 s, no sound |

The text for the form (title, descriptions, controls, tags) is in `../STORE_TEXT.md`.

## Rebuild after code changes
```powershell
$env:VITE_SERVER_URLS = "wss://YOUR-SERVICE.onrender.com"
npm run crazygames
```
`npm run crazygames` runs `scripts/prepare-upload.mjs crazygames`. It refuses localhost or non-wss addresses, builds the client, checks that the server address is inside the build,
and refills these three folders. Photos and videos are copied from `e2e/covers` and `e2e/videos`
(`npm run covers`, `npm run videos`).
