import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __PLATFORM__: JSON.stringify(mode === 'crazygames' ? 'crazygames' : mode === 'poki' ? 'poki' : 'auto'),
  },
  server: { port: 5190, strictPort: true },
  build: {
    target: 'es2020',
    manifest: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  test: { environment: 'node', testTimeout: 120_000 },
}));
