import { defineConfig } from 'vitest/config';

// Relative base so the build works from any folder (portal upload, GitHub Pages sub-path, itch.io).
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __PLATFORM__: JSON.stringify(mode === 'crazygames' ? 'crazygames' : 'auto'),
  },
  server: { port: 5180, strictPort: true },
  build: {
    target: 'es2020',
    manifest: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Phaser in its own chunk so game code changes do not invalidate the engine cache.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
