export type SummonKind = 'beast' | 'robot' | 'dragon' | 'aquatic' | 'drone';

export interface SummonDef {
  id: number;
  name: string;
  kind: SummonKind;
  desc: string;
  power: number;
  price: number;
}

export const SUMMONS: SummonDef[] = [
  { id: 1, name: 'Ember Wolf', kind: 'beast', desc: 'A fast fire companion.', power: 12, price: 250 },
  { id: 2, name: 'Iron Sentinel', kind: 'robot', desc: 'A durable ranged guardian.', power: 10, price: 300 },
  { id: 3, name: 'Storm Drake', kind: 'dragon', desc: 'A lightning-breathing dragon.', power: 18, price: 650 },
  { id: 4, name: 'Tidefin', kind: 'aquatic', desc: 'A healing water companion.', power: 9, price: 220 },
  { id: 5, name: 'Meridian Mermaid', kind: 'aquatic', desc: 'A support summon with restorative waves.', power: 11, price: 400 },
  { id: 6, name: 'Scout Drone', kind: 'drone', desc: 'A small drone that marks targets.', power: 8, price: 180 },
  { id: 7, name: 'Golden Wyvern', kind: 'dragon', desc: 'A rare aerial attacker.', power: 22, price: 1200 },
  { id: 8, name: 'Mecha Bear', kind: 'robot', desc: 'A heavy close-range protector.', power: 16, price: 800 },
];

export function summonById(id: number): SummonDef | undefined {
  return SUMMONS.find((s) => s.id === id);
}
