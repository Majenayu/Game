/**
 * Zombie Survival: endless waves on a ruined neon street. Walkers from wave 1, Runners from 2, Spitters from 3,
 * Officers from 4, Bombers from 5; a boss every 5th wave (the Brute on 5, 15, 25..., the Toxic Titan on 10, 20...).
 * Score per kill times a multiplier that grows with kills and resets when you are hit (up to x5).
 */
import { Hero, effect, floater, sparks, stepWorld, makeWorld, blip, type Box, type Target, type World, type Keys } from './fight';
import { ZSPEC, drawZombie, type ZLook, type ZType } from './zombies';
import type { El } from './save';

let ZID = 1000;
export class Zombie implements Target, ZLook {
  id = ZID++;
  team = 2;
  hp: number;
  maxHp: number;
  state: ZLook['state'] = 'spawn';
  k = 0;
  len = 40;
  phase = 0;
  t = 0;
  flash = 0;
  shieldHp: number;
  seed: number;
  vx = 0;
  cool = 60;
  timer = 0;
  hitOnce = false;
  gone = false;
  facing = 1;
  constructor(readonly type: ZType, public x: number, public feet: number, hpScale = 1) {
    this.hp = this.maxHp = Math.round(ZSPEC[type].hp * hpScale);
    this.shieldHp = type === 'officer' ? 260 : 0;
    this.seed = Math.floor(Math.random() * 1e6);
    if (ZSPEC[type].boss) {
      this.state = 'spawn';
      this.len = 90;
    }
  }
  get spec() {
    return ZSPEC[this.type];
  }
  alive(): boolean {
    return this.state !== 'dead' && this.state !== 'spawn';
  }
  box(): Box {
    const s = this.spec.size;
    return { x: this.x - 34 * s, y: this.feet - 235 * s, w: 68 * s, h: 235 * s };
  }
  set(state: ZLook['state'], len: number): void {
    this.state = state;
    this.k = 0;
    this.len = len;
    this.hitOnce = false;
  }
  hurt(dmg: number, kb: number, lift: number, fromX: number, stun: number, w: World): number {
    if (!this.alive()) return 0;
    const front = (fromX - this.x) * this.facing > 0;
    if (this.type === 'officer' && front && this.shieldHp > 0) {
      this.shieldHp -= dmg;
      sparks(w, this.x + this.facing * 30, this.feet - 130, 6, '#9fe0ff', 6);
      floater(w, this.x, this.feet - 260, this.shieldHp > 0 ? 'BLOCK' : 'SHIELD BROKEN', '#9fe0ff', 24);
      this.x -= Math.sign(fromX - this.x) * kb * 0.3;
      return 0;
    }
    this.hp -= dmg;
    this.flash = 4;
    const boss = !!this.spec.boss;
    if (!boss) this.x -= Math.sign(fromX - this.x || 1) * kb * 1.2;
    void lift;
    if (this.hp <= 0) {
      this.hp = 0;
      this.set('dead', 70);
      if (this.type === 'bomber') this.explode(w);
    } else if (!boss && this.state !== 'fuse') this.set('hurt', Math.max(10, stun));
    return dmg;
  }
  explode(w: World): void {
    const e = effect('boom', 'boom', this.x, this.feet - 60, 0, 0, 30, 130, this.spec.dmg, null, 1);
    w.effects.push(e);
    w.shake = Math.max(w.shake, 16);
    blip('boom');
  }
  step(w: World, p: Hero, spawn: (t: ZType, x: number) => void): void {
    this.t++;
    if (this.flash > 0) this.flash--;
    this.k = Math.min(1, this.k + 1 / this.len);
    const d = p.x - this.x;
    const dist = Math.abs(d);
    const sp = this.spec;
    if (this.cool > 0) this.cool--;
    this.timer++;
    switch (this.state) {
      case 'spawn':
        if (this.k >= 1) this.set('walk', 1);
        return;
      case 'dead':
        if (this.k >= 1) this.gone = true;
        return;
      case 'hurt':
        if (this.k >= 1) this.set('walk', 1);
        return;
      case 'attack':
        if (this.k > 0.55 && !this.hitOnce) {
          this.hitOnce = true;
          if (dist < sp.reach + 50 && Math.abs(p.feet - this.feet) < 160) p.hurt(sp.dmg, 10, sp.boss ? 10 : 0, this.x, 22, w);
        }
        if (this.k >= 1) this.set('walk', 1);
        return;
      case 'fuse':
        if (this.k >= 1) {
          this.hp = 0;
          this.explode(w);
          this.set('dead', 50);
        }
        return;
      case 'spit':
        if (this.k > 0.5 && !this.hitOnce) {
          this.hitOnce = true;
          const n = this.type === 'titan' ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const tx = d + (i - (n - 1) / 2) * 140;
            const e = effect('acid', 'acid', this.x + this.facing * 30 * sp.size, this.feet - 200 * sp.size, tx / 52, -11 - i, 200, 14, sp.dmg, { id: this.id, team: 2 }, 0);
            w.effects.push(e);
          }
        }
        if (this.k >= 1) this.set('walk', 1);
        return;
      case 'slam':
        if (this.k > 0.55 && !this.hitOnce) {
          this.hitOnce = true;
          w.shake = 20;
          blip('boom');
          for (const dir of [-1, 1]) w.effects.push(effect('shock', 'rock', this.x + dir * 120, w.ground, dir * 8, 0, 120, 40, 120, { id: this.id, team: 2 }, 0));
          if (this.type === 'titan') {
            spawn('walker', this.x - 260);
            spawn('walker', this.x + 260);
          }
        }
        if (this.k >= 1) this.set('walk', 1);
        return;
      case 'charge':
        this.x += this.facing * 10;
        this.phase += 0.35;
        if (!this.hitOnce && Math.abs(p.x - this.x) < 90 && p.feet > w.ground - 120) {
          this.hitOnce = true;
          p.hurt(sp.dmg, 22, 12, this.x - this.facing * 50, 30, w);
        }
        if (this.k >= 1 || this.x < w.left - 40 || this.x > w.right + 40) {
          this.x = Math.max(w.left, Math.min(w.right, this.x));
          this.set('walk', 1);
        }
        return;
      default:
        break;
    }
    // walking
    this.facing = d > 0 ? 1 : -1;
    if (this.type === 'spitter') {
      if (dist < 260) this.x -= this.facing * sp.speed;
      else if (dist > 460) this.x += this.facing * sp.speed;
      if (dist < 520 && this.cool <= 0) {
        this.set('spit', 50);
        this.cool = 140;
        return;
      }
      this.phase += 0.08;
      return;
    }
    if (sp.boss) {
      if (this.timer > 260 && this.type === 'brute' && dist > 300) {
        this.timer = 0;
        this.set('charge', 70);
        return;
      }
      if (this.timer > 320) {
        this.timer = 0;
        this.set('slam', 70);
        return;
      }
      if (this.type === 'titan' && this.cool <= 0 && dist > 250) {
        this.set('spit', 60);
        this.cool = 150;
        return;
      }
    }
    if (dist > sp.reach) {
      this.x += this.facing * sp.speed;
      this.phase += 0.05 + sp.speed * 0.04;
    } else if (this.cool <= 0) {
      if (this.type === 'bomber') this.set('fuse', 45);
      else {
        this.set('attack', sp.boss ? 55 : 40);
        this.cool = sp.boss ? 50 : 70;
      }
    }
  }
  draw(g: CanvasRenderingContext2D): void {
    drawZombie(g, this);
  }
}

export interface ZGame {
  w: World;
  hero: Hero;
  zs: Zombie[];
  wave: number;
  toSpawn: number;
  spawnTimer: number;
  remaining: number;
  score: number;
  mult: number;
  streak: number;
  banner: number;
  bannerText: string;
  between: number;
  over: boolean;
  overTimer: number;
  kills: number;
  boss: Zombie | null;
}
export const ZGROUND = 668;
export function newZGame(el: El, wave = 1): ZGame {
  const zs: Zombie[] = [];
  const hero = new Hero(el, 420, 1, 1, ZGROUND, 1000);
  hero.scale = 0.8;
  hero.mp = 60;
  const w = makeWorld(ZGROUND, 60, 1316, () => [hero, ...zs]);
  const z: ZGame = { w, hero, zs, wave: wave - 1, toSpawn: 0, spawnTimer: 0, remaining: 0, score: 0, mult: 1, streak: 0, banner: 0, bannerText: '', between: 1, over: false, overTimer: 0, kills: 0, boss: null };
  const baseHurt = hero.hurt.bind(hero);
  hero.hurt = (dmg, kb, lift, fromX, stun, ww) => {
    const got = baseHurt(dmg, kb, lift, fromX, stun, ww);
    if (got > 0 && !hero.guarding) {
      z.mult = 1;
      z.streak = 0;
      floater(ww, hero.x, hero.box().y, `-${got}`, '#ff4a4a', 30);
    }
    return got;
  };
  return z;
}
function waveTypes(n: number): ZType[] {
  const t: ZType[] = ['walker', 'walker'];
  if (n >= 2) t.push('runner');
  if (n >= 3) t.push('spitter');
  if (n >= 4) t.push('officer');
  if (n >= 5) t.push('bomber', 'runner');
  return t;
}
function startWave(z: ZGame): void {
  z.wave++;
  z.toSpawn = 6 + z.wave * 3;
  z.remaining = z.toSpawn;
  z.spawnTimer = 30;
  z.banner = 120;
  const bossWave = z.wave % 5 === 0;
  z.bannerText = bossWave ? `WAVE ${z.wave} · BOSS` : `WAVE ${z.wave}`;
  if (bossWave) {
    const type: ZType = z.wave % 10 === 5 ? 'brute' : 'titan';
    const b = new Zombie(type, 1100, ZGROUND, 1 + (z.wave - 5) * 0.08);
    z.zs.push(b);
    z.boss = b;
    z.remaining++;
  }
}
export function stepZGame(z: ZGame, keys: Keys): void {
  const { w, hero } = z;
  if (w.hitstop > 0) {
    w.hitstop--;
    return;
  }
  if (z.over) {
    z.overTimer++;
    hero.step(w, { ...keys, left: false, right: false, attack: false });
    stepWorld(w, [hero]);
    return;
  }
  if (z.between > 0 && --z.between === 0) startWave(z);
  if (z.banner > 0) z.banner--;
  const spawn = (t: ZType, x: number) => {
    const zz = new Zombie(t, Math.max(w.left, Math.min(w.right, x)), ZGROUND, 1 + z.wave * 0.04);
    z.zs.push(zz);
  };
  // spawner
  const alive = z.zs.filter((q) => q.state !== 'dead').length;
  if (z.toSpawn > 0 && --z.spawnTimer <= 0 && alive < 5 + Math.min(z.wave, 7)) {
    const types = waveTypes(z.wave);
    const t = types[Math.floor(Math.random() * types.length)];
    const side = Math.random() < 0.5 ? -1 : 1;
    spawn(t, side < 0 ? 70 + Math.random() * 60 : 1300 - Math.random() * 60);
    z.toSpawn--;
    z.spawnTimer = Math.max(22, 80 - z.wave * 4);
  }
  hero.step(w, keys);
  for (const q of z.zs) {
    const wasAlive = q.alive();
    q.step(w, hero, (t, x) => {
      spawn(t, x);
      z.remaining++;
    });
    if (wasAlive && q.state === 'dead') {
      z.kills++;
      z.streak++;
      z.mult = Math.min(5, 1 + Math.floor(z.streak / 4));
      const pts = q.spec.score * z.mult;
      z.score += pts;
      z.remaining = Math.max(0, z.remaining - 1);
      floater(w, q.x, q.feet - 250 * q.spec.size, `+${pts}`, '#ffe14a', 26);
      if (q === z.boss) {
        z.boss = null;
        z.banner = 120;
        z.bannerText = 'BOSS DOWN';
        w.flash = 10;
      }
    }
  }
  // a hit on a dying zombie can count it after death; keep the list small
  z.zs.splice(0, z.zs.length, ...z.zs.filter((q) => !q.gone));
  stepWorld(w, [hero]);
  if (z.toSpawn === 0 && z.remaining === 0 && z.between === 0 && !z.zs.some((q) => q.alive() || q.state === 'spawn')) {
    z.between = 150;
    z.banner = 120;
    z.bannerText = `WAVE ${z.wave} CLEAR`;
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.2);
  }
  if (hero.ko && !z.over) z.over = true;
}
