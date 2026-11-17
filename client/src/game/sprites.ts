import Phaser from 'phaser';
import { BOSS_FIGHTS, PLAYER_RADIUS, getCreature, type PlayerView } from '@orb/shared';
import { ALL_FIGURES } from '../art/bestiary';
import { heroSvg } from '../art/hero';
import { BOSS_ART, CREATURE_ART, FL, GI } from '../art/packs.gen';
import { hx, shade } from '../art/render';
import { presentation } from '../presentation';

/**
 * Turns the SVG art (heroes, bosses, summons) into Phaser textures and draws them in the arena.
 * Textures load in the background; until one is ready the old orb is drawn instead.
 */
export class ArenaArt {
  private ready = new Set<string>();
  private loading = new Set<string>();
  private imgs = new Map<string, Phaser.GameObjects.Image>();
  private used = new Set<string>();
  /** Soft outline in the player's colour so heroes stand out from the floor (WebGL only). */
  private glows = new Map<string, { fx: Phaser.FX.Glow; color: number }>();

  constructor(private scene: Phaser.Scene) {}

  /** Starts loading a texture; returns true when it can be drawn. */
  private ensure(key: string, svg: () => string, w: number, h: number): boolean {
    if (this.ready.has(key)) return true;
    if (this.loading.has(key)) return false;
    this.loading.add(key);
    const src = svg().replace('<svg ', `<svg width="${w}" height="${h}" `);
    const img = new Image();
    img.onload = () => {
      if (!this.scene.textures.exists(key)) this.scene.textures.addImage(key, img);
      this.ready.add(key);
    };
    img.onerror = () => this.loading.delete(key);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    return false;
  }
  private image(id: string, key: string): Phaser.GameObjects.Image {
    let im = this.imgs.get(id);
    if (!im) {
      im = this.scene.add.image(0, 0, key).setDepth(10.5);
      this.imgs.set(id, im);
    }
    if (im.texture.key !== key) im.setTexture(key);
    this.used.add(id);
    return im.setVisible(true);
  }
  private outline(id: string, im: Phaser.GameObjects.Image, color: number): void {
    const cur = this.glows.get(id);
    if (cur) {
      if (cur.color !== color) {
        cur.fx.color = color;
        cur.color = color;
      }
      return;
    }
    if (!im.preFX) return;
    const fx = im.preFX.addGlow(color, 2.2, 0, false, 0.1, 6);
    this.glows.set(id, { fx, color });
  }
  /** Call once per frame before drawing. */
  begin(): void {
    this.used.clear();
  }
  /** Call once per frame after drawing: hides sprites of players that left or died. */
  end(): void {
    for (const [id, im] of this.imgs) {
      if (this.used.has(id)) continue;
      im.setVisible(false);
      if (!this.scene.children.exists(im)) {
        this.imgs.delete(id);
        this.glows.delete(id);
      }
    }
  }
  /** Half the height of what is drawn for this player (to place the HP bar above it). */
  topOf(p: PlayerView): number {
    if (p.boss) return PLAYER_RADIUS * ((4.6 + p.form * 0.9) * (p.form >= 3 ? 1.35 : 1) * 0.5 + 0.3);
    return PLAYER_RADIUS * 2.75;
  }

  /** Draws a hero or a boss. Returns false while the art is still loading. */
  drawPlayer(p: PlayerView, alpha: number, now: number): boolean {
    if (p.boss) return this.drawBoss(p, alpha, now);
    const gear = p.look ? p.look.split(',').map(Number).filter(Number.isFinite) : [];
    // The weapon is drawn as a live arena layer so it follows the authoritative aim
    // angle. Baking it into this left/right sprite made diagonal aiming unreadable.
    const key = `hero:${p.char}:${p.look}`;
    if (!this.ensure(key, () => heroSvg({ char: p.char, gear }), 120, 144)) return false;
    const im = this.image(p.id, key);
    this.outline(p.id, im, p.color);
    const moving = p.spd > 0;
    const step = presentation.prefs.motion ? Math.sin(now / 135 + p.x * 0.05) * (moving ? 1.5 : 0.7) : 0;
    const lean = presentation.prefs.motion && moving ? Math.sin(p.aim) * 2.5 : 0;
    const breathe = presentation.prefs.motion ? 1 + Math.sin(now / 420 + p.x * 0.01) * 0.012 : 1;
    const h = PLAYER_RADIUS * 4.6;
    im.setDisplaySize(h * (100 / 120) * breathe, h * breathe)
      .setPosition(p.x, p.y - PLAYER_RADIUS * 0.55 + step)
      .setAngle(lean)
      .setFlipX(Math.cos(p.aim) < 0)
      .setAlpha(alpha);
    if (p.hp <= p.maxHp * 0.34) im.setTint(0xffc0c8);
    else if (p.casting > 0) im.setTint(0xfff1b8);
    else im.clearTint();
    return true;
  }

  /**
   * Bosses change shape with every form: the bestiary figure grows and changes colour in forms 1 and 2, and
   * the final form is a monster (Majen becomes a golden dragon).
   */
  private drawBoss(p: PlayerView, alpha: number, now: number): boolean {
    const idx = Math.max(0, BOSS_FIGHTS.findIndex((b) => b.name === p.name));
    const figId = BOSS_FIGHTS.find((b) => b.name === p.name)?.figure;
    const fig = ALL_FIGURES.find((f) => f.id === figId || f.name.toLowerCase() === p.name.toLowerCase());
    const champion = p.name === 'Majen' || figId === 'majen';
    let key: string;
    let svg: () => string;
    if (p.form >= 3) {
      const art = champion ? 'dragon' : BOSS_ART[(idx * 3 + 2) % BOSS_ART.length] ?? 'dragon';
      key = `boss3:${p.name}`;
      svg = () => monster(art, champion);
    } else if (fig) {
      key = `boss:${fig.id}`;
      svg = () => fig.svg;
    } else {
      key = `boss3:${p.name}`;
      svg = () => monster(BOSS_ART[idx % BOSS_ART.length] ?? 'ogre', false);
    }
    if (!this.ensure(key, svg, 240, 240)) return false;
    const im = this.image(p.id, key);
    const size = PLAYER_RADIUS * (4.6 + p.form * 0.9) * (p.form >= 3 ? 1.35 : 1);
    const breathe = 1 + Math.sin(now / 260) * 0.03;
    const tint = [0xffffff, 0xaee8ff, 0xd9b8ff, 0xffffff][p.form] ?? 0xffffff;
    im.setDisplaySize(size * breathe, size * breathe).setPosition(p.x, p.y - PLAYER_RADIUS * 0.3).setAlpha(alpha).setFlipX(Math.cos(p.aim) < 0);
    if (tint === 0xffffff) im.clearTint();
    else im.setTint(tint);
    return true;
  }

  /** Summons in the arena: their real creature art, bigger for higher ranks. */
  drawCreature(petId: string, creature: number, x: number, y: number, now: number): boolean {
    const c = getCreature(creature);
    const art = CREATURE_ART[c.family]?.[c.species] ?? 'g:paw-print';
    const key = `pet:${art}:${c.color}`;
    if (!this.ensure(key, () => creatureSvg(art, c.color), 128, 128)) return false;
    const im = this.image(`pet${petId}`, key);
    const size = 52 + (creature % 8) * 5;
    im.setDisplaySize(size, size).setPosition(x, y + Math.sin(now / 180 + x * 0.01) * 3).setAlpha(1).clearTint();
    return true;
  }
}

function creatureSvg(art: string, color: number): string {
  if (art.startsWith('g:')) {
    const a = GI[art.slice(2)];
    if (!a) return '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"></svg>';
    return `<svg viewBox="0 0 ${a[0]} ${a[1]}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hx(shade(color, 0.5))}"/><stop offset="1" stop-color="${hx(shade(color, -0.4))}"/></linearGradient></defs><g stroke="${hx(shade(color, -0.7))}" stroke-width="${a[0] / 50}">${a[2].replace(/currentColor/g, 'url(#cg)')}</g></svg>`;
  }
  const a = FL[art];
  return `<svg viewBox="0 0 ${a[0]} ${a[1]}" xmlns="http://www.w3.org/2000/svg">${a[2]}</svg>`;
}

/** A final-form monster from the colour pack. The champion's dragon is repainted in gold. */
function monster(art: string, gold: boolean): string {
  const a = FL[art] ?? FL.dragon;
  let body = a[2];
  if (gold)
    body = body.replace(/#([0-9a-fA-F]{6})\b/g, (_, h: string) => {
      const n = parseInt(h, 16);
      const l = (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
      // Dark parts become deep bronze, light parts bright gold.
      const c = l < 0.25 ? 0x7a4a00 : l < 0.5 ? 0xc8900a : l < 0.75 ? 0xffc93c : 0xfff2a8;
      return hx(c);
    });
  return `<svg viewBox="0 0 ${a[0]} ${a[1]}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
