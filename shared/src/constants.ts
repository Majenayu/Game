export const WORLD_W = 1600;
export const WORLD_H = 900;

export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const INPUT_RATE = 20;

export const MAX_PLAYERS = 8;
export const MAX_NICK = 16;

export const PLAYER_RADIUS = 22;
export const PLAYER_SPEED = 280;
export const MAX_HP = 3;

export const BULLET_RADIUS = 6;
export const BULLET_SPEED = 720;
export const BULLET_TTL = 1.1;
export const FIRE_INTERVAL = 0.35;
export const RAPID_FIRE_INTERVAL = 0.12;
export const RAPID_DURATION = 5;

export const RESPAWN_DELAY = 2;
export const INVULN_TIME = 1.5;
export const ROUND_TIME = 90;
export const SCOREBOARD_TIME = 8;

export const PICKUP_INTERVAL = 15;
export const PICKUP_RADIUS = 18;

export const RECONNECT_SECONDS = 15;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const OBSTACLES: Rect[] = [
  { x: 700, y: 390, w: 200, h: 120 },
  { x: 260, y: 180, w: 30, h: 220 },
  { x: 1310, y: 500, w: 30, h: 220 },
  { x: 1150, y: 180, w: 200, h: 30 },
  { x: 250, y: 690, w: 200, h: 30 },
];

export const PLAYER_COLORS = [0x4dd2ff, 0xff5e8a, 0x7dff6b, 0xffc93c, 0xb77dff, 0xff8a3c, 0x3cffd0, 0xf2f2f2];

export const MSG_INPUT = 'input';
export const MSG_EVENT = 'ev';
export const MSG_HELLO = 'hello';
