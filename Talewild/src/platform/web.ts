// Plain web (and itch.io): localStorage saves, no portal events.

import { browserKV, type KV } from '../core/storage';
import { BasePlatform } from './types';

export class WebPlatform extends BasePlatform {
  readonly name = 'web' as const;
  readonly storage: KV = browserKV();
}
