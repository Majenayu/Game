import {
  BULLET_FX,
  CHARACTER_LIST,
  COLORS,
  CASUAL_BUDGET,
  EFFECT_LIST,
  ELEMENTS,
  FUSION_MIN_LEVEL,
  LEVELS,
  MAP_LIST,
  MODES,
  MODE_LIST,
  MODS,
  POWERUP_TOTAL,
  RANK_INFO,
  RARITIES,
  RECIPES,
  TRAILS,
  ACCESSORIES,
  BOSS_FIGHTS,
  BOSS_LEVELS,
  LEVEL_COPIES,
  UNIQUES,
  WEAPONS,
  uniqueIdOf,
  RANKED_TIERS,
  TOWER_UNLOCK_LEVEL,
  budgetCost,
  neutralInstance,
  rankedTier,
  getSkill,
  loadoutCost,
  masteryLevel,
  objectiveText,
  powerupFromId,
  usableInBattle,
  type LevelDef,
  type ModeId,
  type SkillInstance,
} from '@orb/shared';
import { ALL_FIGURES, MAJEN, uniqueSvg } from '../art/bestiary';
import { sfx } from '../audio';
import { ENABLE_ADS } from '../platform/crazygames';
import type { Ui } from '../ui/ui';
import { esc, hex } from '../ui/ui';
import {
  DAILY_POOL,
  DAILY_REWARDS,
  EXTRA_SPIN_COST,
  WEEKLY_POOL,
  WHEEL,
  type Progress,
  type ShopKind,
} from './economy';

export interface PageActions {
  playOnline(mode: ModeId | 'mix', map: string): void;
  playOffline(mode: ModeId, map: string): void;
  startLevel(level: LevelDef): void;
  /** Joins the online 2v2 ranked queue. */
  playRanked(): void;
  /** Opens the training ground (harmless dummies). */
  playTraining(): void;
  /** 1v1 against the champion Majen. Open to everyone. */
  challengeChampion(): void;
  /** Shows the rewarded-ad flow for an extra spin. Resolves true when granted. */
  watchAd(): Promise<boolean>;
}

export type PageName =
  | 'arenas'
  | 'campaign'
  | 'loadout'
  | 'collection'
  | 'fusion'
  | 'shop'
  | 'daily'
  | 'quests'
  | 'spin'
  | 'dex'
  | 'bestiary'
  | 'tower'
  | 'ranked'
  | 'market'
  | 'training';

const TITLES: Record<PageName, string> = {
  arenas: 'Arenas & Modes',
  campaign: 'Campaign',
  loadout: 'Loadout',
  collection: 'Skill Collection',
  fusion: 'Fusion Lab',
  shop: 'Shop',
  daily: 'Daily Reward',
  quests: 'Quests',
  spin: 'Lucky Draw',
  dex: 'Powerup Collection',
  bestiary: 'Bestiary',
  tower: 'Boss Tower',
  ranked: '2v2 Ranked',
  market: 'Market',
  training: 'Training Ground',
};

export class Pages {
  current: PageName | null = null;
  private mode: ModeId = 'dm';
  private shopTab: ShopKind = 'char';
  private wheelBusy = false;
  private spinMsg = '';
  private fuseA = '';
  private fuseB = '';
  private fuseMsg = '';

  constructor(
    private ui: Ui,
    private pr: Progress,
    private actions: PageActions,
  ) {}

  open(name: PageName): void {
    this.current = name;
    this.render();
  }

  close(): void {
    this.current = null;
    this.ui.hidePage();
  }

  render(): void {
    if (!this.current) return;
    const name = this.current;
    const body = this.ui.showPage(TITLES[name], this.html(name));
    this.bind(name, body);
    const l = this.pr.level;
    this.ui.setStatus(l.level, l.into, l.need, this.pr.data.coins);
  }

  // ---- html builders ----------------------------------------------------------

  private html(name: PageName): string {
    switch (name) {
      case 'arenas':
        return this.arenasHtml();
      case 'campaign':
        return this.campaignHtml();
      case 'loadout':
        return this.loadoutHtml();
      case 'collection':
        return this.collectionHtml();
      case 'fusion':
        return this.fusionHtml();
      case 'shop':
        return this.shopHtml();
      case 'daily':
        return this.dailyHtml();
      case 'quests':
        return this.questsHtml();
      case 'spin':
        return this.spinHtml();
      case 'dex':
        return this.dexHtml();
      case 'bestiary':
        return this.bestiaryHtml();
      case 'tower':
        return this.towerHtml();
      case 'ranked':
        return this.rankedHtml();
      case 'market':
        return this.marketHtml();
      case 'training':
        return this.trainingHtml();
    }
  }

  private arenasHtml(): string {
    const lvl = this.pr.level.level;
    const tabs = MODE_LIST.map(
      (m) => `<button class="${m === this.mode ? 'on' : ''}" data-mode="${m}">${MODES[m].name}</button>`,
    ).join('');
    const maps = MAP_LIST.map((m) => {
      const locked = lvl < m.level;
      return `<div class="card ${locked ? 'locked' : ''}">
        <b style="color:${hex(m.theme.accent)}">${esc(m.name)}</b>
        <div class="d">${locked ? `Unlocks at level ${m.level}` : `${m.obstacles.length} walls${m.hazards.length ? ', lava' : ''}`}</div>
        <button data-online="${m.id}" ${locked ? 'disabled' : ''}>Play online</button>
        <button class="ghost" data-offline="${m.id}" ${locked ? 'disabled' : ''}>vs bots</button>
      </div>`;
    }).join('');
    return `<div class="tabs">${tabs}</div>
      <p class="sub">${esc(MODES[this.mode].desc)} (${MODES[this.mode].roundTime}s rounds)</p>
      <div class="row"><div class="grow"><b>Quick Play: Mixed Arenas</b><div class="sub" style="margin:0">Every round changes the mode and the map. Best for finding real players.</div></div><button data-quick="1">Play</button></div>
      <h3>Pick an arena</h3><div class="cards">${maps}</div>`;
  }

  private campaignHtml(): string {
    const rows = LEVELS.map((l) => {
      const unlocked = this.pr.levelUnlocked(l);
      const stars = this.pr.data.campaign[String(l.id)] ?? 0;
      const st = [1, 2, 3].map((i) => `<span class="star ${i <= stars ? 'on' : ''}">&#9733;</span>`).join('');
      return `<div class="row ${unlocked ? '' : 'locked'}">
        <div style="width:28px;font-size:18px;color:var(--gold)">${l.id}</div>
        <div class="grow"><b>${esc(l.name)}${l.boss ? ' <span class="tag" style="color:#ff1744;border-color:#ff1744">BOSS</span>' : ''}</b>
          <div class="sub" style="margin:0">${esc(objectiveText(l))} &middot; ${MODES[l.mode].name} &middot; ${l.bots} enemies</div></div>
        <div style="font-size:20px">${st}</div>
        <button data-lvl="${l.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? 'Play' : 'Locked'}</button>
      </div>`;
    }).join('');
    return `<p class="sub">Stars earned: ${this.pr.totalStars()} / ${LEVELS.length * 3}. Star 1: clear it. Star 2: beat the par time. Star 3: clear without dying.</p>${rows}`;
  }

  private loadoutHtml(): string {
    const l = this.pr.data.loadout;
    const owned = this.pr.data.owned;
    const chars = CHARACTER_LIST.filter((c) => owned.chars.includes(c.id))
      .map(
        (
          c,
        ) => `<div class="card ${l.char === c.id ? 'sel' : ''}"><b>${esc(c.name)}</b><div class="d">${esc(c.desc)}<br />HP ${c.hp} &middot; Speed ${Math.round(c.speed * 100)}%</div>
        <button data-equip="char:${c.id}" ${l.char === c.id ? 'disabled' : ''}>${l.char === c.id ? 'Equipped' : 'Equip'}</button></div>`,
      )
      .join('');
    const cos = (kind: 'color' | 'trail' | 'bfx') => {
      const list = kind === 'color' ? COLORS : kind === 'trail' ? TRAILS : BULLET_FX;
      const key = kind === 'color' ? 'colors' : kind === 'trail' ? 'trails' : 'bfx';
      const cur = kind === 'color' ? l.color : kind === 'trail' ? l.trail : l.bfx;
      return list
        .filter((c) => (owned[key] as number[]).includes(c.id))
        .map(
          (
            c,
          ) => `<div class="card ${cur === c.id ? 'sel' : ''}">${c.hex !== undefined ? `<span class="swatch" style="color:${hex(c.hex)};background:${hex(c.hex)}"></span>` : ''}<b>${esc(c.name)}</b>
          <button data-equip="${kind}:${c.id}" ${cur === c.id ? 'disabled' : ''}>${cur === c.id ? 'Equipped' : 'Equip'}</button></div>`,
        )
        .join('');
    };
    const gear = (kind: 'weapon' | 'acc') => {
      const ownedIds = kind === 'weapon' ? owned.weapons : owned.accs;
      const cur = kind === 'weapon' ? l.weapon : l.acc;
      const list: Array<{ id: number; name: string; desc: string }> =
        kind === 'weapon' ? WEAPONS : ACCESSORIES.map((a) => ({ id: a.id, name: a.name, desc: 'Looks only.' }));
      return list
        .filter((c) => ownedIds.includes(c.id))
        .map(
          (c) => `<div class="card ${cur === c.id ? 'sel' : ''}"><b>${esc(c.name)}</b><div class="d">${esc(c.desc)}</div>
          <button data-equip="${kind}:${c.id}" ${cur === c.id ? 'disabled' : ''}>${cur === c.id ? 'Equipped' : 'Equip'}</button></div>`,
        )
        .join('');
    };
    return `<p class="sub">Your loadout is used in every match. You can also change skills and weapon in the lobby before each match. Buy more weapons and accessories in the Shop.</p>
      ${this.skillSlotsHtml()}
      <h3>Weapon</h3><div class="cards">${gear('weapon')}</div>
      <h3>Accessory</h3><div class="cards">${gear('acc')}</div>
      <h3>Character</h3><div class="cards">${chars}</div>
      <h3>Orb color</h3><div class="cards">${cos('color')}</div>
      <h3>Trail</h3><div class="cards">${cos('trail')}</div>
      <h3>Bullets</h3><div class="cards">${cos('bfx')}</div>`;
  }

  // ---- skills -----------------------------------------------------------------

  /** One skill card: rank badge, element colour, level, copies and mastery. */
  private skillCard(s: SkillInstance, buttons = '', cls = ''): string {
    const d = getSkill(s.skillId);
    const rank = RANK_INFO[d.rank];
    const el = ELEMENTS[d.element];
    const col = el ? hex(el.color) : hex(rank.color);
    const tags = `${s.bound ? '<span class="tag">Bound</span>' : ''}${d.unique ? '<span class="tag" style="color:#ff4da6;border-color:#ff4da6">Unique</span>' : ''}`;
    return `<div class="card skillcard ${cls}" style="border-color:${col}">
      <span class="rb" style="color:${hex(rank.color)}" title="${rank.name}">${d.rank}</span>
      <b style="color:${col}">${esc(d.name)}</b>
      <div class="d">${esc(d.category)}${el ? ` &middot; ${esc(el.name)}` : ''} &middot; ${esc(d.kind)}<br />
        Lv ${s.level} &middot; ${s.copies} cop${s.copies === 1 ? 'y' : 'ies'} &middot; Mastery ${masteryLevel(s.masteryXp)}<br />
        Cost ${budgetCost(s)} ${tags}</div>${buttons}</div>`;
  }

  private sortedSkills(): SkillInstance[] {
    const order = Object.keys(RANK_INFO);
    return [...this.pr.data.skills].sort(
      (a, b) =>
        order.indexOf(getSkill(b.skillId).rank) - order.indexOf(getSkill(a.skillId).rank) ||
        b.level - a.level ||
        a.skillId - b.skillId,
    );
  }

  private collectionHtml(): string {
    const skills = this.sortedSkills();
    const drop = this.pr.dailySkillStatus().canClaim;
    const cards = skills.map((s) => this.skillCard(s)).join('');
    return `<p class="sub">You own ${skills.length} skill(s). Duplicates merge into the skill you already have and raise its level automatically. Win matches and clear levels to find more.</p>
      <div class="row"><div class="grow"><b>Daily skill drop</b><div class="sub" style="margin:0">One free skill every day.</div></div>
      <button data-dailydrop="1" ${drop ? '' : 'disabled'}>${drop ? 'Claim' : 'Come back tomorrow'}</button></div>
      <h3>Your skills</h3><div class="cards">${cards || '<p class="sub">No skills yet.</p>'}</div>
      ${this.uniquesHtml()}`;
  }

  /** All 100 unique skills: owned ones are shown in full, the rest show how to get them. */
  private uniquesHtml(): string {
    const owned = UNIQUES.filter((u) => this.pr.skillBySkillId(uniqueIdOf(u.n))).length;
    const list = UNIQUES.map((u) => {
      const have = !!this.pr.skillBySkillId(uniqueIdOf(u.n));
      return `<div class="card ${have ? 'sel' : 'locked'}" style="border-color:#ff4da6"><span class="rb" style="color:#ff4da6">U</span>
        <b style="color:#ff4da6">${esc(u.name)}</b><div class="d">${esc(u.category)} &middot; ${esc(u.kind)}<br />${esc(u.desc)}</div>
        <div class="d">${have ? 'Owned' : 'Not owned'}</div></div>`;
    }).join('');
    return `<h3>Unique skills (${owned} / ${UNIQUES.length})</h3>
      <p class="sub">Uniques are the strongest skills. Get one by beating the champion Majen for the first time, or by hitting the UNIQUE slice in the Lucky Draw.</p>
      <div class="cards">${list}</div>`;
  }
  private skillSlotsHtml(): string {
    const pr = this.pr;
    const equipped = pr.loadoutInstances();
    const ids = new Set(equipped.map((s) => s.skillId));
    const cost = loadoutCost(equipped);
    const slots = [0, 1, 2, 3, 4]
      .map((i) => {
        const s = equipped[i];
        return s
          ? this.skillCard(s, `<button class="ghost" data-unequip="${s.skillId}">Remove</button>`, 'sel')
          : `<div class="card locked"><b>Slot ${i + 1}</b><div class="d">Empty. Key ${i + 1}</div></div>`;
      })
      .join('');
    const pool = this.sortedSkills()
      .filter((s) => usableInBattle(s.skillId) && !ids.has(s.skillId))
      .map((s) => this.skillCard(s, `<button data-equipskill="${s.skillId}">Equip</button>`))
      .join('');
    return `<h3>Battle skills (keys 1-5)</h3>
      <p class="sub">Power budget: ${cost} / ${CASUAL_BUDGET}. Higher ranks and levels cost more. Skills that only work outside battle are not listed.</p>
      <div class="cards">${slots}</div>
      <h3>Available skills</h3><div class="cards">${pool || '<p class="sub">Nothing else to equip.</p>'}</div>`;
  }

  private fusionHtml(): string {
    const pr = this.pr;
    const st = pr.fusionStatus();
    const pick = (uid: string) => (pr.data.skills.some((s) => s.uid === uid) ? uid : '');
    this.fuseA = pick(this.fuseA);
    this.fuseB = pick(this.fuseB);
    const cards = this.sortedSkills()
      .filter((s) => !getSkill(s.skillId).unique)
      .map((s) => {
        const sel = s.uid === this.fuseA || s.uid === this.fuseB;
        return this.skillCard(
          s,
          `<button class="${sel ? '' : 'ghost'}" data-fpick="${s.uid}">${sel ? 'Selected' : 'Pick'}</button>`,
          sel ? 'sel' : s.level < FUSION_MIN_LEVEL ? 'locked' : '',
        );
      })
      .join('');
    const recipes = RECIPES.map(
      (r) =>
        `<div class="row"><div class="grow"><b>${esc(r.name)}</b><div class="sub" style="margin:0">${esc(r.hint)}</div></div><span class="tag">Secret recipe</span></div>`,
    ).join('');
    const ready = !!this.fuseA && !!this.fuseB && st.left > 0;
    return `<p class="sub">Fuse two different skills of the same or neighbouring rank (both at level ${FUSION_MIN_LEVEL}+) into a new one. The two parents are used up. Fusions left this week: ${st.left}.</p>
      <div style="text-align:center"><button data-fuse="1" ${ready ? '' : 'disabled'}>Fuse</button>
      <div class="sub" style="min-height:22px;color:var(--gold)">${esc(this.fuseMsg)}</div></div>
      <h3>Pick two skills</h3><div class="cards">${cards || '<p class="sub">No skills to fuse.</p>'}</div>
      <h3>Unique recipes</h3><p class="sub">Unique skills can be crafted from rare, high level skills. The first player to craft one owns it. Hints only.</p>${recipes}`;
  }

  private shopHtml(): string {
    const pr = this.pr;
    const lvl = pr.level.level;
    const tabs = (
      [
        ['char', 'Characters'],
        ['color', 'Colors'],
        ['trail', 'Trails'],
        ['bfx', 'Bullets'],
        ['weapon', 'Weapons'],
        ['acc', 'Accessories'],
      ] as Array<[ShopKind, string]>
    )
      .map(([k, n]) => `<button class="${k === this.shopTab ? 'on' : ''}" data-shoptab="${k}">${n}</button>`)
      .join('');
    type Item = {
      id: string | number;
      name: string;
      desc: string;
      price: number;
      level: number;
      swatch?: number;
    };
    let items: Item[] = [];
    if (this.shopTab === 'char')
      items = CHARACTER_LIST.map((c) => ({
        id: c.id,
        name: c.name,
        desc: `${c.desc} HP ${c.hp}`,
        price: c.price,
        level: c.level,
      }));
    if (this.shopTab === 'color')
      items = COLORS.map((c) => ({
        id: c.id,
        name: c.name,
        desc: '',
        price: c.price,
        level: c.level,
        swatch: c.hex,
      }));
    if (this.shopTab === 'trail')
      items = TRAILS.map((c) => ({
        id: c.id,
        name: c.name,
        desc: 'Leaves a trail behind your orb.',
        price: c.price,
        level: c.level,
      }));
    if (this.shopTab === 'bfx')
      items = BULLET_FX.map((c) => ({
        id: c.id,
        name: c.name,
        desc: 'Bullet style.',
        price: c.price,
        level: c.level,
      }));
    if (this.shopTab === 'weapon')
      items = WEAPONS.map((c) => ({ id: c.id, name: c.name, desc: c.desc, price: c.price, level: c.level }));
    if (this.shopTab === 'acc')
      items = ACCESSORIES.map((c) => ({
        id: c.id,
        name: c.name,
        desc: 'A look for your orb.',
        price: c.price,
        level: c.level,
      }));
    const cards = items
      .map((it) => {
        const own = pr.owns(this.shopTab, it.id);
        const locked = !own && lvl < it.level;
        const btn = own
          ? '<button disabled>Owned</button>'
          : locked
            ? `<button disabled>Level ${it.level}</button>`
            : `<button data-buy="${this.shopTab}:${it.id}" ${pr.data.coins < it.price ? 'class="ghost"' : ''}>&#9679; ${it.price}</button>`;
        return `<div class="card ${locked ? 'locked' : ''}">${it.swatch !== undefined ? `<span class="swatch" style="color:${hex(it.swatch)};background:${hex(it.swatch)}"></span>` : ''}
          <b>${esc(it.name)}</b><div class="d">${esc(it.desc)}</div>${btn}</div>`;
      })
      .join('');
    return `<div class="tabs">${tabs}</div><div class="cards">${cards}</div>`;
  }

  private dailyHtml(): string {
    const st = this.pr.dailyStatus();
    const days = DAILY_REWARDS.map((c, i) => {
      const day = i + 1;
      const done = !st.canClaim ? day <= ((this.pr.data.daily.streak - 1) % 7) + 1 : day < st.nextDay;
      const now = st.canClaim && day === st.nextDay;
      return `<div class="day ${done ? 'done' : ''} ${now ? 'now' : ''}">Day ${day}<b>&#9679; ${c}</b>${done ? '&#10003;' : ''}</div>`;
    }).join('');
    return `<p class="sub">Log in every day to keep your streak. Day 7 pays the most, then the cycle restarts. Streak: ${st.streak} day(s).</p>
      <div class="days">${days}</div>
      <div style="text-align:center"><button data-claimdaily="1" ${st.canClaim ? '' : 'disabled'}>${st.canClaim ? `Claim day ${st.nextDay}` : 'Come back tomorrow'}</button></div>`;
  }

  private questRow(q: { id: string; progress: number; claimed: boolean }): string {
    const def = this.pr.questDef(q.id);
    if (!def) return '';
    const done = q.progress >= def.target;
    return `<div class="row"><div class="grow"><b>${esc(def.text)}</b>
        <div class="bar"><div style="width:${Math.min(100, (q.progress / def.target) * 100)}%"></div></div>
        <div class="sub" style="margin:2px 0 0">${Math.min(q.progress, def.target)} / ${def.target} &middot; reward &#9679; ${def.coins} + ${def.xp} XP</div></div>
        <button data-claimq="${q.id}" ${done && !q.claimed ? '' : 'disabled'}>${q.claimed ? 'Claimed' : done ? 'Claim' : 'In progress'}</button></div>`;
  }

  private questsHtml(): string {
    this.pr.ensureQuests();
    const q = this.pr.data.quests;
    return `<h3>Daily quests</h3>${q.list.map((x) => this.questRow(x)).join('')}<h3>Weekly quests</h3>${q.weekList.map((x) => this.questRow(x)).join('')}
      <p class="sub">New daily quests appear every day, weekly quests every Monday.</p>`;
  }

  private spinHtml(): string {
    const st = this.pr.spinStatus();
    return `<div class="wheelbox"><p class="sub">One free spin every day. Extra spins cost ${EXTRA_SPIN_COST} coins${ENABLE_ADS ? ' or a short ad' : ''}.</p>
      <div id="wheelwrap"><div id="pointer"></div><canvas id="wheel" width="300" height="300"></canvas></div>
      <div id="spinresult" style="min-height:26px;color:var(--gold);font-size:18px">${esc(this.spinMsg)}</div>
      <button data-spin="1">${st.free ? 'Spin (free)' : `Spin (${EXTRA_SPIN_COST} coins)`}</button>
      ${!st.free && ENABLE_ADS ? '<button class="ghost" data-spinad="1">Watch ad for a spin</button>' : ''}</div>`;
  }

  private towerHtml(): string {
    const rows = BOSS_LEVELS.map((l, i) => {
      const f = BOSS_FIGHTS[i];
      const fig = ALL_FIGURES.find((x) => x.id === f.figure);
      const unlocked = this.pr.levelUnlocked(l);
      const stars = this.pr.data.campaign[String(l.id)] ?? 0;
      const st = [1, 2, 3].map((k) => `<span class="star ${k <= stars ? 'on' : ''}">&#9733;</span>`).join('');
      const champ = f.figure === 'majen';
      return `<div class="row ${unlocked ? '' : 'locked'}">
        <div class="towerart">${fig ? uniqueSvg(fig.svg, `tw${i}`) : ''}</div>
        <div class="grow"><b style="color:${hex(f.color)}">Floor ${i + 1}: ${esc(f.name)}</b>${champ ? ' <span class="tag" style="color:#ffc93c;border-color:#ffc93c">CHAMPION</span>' : ''}
          <div class="sub" style="margin:0">${f.hp} HP &middot; ${l.bots - 1} guards &middot; ${esc(MAP_LIST.find((m) => m.id === l.map)?.name ?? l.map)} &middot; ${l.reward} coins</div>
          <div class="sub" style="margin:0">Skills: ${f.kit.map(esc).join(', ')}</div></div>
        <div style="font-size:20px">${st}</div>
        <button data-tower="${l.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? (champ ? 'Challenge' : 'Fight') : 'Locked'}</button>
      </div>`;
    }).join('');
    return `<p class="sub">Climb eight boss floors (they open after campaign level ${TOWER_UNLOCK_LEVEL}). Each boss fights with five unique skills. Majen, the champion, can be challenged by anyone at any time: a 1v1 in an empty arena. Beat him once to win a unique skill.</p>${rows}`;
  }
  private rankedHtml(): string {
    const r = this.pr.data.ranked;
    const t = rankedTier(r.rating);
    const losses = r.games - r.wins;
    const tiers = RANKED_TIERS.map(
      (x) => `<span class="tag" style="color:${hex(x.color)};border-color:${hex(x.color)}">${esc(x.name)} ${x.min}+</span>`,
    ).join(' ');
    return `<div class="row"><div class="grow"><b style="font-size:22px;color:${hex(t.color)}">${esc(t.name)}</b>
        <div class="sub" style="margin:0">Rating ${r.rating} &middot; best ${r.best} &middot; ${r.wins} wins, ${losses} losses</div></div>
        <button data-ranked="1">Find 2v2 match</button></div>
      <p class="sub">Two against two, team battle, rotating arenas. Win to gain rating, lose to drop a little. You never lose levels or skills. Empty seats are filled by bots so a match always starts at once. Every fifth win pays a ranked skill drop.</p>
      <h3>Tiers</h3><p>${tiers}</p>`;
  }
  private trainingHtml(): string {
    const lv = LEVEL_COPIES.slice(0, 8)
      .map((n, i) => `<span class="tag">Lv ${i + 1}: ${n} cop${n === 1 ? 'y' : 'ies'}</span>`)
      .join(' ');
    return `<div class="row"><div class="grow"><b>Training ground</b><div class="sub" style="margin:0">An empty arena with three dummies that never attack. Your mana refills fast and you cannot be knocked out. Try every skill and see what it does.</div></div>
        <button data-train="1">Start training</button></div>
      <h3>How skills work</h3>
      <p class="sub">You carry up to 5 skills (keys 1 to 5, or the buttons). Each skill costs mana (the blue bar) and then needs to cool down (the dark sweep on its button). Some skills take a moment to cast; a yellow ring shows that. Press <b>Q</b> or the <b>AUTO</b> button and your orb casts attack and defence skills for you and aims them at the nearest enemy.</p>
      <p class="sub">Kinds: <b>shots, beams, volleys</b> hit at range &middot; <b>nova</b> and <b>swing</b> hit close &middot; <b>shield, barrier, heal</b> protect &middot; <b>dash, blink, portal</b> move you &middot; <b>mine, pet, pull, slow, aura, buff, stealth</b> set up fights.</p>
      <h3>How merging works</h3>
      <p class="sub">Every time you get a skill you already own, it merges into your copy automatically and its level rises when it has enough copies. Higher levels hit harder and recharge faster.</p>
      <p>${lv}</p>
      <h3>How fusion works</h3>
      <p class="sub">In the Fusion Lab, two different skills of the same or neighbouring rank fuse into a new one. Any level works. Both parents are used up. You can fuse a few times each week.</p>`;
  }
  private marketHtml(): string {
    const pr = this.pr;
    const offers = pr
      .marketToday()
      .map((o, i) =>
        this.skillCard(
          neutralInstance(o.skillId),
          o.sold
            ? '<button disabled>Sold</button>'
            : `<button data-buy="${i}" ${pr.data.coins >= o.price ? '' : 'disabled'}>Buy ${o.price}</button>`,
        ),
      )
      .join('');
    const equipped = new Set(pr.data.loadout.skillIds);
    const sellable = this.sortedSkills()
      .filter((s) => !s.bound && !equipped.has(s.skillId))
      .map((s) => this.skillCard(s, `<button class="ghost" data-sell="${s.skillId}">Sell ${pr.sellValue(s.skillId)}</button>`))
      .join('');
    return `<p class="sub">The Starforge broker trades skills for coins only. New stock every day. Uniques are never sold here. Starter skills are bound and cannot be sold. Player-to-player auctions arrive with accounts.</p>
      <h3>Today's stock</h3><div class="cards">${offers}</div>
      <h3>Sell your skills</h3><div class="cards">${sellable || '<p class="sub">Nothing to sell. Equipped and starter skills are kept.</p>'}</div>`;
  }
  private bestiaryHtml(): string {    const card = (f: (typeof ALL_FIGURES)[number]) => `
      <div class="boss ${f.id === MAJEN.id ? 'champion' : ''}">
        <div class="art">${uniqueSvg(f.svg, 'dex')}</div>
        <div><b style="color:${f.color}">${esc(f.name)}</b><div class="tt">${esc(f.title)} &middot; ${esc(f.element)}</div>
        <div class="lore">${esc(f.lore)}</div><div class="hint">${esc(f.hint)}</div>
        ${f.id === MAJEN.id ? '<button data-challenge="1">Challenge Majen (1v1)</button>' : ''}</div>
      </div>`;
    return `<p class="sub">Meet the champion and the bosses of the world. Each boss has a secret condition. Find it, and it falls.</p>
      <div class="bossgrid">${ALL_FIGURES.map(card).join('')}</div>`;
  }

  private dexHtml(): string {
    const have = new Set(this.pr.data.dex);
    const per = EFFECT_LIST.map((e, ei) => {
      let n = 0;
      for (let i = 0; i < RARITIES.length * MODS.length; i++)
        if (have.has(ei * RARITIES.length * MODS.length + i)) n++;
      const total = RARITIES.length * MODS.length;
      return `<div class="row"><div class="grow"><b style="color:${hex(e.color)}">${esc(e.name)}</b><div class="sub" style="margin:0">${esc(e.desc)}</div>
        <div class="bar"><div style="width:${(n / total) * 100}%;background:${hex(e.color)}"></div></div></div><div>${n} / ${total}</div></div>`;
    }).join('');
    let grid = '';
    for (let i = 0; i < POWERUP_TOTAL; i++) {
      const pu = powerupFromId(i)!;
      const c = hex(EFFECT_LIST.find((e) => e.id === pu.effect)!.color);
      grid += have.has(i)
        ? `<i style="background:${c};border-color:${hex(RARITIES[pu.rarity].color)}"></i>`
        : '<i></i>';
    }
    return `<p class="sub">Discovered ${have.size} of ${POWERUP_TOTAL} unique powerups: 12 effects x 4 rarities x 21 modifiers. Grab powerups in matches to fill the collection.</p>
      <div class="dexgrid">${grid}</div><h3>By effect</h3>${per}`;
  }

  // ---- behaviour --------------------------------------------------------------

  private bind(name: PageName, body: HTMLElement): void {
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((el) =>
        el.addEventListener('click', () => {
          sfx.click();
          fn(el);
        }),
      );
    const pr = this.pr;
    const note = (t: string, c = '#e8ecff') => this.ui.notify(t, c);
    const levelUps = (ls: number[]) => ls.forEach((l) => note(`Level up! You reached level ${l}`, '#ffc93c'));

    if (name === 'arenas') {
      on('[data-mode]', (el) => {
        this.mode = el.dataset.mode as ModeId;
        this.render();
      });
      on('[data-quick]', () => this.actions.playOnline('mix', 'rotate'));
      on('[data-online]', (el) => this.actions.playOnline(this.mode, el.dataset.online!));
      on('[data-offline]', (el) => this.actions.playOffline(this.mode, el.dataset.offline!));
    }
    if (name === 'campaign')
      on('[data-lvl]', (el) =>
        this.actions.startLevel(LEVELS.find((l) => l.id === Number(el.dataset.lvl))!),
      );
    if (name === 'tower')
      on('[data-tower]', (el) =>
        this.actions.startLevel(BOSS_LEVELS.find((l) => l.id === Number(el.dataset.tower))!),
      );
    if (name === 'ranked') on('[data-ranked]', () => this.actions.playRanked());
    if (name === 'training') on('[data-train]', () => this.actions.playTraining());
    if (name === 'bestiary') on('[data-challenge]', () => this.actions.challengeChampion());
    if (name === 'market') {
      on('[data-buy]', (el) => {
        const r = pr.buyOffer(Number(el.dataset.buy));
        if (r.ok && r.drop) {
          sfx.reward();
          note(`Bought ${getSkill(r.drop.skillId).name} (${r.drop.rank})${r.drop.merged ? `, merged to level ${r.drop.level}` : ''}`, '#ffc93c');
        } else if (r.reason) note(r.reason, '#ff8a9a');
        this.render();
      });
      on('[data-sell]', (el) => {
        const r = pr.sellSkill(Number(el.dataset.sell));
        if (r.ok) note(`Sold for ${r.coins} coins`, '#ffc93c');
        else if (r.reason) note(r.reason, '#ff8a9a');
        this.render();
      });
    }    if (name === 'loadout') {
      on('[data-equip]', (el) => {
        const [kind, id] = el.dataset.equip!.split(':');
        const key: ShopKind = kind as ShopKind;
        pr.equip(key, key === 'char' ? id : Number(id));
        this.render();
      });
    }
    if (name === 'collection') {
      on('[data-dailydrop]', () => {
        const d = pr.claimDailySkill();
        if (d) {
          sfx.reward();
          note(
            `Daily drop: ${getSkill(d.skillId).name} (${d.rank})${d.merged ? ` merged, now level ${d.level}` : ''}`,
            '#ffc93c',
          );
        }
        this.render();
      });
    }
    if (name === 'fusion') {
      on('[data-fpick]', (el) => {
        const uid = el.dataset.fpick!;
        if (uid === this.fuseA) this.fuseA = '';
        else if (uid === this.fuseB) this.fuseB = '';
        else if (!this.fuseA) this.fuseA = uid;
        else this.fuseB = uid;
        this.render();
      });
      on('[data-fuse]', () => {
        const r = pr.fuseSkills(this.fuseA, this.fuseB);
        if (r.ok && r.drop) {
          sfx.reward();
          this.fuseA = '';
          this.fuseB = '';
          this.fuseMsg = `Created ${getSkill(r.drop.skillId).name} (${r.drop.rank})${r.upgraded ? ', rank up!' : ''}`;
          note(this.fuseMsg, '#ffc93c');
        } else {
          this.fuseMsg = r.reason ?? 'Fusion failed';
          note(this.fuseMsg, '#ff8a9a');
        }
        this.render();
      });
    }
    if (name === 'loadout') {
      const set = (ids: number[]) => {
        const r = pr.equipSkills(ids);
        if (!r.ok) note(r.reason ?? 'Cannot equip', '#ff8a9a');
        this.render();
      };
      on('[data-equipskill]', (el) => {
        const cur = pr.data.loadout.skillIds;
        const id = Number(el.dataset.equipskill);
        if (cur.length >= 5) {
          set([...cur.slice(0, 4), id]);
          note('Slot 5 swapped for the new skill.', '#ffc93c');
          return;
        }
        set([...cur, id]);
      });
      on('[data-unequip]', (el) =>
        set(pr.data.loadout.skillIds.filter((id) => id !== Number(el.dataset.unequip))),
      );
    }
    if (name === 'shop') {
      on('[data-shoptab]', (el) => {
        this.shopTab = el.dataset.shoptab as ShopKind;
        this.render();
      });
      on('[data-buy]', (el) => {
        const [kind, id] = el.dataset.buy!.split(':');
        const k = kind as ShopKind;
        const res = pr.buy(k, k === 'char' ? id : Number(id));
        if (res.ok) {
          sfx.reward();
          note('Purchased!', '#7dff6b');
          pr.equip(k, k === 'char' ? id : Number(id));
        } else note(res.reason ?? 'Cannot buy', '#ff8a9a');
        this.render();
      });
    }
    if (name === 'daily') {
      on('[data-claimdaily]', () => {
        const r = pr.claimDaily();
        if (r) {
          sfx.reward();
          note(`Day ${r.day} reward: ${r.coins} coins!`, '#ffc93c');
          levelUps(r.levels);
        }
        this.render();
      });
    }
    if (name === 'quests') {
      on('[data-claimq]', (el) => {
        const q = [...pr.data.quests.list, ...pr.data.quests.weekList].find(
          (x) => x.id === el.dataset.claimq,
        );
        const r = q && pr.claimQuest(q);
        if (r) {
          sfx.reward();
          note(`Quest done: +${r.coins} coins`, '#ffc93c');
          levelUps(r.levels);
        }
        this.render();
      });
    }
    if (name === 'spin') this.bindSpin(body, note);
  }

  private drawWheel(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const n = WHEEL.length;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = canvas.width / 2 - 2;
    WHEEL.forEach((w, i) => {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const a1 = a0 + (2 * Math.PI) / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = w.color;
      ctx.fill();
      ctx.strokeStyle = '#0b0e1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((a0 + a1) / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Trebuchet MS, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.label, r - 16, 0);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0e1a';
    ctx.fill();
  }

  private bindSpin(body: HTMLElement, note: (t: string, c?: string) => void): void {
    const canvas = body.querySelector<HTMLCanvasElement>('#wheel')!;
    this.drawWheel(canvas);
    let rotation = 0;
    const result = body.querySelector<HTMLElement>('#spinresult')!;
    const run = () => {
      if (this.wheelBusy) return;
      this.wheelBusy = true;
      const idx = this.pr.rollSpin();
      const prize = this.pr.grantPrize(idx);
      const seg = 360 / WHEEL.length;
      const target = 360 - (idx * seg + seg / 2);
      rotation += 360 * 5 + ((target - (rotation % 360) + 360) % 360);
      canvas.style.transform = `rotate(${rotation}deg)`;
      this.spinMsg = 'Spinning...';
      result.textContent = this.spinMsg;
      window.setTimeout(() => {
        sfx.reward();
        this.spinMsg = `You won: ${prize}!`;
        result.textContent = this.spinMsg;
        note(`Lucky Draw: ${prize}`, '#ffc93c');
        this.wheelBusy = false;
        this.render();
      }, 4400);
    };
    body.querySelector('[data-spin]')?.addEventListener('click', () => {
      if (this.wheelBusy) return;
      if (!this.pr.payForSpin()) {
        note('Not enough coins for an extra spin', '#ff8a9a');
        return;
      }
      run();
    });
    body.querySelector('[data-spinad]')?.addEventListener('click', async () => {
      if (this.wheelBusy) return;
      if (await this.actions.watchAd()) run();
      else note('No ad available right now', '#ff8a9a');
    });
  }
}

export const QUEST_COUNT = DAILY_POOL.length + WEEKLY_POOL.length;
