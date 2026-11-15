import { MapSchema, Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') name = '';
  @type('boolean') bot = false;
  @type('uint32') color = 0;
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') aim = 0;
  @type('uint8') hp = 0;
  @type('int16') kills = 0;
  @type('int16') deaths = 0;
  @type('boolean') alive = true;
  @type('boolean') invuln = false;
  @type('boolean') rapid = false;
  @type('uint32') seq = 0;
}

export class BulletState extends Schema {
  @type('string') owner = '';
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') vx = 0;
  @type('float32') vy = 0;
}

export class PickupState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
}

export class ArenaState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: BulletState }) bullets = new MapSchema<BulletState>();
  @type({ map: PickupState }) pickups = new MapSchema<PickupState>();
  @type('string') phase = 'play';
  @type('float32') timeLeft = 0;
  @type('uint16') round = 1;
  @type('string') winner = '';
}
