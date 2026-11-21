import { createGameServer } from './app';

const port = Number(process.env.PORT ?? 2567);
const server = createGameServer();
await server.listen(port, '0.0.0.0');
console.log(`Orb Arena server listening on :${port}`);

// Keep-alive: hit our own public /health URL every 14.5 minutes so hosts that sleep idle
// services (e.g. Render free plan, 15 min) see regular traffic. Render sets RENDER_EXTERNAL_URL.
const KEEPALIVE_MS = 14.5 * 60 * 1000;
const keepAliveUrl = process.env.KEEPALIVE_URL ?? process.env.RENDER_EXTERNAL_URL;
if (keepAliveUrl) {
  const target = `${keepAliveUrl.replace(/\/$/, '')}/health`;
  setInterval(() => {
    fetch(target)
      .then((r) => console.log(`[keepalive] ${target} -> ${r.status}`))
      .catch((e) => console.warn('[keepalive] failed', e instanceof Error ? e.message : e));
  }, KEEPALIVE_MS).unref();
  console.log(`Keep-alive ping every 14.5 min to ${target}`);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void server.gracefullyShutdown().finally(() => process.exit(0));
  });
}
