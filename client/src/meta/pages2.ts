import {
  CATEGORIES,
  ELEMENTS,
  GEAR_SLOTS,
  LEVELS,
  RANKED_TIERS,
  RANKS,
  RANK_INFO,
  SLOT_NAMES,
  STAR_MILESTONES,
  STAT_KEYS,
  STAT_LABELS,
  WORLDS,
  bonusText,
  creatureStats,
  creatureUpgradeCost,
  firstIdOfRank,
  getCreature,
  getGear,
  getSkill,
  rankedTier,
  skillCount,
  UNIQUES,
  uniqueIdOf,
  usableInBattle,
  CREATURE_COST,
  type GearSlot,
  type Rank,
} from '@orb/shared';
import { creatureIcon, gearIcon } from '../art/icons2';
import { skillIcon } from '../art/icons';
import { sfx } from '../audio';
import type { Ui } from '../ui/ui';
import { esc, hex } from '../ui/ui';
import type { Progress } from './economy';
import {
  attachCard,
  equipGear,
  fusionCost,
  hatchCreature,
  howToGet,
  myStats,
  sellGear,
  unequipGear,
  upgradeCreature,
} from './inventory';

export interface MoreCtx {
  ui: Ui;
  pr: Progress;
  render(): void;
  startLevel(id: number): void;
  showSkill(id: number): void;
  playRanked(mode: '1v1' | '2v2'): void;
  playShadow(online: boolean): void;
  startRaid(): void;
  joinWar(): void;
}

/** Extra pages: world map, gear, summons, encyclopedia, stats. */
export class MorePages {
  gearSlot: GearSlot = 'hat';
  creatureSel = '';
  encQuery = '';
  encRank: Rank = 'U';
  encPage = 0;
  rankedTab: '1v1' | '2v2' | 'world' = '1v1';
  tierTab = '';
  board: { mode: string; tier: string; top: Array<{ rank: number; name: string; rating: number; rating2: number; level: number; score: number; tier: string; tier2: string; guild: { tag: string } | null }>; total: number } | null = null;
  constructor(private c: MoreCtx) {}

  // ---- stat sheet (like a level-up screen) --------------------------------------------------
  statsHtml(): string {
    const st = myStats(this.c.pr);
    const rows = STAT_KEYS.map(
      (k) => `<div><span class="sub">${STAT_LABELS[k]}</span><b>${+st.sheet[k].toFixed(2)}</b>${st.bonus[k] ? `<span class="sub" style="color:#7dff6b"> +${Math.round(st.bonus[k])}%</span>` : ''}</div>`,
    ).join('');
    return `<div class="statsheet">${rows}</div>`;
  }

  // ---- campaign world map (candy-crush style path) -----------------------------------------
  worldMapHtml(): string {
    const pr = this.c.pr;
    return WORLDS.map((w) => {
      const levels = LEVELS.filter((l) => l.id > w.id * 11 && l.id <= w.id * 11 + 11);
      const stars = levels.reduce((s, l) => s + (pr.data.campaign[String(l.id)] ?? 0), 0);
      const open = levels.length > 0 && pr.levelUnlocked(levels[0]);
      const W = 900;
      const H = 330;
      const pts = levels.map((_, i) => ({ x: 70 + (i * (W - 140)) / 10, y: 165 + Math.sin(i * 0.95 + w.id) * 105 }));
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' ');
      const nodes = levels
        .map((l, i) => {
          const p = pts[i];
          const st = pr.data.campaign[String(l.id)] ?? 0;
          const un = pr.levelUnlocked(l);
          const next = un && !st;
          const r = l.boss ? 30 : 20;
          const fill = !un ? '#2a2f4a' : l.boss ? '#ff1744' : st ? w.path : '#ffc93c';
          const starTxt = [1, 2, 3].map((k) => `<tspan fill="${k <= st ? '#ffc93c' : '#4a5070'}">&#9733;</tspan>`).join('');
          return `<g class="mnode ${next ? 'next' : ''} ${un ? 'open' : 'lock'}" data-mlvl="${un ? l.id : ''}" style="cursor:${un ? 'pointer' : 'default'}">
            <circle cx="${p.x}" cy="${p.y}" r="${r + 6}" fill="${fill}" opacity=".25" class="halo"/>
            <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="3"/>
            <text x="${p.x}" y="${p.y + 6}" text-anchor="middle" font-size="${l.boss ? 15 : 16}" font-weight="800" fill="#1b0a3a">${l.boss ? 'BOSS' : i + 1}</text>
            <text x="${p.x}" y="${p.y + r + 18}" text-anchor="middle" font-size="14">${starTxt}</text>
            ${un ? '' : `<text x="${p.x}" y="${p.y - r - 6}" text-anchor="middle" font-size="14">&#128274;</text>`}
          </g>`;
        })
        .join('');
      const deco = Array.from({ length: 14 }, (_, k) => {
        const x = (k * 97 + w.id * 31) % W;
        const y = (k * 53 + w.id * 17) % H;
        return `<circle class="spark" cx="${x}" cy="${y}" r="${1 + (k % 3)}" fill="#fff" style="animation-delay:${(k % 7) * 0.4}s"/>`;
      }).join('');
      const ms = STAR_MILESTONES.map(
        (m) => `<span class="tag" style="${stars >= m.stars ? 'color:#7dff6b;border-color:#7dff6b' : ''}">${m.stars}&#9733;: ${esc(m.text)}${stars >= m.stars ? ' &#10003;' : ''}</span>`,
      ).join(' ');
      return `<div class="worldbox ${open ? '' : 'locked'}">
        <div class="row" style="border:none;padding:4px 0"><div class="grow"><b style="font-size:20px;color:${w.path}">World ${w.id + 1}: ${esc(w.name)}</b>
          <div class="sub" style="margin:0">${esc(w.desc)} &middot; Stars ${stars} / 33</div>
          <div class="bar"><div style="width:${(stars / 33) * 100}%"></div></div><div style="margin-top:4px">${ms}</div></div></div>
        <svg class="worldmap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="sky${w.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w.sky[0]}"/><stop offset="1" stop-color="${w.sky[1]}"/></linearGradient></defs>
          <rect width="${W}" height="${H}" rx="18" fill="url(#sky${w.id})"/>
          ${deco}
          <path d="${path}" stroke="#000" stroke-opacity=".35" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="${path}" stroke="${w.path}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="2 18" class="trail"/>
          ${nodes}
        </svg></div>`;
    }).join('');
  }
  bindWorldMap(body: HTMLElement): void {
    body.querySelectorAll<SVGGElement>('[data-mlvl]').forEach((n) =>
      n.addEventListener('click', () => {
        const id = Number(n.dataset.mlvl);
        if (id) {
          sfx.click();
          this.c.startLevel(id);
        }
      }),
    );
    body.querySelector('.mnode.next')?.scrollIntoView({ block: 'center' });
  }

  // ---- gear (accessories with stats) ------------------------------------------------------
  gearHtml(): string {
    const pr = this.c.pr;
    const tabs = GEAR_SLOTS.map((s) => `<button class="${s === this.gearSlot ? 'on' : ''}" data-gslot="${s}">${SLOT_NAMES[s]}</button>`).join('');
    const equipped = GEAR_SLOTS.map((s) => {
      const id = pr.data.gear.equip[s];
      return id !== undefined
        ? `<div class="card sel" title="${esc(bonusText(getGear(id).bonus))}">${gearIcon(id)}<b>${esc(getGear(id).name)}</b><div class="d">${esc(SLOT_NAMES[s])}</div></div>`
        : `<div class="card locked"><b>${esc(SLOT_NAMES[s])}</b><div class="d">Empty</div></div>`;
    }).join('');
    const counts = new Map<number, number>();
    for (const id of pr.data.gear.owned) if (getGear(id).slot === this.gearSlot) counts.set(id, (counts.get(id) ?? 0) + 1);
    const list = Array.from(counts.entries())
      .sort((a, b) => b[0] % 8 - (a[0] % 8))
      .map(([id, n]) => {
        const g = getGear(id);
        const on = pr.data.gear.equip[g.slot] === id;
        return `<div class="card ${on ? 'sel' : ''}">${gearIcon(id)}<b style="color:${hex(RANK_INFO[g.rank].color)}">[${g.rank}] ${esc(g.name)}</b>
          <div class="d">${esc(bonusText(g.bonus))}${n > 1 ? ` &middot; x${n}` : ''}</div>
          ${on ? `<button class="ghost" data-gun="${g.slot}">Unequip</button>` : `<button data-geq="${id}">Equip</button>`}
          <button class="ghost" data-gsell="${id}">Sell ${Math.round(g.price / 3)}</button></div>`;
      })
      .join('');
    return `<p class="sub">Accessories with stats: 8 slots, 30 designs, 12 colours and 8 ranks (23,040 items). Higher ranks give much bigger buffs (rank U is 10x rank F). Get them from chests, the Gear wheel, daily rewards and the market.</p>
      <h3>Your stats</h3>${this.statsHtml()}
      <h3>Equipped</h3><div class="cards">${equipped}</div>
      <div class="tabs">${tabs}</div><div class="cards">${list || '<p class="sub">No items for this slot yet.</p>'}</div>`;
  }
  bindGear(body: HTMLElement, note: (t: string, c?: string) => void): void {
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => (sfx.click(), fn(el), this.c.render())));
    on('[data-gslot]', (el) => (this.gearSlot = el.dataset.gslot as GearSlot));
    on('[data-geq]', (el) => equipGear(this.c.pr, Number(el.dataset.geq)));
    on('[data-gun]', (el) => unequipGear(this.c.pr, el.dataset.gun as GearSlot));
    on('[data-gsell]', (el) => note(`Sold for ${sellGear(this.c.pr, Number(el.dataset.gsell))} coins`, '#ffc93c'));
  }

  // ---- creature summons ---------------------------------------------------------------
  creaturesHtml(): string {
    const pr = this.c.pr;
    const list = pr.data.creatures.list
      .map((c) => {
        const d = getCreature(c.id);
        const st = creatureStats(c.id, c.level);
        const act = pr.data.creatures.active === c.uid;
        const cards = Array.from({ length: d.cardSlots }, (_, i) => {
          const sid = c.cards[i];
          return sid !== undefined ? `<span class="tag">${esc(getSkill(sid).name)}</span>` : '<span class="tag">empty card slot</span>';
        }).join(' ');
        return `<div class="card ${act ? 'sel' : ''}">${creatureIcon(c.id)}<b style="color:${hex(RANK_INFO[d.rank].color)}">[${d.rank}] ${esc(d.name)}</b>
          <div class="d">${esc(d.familyName)} &middot; Lv ${c.level} &middot; dmg ${st.dmg} &middot; shot every ${st.fire.toFixed(1)}s</div><div class="d">${cards}</div>
          ${act ? '<button disabled>Fighting</button>' : `<button data-cact="${c.uid}">Take to battle</button>`}
          <button class="ghost" data-cup="${c.uid}">Upgrade ${creatureUpgradeCost(c.id, c.level)}</button>
          <button class="ghost" data-ccards="${c.uid}">Skill cards</button></div>`;
      })
      .join('');
    let picker = '';
    const sel = pr.data.creatures.list.find((x) => x.uid === this.creatureSel);
    if (sel) {
      const d = getCreature(sel.id);
      const skills = pr.data.skills
        .filter((s) => usableInBattle(s.skillId))
        .slice(0, 60)
        .map((s) => `<button class="ghost" data-cpick="${s.skillId}">${esc(getSkill(s.skillId).name)} (${getSkill(s.skillId).rank})</button>`)
        .join(' ');
      picker = `<h3>Give skill cards to ${esc(d.name)} (${d.cardSlots} slot${d.cardSlots > 1 ? 's' : ''})</h3><p class="sub">It uses these cards on its own every few seconds in battle.</p><div class="pick">${skills}</div>`;
    }
    return `<div class="row"><div class="grow"><b>Hatch a summon</b><div class="sub" style="margin:0">Beasts, robots, dragons, animals, fish, merfolk, drones and spirits in 8 ranks (768 kinds). Uses a summon egg (you have ${pr.data.eggs}) or ${CREATURE_COST} coins.</div></div><button data-hatch="1">Hatch</button></div>
      <p class="sub">Your active summon fights beside you in arena, campaign and practice matches (not in ranked). Rank A and above carry two skill cards.</p>
      <div class="cards">${list || '<p class="sub">No summons yet. Hatch your first one!</p>'}</div>${picker}`;
  }
  bindCreatures(body: HTMLElement, note: (t: string, c?: string) => void): void {
    const pr = this.c.pr;
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => (sfx.click(), fn(el), this.c.render())));
    on('[data-hatch]', () => {
      const r = hatchCreature(pr);
      if (r.ok && r.id !== undefined) {
        sfx.reward();
        const d = getCreature(r.id);
        note(`Hatched ${d.name} (${d.rank})!`, hex(RANK_INFO[d.rank].color));
      } else note(r.reason ?? 'Cannot hatch', '#ff8a9a');
    });
    on('[data-cact]', (el) => {
      pr.data.creatures.active = el.dataset.cact!;
      pr.commit();
    });
    on('[data-cup]', (el) => {
      const r = upgradeCreature(pr, el.dataset.cup!);
      if (!r.ok) note(r.reason ?? 'Cannot upgrade', '#ff8a9a');
    });
    on('[data-ccards]', (el) => (this.creatureSel = el.dataset.ccards!));
    on('[data-cpick]', (el) => {
      const c = pr.data.creatures.list.find((x) => x.uid === this.creatureSel);
      if (!c) return;
      const slots = getCreature(c.id).cardSlots;
      const slot = c.cards.length < slots ? c.cards.length : 0;
      const r = attachCard(pr, c.uid, slot, Number(el.dataset.cpick), slots);
      if (!r.ok) note(r.reason ?? 'Cannot attach', '#ff8a9a');
    });
  }

  // ---- encyclopedia --------------------------------------------------------------------
  encyclopediaHtml(): string {
    const per = 40;
    const tabs = (['U', 'S', 'A', 'B', 'C', 'D', 'E', 'F'] as Rank[])
      .map((r) => `<button class="${r === this.encRank ? 'on' : ''}" data-erank="${r}">${r} (${r === 'U' ? UNIQUES.length : skillCount(r)})</button>`)
      .join('');
    const q = this.encQuery.trim().toLowerCase();
    let ids: number[];
    if (this.encRank === 'U') ids = UNIQUES.map((u) => uniqueIdOf(u.n));
    else {
      const start = firstIdOfRank(this.encRank);
      const n = skillCount(this.encRank);
      if (q) {
        ids = [];
        for (let k = 0; k < n && ids.length < 400; k++) if (getSkill(start + k).name.toLowerCase().includes(q)) ids.push(start + k);
      } else ids = Array.from({ length: Math.min(per, n - this.encPage * per) }, (_, k) => start + this.encPage * per + k);
    }
    if (q && this.encRank === 'U') ids = ids.filter((id) => getSkill(id).name.toLowerCase().includes(q));
    const pageIds = q || this.encRank === 'U' ? ids.slice(this.encPage * per, this.encPage * per + per) : ids;
    const owned = new Set(this.c.pr.data.skills.map((s) => s.skillId));
    const cards = pageIds
      .map((id) => {
        const s = getSkill(id);
        const col = ELEMENTS[s.element]?.color ?? RANK_INFO[s.rank].color;
        return `<div class="card skillcard" data-skill="${id}" style="border-color:${hex(col)}">${skillIcon(s.kind, col)}<b style="color:${hex(col)}">${esc(s.name)}</b>
          <div class="d">${esc(s.desc)}</div><div class="d" style="color:#ffd36e">How to get: ${esc(howToGet(id)[1] ?? howToGet(id)[0])}</div>${owned.has(id) ? '<span class="tag">Owned</span>' : ''}</div>`;
      })
      .join('');
    const total = q || this.encRank === 'U' ? ids.length : skillCount(this.encRank);
    const pages = Math.max(1, Math.ceil(total / per));
    return `<p class="sub">Every skill in the game: 115,000 generated skills in 7 ranks plus ${UNIQUES.length} unique skills. Tap a card for full stats. Unique skills cannot be bought or spun: defeat campaign bosses, beat the champion, fuse two S skills, or hold a top-10 world rank for 30 days.</p>
      <div class="row" style="border:none"><input id="encq" placeholder="Search a skill name" value="${esc(this.encQuery)}" /><button data-esearch="1">Search</button></div>
      <div class="tabs">${tabs}</div>
      <div class="row" style="border:none"><button class="ghost" data-epage="-1" ${this.encPage ? '' : 'disabled'}>&#9664; Prev</button><span class="sub">Page ${this.encPage + 1} / ${pages}</span><button class="ghost" data-epage="1" ${this.encPage + 1 < pages ? '' : 'disabled'}>Next &#9654;</button></div>
      <div class="cards">${cards || '<p class="sub">No skills found.</p>'}</div>`;
  }
  bindEncyclopedia(body: HTMLElement): void {
    const input = body.querySelector<HTMLInputElement>('#encq');
    input?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        this.encQuery = input.value;
        this.encPage = 0;
        this.c.render();
      }
    });
    body.querySelector('[data-esearch]')?.addEventListener('click', () => {
      this.encQuery = input?.value ?? '';
      this.encPage = 0;
      this.c.render();
    });
    body.querySelectorAll<HTMLElement>('[data-erank]').forEach((el) =>
      el.addEventListener('click', () => {
        this.encRank = el.dataset.erank as Rank;
        this.encPage = 0;
        this.c.render();
      }),
    );
    body.querySelectorAll<HTMLElement>('[data-epage]').forEach((el) =>
      el.addEventListener('click', () => {
        this.encPage = Math.max(0, this.encPage + Number(el.dataset.epage));
        this.c.render();
      }),
    );
  }

  // ---- ranked (1v1 and 2v2, tiers, leaderboards) ---------------------------------------------
  rankedHtml(): string {
    const pr = this.c.pr;
    const r = pr.data.ranked;
    const t = rankedTier(r.rating);
    const tabs = (['1v1', '2v2', 'world'] as const).map((m) => `<button class="${m === this.rankedTab ? 'on' : ''}" data-rtab="${m}">${m === 'world' ? 'World ranking' : `Ranked ${m}`}</button>`).join('');
    const tierTabs =
      this.rankedTab === 'world'
        ? ''
        : `<div class="tabs"><button class="${!this.tierTab ? 'on' : ''}" data-rtier="">All tiers</button>${RANKED_TIERS.map(
            (x) => `<button class="${this.tierTab === x.name ? 'on' : ''}" data-rtier="${x.name}" style="color:${hex(x.color)}">${x.name}</button>`,
          ).join('')}</div>`;
    const b = this.board;
    const rows = b
      ? b.top
          .map(
            (p) =>
              `<tr class="${p.name === pr.data.nick ? 'me' : ''}"><td>${p.rank}</td><td>${p.guild ? `[${esc(p.guild.tag)}] ` : ''}${esc(p.name)}</td><td>Lv ${p.level}</td><td>${this.rankedTab === 'world' ? p.score : this.rankedTab === '1v1' ? p.rating : p.rating2}</td><td>${esc(this.rankedTab === '2v2' ? p.tier2 : p.tier)}</td></tr>`,
          )
          .join('') || '<tr><td colspan="5">No players in this list yet.</td></tr>'
      : '<tr><td colspan="5">Loading...</td></tr>';
    return `<div class="row"><div class="grow"><b style="font-size:20px;color:${hex(t.color)}">${esc(t.name)}</b><div class="sub" style="margin:0">Your rating (this device): ${r.rating}</div></div>
        <button data-rplay="1v1">Ranked 1v1</button><button data-rplay="2v2">Ranked 2v2</button></div>
      <p class="sub">Ranked matches are deathmatches in the arena with a timer: 1v1 (2 minutes) and 2v2 (2.5 minutes). Each has its own rating and tier, starting at Bronze. The world ranking adds both ratings and your player level.</p>
      <p class="sub">Hold a world rank for 30 days in a row to earn: top 10 = a unique skill, top 50 = an S skill, top 100 = A, top 250 = B, top 500 = C, top 1000 = D.</p>
      <div class="row"><div class="grow"><b>Shadow duel (unranked)</b><div class="sub" style="margin:0">The side-view fighting duel, just for fun.</div></div><button class="ghost" data-shadow="1">Online</button><button class="ghost" data-shadow="0">Vs bot</button></div>
      <div class="tabs">${tabs}</div>${tierTabs}
      <div id="board"><table><tr><th>#</th><th>Player</th><th>Level</th><th>${this.rankedTab === 'world' ? 'World score' : 'Rating'}</th><th>Tier</th></tr>${rows}</table></div>`;
  }
  loadBoard(): void {
    this.board = null;
    const mode = this.rankedTab;
    const tier = this.tierTab;
    import('../account').then(({ fetchBoard }) =>
      fetchBoard(mode, tier).then((r) => {
        this.board = r.ok ? { mode, tier, top: r.top as any, total: r.total } : { mode, tier, top: [], total: 0 };
        this.c.render();
      }),
    );
  }
  bindRanked(body: HTMLElement): void {
    body.querySelectorAll<HTMLElement>('[data-rtab]').forEach((el) =>
      el.addEventListener('click', () => {
        this.rankedTab = el.dataset.rtab as '1v1' | '2v2' | 'world';
        this.tierTab = '';
        this.loadBoard();
        this.c.render();
      }),
    );
    body.querySelectorAll<HTMLElement>('[data-rtier]').forEach((el) =>
      el.addEventListener('click', () => {
        this.tierTab = el.dataset.rtier ?? '';
        this.loadBoard();
        this.c.render();
      }),
    );
    body.querySelectorAll<HTMLElement>('[data-rplay]').forEach((el) => el.addEventListener('click', () => this.c.playRanked(el.dataset.rplay as '1v1' | '2v2')));
    body.querySelectorAll<HTMLElement>('[data-shadow]').forEach((el) => el.addEventListener('click', () => this.c.playShadow(el.dataset.shadow === '1')));
  }

  // ---- guild raid and war panel ----------------------------------------------------------
  guildExtraHtml(g: { level: number; xp: number; wars: number; buff: { lines: string[] } } | null, raid: { name: string; hp: number; max: number; myHits: number; maxHits: number; defeated: boolean; claimed: boolean } | null): string {
    if (!g) return '';
    const buff = g.buff.lines.length ? g.buff.lines.map((l) => `<div>${esc(l)}</div>`).join('') : '<div class="sub">Add members of different classes to unlock buffs.</div>';
    const raidBox = raid
      ? `<div class="row"><div class="grow"><b>Daily raid: ${esc(raid.name)}</b><div class="sub" style="margin:0">Guild damage ${raid.max - raid.hp} / ${raid.max} &middot; your attempts ${raid.myHits} / ${raid.maxHits}</div>
          <div class="bar"><div style="width:${((raid.max - raid.hp) / raid.max) * 100}%;background:#ff4d5e"></div></div></div>
          ${raid.defeated ? (raid.claimed ? '<button disabled>Claimed</button>' : '<button data-rclaim="1">Claim reward</button>') : `<button data-raid="1" ${raid.myHits >= raid.maxHits ? 'disabled' : ''}>Fight</button>`}</div>`
      : '';
    return `<h3>Guild level ${g.level}</h3><p class="sub">Guild XP ${g.xp} &middot; wars won ${g.wars}. XP comes from members' ranked wins, raids and guild wars.</p>
      <h3>Guild buffs (in normal and ranked battles)</h3><div class="sub">${buff}</div>
      <p class="sub">Each class adds its own buff. 5 different classes unlock Harmony (+all stats); 5 of one class unlock Legion (that buff doubled). Buffs grow with guild level.</p>
      ${raidBox}
      <div class="row"><div class="grow"><b>Guild war</b><div class="sub" style="margin:0">5 against 5 in an open arena against another guild. Empty seats are filled by bots.</div></div><button data-war="1">Join war</button></div>`;
  }
  bindGuildExtra(body: HTMLElement): void {
    body.querySelector('[data-raid]')?.addEventListener('click', () => this.c.startRaid());
    body.querySelector('[data-war]')?.addEventListener('click', () => this.c.joinWar());
  }
  /** Fusion info line (free weekly fusion, then stones + coins). */
  fusionInfo(): string {
    const c = fusionCost(this.c.pr);
    return `<p class="sub">Fusion stones: <b>${this.c.pr.data.stones}</b>. ${c.free ? 'Your weekly free fusion is ready.' : `Each fusion costs 1 stone + ${c.coins} coins (one free fusion every week).`} Recipes are fixed: the same two skills always make the same result, never a lower rank. Same-rank pairs sometimes rank up (A + A can give S), and a few S + S recipes forge a unique.</p>`;
  }
  /** Category filter for skill lists. */
  static categories(): string[] {
    return ['all', ...CATEGORIES.filter((c) => c !== 'world')];
  }
  static rankOrder(r: Rank): number {
    return RANKS.indexOf(r);
  }
}
