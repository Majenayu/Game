// Plain web and itch.io: localStorage saves, no ads. With ?fakeads=1 a short placeholder ad is shown so the
// ad flows (pause, mute, reward) can be tested without a portal.

import { browserKV, type KV } from '../core/storage';
import { BasePlatform } from './types';

export class WebPlatform extends BasePlatform {
  readonly name = 'web' as const;
  readonly storage: KV = browserKV();
  private fake = new URLSearchParams(location.search).has('fakeads');

  constructor() {
    super();
    this.hasRewarded = this.fake;
  }

  override async midgame(): Promise<void> {
    this.send('midgame');
    if (this.fake) await this.fakeAd('Ad break (test)');
  }

  override async rewarded(): Promise<boolean> {
    this.send('rewarded');
    if (!this.fake) return false;
    await this.fakeAd('Rewarded ad (test)');
    return true;
  }

  private fakeAd(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.adState(true);
      const el = document.createElement('div');
      el.className = 'fake-ad';
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        this.adState(false);
        resolve();
      }, 1200);
    });
  }
}
