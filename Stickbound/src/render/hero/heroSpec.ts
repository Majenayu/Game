// Measured style spec for the neon stick heroes (from the Gemini sheets, see docs/reference-art/INVENTORY.md).
// Every number is a fraction of the standing height H (feet to top of head). One rig unit set: H = 142 * s.

export const REF_H = 142;

export const SPEC = {
  head: 0.115, // head RADIUS (diameter 0.23 H)
  chest: 0.2, // torso width at the shoulders
  hip: 0.15, // torso width at the hips
  limb: 0.09, // limb thickness (fill)
  hand: 1.4, // hand diameter as a multiple of limb width
  toe: 0.95, // foot length beyond the ankle, multiple of limb width
  outline: 0.019, // neon outline thickness
  hot: 0.0065, // hotter line just inside the outline
  glowR: 0.05, // outer glow radius
  glowA: 0.3, // outer glow max opacity
  coreIdle: 0.07, // chest core radius, idle
  coreCast: 0.14, // chest core radius, casting
  coreAt: 0.35, // chest core, fraction down the torso from the neck
  tint: 0, // element tint on the near-black fill
  shadowW: 0.45, // soft shadow width
} as const;

export const FILL = 0x0b0d17;

export const STYLE = {
  classic: { limb: 1, torso: 1 },
  striker: { limb: 0.9, torso: 0.9 },
  warden: { limb: 1.14, torso: 1.16 },
} as const;
