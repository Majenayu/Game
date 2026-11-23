// Scan index -> part name for each sheet (see parts/<el>/_scan.png). Only heads and the signature pieces are cut;
// the body stays one code-drawn silhouette like the Lightning avatar.
// back: behind the body; shoulder: on the shoulders; wrist: on the front forearm; emblem: chest core.
export const PICKS = {
  fire: { head_normal: 0, head_attack: 1, head_hurt: 2, head_ko: 3, emblem: { box: [1115, 330, 1300, 512] } },
  water: { head_normal: 0, head_attack: 1, head_hurt: 2, head_ko: 3, emblem: 6 },
  ice: { head_normal: 0, head_attack: 1, head_hurt: 2, head_ko: 3, shoulder: 4, wrist: 6, emblem: 7 },
  wind: { head_normal: 0, head_attack: 1, head_hurt: 2, head_ko: 3, neck: 5, emblem: 6 },
  earth: { head_normal: 0, head_attack: 1, head_hurt: 2, head_ko: 3, shoulder: { box: [106, 237, 262, 424] }, emblem: 6 },
  leaf: { head_normal: 0, head_attack: 2, head_hurt: 3, head_ko: 5, shoulder: 6, wrist: 7, emblem: 8 },
  light: { head_normal: 0, head_attack: 2, head_hurt: 3, head_ko: 4, shoulder: 5, emblem: 6, back: 7 },
  gravity: { head_normal: 0, head_attack: 2, head_hurt: 3, head_ko: 4, emblem: 8, back: 7 },
  time: { head_normal: 0, head_attack: 2, head_hurt: 3, head_ko: 4, back: 5, shoulder: 6, emblem: 9 },
};
