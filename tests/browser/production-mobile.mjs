/**
 * Real production entry point, no Phaser/game globals or scene inspection.
 * Run with approved loopback access: node tests/browser/production-mobile.mjs
 * Pure coordinate checks only: node tests/browser/production-mobile.mjs --self-test
 * Requires the existing outputs/browser-deps Playwright install and installed Chrome.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { resumeFixture, SAVE } from './fixtures.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'outputs', 'production-mobile');
const viewport = { width: 844, height: 390 };

export function canvasPoint(bounds, x, y) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('Canvas has no visible bounds');
  if (x < 0 || x > 1600 || y < 0 || y > 900) throw new Error(`Logical point outside canvas: ${x},${y}`);
  return { x: bounds.x + x / 1600 * bounds.width, y: bounds.y + y / 900 * bounds.height };
}

// The real production camera follows the player and clamps at the 2400x1600 map bounds.
export function checkpointWorldPoint(checkpoint, x, y) {
  const scrollX = Math.max(0, Math.min(800, checkpoint.position.x - 800));
  const scrollY = Math.max(0, Math.min(700, checkpoint.position.y - 450));
  return { x: x - scrollX, y: y - scrollY };
}

if (process.argv.includes('--self-test')) {
  assert.deepEqual(canvasPoint({ x: 75, y: 0, width: 694, height: 390 }, 800, 450), { x: 422, y: 195 });
  assert.throws(() => canvasPoint(null, 1, 1));
  assert.throws(() => canvasPoint({ x: 0, y: 0, width: 1, height: 1 }, 1601, 0));
  assert.deepEqual(checkpointWorldPoint({ position: { x: 820, y: 980 } }, 820, 820), { x: 800, y: 290 });
  assert.deepEqual(checkpointWorldPoint({ position: { x: 200, y: 200 } }, 820, 820), { x: 820, y: 820 });
  console.log('PASS production-mobile coordinate self-checks (5 assertions)');
} else {
  await run();
}

async function run() {
  await mkdir(output, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(), command: 'node tests/browser/production-mobile.mjs',
    entry: '/index.html', viewport, isMobile: true, hasTouch: true,
    observations: [], results: [], diagnostics: [],
    limitation: 'Canvas labels are preserved in screenshots; no production game reference or canvas text hook is used. Audible speech is not asserted.',
  };
  let server;
  let browser;
  let baseUrl;

  async function snapshot(page, name) {
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, timeout: 10000 });
    const state = await page.evaluate(() => ({
      dataset: { ...document.body.dataset }, url: location.href,
      viewport: { width: innerWidth, height: innerHeight, coarse: matchMedia('(pointer: coarse)').matches },
      checkpoint: JSON.parse(localStorage.getItem('under-shadow-world-checkpoint-v1') || 'null'),
      storage: Object.fromEntries(Object.entries(localStorage)),
      hasSandboxGlobal: 'sandboxGame' in window,
      controls: [...document.querySelectorAll('button, #mobile-stick, #mobile-controls, #asset-loading, #orientation-tip')].map(element => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const center = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return { id: element.id, text: element.textContent?.trim(), display: style.display, visibility: style.visibility,
          bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          centerHit: center?.id || center?.tagName, centerReachable: Boolean(center && (center === element || element.contains(center))) };
      }),
    }));
    await writeFile(path.join(output, `${name}.json`), JSON.stringify(state, null, 2));
    return state;
  }

  async function step(name, page, action) {
    const start = Date.now();
    try {
      const detail = await action();
      await snapshot(page, name);
      report.results.push({ name, status: 'passed', durationMs: Date.now() - start, detail });
      console.log(`PASS ${name}`);
      return true;
    } catch (error) {
      process.exitCode = 1;
      await snapshot(page, `${name}-failure`).catch(() => {});
      report.results.push({ name, status: 'failed', durationMs: Date.now() - start, error: String(error.stack ?? error) });
      console.error(`FAIL ${name}: ${error.message}`);
      return false;
    }
  }

  async function waitUi(page, mode, timeout = 15000) {
    await page.waitForFunction(expected => document.body?.dataset.gameUi === expected, mode, { timeout });
    if (mode === 'world') {
      await page.locator('#asset-loading').waitFor({ state: 'hidden', timeout });
      await page.locator('#mobile-controls').waitFor({ state: 'visible', timeout });
    }
  }

  async function tapCanvas(page, x, y) {
    const canvas = page.locator('#app canvas');
    const point = canvasPoint(await canvas.boundingBox(), x, y);
    const hit = await page.evaluate(point => {
      const element = document.elementFromPoint(point.x, point.y);
      return { tag: element?.tagName, id: element?.id };
    }, point);
    assert.equal(hit.tag, 'CANVAS', `Canvas target intercepted by ${JSON.stringify(hit)}`);
    await page.touchscreen.tap(point.x, point.y);
  }

  async function controlsReachable(page) {
    for (const id of ['mobile-stick', 'mobile-help', 'mobile-interact', 'mobile-map', 'mobile-notebook', 'mobile-pets']) {
      const element = page.locator(`#${id}`);
      assert.ok(await element.isVisible(), `${id} must be visible in world mode`);
      const reachable = await element.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.width >= 44 && rect.height >= 44 && rect.x >= 0 && rect.y >= 0
          && rect.right <= innerWidth && rect.bottom <= innerHeight && Boolean(hit && (hit === element || element.contains(hit)));
      });
      assert.ok(reachable, `${id} must have a reachable in-viewport touch target >=44px`);
    }
  }

  async function openPage(save, size = viewport) {
    const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-TW' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort('blockedbyclient');
    });
    await context.addInitScript(values => {
      if (location.protocol !== 'http:') return;
      if (sessionStorage.getItem('production-mobile-seeded')) return;
      localStorage.clear();
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      localStorage.setItem('under-shadow-music', 'off');
      sessionStorage.setItem('production-mobile-seeded', 'true');
    }, save);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(String(error.stack ?? error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    context.on('close', () => report.diagnostics.push({ viewport: size, errors }));
    try {
      await page.goto(baseUrl, { waitUntil: 'commit', timeout: 45000 });
      // The HTML already says "gate" before main.ts imports and CSS finish loading.
      // Wait for main's localized button copy and applied layout, not that initial attribute.
      await page.waitForFunction(() => document.body?.dataset.gameUi === 'gate'
        && document.querySelector('#start-game')?.textContent.includes('新')
        && getComputedStyle(document.querySelector('#app')).display === 'grid', null, { timeout: 45000 });
      await page.locator('#start-game').waitFor({ state: 'attached' });
      assert.equal(await page.evaluate(() => 'sandboxGame' in window), false);
      assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
      return { context, page, errors };
    } catch (error) {
      await snapshot(page, `boot-failure-${report.results.length}`).catch(() => {});
      await context.close();
      throw error;
    }
  }

  async function joystick(page) {
    const checkpoint = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE.checkpoint);
    assert.ok(checkpoint?.position, 'Real world must have saved its checkpoint');
    const bounds = await page.locator('#mobile-stick').boundingBox();
    const session = await page.context().newCDPSession(page);
    const touch = { x: bounds.x + bounds.width * 0.85, y: bounds.y + bounds.height / 2, id: 1, radiusX: 5, radiusY: 5, force: 1 };
    try {
      // Trusted browser touch input drives production pointer capture and joystick handlers.
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#mobile-knob')).transform !== 'matrix(1, 0, 0, 1, 0, 0)');
      await page.waitForFunction(({ key, x }) => {
        const current = JSON.parse(localStorage.getItem(key) || 'null');
        return current?.position.x > x + 90 && current?.tutorial.moved;
      }, { key: SAVE.checkpoint, x: checkpoint.position.x }, { timeout: 10000 });
    } finally {
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
      await session.detach();
    }
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#mobile-knob')).transform === 'matrix(1, 0, 0, 1, 0, 0)');
    return { before: checkpoint.position, after: await page.evaluate(key => JSON.parse(localStorage.getItem(key)).position, SAVE.checkpoint) };
  }

  async function panel(page, buttonId, mode, close) {
    await waitUi(page, 'world');
    await controlsReachable(page);
    await page.locator(`#${buttonId}`).tap();
    try {
      await waitUi(page, mode);
      assert.equal(await page.locator('#mobile-controls').isVisible(), false, `Controls overlay must hide in ${mode}`);
      await snapshot(page, `${buttonId}-open`);
      await tapCanvas(page, close.x, close.y);
      await waitUi(page, 'world');
      await controlsReachable(page);
      return { openedBy: buttonId, mode, canvasClose: close, controlsHiddenOverPanel: true };
    } finally {
      if (await page.evaluate(() => document.body.dataset.gameUi) === mode) {
        await tapCanvas(page, close.x, close.y).catch(() => {});
      }
    }
  }

  try {
    const moduleUrl = process.env.PLAYWRIGHT_MODULE
      ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href
      : new URL('../../outputs/browser-deps/node_modules/playwright/index.mjs', import.meta.url).href;
    const { chromium } = await import(moduleUrl);
    server = await createServer({
      root, configFile: false, base: '/', clearScreen: false, cacheDir: path.join(output, '.vite'),
      server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/outputs/**'] } },
      optimizeDeps: { entries: ['index.html'], include: ['phaser'] },
    });
    await server.listen();
    baseUrl = `${server.resolvedUrls.local[0]}index.html`;
    report.url = baseUrl;
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
      args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    report.browserVersion = browser.version();

    const fresh = await openPage(resumeFixture());
    try {
      const started = await step('fresh-intro', fresh.page, async () => {
        assert.equal(await fresh.page.locator('#mobile-controls').isVisible(), false);
        await fresh.page.locator('#start-game').tap();
        await waitUi(fresh.page, 'intro', 45000);
        assert.equal(await fresh.page.locator('#profile-gate').count(), 0);
        assert.equal(await fresh.page.evaluate(key => localStorage.getItem(key), SAVE.claimed), null);
        assert.equal(await fresh.page.evaluate(key => localStorage.getItem(key), SAVE.chapter), null);
        assert.equal(await fresh.page.locator('#mobile-controls').isVisible(), false);
        const voice = fresh.page.getByRole('button', { name: /中文[語语]音/ });
        let voiceResult = 'unavailable on device';
        if (await voice.count() && await voice.isEnabled()) {
          await voice.tap();
          assert.equal(await voice.getAttribute('aria-pressed'), 'true');
          await voice.tap();
          assert.equal(await voice.getAttribute('aria-pressed'), 'false');
          voiceResult = 'real touch toggled on/off';
        }
        await snapshot(fresh.page, 'intro-voice-controls');
        await fresh.page.getByRole('button', { name: /跳[過过]序幕/ }).tap();
        await waitUi(fresh.page, 'world', 45000);
        await fresh.page.waitForFunction(key => Boolean(localStorage.getItem(key)), SAVE.checkpoint);
        assert.equal(await fresh.page.getByRole('button', { name: /跳[過过]序幕/ }).count(), 0);
        const progress = await fresh.page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE.species);
        assert.ok(Object.values(progress).every(item => item.snacks === 0 && item.fed === 0));
        await controlsReachable(fresh.page);
        return { voice: voiceResult, dirtySaveCleared: true, introGateRemoved: true, noProductionHooks: true };
      });
      if (started) {
        await step('joystick-movement', fresh.page, () => joystick(fresh.page));
        await step('mobile-help', fresh.page, () => panel(fresh.page, 'mobile-help', 'help', { x: 800, y: 625 }));
        await step('mobile-map', fresh.page, () => panel(fresh.page, 'mobile-map', 'map', { x: 800, y: 830 }));
        await step('mobile-notebook', fresh.page, () => panel(fresh.page, 'mobile-notebook', 'notebook', { x: 800, y: 740 }));
        await step('mobile-pets', fresh.page, () => panel(fresh.page, 'mobile-pets', 'dialogue', { x: 800, y: 785 }));
      }
      await step('fresh-runtime-errors', fresh.page, async () => { assert.deepEqual(fresh.errors, []); });
    } finally { await fresh.context.close(); }

    const dialogueSave = resumeFixture();
    const saved = JSON.parse(dialogueSave[SAVE.checkpoint]);
    saved.position = { x: 820, y: 980 };
    dialogueSave[SAVE.checkpoint] = JSON.stringify(saved);
    const dialogue = await openPage(dialogueSave);
    try {
      await step('npc-dialogue-end-talk', dialogue.page, async () => {
        await dialogue.page.locator('#continue-game').tap();
        await waitUi(dialogue.page, 'world', 45000);
        await controlsReachable(dialogue.page);
        await dialogue.page.waitForFunction(({ key, point }) => {
          const checkpoint = JSON.parse(localStorage.getItem(key) || 'null');
          return checkpoint?.position.x === point.x && checkpoint?.position.y === point.y;
        }, { key: SAVE.checkpoint, point: saved.position });
        const npc = checkpointWorldPoint(saved, 820, 820);
        // A trusted tap on the on-screen mentor, not a direct scene method call.
        await tapCanvas(dialogue.page, npc.x, npc.y);
        await waitUi(dialogue.page, 'dialogue');
        assert.equal(await dialogue.page.locator('#mobile-controls').isVisible(), false);
        await snapshot(dialogue.page, 'npc-dialogue-open');
        // Production touch layout places the persistent "結束交談" button here.
        await tapCanvas(dialogue.page, 1370, 490);
        await waitUi(dialogue.page, 'world');
        await controlsReachable(dialogue.page);
        assert.deepEqual(dialogue.errors, []);
        return { checkpoint: saved.position, npc: 'mentor', tappedAt: npc, endTalk: { x: 1370, y: 490 } };
      });
    } finally { await dialogue.context.close(); }

    const portrait = await openPage(resumeFixture(), { width: 390, height: 844 });
    try {
      await step('portrait-orientation-prompt', portrait.page, async () => {
        await portrait.page.locator('#orientation-tip').waitFor({ state: 'visible' });
        assert.equal(await portrait.page.locator('#profile-gate').isVisible(), false);
        assert.equal(await portrait.page.evaluate(() => document.body.dataset.orientationHint), 'true');
        await snapshot(portrait.page, 'portrait-prompt-open');
        await portrait.page.locator('#continue-portrait').tap();
        await portrait.page.locator('#orientation-tip').waitFor({ state: 'hidden' });
        assert.ok(await portrait.page.locator('#profile-gate').isVisible());
        assert.equal(await portrait.page.evaluate(() => document.body.dataset.orientationHint), 'false');
        assert.deepEqual(portrait.errors, []);
        return { promptAppeared: true, portraitOverrideReturnsGate: true };
      });
    } finally { await portrait.context.close(); }
  } catch (error) {
    process.exitCode = 1;
    report.fatal = String(error.stack ?? error);
    console.error(report.fatal);
  } finally {
    await browser?.close();
    await server?.close();
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(output, `report-${report.startedAt.replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2));
    console.log(`Report: ${path.join(output, 'report.json')}`);
  }
}
