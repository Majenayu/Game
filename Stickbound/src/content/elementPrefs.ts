// Inputs to the element wheel search (owner's preferred pairs plus thematic tie-breakers).

export const ELEMENT_IDS = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

/** Owner's preferred pairs (attacker beats defender). Weight 100 each. */
export const PRIMARY_PAIRS = [
  ['water', 'fire'],
  ['fire', 'leaf'],
  ['fire', 'ice'],
  ['leaf', 'earth'],
  ['earth', 'lightning'],
  ['lightning', 'water'],
  ['ice', 'wind'],
  ['light', 'time'],
  ['gravity', 'light'],
] as const;

/** Thematic tie-breakers used to fill the rest of the wheel. Weight 1 each. */
export const SECONDARY_PAIRS = [
  ['earth', 'fire'], // smothers flames
  ['leaf', 'water'], // roots drink water
  ['ice', 'leaf'], // frost withers leaves
  ['light', 'ice'], // sunlight melts ice
  ['wind', 'lightning'], // wind scatters storm clouds
  ['gravity', 'wind'], // weight holds against wind
  ['time', 'gravity'], // time outlasts weight
  ['lightning', 'gravity'],
  ['water', 'earth'], // water wears down earth
  ['wind', 'time'],
  ['time', 'earth'], // time erodes stone
] as const;
