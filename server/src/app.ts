import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom, RankedRoom } from './ArenaRoom';
import { DuelRoom } from './DuelRoom';
import { registerApi } from './api';
import { Store } from './store';
export function createGameServer(store: Store = Store.auto()) {
  const app = express();
  app.set('trust proxy', true);
  app.use(cors());
  app.get('/', (_req, res) => {
    res.type('text/plain').send('Orb Arena game server is running.');
  });
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/ping', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ t: Date.now() });
  });

  registerApi(app, store);
  const httpServer = createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer, pingInterval: 5000, pingMaxRetries: 3 }),
  });
  gameServer.define('arena', ArenaRoom).filterBy(['mode', 'map']);
  // 2v2 ranked has its own room name so casual players can never land in a ranked match.
  // Ranked is a 1v1 side-view duel (see DuelRoom). The 2v2 team room stays available as 'ranked2v2'.
  gameServer.define('ranked', DuelRoom, { store });
  gameServer.define('ranked2v2', RankedRoom);
  return gameServer;
}
