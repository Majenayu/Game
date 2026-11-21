// Boot: load the first chapter bundle, generate textures, then show the title.

import Phaser from 'phaser';
import { loadChapter } from '../core/loader';
import { NPC_LOOKS } from '../content/looks';
import { getContext } from '../game/context';
import { getFlow } from '../game/flow';
import { ensureCharacter, ensureNib, ensureTileset } from '../render/mapRender';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const ctx = getContext();
    ctx.platform.loadingStart();
    void loadChapter('ch0').then((chapter) => {
      ctx.chapter = chapter;
      ensureTileset(this);
      ensureNib(this);
      for (const look of Object.values(NPC_LOOKS)) ensureCharacter(this, look);
      ctx.platform.loadingStop();
      document.getElementById('boot')?.remove();
      getFlow().showTitle();
      (window as unknown as { __tw: { ready: boolean } }).__tw.ready = true;
    });
  }
}
