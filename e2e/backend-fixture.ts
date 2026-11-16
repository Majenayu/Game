/** Real Colyseus + HTTP API, ephemeral in-memory storage, only for opt-in e2e runs. */
import { createGameServer } from '../server/src/app';
import { Store } from '../server/src/store';

process.env.VITEST = '1';
const server = createGameServer(Store.auto());
await server.listen(2598, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { void server.gracefullyShutdown().finally(() => process.exit(0)); });
}
