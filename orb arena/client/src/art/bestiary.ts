/** Original vector art and lore for the champion and bosses. Every figure is an SVG string (viewBox 240x240). */

export interface BossDef {
  id: string;
  name: string;
  title: string;
  element: string;
  color: string;
  lore: string;
  /** Hint shown to players. The real condition is revealed in the encounter. */
  hint: string;
  svg: string;
}

const wrap = (inner: string) =>
  `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;

function star(cx: number, cy: number, ro: number, ri: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 === 0 ? ro : ri;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

const sparkle = (x: number, y: number, s = 1, fill = '#fff') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z" fill="${fill}"/>`;

export const MAJEN: BossDef = {
  id: 'majen',
  name: 'Majen',
  title: 'The Crowned Champion',
  element: 'Light',
  color: '#FFC93C',
  lore: 'A cheerful little orb who won the first great tournament with a smile and a thousand skills. He bows to every challenger, then fights like a storm.',
  hint: 'Reach Master tier in ranked 2v2 to unlock the Crown Challenge. Beat him to take the throne.',
  svg: wrap(`
<defs>
<radialGradient id="mj-body" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFF8D6"/><stop offset=".5" stop-color="#FFC93C"/><stop offset="1" stop-color="#E8851E"/></radialGradient>
<radialGradient id="mj-aura" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD76A" stop-opacity=".6"/><stop offset="1" stop-color="#FFD76A" stop-opacity="0"/></radialGradient>
<linearGradient id="mj-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8405E"/><stop offset="1" stop-color="#6B1030"/></linearGradient>
</defs>
<circle cx="120" cy="128" r="114" fill="url(#mj-aura)"/>
<path d="M50 120 C24 162 28 208 52 228 L120 208 L188 228 C212 208 216 162 190 120 Z" fill="url(#mj-cape)" stroke="#FFC93C" stroke-width="3" stroke-linejoin="round"/>
<path d="M62 214 L120 200 L178 214" fill="none" stroke="#FFE08A" stroke-width="3" stroke-dasharray="4 6"/>
<circle cx="120" cy="130" r="62" fill="url(#mj-body)" stroke="#FFF3B0" stroke-width="3"/>
<ellipse cx="97" cy="102" rx="19" ry="11" fill="#fff" opacity=".6" transform="rotate(-25 97 102)"/>
<ellipse cx="100" cy="134" rx="11" ry="15" fill="#2A1633"/><ellipse cx="140" cy="134" rx="11" ry="15" fill="#2A1633"/>
<circle cx="104" cy="128" r="5" fill="#fff"/><circle cx="144" cy="128" r="5" fill="#fff"/><circle cx="97" cy="140" r="2.6" fill="#fff"/><circle cx="137" cy="140" r="2.6" fill="#fff"/>
<ellipse cx="80" cy="154" rx="10" ry="6" fill="#FF6F86" opacity=".65"/><ellipse cx="160" cy="154" rx="10" ry="6" fill="#FF6F86" opacity=".65"/>
<path d="M105 158 Q120 173 135 158" fill="none" stroke="#2A1633" stroke-width="4.5" stroke-linecap="round"/>
<path d="M80 80 L88 42 L105 66 L120 32 L135 66 L152 42 L160 80 Z" fill="#FFC93C" stroke="#B87400" stroke-width="3" stroke-linejoin="round"/>
<rect x="80" y="76" width="80" height="10" rx="3" fill="#F2A71B" stroke="#B87400" stroke-width="2"/>
<circle cx="120" cy="50" r="6" fill="#FF4DA6"/><circle cx="91" cy="55" r="4" fill="#4DD2FF"/><circle cx="149" cy="55" r="4" fill="#7DFF6B"/>
${sparkle(34, 66, 1.3)}${sparkle(208, 82, 1)}${sparkle(196, 30, 0.8, '#FFF3B0')}${sparkle(44, 190, 0.9, '#FFF3B0')}`),
};

export const BOSSES: BossDef[] = [
  {
    id: 'hollow',
    name: 'Hollow Sovereign',
    title: 'King of the Forgotten Hill',
    element: 'Shadow',
    color: '#8A5CFF',
    lore: 'An ancient ghost king who still guards a hill nobody remembers. His crown is heavier than his body.',
    hint: 'His weak points glow faintly. Strike them in the right order.',
    svg: wrap(`
<defs><linearGradient id="hs-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B2E8A"/><stop offset="1" stop-color="#150B33"/></linearGradient>
<radialGradient id="hs-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8A5CFF" stop-opacity=".5"/><stop offset="1" stop-color="#8A5CFF" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="120" r="115" fill="url(#hs-g)"/>
<path d="M58 100 C40 170 52 210 70 232 Q84 216 98 232 Q112 214 126 232 Q140 214 154 232 Q168 216 184 232 C198 208 202 168 182 100 Z" fill="url(#hs-c)" stroke="#B79CFF" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="120" cy="96" rx="48" ry="54" fill="#ECE8F8" stroke="#B79CFF" stroke-width="3"/>
<ellipse cx="102" cy="94" rx="13" ry="17" fill="#150B33"/><ellipse cx="138" cy="94" rx="13" ry="17" fill="#150B33"/>
<circle cx="102" cy="96" r="6" fill="#4DD2FF"/><circle cx="138" cy="96" r="6" fill="#4DD2FF"/>
<path d="M113 118 L120 108 L127 118 Z" fill="#150B33"/>
<path d="M92 128 Q120 146 148 128" fill="none" stroke="#150B33" stroke-width="3"/>
<path d="M100 130 V140 M110 134 V145 M120 136 V147 M130 134 V145 M140 130 V140" stroke="#150B33" stroke-width="3"/>
<path d="M72 62 L76 22 L98 48 L120 14 L142 48 L164 22 L168 62 Z" fill="#3A2A6A" stroke="#FFC93C" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="120" cy="36" r="6" fill="#4DD2FF"/><circle cx="88" cy="46" r="4" fill="#FF4DA6"/><circle cx="152" cy="46" r="4" fill="#FF4DA6"/>
<g fill="none" stroke="#8E97C4" stroke-width="4"><ellipse cx="62" cy="168" rx="9" ry="5"/><ellipse cx="74" cy="178" rx="9" ry="5"/><ellipse cx="178" cy="168" rx="9" ry="5"/><ellipse cx="166" cy="178" rx="9" ry="5"/></g>`),
  },
  {
    id: 'mirror',
    name: 'Mirror King',
    title: 'The Faceted Monarch',
    element: 'Light',
    color: '#7DD3FF',
    lore: 'A living crystal throne that reflects everything it sees, including your plans.',
    hint: 'He does not like a team that all fights the same way.',
    svg: wrap(`
<defs><linearGradient id="mk-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8FBFF"/><stop offset="1" stop-color="#4DA8FF"/></linearGradient>
<linearGradient id="mk-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8E6FF"/><stop offset="1" stop-color="#2979FF"/></linearGradient>
<radialGradient id="mk-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7DD3FF" stop-opacity=".5"/><stop offset="1" stop-color="#7DD3FF" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="125" r="115" fill="url(#mk-g)"/>
<polygon points="120,40 196,112 120,226 44,112" fill="url(#mk-a)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
<polygon points="120,40 196,112 120,128" fill="url(#mk-b)" opacity=".85"/>
<polygon points="44,112 120,128 120,226" fill="#2979FF" opacity=".35"/>
<polygon points="120,128 196,112 120,226" fill="#fff" opacity=".25"/>
<path d="M86 108 L110 118 L100 128 Z" fill="#0B1B3A"/><path d="M154 108 L130 118 L140 128 Z" fill="#0B1B3A"/>
<circle cx="102" cy="119" r="3.5" fill="#fff"/><circle cx="138" cy="119" r="3.5" fill="#fff"/>
<path d="M104 150 Q120 160 136 150" fill="none" stroke="#0B1B3A" stroke-width="4" stroke-linecap="round"/>
<path d="M82 52 L90 14 L106 38 L120 6 L134 38 L150 14 L158 52 Z" fill="#E8FBFF" stroke="#4DA8FF" stroke-width="3" stroke-linejoin="round"/>
<path d="M60 72 L40 60 M180 72 L200 60 M54 140 L30 146 M186 140 L210 146" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
${sparkle(206, 40, 1)}${sparkle(30, 98, 0.8)}${sparkle(190, 200, 0.9)}`),
  },
  {
    id: 'storm',
    name: 'Stormbreaker',
    title: 'Giant of the Rolling Sky',
    element: 'Storm',
    color: '#FFE14D',
    lore: 'A thundercloud that grew a temper. He swings a hammer made of lightning and never stays in one place.',
    hint: 'His power comes from four pylons scattered across the arena.',
    svg: wrap(`
<defs><linearGradient id="sb-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A6FB0"/><stop offset="1" stop-color="#1E2A55"/></linearGradient>
<radialGradient id="sb-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE14D" stop-opacity=".4"/><stop offset="1" stop-color="#FFE14D" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="115" r="115" fill="url(#sb-g)"/>
<g fill="url(#sb-a)" stroke="#9FB4FF" stroke-width="3"><circle cx="74" cy="112" r="42"/><circle cx="166" cy="112" r="42"/><circle cx="120" cy="86" r="52"/><circle cx="96" cy="150" r="44"/><circle cx="144" cy="150" r="44"/></g>
<g fill="url(#sb-a)"><circle cx="74" cy="112" r="40"/><circle cx="166" cy="112" r="40"/><circle cx="120" cy="86" r="50"/><circle cx="96" cy="150" r="42"/><circle cx="144" cy="150" r="42"/></g>
<path d="M82 98 L110 112 L84 118 Z" fill="#FFE14D"/><path d="M158 98 L130 112 L156 118 Z" fill="#FFE14D"/>
<path d="M78 90 L112 104 M162 90 L128 104" stroke="#0D1530" stroke-width="6" stroke-linecap="round"/>
<path d="M92 156 Q120 138 148 156 L140 172 L130 160 L120 174 L110 160 L100 172 Z" fill="#0D1530"/>
<polygon points="58,176 84,176 74,200 94,200 56,238 66,208 48,208" fill="#FFE14D" stroke="#FFF7A8" stroke-width="2" stroke-linejoin="round"/>
<polygon points="182,168 204,168 196,190 214,190 180,228 188,198 172,198" fill="#FFE14D" stroke="#FFF7A8" stroke-width="2" stroke-linejoin="round"/>
<rect x="196" y="40" width="10" height="70" rx="4" fill="#8E97C4" transform="rotate(25 201 75)"/><rect x="184" y="28" width="40" height="26" rx="6" fill="#B8C4D6" stroke="#FFE14D" stroke-width="3" transform="rotate(25 204 41)"/>`),
  },
  {
    id: 'eclipse',
    name: 'Eclipse Warden',
    title: 'Keeper of the Last Lantern',
    element: 'Light and Shadow',
    color: '#FF8A3C',
    lore: 'A silent watcher who stands where the moon swallows the sun. His single eye never blinks, and his lantern never goes out.',
    hint: 'He is only hurt at night. Find a way to make it night.',
    svg: wrap(`
<defs><radialGradient id="ew-c" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#FFB347" stop-opacity="0"/><stop offset=".72" stop-color="#FFD76A" stop-opacity=".95"/><stop offset="1" stop-color="#FF6B3D" stop-opacity="0"/></radialGradient>
<radialGradient id="ew-m" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#3A3A66"/><stop offset="1" stop-color="#0B0B1E"/></radialGradient></defs>
<circle cx="120" cy="112" r="112" fill="url(#ew-c)"/>
<circle cx="120" cy="112" r="74" fill="url(#ew-m)" stroke="#FFD76A" stroke-width="3"/>
<ellipse cx="120" cy="112" rx="44" ry="30" fill="#fff"/><circle cx="120" cy="112" r="21" fill="#FF8A3C"/><circle cx="120" cy="112" r="21" fill="none" stroke="#FFD76A" stroke-width="3"/><ellipse cx="120" cy="112" rx="5" ry="18" fill="#0B0B1E"/><circle cx="112" cy="104" r="5" fill="#fff"/>
<path d="M60 62 Q120 20 180 62" fill="none" stroke="#FFD76A" stroke-width="4" stroke-linecap="round"/>
<rect x="168" y="150" width="8" height="84" rx="3" fill="#8A6B3A"/><path d="M158 150 H186 L180 138 H164 Z" fill="#3A2A12" stroke="#FFD76A" stroke-width="2.5"/><rect x="162" y="168" width="20" height="26" rx="5" fill="#FFB347" stroke="#FFD76A" stroke-width="2.5"/><circle cx="172" cy="181" r="13" fill="#FFF3B0" opacity=".45"/>
<path d="M54 184 Q78 160 100 190 Q80 210 54 184 Z" fill="#0B0B1E" opacity=".8"/>
${sparkle(36, 46, 1.2, '#FFD76A')}${sparkle(208, 52, 0.9, '#FFD76A')}${sparkle(30, 150, 0.8, '#FFD76A')}`),
  },
  {
    id: 'hydra',
    name: 'Hydra of Ten Chains',
    title: 'Beast of the Bound Swamp',
    element: 'Toxin',
    color: '#8BE04D',
    lore: 'Ten heads, ten chains. Each chain once held a different hero. None of them are around to ask.',
    hint: 'Ten different skills must land in one short window.',
    svg: wrap(`
<defs><radialGradient id="hy-b" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#C6F58B"/><stop offset="1" stop-color="#2E7A25"/></radialGradient>
<radialGradient id="hy-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8BE04D" stop-opacity=".45"/><stop offset="1" stop-color="#8BE04D" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="130" r="114" fill="url(#hy-g)"/>
<g fill="none" stroke="#3E9A32" stroke-width="16" stroke-linecap="round"><path d="M96 168 C60 140 52 100 62 66"/><path d="M108 164 C90 120 94 80 100 44"/><path d="M120 162 C120 110 120 70 120 34"/><path d="M132 164 C150 120 146 80 140 44"/><path d="M144 168 C180 140 188 100 178 66"/></g>
<ellipse cx="120" cy="186" rx="76" ry="48" fill="url(#hy-b)" stroke="#E4FFC2" stroke-width="3"/>
<g fill="url(#hy-b)" stroke="#E4FFC2" stroke-width="3"><ellipse cx="62" cy="60" rx="20" ry="16"/><ellipse cx="100" cy="38" rx="20" ry="16"/><ellipse cx="120" cy="28" rx="22" ry="17"/><ellipse cx="140" cy="38" rx="20" ry="16"/><ellipse cx="178" cy="60" rx="20" ry="16"/></g>
<g fill="#FFEB3B"><circle cx="56" cy="56" r="5"/><circle cx="94" cy="34" r="5"/><circle cx="114" cy="24" r="5.5"/><circle cx="146" cy="34" r="5"/><circle cx="184" cy="56" r="5"/></g>
<g fill="#0B1B0B"><ellipse cx="56" cy="56" rx="1.8" ry="4"/><ellipse cx="94" cy="34" rx="1.8" ry="4"/><ellipse cx="114" cy="24" rx="2" ry="4.5"/><ellipse cx="146" cy="34" rx="1.8" ry="4"/><ellipse cx="184" cy="56" rx="1.8" ry="4"/></g>
<circle cx="102" cy="176" r="8" fill="#FFEB3B"/><circle cx="138" cy="176" r="8" fill="#FFEB3B"/><ellipse cx="102" cy="176" rx="2.5" ry="6" fill="#0B1B0B"/><ellipse cx="138" cy="176" rx="2.5" ry="6" fill="#0B1B0B"/>
<path d="M94 204 Q120 220 146 204" fill="none" stroke="#173D10" stroke-width="4" stroke-linecap="round"/>
<g fill="#B8C4D6" stroke="#5B6480" stroke-width="2"><rect x="46" y="118" width="14" height="8" rx="4" transform="rotate(-50 53 122)"/><rect x="180" y="118" width="14" height="8" rx="4" transform="rotate(50 187 122)"/><rect x="82" y="108" width="14" height="8" rx="4"/><rect x="144" y="108" width="14" height="8" rx="4"/></g>`),
  },
  {
    id: 'maw',
    name: 'The Gilded Maw',
    title: 'Glutton of Golden Ruins',
    element: 'Metal',
    color: '#FFC93C',
    lore: 'He swallowed a treasury and grew a taste for more. Every coin he eats makes him shine brighter and hungrier.',
    hint: 'He heals every time he is not offered something. Feed him wisely.',
    svg: wrap(`
<defs><radialGradient id="gm-b" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".5" stop-color="#FFC93C"/><stop offset="1" stop-color="#B87400"/></radialGradient>
<radialGradient id="gm-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFC93C" stop-opacity=".5"/><stop offset="1" stop-color="#FFC93C" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="130" r="114" fill="url(#gm-g)"/>
<ellipse cx="120" cy="140" rx="92" ry="84" fill="url(#gm-b)" stroke="#FFF3B0" stroke-width="3"/>
<ellipse cx="120" cy="156" rx="64" ry="46" fill="#5A0F1E" stroke="#2A0610" stroke-width="3"/>
<path d="M62 142 L74 164 L86 142 L98 166 L110 142 L122 166 L134 142 L146 166 L158 142 L170 164 L178 142" fill="#fff" stroke="#E8E2D0" stroke-width="2" stroke-linejoin="round"/>
<ellipse cx="120" cy="182" rx="34" ry="14" fill="#FF6F86"/>
<circle cx="88" cy="94" r="14" fill="#fff" stroke="#B87400" stroke-width="3"/><circle cx="152" cy="94" r="14" fill="#fff" stroke="#B87400" stroke-width="3"/><circle cx="90" cy="96" r="7" fill="#E0334F"/><circle cx="150" cy="96" r="7" fill="#E0334F"/><circle cx="88" cy="94" r="2.5" fill="#fff"/><circle cx="148" cy="94" r="2.5" fill="#fff"/>
<path d="M68 78 L108 90 M172 78 L132 90" stroke="#5A3A00" stroke-width="6" stroke-linecap="round"/>
<circle cx="120" cy="66" r="15" fill="#FFE08A" stroke="#B87400" stroke-width="3"/><path d="M120 56 V76 M112 66 H128" stroke="#B87400" stroke-width="3" stroke-linecap="round"/>
<g fill="#FFD54F" stroke="#B87400" stroke-width="2"><circle cx="40" cy="206" r="11"/><circle cx="62" cy="222" r="10"/><circle cx="200" cy="208" r="11"/><circle cx="176" cy="224" r="10"/><circle cx="220" cy="190" r="9"/></g>
${sparkle(34, 70, 1.1, '#FFF3B0')}${sparkle(208, 60, 1, '#FFF3B0')}`),
  },
  {
    id: 'echo',
    name: 'Echo Twins',
    title: 'Dancers of the Second Sound',
    element: 'Wind',
    color: '#FF4DA6',
    lore: "Two sisters who finish each other's songs, and each other's enemies. If one stops dancing, the other does too.",
    hint: 'Two heartbeats, one fight. Time matters more than damage.',
    svg: wrap(`
<defs><radialGradient id="et-a" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#FFD6EC"/><stop offset="1" stop-color="#FF4DA6"/></radialGradient>
<radialGradient id="et-b" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#D6F0FF"/><stop offset="1" stop-color="#2F9BFF"/></radialGradient></defs>
<path d="M52 150 C90 210 150 210 188 150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9" opacity=".8"/>
<path d="M40 70 C50 30 90 30 98 52" fill="none" stroke="#FF4DA6" stroke-width="8" stroke-linecap="round"/><path d="M200 70 C190 30 150 30 142 52" fill="none" stroke="#2F9BFF" stroke-width="8" stroke-linecap="round"/>
<circle cx="80" cy="128" r="54" fill="url(#et-a)" stroke="#fff" stroke-width="3"/><circle cx="160" cy="128" r="54" fill="url(#et-b)" stroke="#fff" stroke-width="3"/>
<ellipse cx="62" cy="104" rx="14" ry="8" fill="#fff" opacity=".55" transform="rotate(-25 62 104)"/><ellipse cx="142" cy="104" rx="14" ry="8" fill="#fff" opacity=".55" transform="rotate(-25 142 104)"/>
<path d="M62 126 Q70 134 78 126 M82 126 Q90 134 98 126" fill="none" stroke="#3A1030" stroke-width="4" stroke-linecap="round"/><path d="M142 126 Q150 134 158 126 M162 126 Q170 134 178 126" fill="none" stroke="#0E2A55" stroke-width="4" stroke-linecap="round"/>
<path d="M68 148 Q80 160 92 148" fill="none" stroke="#3A1030" stroke-width="4" stroke-linecap="round"/><path d="M148 148 Q160 160 172 148" fill="none" stroke="#0E2A55" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="56" cy="142" rx="8" ry="5" fill="#fff" opacity=".5"/><ellipse cx="104" cy="142" rx="8" ry="5" fill="#fff" opacity=".5"/><ellipse cx="136" cy="142" rx="8" ry="5" fill="#fff" opacity=".5"/><ellipse cx="184" cy="142" rx="8" ry="5" fill="#fff" opacity=".5"/>
<path d="M120 56 q10 -22 24 -14 M120 56 v-18" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="116" cy="62" r="7" fill="#fff"/>
${sparkle(34, 150, 1)}${sparkle(208, 168, 1)}${sparkle(120, 214, 1.1)}`),
  },
  {
    id: 'star',
    name: 'The Last Star',
    title: 'Final Light of a Dead Sky',
    element: 'Star',
    color: '#FFD6F5',
    lore: 'The last star refused to fall. Now it gazes down, calm and kind, and asks one question: are you strong enough to be the next sun?',
    hint: 'Hold the hill, and the star will listen.',
    svg: wrap(`
<defs><radialGradient id="ls-b" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#FFE9A8"/><stop offset="1" stop-color="#FF9ED8"/></radialGradient>
<radialGradient id="ls-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#C77DFF" stop-opacity=".75"/><stop offset="1" stop-color="#C77DFF" stop-opacity="0"/></radialGradient></defs>
<circle cx="120" cy="124" r="116" fill="url(#ls-g)"/>
<g stroke="#FFF3B0" stroke-width="3" stroke-linecap="round" opacity=".75"><path d="M120 6 V26 M120 222 V240 M8 124 H28 M212 124 H232 M40 44 L54 58 M200 44 L186 58 M40 204 L54 190 M200 204 L186 190"/></g>
<polygon points="${star(120, 128, 104, 52)}" fill="url(#ls-b)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
<ellipse cx="102" cy="130" rx="9" ry="13" fill="#3A1A5A"/><ellipse cx="138" cy="130" rx="9" ry="13" fill="#3A1A5A"/><circle cx="105" cy="125" r="4" fill="#fff"/><circle cx="141" cy="125" r="4" fill="#fff"/>
<ellipse cx="86" cy="150" rx="9" ry="5" fill="#FF6FB5" opacity=".6"/><ellipse cx="154" cy="150" rx="9" ry="5" fill="#FF6FB5" opacity=".6"/>
<path d="M108 152 Q120 162 132 152" fill="none" stroke="#3A1A5A" stroke-width="4" stroke-linecap="round"/>
${sparkle(30, 40, 1.2)}${sparkle(210, 30, 1)}${sparkle(214, 190, 1.3)}${sparkle(28, 200, 0.9)}`),
  },
];

export const ALL_FIGURES: BossDef[] = [MAJEN, ...BOSSES];

/** Makes gradient ids unique so the same figure can appear several times on one page. */
export function uniqueSvg(svg: string, suffix: string): string {
  return svg
    .replace(/id="([\w-]+)"/g, (_m, id) => `id="${id}-${suffix}"`)
    .replace(/url\(#([\w-]+)\)/g, (_m, id) => `url(#${id}-${suffix})`);
}
