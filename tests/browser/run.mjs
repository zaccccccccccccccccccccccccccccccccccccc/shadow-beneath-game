import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { freshFixture, resumeFixture, SAVE } from './fixtures.mjs';
import { setupFixture, inspectScene, collectUiText, clickCanvas, clickCanvasText, clickWorldPoint, clickQuizAnswer, pressGameplayKey, waitForScene, waitForWorld } from './helpers.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'outputs', 'browser-sandbox');
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const selected = new Set((process.env.SANDBOX_CASES || 'intro,fresh,resume,feeding,cooldown').split(','));
const report = { startedAt: new Date().toISOString(), command: 'node tests/browser/run.mjs', chromePath, results: [], diagnostics: [] };
await mkdir(output, { recursive: true });
let server;
let browser;
let baseUrl;

async function openCase(fixture, mode = 'resume', { touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, hasTouch: touch, locale: 'zh-TW' });
  // Only this disposable loopback origin is reachable. No installed profile or online game.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort('blockedbyclient');
  });
  await setupFixture(context, fixture);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error.stack ?? error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  context.on('close', () => report.diagnostics.push({ mode, errors }));
  try {
    await page.goto(baseUrl, { waitUntil: 'commit', timeout: 45000 });
    await page.waitForFunction(() => {
      if (document.body?.dataset.sandbox === 'error') throw new Error(document.querySelector('#error').textContent);
      return document.body?.dataset.sandbox === 'ready';
    }, null, { timeout: 45000 });
    await page.locator(`#sandbox-${mode}`).click();
    await waitForScene(page, mode === 'fresh' ? 'intro' : 'world');
    await page.evaluate(() => document.fonts.ready);
    return { context, page, errors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, `boot-failure-${report.results.length}.png`) }).catch(() => {});
    await writeFile(path.join(output, `boot-failure-${report.results.length}.html`), await page.content()).catch(() => {});
    await context.close();
    throw error;
  }
}

async function saveSnapshot(page, name) {
  // Wait for panel fade-in by observable state, so captures show readable final UI.
  await page.waitForFunction(() => {
    const scene = window.sandboxGame?.scene.keys.world;
    return !scene?.companionLayer || scene.companionLayer.alpha >= 0.99;
  }, null, { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  await writeFile(path.join(output, `${name}.json`), JSON.stringify({
    scene: await inspectScene(page),
    ui: await collectUiText(page),
    storage: await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))),
  }, null, 2));
}

async function runCase(name, action) {
  if (!selected.has(name)) return;
  const started = Date.now();
  try {
    const details = await action();
    report.results.push({ name, status: 'passed', durationMs: Date.now() - started, ...details });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.results.push({ name, status: 'failed', durationMs: Date.now() - started, error: String(error.stack ?? error) });
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

async function settled(page) {
  await waitForWorld(page, scene => !scene.cameras.main.fadeEffect.isRunning && !scene.transitioning);
}

try {
  const packageUrl = process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href
    : new URL('../../outputs/browser-deps/node_modules/playwright/index.mjs', import.meta.url).href;
  let playwright;
  try { playwright = await import('playwright'); }
  catch { playwright = await import(packageUrl); }
  server = await createServer({
    root, configFile: false, base: '/', clearScreen: false, cacheDir: path.join(root, 'outputs', 'browser-vite-cache'),
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/outputs/**'] } },
    optimizeDeps: { entries: ['tests/browser/index.html'], include: ['phaser'] },
  });
  await server.listen();
  baseUrl = `${server.resolvedUrls.local[0]}tests/browser/index.html`;
  report.url = baseUrl;
  browser = await playwright.chromium.launch({
    executablePath: chromePath, headless: process.env.HEADED !== '1',
    args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  report.browserVersion = browser.version();

  await runCase('intro', async () => {
    const { context, page, errors } = await openCase(resumeFixture(), 'fresh', { touch: true });
    try {
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE.claimed), null);
      const voice = page.getByRole('button', { name: /中文[語语]音/ });
      let voiceResult = 'unavailable';
      if (await voice.count() && await voice.isEnabled()) {
        await voice.tap();
        assert.equal(await voice.getAttribute('aria-pressed'), 'true');
        await voice.tap();
        assert.equal(await voice.getAttribute('aria-pressed'), 'false');
        voiceResult = 'on/off toggled via real touch; audible output is not asserted';
      }
      await page.screenshot({ path: path.join(output, 'intro.png'), fullPage: true });
      await page.getByRole('button', { name: /跳[過过]序幕/ }).tap();
      await waitForScene(page, 'world');
      assert.equal(await page.getByRole('button', { name: /跳[過过]序幕/ }).count(), 0);
      assert.deepEqual(errors, []);
      return { voice: voiceResult, verified: ['dirty save reset', 'touch voice on/off', 'touch intro skip', 'intro controls cleaned up'] };
    } finally { await saveSnapshot(page, 'intro-last-state').catch(() => {}); await context.close(); }
  });

  // Independent of intro shutdown: a regression there must not hide tutorial failures.
  await runCase('fresh', async () => {
    const { context, page, errors } = await openCase(freshFixture(), 'resume', { touch: true });
    try {
      await settled(page);
      const before = await inspectScene(page);
      assert.equal(before.chapter, 1);
      assert.equal(before.companionUnlocked, false);
      assert.equal(before.companions.xiezhi, null);
      assert.equal(before.companions.baize, null);
      assert.equal(before.companions.pixiu, null);
      assert.deepEqual(before.companions.late, []);
      assert.ok(Object.values(before.tutorial).every(value => value === false));
      await pressGameplayKey(page, 'd', scene => scene.tutorial.moved);
      // Regression: production must preserve an edge even when keyup precedes update.
      await page.keyboard.press('m');
      await waitForWorld(page, scene => Boolean(scene.mapLayerUi));
      await clickCanvasText(page, /按 M 或 Esc [關关][閉闭]/, { touch: true });
      await waitForWorld(page, scene => !scene.mapLayerUi);
      await page.keyboard.press('l');
      await waitForWorld(page, scene => Boolean(scene.notebookLayer));
      await clickCanvasText(page, /[關关][閉闭][記记][錄录][簿本]/, { touch: true });
      await waitForWorld(page, scene => !scene.notebookLayer);
      await saveSnapshot(page, 'fresh-world');
      assert.deepEqual(errors, []);
      return { verified: ['tutorial without pets', 'keyboard movement', 'fast map keypress retained', 'canvas map close', 'fast notebook keypress retained', 'canvas notebook close'] };
    } finally { await saveSnapshot(page, 'fresh-last-state').catch(() => {}); await context.close(); }
  });

  await runCase('resume', async () => {
    const { context, page, errors } = await openCase(resumeFixture());
    try {
      await settled(page);
      const scene = await inspectScene(page);
      assert.equal(scene.chapter, 2);
      assert.equal(scene.area, 'hq');
      assert.ok(Math.abs(scene.player.x - 1190) < 1 && Math.abs(scene.player.y - 1120) < 1);
      assert.equal(scene.companionUnlocked, true);
      assert.ok(scene.companions.xiezhi);
      assert.equal(scene.progress.xiezhi.fed, 2);
      await saveSnapshot(page, 'resume-world');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#sandbox-resume').click();
      await waitForScene(page, 'world');
      assert.equal((await inspectScene(page)).chapter, 2);
      assert.deepEqual(errors, []);
      return { verified: ['chapter', 'HQ checkpoint position', 'owned companion', 'reload retains save'] };
    } finally { await saveSnapshot(page, 'resume-last-state').catch(() => {}); await context.close(); }
  });

  await runCase('feeding', async () => {
    const { context, page, errors } = await openCase(resumeFixture(), 'resume', { touch: true });
    try {
      await settled(page);
      const pet = (await inspectScene(page)).companions.xiezhi;
      await clickWorldPoint(page, pet.x, pet.y - 45, { touch: true });
      await waitForWorld(page, scene => Boolean(scene.companionLayer));
      await clickCanvasText(page, /投[餵喂]零食/, { touch: true });
      await waitForWorld(page, scene => scene.spiritProgress.xiezhi.fed === 3 && scene.spiritProgress.xiezhi.snacks === 1);
      assert.equal((await inspectScene(page)).panel, 'feed');
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE.species);
      assert.equal(saved.xiezhi.fed, 3);
      assert.equal(saved.xiezhi.snacks, 1);
      await saveSnapshot(page, 'feeding-growth');
      await clickCanvasText(page, /回到街[區区]/, { touch: true });
      await waitForWorld(page, scene => !scene.companionLayer);
      assert.deepEqual(errors, []);
      return { verified: ['touch pet opens feed interface', 'real feed button', 'food decreases', 'growth threshold 2→3', 'saved feeding result', 'close feed interface'] };
    } finally { await saveSnapshot(page, 'feeding-last-state').catch(() => {}); await context.close(); }
  });

  await runCase('cooldown', async () => {
    // Discover the seeded real layout, then create a localStorage checkpoint at a legal fruit tile.
    const discovery = await openCase(freshFixture());
    let fruit;
    try {
      fruit = (await inspectScene(discovery.page)).fruitLayout?.find(item => item.region === 'hq' && item.spiritId === 'xiezhi');
      assert.ok(fruit, 'Expected a seeded HQ xiezhi fruit in actual WorldScene');
    } finally { await discovery.context.close(); }
    const fixture = freshFixture();
    fixture[SAVE.checkpoint] = JSON.stringify({ area: fruit.region, position: { x: fruit.x, y: fruit.y }, tutorial: {}, visitedAreas: ['hq'] });
    const { context, page, errors } = await openCase(fixture);
    try {
      await settled(page);
      await clickWorldPoint(page, fruit.x, fruit.y - 18);
      await waitForWorld(page, scene => scene.companionPanelMode === 'quiz' && Boolean(scene.companionLayer));
      await clickQuizAnswer(page, { correct: false });
      await waitForWorld(page, scene => scene.companionPanelMode === 'result' && scene.quizRetryAt > Date.now());
      const deadline = (await inspectScene(page)).quizRetryAt;
      assert.equal(await page.evaluate(key => Number(localStorage.getItem(key)), SAVE.cooldown), deadline);
      await clickCanvasText(page, '再想想');
      assert.equal((await inspectScene(page)).panel, 'result', 'Early retry must stay blocked');
      await saveSnapshot(page, 'quiz-cooldown');
      // Advance Date only; Phaser RAF/tweens remain real. No 30-second sleep.
      await page.clock.setFixedTime(new Date(deadline + 1));
      await clickCanvasText(page, '再想想');
      await waitForWorld(page, scene => scene.companionPanelMode === 'quiz');
      await clickQuizAnswer(page, { correct: true });
      await waitForWorld(page, scene => scene.spiritProgress.xiezhi.snacks === 1);
      assert.equal((await inspectScene(page)).companionUnlocked, false);
      await saveSnapshot(page, 'quiz-retry-success');
      assert.deepEqual(errors, []);
      return { verified: ['fruit opened by canvas click', 'wrong answer', '30-second cooldown persisted', 'early retry blocked', 'Date-only clock expiry', 'correct retry awards fruit without pet'] };
    } finally { await saveSnapshot(page, 'cooldown-last-state').catch(() => {}); await context.close(); }
  });
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
