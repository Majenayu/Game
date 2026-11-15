import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom } from './ArenaRoom';

export function createGameServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(cors());
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/ping', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ t: Date.now() });
  });

  const httpServer = createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer, pingInterval: 5000, pingMaxRetries: 3 }),
  });
  gameServer.define('arena', ArenaRoom);
  return gameServer;
}
