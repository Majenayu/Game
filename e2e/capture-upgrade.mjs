/** Read-only release evidence. Run after the browser suite, never in parallel with a performance run. */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('..');
const output = resolve(root, 'docs/audit/after');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.ORB_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const evidence = {
  capturedAt: new Date().toISOString(),
  environment: 'Headless system Chromium, sandbox software GPU. Not physical device certification.',
  screenshots: [], quality: [], coldLoads: [], errors: [],
};
const seed = (quality = 'auto', motion = true) => ({ quality, motion, shake: false, colorblind: true, music: 0, effects: 0, voice: 0 });
async function context(viewport, touch = false, prefs = seed()) {
  const ctx = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch });
  await ctx.addInitScript(({ prefs }) => {
    let n = 12345;
    // Only this disposable evidence browser is seeded; shipped RNG and simulation are unchanged.
    Math.random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
    localStorage.setItem('orb.save3', JSON.stringify({
      v: 2, nick: 'Starforger', xp: 1000000,
      profile: { cls: 'warrior', created: 1, onboarded: true, registered: true },
    }));
    localStorage.setItem('orb.presentation1', JSON.stringify(prefs));
    localStorage.setItem('orb.muted', '1');
  }, { prefs });
  return ctx;
}
async function capture(page, name) {
  await page.screenshot({ path: resolve(output, name) });
  evidence.screenshots.push(name);
}
async function startPractice(page) {
  await page.locator('#practice').click();
  await page.locator('[data-lconfirm]').click();
  await active(page);
}
async function active(page) {
  await page.waitForFunction(() => {
    const src = window.__orbGame.scene.getScene('game').activeSource;
    return src?.view(performance.now()).players.find(p => p.id === src.localId)?.hold <= 0;
  }, null, { timeout: 45000 });
  await page.locator('#countdown').waitFor({state:'hidden'});
  if (await page.locator('.hint-dismiss').isVisible()) await page.locator('.hint-dismiss').click();
}
async function measure(page, duration) {
  return page.evaluate(async duration => {
    const scene = window.__orbGame.scene.getScene('game');
    const intervals = [], peaks = { particles:0, texts:0, effects:0, images:0, bullets:0 };
    const initialHeap = performance.memory?.usedJSHeapSize ?? null;
    let last = performance.now();
    const end = last + duration;
    await new Promise(resolve => {
      function tick(now) {
        intervals.push(now-last); last=now;
        peaks.particles = Math.max(peaks.particles,scene.particlePool.slots.filter(p=>p.life>0).length);
        peaks.texts = Math.max(peaks.texts,scene.textPool.length);
        peaks.effects = Math.max(peaks.effects,scene.fxs.length);
        peaks.images = Math.max(peaks.images,scene.art.imgs.size);
        peaks.bullets = Math.max(peaks.bullets,scene.activeSource.view(now).bullets.length);
        if (now<end) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
    intervals.sort((a,b)=>a-b);
    const gl=window.__orbGame.renderer.gl;
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      seconds:duration/1000,combatants:scene.lastPlayers.length,
      meanFps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),
      p95ms:intervals[Math.floor(intervals.length*.95)],
      phaserFps:window.__orbGame.loop.actualFps,
      renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',
      particleSlots:scene.particlePool.slots.length,textSlots:scene.textPool.length,
      peaks,initialHeap,finalHeap:performance.memory?.usedJSHeapSize??null,
    };
  },duration);
}
const url = process.env.ORB_CAPTURE_URL || 'http://localhost:3000';
let server;
try {
  for (const [width, height, touch] of [[1366,768,false],[1920,1080,false],[390,844,true],[844,390,true]]) {
    const ctx = await context({ width, height }, touch, seed('medium', false));
    const page = await ctx.newPage();
    page.on('pageerror', e => evidence.errors.push(e.message));
    await page.goto(url);
    await page.locator('#menu').waitFor({ state: 'visible' });
    await capture(page, `menu-${width}.png`);
    if (width === 1366) {
      await page.locator('#settings').click();
      await capture(page,'settings-1366.png');
      await page.keyboard.press('Escape');
      await page.locator('#journey summary').click();
      await page.locator('.journey-cards').scrollIntoViewIfNeeded();
      await capture(page,'journey-1366.png');
      await page.locator('#journey summary').click();
      await page.locator('#menu').evaluate(el=>el.scrollTop=0);
      for (const name of ['arenas','campaign','loadout','collection','shop','daily','quests','spin','summons','dex','bestiary','ranked','chests','guild','training']) {
        await page.locator(`#menu [data-page="${name}"]`).click();
        await page.locator('#page').waitFor({ state: 'visible' });
        await capture(page, `${name}-${width}.png`);
        const tabs = {loadout:['gear','profile'],collection:['fusion','encyclopedia'],shop:['market','auction']}[name] ?? [];
        for (const tab of tabs) {
          await page.locator(`[data-pgtab="${tab}"]`).click();
          await capture(page,`${tab}-${width}.png`);
        }
        await page.locator('#pageclose').click();
      }
    }
    if (touch) {
      await page.locator('[data-page="training"]').scrollIntoViewIfNeeded();
      await capture(page,`destinations-${width}.png`);
      await page.locator('#menu').evaluate(el=>el.scrollTop=0);
    }
    await startPractice(page);
    await capture(page, `active-match-${width}.png`);
    if (width === 1366) {
      const gray = await page.addStyleTag({content:'html { filter:grayscale(1); }'});
      await capture(page,'active-grayscale-1366.png');
      await gray.evaluate(el=>el.remove());
      await page.locator('#leave').click();
      for (const map of ['neon','crossfire','pillars','fortress','lava','maze','glacier']) {
        await page.locator('[data-page="arenas"]').click();
        await page.locator(`[data-offline="${map}"]`).click();
        await page.locator('[data-lconfirm]').click();
        await active(page);
        await capture(page, `arena-${map}.png`);
        await page.locator('#leave').click();
      }
    }
    await ctx.close();
  }
  for (const [width,height,touch] of [[1366,768,false],[390,844,true]]) {
    const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
    await ctx.addInitScript(()=>localStorage.setItem('orb.muted','1'));
    const page=await ctx.newPage();
    await page.goto(url);
    await page.locator('#hint').waitFor({state:'visible'});
    await page.waitForFunction(width=>window.__orbGame.scale.gameSize.width===width,touch?480:1600);
    await capture(page,`first-run-${width}.png`);
    await ctx.close();
  }
  for (const quality of ['low','medium','high']) {
    const ctx = await context({ width:1366, height:768 }, false, seed(quality));
    const page = await ctx.newPage();
    await page.goto(url);
    await startPractice(page);
    await page.locator('#autobtn').click();
    await page.mouse.move(900,300);
    await page.mouse.down();
    const sample = await measure(page,10000);
    if (quality === 'high') {
      // Stress fixture only: double the usual seat count using the existing Sim API.
      await page.evaluate(() => {
        const scene=window.__orbGame.scene.getScene('game'), pr=window.__orbProgress;
        const Source=scene.activeSource.constructor;
        const source=new Source('Starforger',pr.data.loadout,{seats:8,botLevel:pr.level.level},pr.loadoutInstances(),pr.level.level);
        source.confirm();
        scene.setSource(source);
      });
      await active(page);
      const stress = await measure(page,60000);
      if (stress.combatants !== 8) throw new Error(`Stress fixture expected 8 combatants, received ${stress.combatants}`);
      evidence.quality.push({quality,stress:'8-seat disposable fixture; 60 seconds',...stress});
    }
    await page.mouse.up();
    evidence.quality.push({ quality,...sample });
    await ctx.close();
  }
  // An ephemeral static-file server, not another development server; no app or backend changes.
  const build = resolve(root,'client/dist');
  const types = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.txt':'text/plain' };
  server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://release.local').pathname);
      const file = resolve(build, '.'+(pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(build+'/')) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const release = `http://127.0.0.1:${server.address().port}`;
  for (let run=1;run<=3;run++) {
    const ctx = await context({width:1366,height:768});
    const page = await ctx.newPage();
    const start = performance.now();
    await page.goto(release);
    await page.locator('#menu').waitFor({state:'visible'});
    evidence.coldLoads.push({
      run, menuReadyMs:performance.now()-start,
      ...await page.evaluate(() => ({
        navigationMs:performance.getEntriesByType('navigation')[0].duration,
        resources:performance.getEntriesByType('resource').length,
        transferBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),
        lazyPagesRequested:performance.getEntriesByType('resource').some(r=>r.name.includes('/pages-')),
      })),
    });
    await ctx.close();
  }
  evidence.bundles = [];
  for (const name of await readdir(resolve(build,'assets'))) if (name.endsWith('.js') || name.endsWith('.css')) {
    const body = await readFile(resolve(build,'assets',name));
    evidence.bundles.push({ name, raw:body.length, gzip:gzipSync(body).length });
  }
  evidence.zipBytes = (await stat(resolve(root,'dist/orb-arena.zip'))).size;
  evidence.productionColdLoadMethod = 'Three fresh browser contexts, local uncompressed static build, no throttling. Menu-ready sampling, not field TTI; not comparable to the development baseline.';
  await writeFile(resolve(output,'measurements.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
