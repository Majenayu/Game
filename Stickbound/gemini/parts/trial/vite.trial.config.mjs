// Dev server for the Hero Trial checks: port 5191, no hot reload, so edits elsewhere never reload a page mid-check.
// Run from Stickbound/: npx vite --config gemini/parts/trial/vite.trial.config.mjs
import { defineConfig } from 'vite';
export default defineConfig({
  root: process.cwd(),
  define: { __PLATFORM__: JSON.stringify('auto') },
  server: { port: 5191, strictPort: true, hmr: false, watch: null },
});

