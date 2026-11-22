// Poki SDK adapter (filled in during the portal milestone after reading Poki's current docs).
// Until then it behaves like plain web so the Poki build always runs.

import { browserKV, type KV } from '../core/storage';
import { BasePlatform } from './types';

export class PokiPlatform extends BasePlatform {
  readonly name = 'poki' as const;
  readonly storage: KV = browserKV();
}
