import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') name = '';
  @type('boolean') bot = false;
  @type('boolean') boss = false;
  @type('uint32') color = 0;
  @type('string') char = 'nova';
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') aim = 0;
  @type('uint32') hp = 0;
  @type('uint32') maxHp = 300;
  @type('uint8') form = 0;
  @type('uint16') lv = 1;
  @type('uint16') atk = 50;
  @type('uint8') def = 0;
  @type('int16') kills = 0;
  @type('int16') deaths = 0;
  @type('int16') score = 0;
  @type('boolean') alive = true;
  @type('boolean') invuln = false;
  @type('uint8') team = 0;
  @type('string') fx = '';
  @type('uint8') shield = 0;
  @type('boolean') slow = false;
  @type('uint8') trail = 0;
  @type('uint8') bfx = 0;
  @type('float32') spd = 1;
  @type('uint32') seq = 0;
  /** Skill ids of the slots, comma separated. */
  @type('string') skills = '';
  /** "remaining:total" seconds per slot, comma separated. */
  @type('string') cds = '';
  @type('float32') mp = 0;
  @type('uint8') maxMp = 100;
  @type('boolean') hidden = false;
  @type('float32') casting = 0;
  @type('uint8') weapon = 0;
  @type('uint8') acc = 0;
  /** Seconds until this player may act (lobby, countdown, waiting to confirm). */
  @type('float32') hold = 0;
  @type('boolean') ready = false;
}

export class BulletState extends Schema {
  @type('string') owner = '';
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') vx = 0;
  @type('float32') vy = 0;
  @type('float32') r = 6;
  @type('uint8') kind = 0;
}

export class PickupState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  /** Powerup id (see shared content). */
  @type('uint16') pu = 0;
}

export class CoinState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('uint8') v = 1;
}

export class MineState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('string') owner = '';
  @type('boolean') armed = false;
}

export class ZoneState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') r = 0;
  @type('string') kind = '';
  @type('string') owner = '';
}
export class PetState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('string') owner = '';
  @type('uint32') color = 0;
}
export class ArenaState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: BulletState }) bullets = new MapSchema<BulletState>();
  @type({ map: PickupState }) pickups = new MapSchema<PickupState>();
  @type({ map: CoinState }) coins = new MapSchema<CoinState>();
  @type({ map: MineState }) mines = new MapSchema<MineState>();
  @type({ map: ZoneState }) zones = new MapSchema<ZoneState>();
  @type({ map: PetState }) pets = new MapSchema<PetState>();
  @type('boolean') ranked = false;
  /** Seconds left for lobby confirmations (0 once the match has started). */
  @type('float32') lobby = 0;
  @type('string') domainName = '';
  @type('uint32') domainColor = 0;
  @type('string') domainOwner = '';
  @type('string') phase = 'play';
  @type('string') mode = 'dm';
  @type('string') mapId = 'neon';
  @type('float32') timeLeft = 0;
  @type('uint16') round = 1;
  @type('string') winner = '';
  @type('int8') winnerTeam = -1;
  @type('int16') teamScore0 = 0;
  @type('int16') teamScore1 = 0;
  @type('string') hillHolder = '';
}
