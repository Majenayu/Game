import { Client, Room } from 'colyseus.js';

export function serverUrls(): string[] {
  const raw = (import.meta.env.VITE_SERVER_URLS as string | undefined) ?? 'ws://localhost:2567';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = list.length ? list : ['ws://localhost:2567'];
  // When testing from a phone on the LAN, "localhost" must point at the dev machine.
  const host = location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return out.map((u) => u.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${host}`));
  }
  return out;
}

function toHttp(url: string): string {
  return url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
}

async function rtt(url: string, timeoutMs: number): Promise<number> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let best = Infinity;
    for (let i = 0; i < 2; i++) {
      const t0 = performance.now();
      const r = await fetch(`${toHttp(url)}/ping?x=${Math.random()}`, {
        signal: ctl.signal,
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('bad ping');
      best = Math.min(best, performance.now() - t0);
    }
    return best;
  } finally {
    clearTimeout(timer);
  }
}

/** Index and url of the lowest latency server. Falls back to the first when all pings fail. */
export async function pickServer(urls = serverUrls()): Promise<{ index: number; url: string }> {
  if (urls.length === 1) return { index: 0, url: urls[0] };
  const times = await Promise.all(urls.map((u) => rtt(u, 2500).catch(() => Infinity)));
  let index = 0;
  times.forEach((t, i) => {
    if (t < times[index]) index = i;
  });
  return { index, url: urls[index] };
}

export interface JoinTarget {
  /** Join this exact room (invite link). */
  roomId?: string;
  /** Index into the server list (from an invite link). */
  serverIndex?: number;
  /** Create a fresh private room (CrazyGames Instant Multiplayer). */
  createPrivate?: boolean;
  /** Game mode or 'mix' for Quick Play. */
  mode?: string;
  /** Map id or 'rotate'. */
  map?: string;
  loadout?: unknown;
  /** Join the ranked queue (separate room type on the server). */
  ranked?: boolean;
  /** Player level (extra max HP). */
  level?: number;
  /** Ranked arena: '1v1' or '2v2'. */
  rankedMode?: '1v1' | '2v2';
  /** Guild war room. */
  war?: boolean;
  token?: string;
  gear?: number[];
  summon?: { id: number; level: number; cards: number[] };
}

/** Joins the ranked 1v1 duel queue. */
export async function joinDuel(
  name: string,
  loadout: unknown,
  level: number,
  token: string,
): Promise<{ room: Room; serverIndex: number }> {
  const { index, url } = await pickServer(serverUrls());
  const room = await new Client(url).joinOrCreate('shadow', { name, loadout, level, token });
  return { room, serverIndex: index };
}
export async function joinArena(
  name: string,
  target: JoinTarget = {},
): Promise<{ room: Room; serverIndex: number }> {
  const urls = serverUrls();
  let serverIndex: number;
  let url: string;
  if (target.serverIndex !== undefined && urls[target.serverIndex]) {
    serverIndex = target.serverIndex;
    url = urls[serverIndex];
  } else {
    ({ index: serverIndex, url } = await pickServer(urls));
  }
  const client = new Client(url);
  const opts = {
    name,
    mode: target.mode ?? 'mix',
    map: target.map ?? 'rotate',
    loadout: target.loadout,
    level: target.level,
    token: target.token,
    gear: target.gear,
    summon: target.summon,
  };
  if (target.rankedMode) {
    const { summon: _s, ...ranked } = opts;
    return { room: await client.joinOrCreate(`ranked${target.rankedMode}`, ranked), serverIndex };
  }
  if (target.war) {
    try {
      return { room: await client.joinOrCreate('guildwar', opts), serverIndex };
    } catch {
      // The open war is between two other guilds: start a new one.
      return { room: await client.create('guildwar', opts), serverIndex };
    }
  }
  const room = target.roomId
    ? await client.joinById(target.roomId, { name, loadout: target.loadout })
    : target.createPrivate
      ? await client.create('arena', { ...opts, private: true })
      : target.ranked
        ? await client.joinOrCreate('ranked2v2', { name, loadout: target.loadout, level: target.level })
        : await client.joinOrCreate('arena', opts);
  return { room, serverIndex };
}

/** Tries to resume a dropped connection for up to `seconds`. */
export async function reconnect(room: Room, url: string, seconds = 15): Promise<Room | null> {
  const token = (room as any).reconnectionToken as string | undefined;
  if (!token) return null;
  const client = new Client(url);
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    try {
      return await client.reconnect(token);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}
