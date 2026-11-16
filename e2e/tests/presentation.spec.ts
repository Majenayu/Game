import { expect, test, type Page } from './fixtures';
import { seed } from './seed';
import { CHARACTER_LIST, MAP_LIST } from '@orb/shared';

const ready = async (page: Page) => {
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
};
const snapshot = (page: Page) => page.evaluate(() => {
  const d = (window as any).__orbProgress.data;
  return JSON.stringify({ coins: d.coins, xp: d.xp, skills: d.skills, loadout: d.loadout, profile: d.profile });
});

test('old saves survive presentation preferences and independent audio controls', async ({ page }) => {
  await seed(page, { v: 2, coins: 9876, xp: 4200, nick: 'LegacyOrb', profile: { cls:'warrior',created:1,onboarded:true,registered:true } });
  await ready(page);
  const before = await snapshot(page);
  await page.locator('#settings').click();
  await page.getByLabel('Graphics quality').selectOption('low');
  await page.locator('[data-pref="motion"]').uncheck();
  await page.locator('[data-pref="colorblind"]').check();
  for (const [key, value] of [['music','10'],['effects','65'],['voice','25']]) {
    await page.locator(`[data-pref="${key}"]`).evaluate((el, v) => {
      const input = el as HTMLInputElement; input.value = v; input.dispatchEvent(new Event('input'));
    }, value);
  }
  await expect(page.locator('html')).toHaveAttribute('data-quality','low');
  await expect(page.locator('html')).toHaveAttribute('data-motion','off');
  await expect(page.locator('[data-volume="music"]')).toHaveText('10%');
  await expect(page.locator('[data-volume="effects"]')).toHaveText('65%');
  await page.keyboard.press('Escape');
  expect(await snapshot(page)).toBe(before);
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.getByLabel('Graphics quality')).toHaveValue('low');
  await expect(page.locator('[data-pref="effects"]')).toHaveValue('65');
  await expect(page.locator('[data-pref="voice"]')).toHaveValue('25');
  expect(await snapshot(page)).toBe(before);
});

test('shadow duel respects camera shake and reduced-motion preferences', async ({ page }) => {
  await seed(page); await ready(page);
  const results = [];
  for (const prefs of [{ motion: false, shake: true }, { motion: true, shake: false }, { motion: true, shake: true }]) {
    await page.locator('#settings').click();
    await page.locator('[data-pref="motion"]').setChecked(prefs.motion);
    await page.locator('[data-pref="shake"]').setChecked(prefs.shake);
    await page.keyboard.press('Escape');
    await page.locator('[data-page="ranked"]').click();
    await page.locator('[data-shadow="0"]').click();
    await expect(page.locator('#lobby')).toBeVisible();
    results.push(await page.evaluate(() => {
      const scene = (window as any).__orbGame.scene.getScene('duel');
      const camera = scene.cameras.main;
      const shake = camera.shake, flash = camera.flash;
      let shakes = 0, flashes = 0;
      camera.shake = () => { shakes++; return camera; };
      camera.flash = () => { flashes++; return camera; };
      try {
        const id = scene.src.localId;
        scene.onEvent({ t: 'hit', id, x: 100, y: 100, dmg: 1, blocked: false });
        scene.onEvent({ t: 'skill', id, skill: (window as any).__orbProgress.data.loadout.skillIds[0], power: 1, kind: 'nova', dir: 1, x: 100, y: 100 });
        scene.onEvent({ t: 'ko', id });
        return { shakes, flashes };
      } finally {
        camera.shake = shake; camera.flash = flash;
      }
    }));
    await page.locator('#leave').click();
  }
  expect(results).toEqual([{ shakes: 0, flashes: 0 }, { shakes: 0, flashes: 1 }, { shakes: 2, flashes: 1 }]);
});

test('modal traps focus, supports Escape, and restores its original trigger through credits', async ({ page }) => {
  await seed(page); await ready(page);
  await page.locator('#settings').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Game settings');
  await expect(page.locator('[data-mclose]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#license-open')).toBeFocused();
  await page.locator('#license-open').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Credits & licenses');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeFocused();
});

test('first-run instruction stays clear of rewards and skills and can be dismissed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hint')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#mergefx')).toBeHidden();
  const hint = await page.locator('#hint').boundingBox();
  const skills = await page.locator('#skills').boundingBox();
  expect(hint!.y + hint!.height).toBeLessThan(skills!.y);
  await page.getByLabel('Dismiss tutorial hint').click();
  await expect(page.locator('#hint')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__orbProgress.data.loadout.skillIds.length)).toBe(5);
});

test('platform mute and disable-chat flags cannot be bypassed from the HUD', async ({ page }) => {
  await seed(page);
  await page.goto('/?muteAudio=true&disableChat=true');
  await page.locator('#practice').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-label','Unmute');
  await page.locator('#mute').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-label','Unmute');
  await expect(page.locator('#emotebtn')).toBeHidden();
  await page.keyboard.press('t');
  await expect(page.locator('#emotes')).toBeHidden();
});

for (const size of [{ width: 390, height: 844 },{ width: 844, height: 390 }]) {
  test(`touch controls and all hub destinations work at ${size.width} × ${size.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true });
    await seed(context);
    const page = await context.newPage();
    await ready(page);
    await expect(page.locator('#rotate')).toBeHidden();
    await expect(page.locator('#play')).toHaveCount(1);
    await expect(page.locator('#menu .tile')).toHaveCount(15);
    for (const id of ['settings','mute','practice','howto','champbtn','champfight']) {
      const target = (await page.locator('#'+id).boundingBox())!;
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('#menu').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.locator('[data-page="spin"]').click();
    await expect(page.locator('[data-wheel="coins"]')).toBeVisible();
    await expect(page.locator('[data-wheel="summons"]')).toBeVisible();
    expect(await page.locator('#page').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.locator('#pageclose').click();
    await page.locator('#practice').click();
    await page.locator('[data-lconfirm]').click();
    await expect(page.locator('#touch')).toHaveClass('on');
    await page.waitForFunction(() => {
      const s = (window as any).__orbGame.scene.getScene('game').activeSource;
      return s?.view(performance.now()).players.find((p: any) => p.id === s.localId)?.hold <= 0;
    });
    const viewport = await page.evaluate(() => {
      const scene=(window as any).__orbGame.scene.getScene('game');
      return {width:scene.scale.gameSize.width,height:scene.scale.gameSize.height};
    });
    expect(viewport.width).toBe(size.width < size.height ? 480 : 1600);
    const hp=(await page.locator('#hpbox').boundingBox())!, kills=(await page.locator('#kills').boundingBox())!;
    expect(hp.y+hp.height).toBeLessThanOrEqual(kills.y);
    const leave=(await page.locator('#leave').boundingBox())!, chat=(await page.locator('#emotebtn').boundingBox())!;
    expect(leave.x+leave.width).toBeLessThanOrEqual(chat.x);
    if (size.width < size.height) {
      const canvas=(await page.locator('#game canvas').boundingBox())!;
      expect(canvas.height).toBeGreaterThan(size.height*.5);
    }
    const control = page.locator('#touch');
    const bounds = (await control.boundingBox())!;
    const x = Math.min(90, size.width / 4), y = bounds.y + bounds.height * .65;
    await control.dispatchEvent('pointerdown',{ pointerId:7, clientX:x, clientY:y });
    await control.dispatchEvent('pointermove',{ pointerId:7, clientX:x+40, clientY:y });
    const movement = await page.evaluate(() => (window as any).__orbGame.scene.getScene('game').touch.state.moveX);
    expect(movement).toBeGreaterThan(.5);
    await control.dispatchEvent('pointercancel',{ pointerId:7 });
    expect(await page.evaluate(() => (window as any).__orbGame.scene.getScene('game').touch.state.moveX)).toBe(0);
    const skill = (await page.locator('#sk0').boundingBox())!;
    expect(skill.x).toBeGreaterThanOrEqual(0);
    expect(skill.y + skill.height).toBeLessThanOrEqual(size.height);
    await page.locator('#leave').click();
    await expect(page.locator('#menu')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__orbGame.scale.gameSize.width)).toBe(1600);
    await context.close();
  });
}

test('all character, weapon, arena and local respawn presentations stay bounded', async ({ page }) => {
  await seed(page); await ready(page);
  await page.locator('#practice').click();
  const result = await page.evaluate(async ({heroes,maps}) => {
    const scene = (window as any).__orbGame.scene.getScene('game');
    const me = scene.activeSource.view(performance.now()).players.find((p: any) => p.id === 'me');
    const calls = { heroes:0, weapons:0, arenas:0 };
    for (const char of heroes) { scene.art.drawPlayer({ ...me, char },1,performance.now()); calls.heroes++; }
    for (let weapon=0;weapon<6;weapon++) { scene.drawWeapon(scene.gt,{...me,weapon},1); calls.weapons++; }
    for (const map of maps) { scene.applyMap(map); calls.arenas++; }
    scene.applyMap('neon');
    const beacons: string[] = [];
    const drawBeacon=scene.drawRespawnBeacon.bind(scene);
    scene.drawRespawnBeacon=(player: any,now: number) => { beacons.push(player.id); drawBeacon(player,now); };
    const snap=scene.activeSource.view(performance.now());
    scene.render(scene.g,snap.players.map((p: any)=>({...p,alive:false})),snap,'me',performance.now(),0);
    scene.drawRespawnBeacon=drawBeacon;
    const beaconCommands = scene.gt.commandBuffer.length;
    for (let i=0;i<100;i++) scene.burst(800,450,0xffffff,1000);
    for (let i=0;i<100;i++) scene.pop(800,450,'10','#fff',20);
    return {...calls,beacons,beaconCommands,particles:scene.particlePool.slots.length,texts:scene.textPool.length};
  }, {heroes:CHARACTER_LIST.map(c=>c.id),maps:MAP_LIST.map(m=>m.id)});
  expect(result).toMatchObject({heroes:7,weapons:6,arenas:25,particles:280,texts:20});
  expect(result.beaconCommands).toBeGreaterThan(0);
  expect(result.beacons).toEqual(['me']);
});

test('journey pins existing goals, links to their pages, and never grants rewards', async ({ page }) => {
  await seed(page, {profile:{cls:'warrior',created:1,onboarded:true,registered:true}});
  await ready(page);
  await page.locator('#journey summary').click();
  await expect(page.locator('.journey-card')).toHaveCount(3);
  const before = await snapshot(page);
  const chosen = await page.getByLabel('Pinned quest').locator('option').nth(1).getAttribute('value');
  await page.getByLabel('Pinned quest').selectOption(chosen!);
  expect(await page.evaluate(() => localStorage.getItem('orb.goal1'))).toBe(chosen);
  expect(await snapshot(page)).toBe(before);
  for (const name of ['quests','campaign','collection']) {
    await page.locator(`[data-journey-go="${name}"]`).click();
    await expect(page.locator('#page')).toHaveAttribute('data-view',name);
    await page.locator('#pageclose').click();
  }
  await page.reload();
  await expect(page.getByLabel('Pinned quest')).toHaveValue(chosen!);
  expect(await snapshot(page)).toBe(before);
  await page.evaluate(() => {
    const pr = (window as any).__orbProgress;
    const q = pr.data.quests.list[0];
    q.progress = pr.questDef(q.id).target;
    pr.commit();
  });
  await expect(page.locator('#journey summary')).toContainText('quest reward');
});
