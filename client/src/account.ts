import { serverUrls } from './net';

/** A secret that identifies this device to the game server. Kept even when progress is reset. */
export function accountToken(): string {
  let t = '';
  try {
    t = localStorage.getItem('orb.token') ?? '';
  } catch {
    /* storage blocked */
  }
  if (!/^[A-Za-z0-9]{20,64}$/.test(t)) {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    t = Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');
    try {
      localStorage.setItem('orb.token', t);
    } catch {
      /* storage blocked */
    }
  }
  return t;
}

const base = () => serverUrls()[0].replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '') + '/api';

async function call<T>(path: string, body?: unknown): Promise<T & { ok: boolean; reason?: string; offline?: boolean }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(base() + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
      cache: 'no-store',
    });
    return (await r.json()) as T & { ok: boolean };
  } catch {
    return { ok: false, offline: true, reason: 'Could not reach the server' } as T & { ok: boolean; offline: boolean; reason: string };
  } finally {
    clearTimeout(timer);
  }
}

export interface PublicPlayer {
  name: string;
  rating: number;
  best: number;
  wins: number;
  games: number;
  tier: string;
  rank: number;
  guild: { id: string; name: string; tag: string } | null;
}
export interface GuildSummary {
  id: string;
  name: string;
  tag: string;
  members: number;
  power: number;
  owner: string;
}

export const checkName = (n: string) => call<{ available: boolean }>(`/name?n=${encodeURIComponent(n)}`);
/** Class and level sent with account calls (for guild buffs and the world score). */
export const facts: { cls?: string; level?: number } = {};
export const registerName = (name: string) => call<{ player: PublicPlayer }>('/register', { token: accountToken(), name, ...facts });
export const fetchMe = () => call<{ player: PublicPlayer & { guild: (PublicPlayer['guild'] & { buff?: { bonus: Record<string, number>; lines: string[] } }) | null; pending?: Array<{ rank: string; bracket: number }> } }>('/me', { token: accountToken(), ...facts });
export const fetchLeaderboard = () => call<{ total: number; top: PublicPlayer[] }>('/leaderboard?limit=50');
export const fetchGuilds = () => call<{ guilds: GuildSummary[] }>('/guilds');
export const fetchBoard = (mode: string, tier: string) =>
  call<{ total: number; top: PublicPlayer[] }>(`/leaderboard?limit=100&mode=${encodeURIComponent(mode)}&tier=${encodeURIComponent(tier)}`);
export const fetchRaid = () =>
  call<{ raid: { name: string; hp: number; max: number; myHits: number; maxHits: number; defeated: boolean; claimed: boolean } }>('/raid', { token: accountToken() });
export const raidHit = (dmg: number) => call<{ hp: number; max: number; defeated: boolean }>('/raid/hit', { token: accountToken(), dmg });
export const raidClaim = () => call<{ reward: { chest: string; stones: number } }>('/raid/claim', { token: accountToken() });
export const claimHold = () => call<{ rewards: Array<{ bracket: number; rank: string }> }>('/claim', { token: accountToken() });
export const fetchGuild = (id: string) =>
  call<{ guild: GuildSummary; members: Array<{ name: string; rating: number; tier: string; owner: boolean }> }>(`/guild/${encodeURIComponent(id)}`);
export const createGuild = (name: string, tag: string) => call<{ guild: GuildSummary }>('/guild/create', { token: accountToken(), name, tag });
export const joinGuild = (id: string) => call<{ guild: GuildSummary }>('/guild/join', { token: accountToken(), id });
export const leaveGuild = () => call<object>('/guild/leave', { token: accountToken() });
