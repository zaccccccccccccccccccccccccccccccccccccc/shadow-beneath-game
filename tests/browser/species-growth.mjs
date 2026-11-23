import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { SAVE, freshFixture } from './fixtures.mjs';
import {
  setupFixture, waitForScene, collectUiText, clickCanvasText, clickWorldPoint,
  clickQuizAnswer, pressGameplayKey,
} from './helpers.mjs';

// Generated earned-campaign fixture, NOT a full UI campaign playthrough. All fruit and
// feeding rewards below are earned through real UI. Only checkpoint coordinates are
// repositioned between pickup cases; no scene methods or production hooks are invoked.
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'outputs', 'species-growth');
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const selected = (process.env.SPECIES_CASES || 'xiezhi,baize,pixiu,qilin,xuanwu,qinglong').split(',');
const report = {
  startedAt: new Date().toISOString(), command: 'node tests/browser/species-growth.mjs',
  chromePath, fixtureKind: 'generated completed-and-rewarded acts 1–6; initially zero fruit/fed for every species',
  setupPolicy: 'Pure data imported through Vite before game bootstrap. Legal checkpoint fixtures between pickups and animation cases; all fruit and feeding earned through canvas UI. sandboxGame inspected read-only.',
  results: [],
};
await mkdir(output, { recursive: true });
let browser;
let server;
let model;
let baseUrl;

async function persist() {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}

async function read(page) {
  return page.evaluate(() => {
    const scene = window.sandboxGame.scene.keys.world;
    const sprite = pet => pet ? {
      x: pet.x, y: pet.y, texture: pet.texture.key, frame: Number(pet.frame.name),
      width: pet.displayWidth, height: pet.displayHeight, visible: pet.visible, alpha: pet.alpha,
    } : null;
    const pets = {
      xiezhi: sprite(scene.companion), baize: sprite(scene.baizeFollower), pixiu: sprite(scene.pixiuFollower),
      ...Object.fromEntries([...scene.lateFollowers].map(([id, pet]) => [id, sprite(pet)])),
    };
    const progress = structuredClone(scene.spiritProgress);
    const claimed = new Set(Object.values(progress).flatMap(item => item.claimedSnackIds));
    return {
      chapter: scene.chapter, area: scene.area, player: { x: scene.player.x, y: scene.player.y },
      selected: scene.selectedSpirit, panel: scene.companionLayer ? scene.companionPanelMode : null,
      roster: scene.companionRosterOpen, questionIndex: scene.activeQuestionIndex,
      activeSnackId: scene.activeSnackId, walking: scene.walking,
      pets, progress, ground: scene.fruitLayout.filter(fruit => !claimed.has(fruit.id)).map(fruit => fruit.id).sort(),
      markers: [...scene.snackMarkers.keys()].sort(),
      storedProgress: JSON.parse(localStorage.getItem('under-shadow-species-fruits-v1')),
    };
  });
}

async function snapshot(page, folder, label) {
  await page.waitForFunction(() => {
    const s = window.sandboxGame.scene.keys.world;
    return !s.companionLayer || s.companionLayer.alpha >= .99;
  });
  const filename = path.join(folder, label);
  await page.screenshot({ path: filename + '.png', fullPage: true });
  await writeFile(filename + '.json', JSON.stringify({ state: await read(page), ui: await collectUiText(page) }, null, 2));
}

async function boot(page) {
  await page.waitForFunction(() => {
    if (document.body?.dataset.sandbox === 'error') throw new Error(document.querySelector('#error').textContent);
    return document.body?.dataset.sandbox === 'ready';
  }, null, { timeout: 45000 });
  await page.locator('#sandbox-resume').click();
  await waitForScene(page, 'world');
  await page.waitForFunction(() => window.sandboxGame.scene.keys.world.chapter === 6);
  // Restoring a fully finished chapter intentionally opens its reward and finale sheets.
  await page.waitForFunction(() => Boolean(window.sandboxGame.scene.keys.world.chapterLayer));
  await clickCanvasText(page, '六靈集結 · 開啟終局檔案');
  await clickCanvasText(page, '回到街區 · 繼續培育六靈');
  await page.waitForFunction(() => {
    const s = window.sandboxGame.scene.keys.world;
    return !s.chapterLayer && !s.transitioning && !s.cameras.main.fadeEffect.isRunning;
  });
  await page.evaluate(() => document.fonts.ready);
  const state = await read(page);
  assert.equal(state.chapter, 6);
  for (const spirit of model.spirits) assert.ok(state.pets[spirit.id], `${spirit.id} is actually present after fixture restoration`);
}

function checkpoint(area, point) {
  return {
    area, position: { x: point.x, y: point.y }, tutorial: model.tutorial,
    clues: model.clues, visited: model.visited, visitedAreas: model.regions, helpUses: 1,
  };
}

async function relocateFixture(page, area, point, entry) {
  entry.checkpointSetups.push({ area, x: point.x, y: point.y, kind: 'explicit legal test checkpoint; not UI travel' });
  const value = checkpoint(area, point);
  // Reload in the same browser task as the storage update, before the running scene can
  // autosave over the setup checkpoint. Species inventory is never patched or reseeded.
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'commit' }),
    page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); location.reload(); }, { key: SAVE.checkpoint, value }),
  ]);
  await boot(page);
  const state = await read(page);
  assert.equal(state.area, area);
  assert.ok(Math.hypot(state.player.x - point.x, state.player.y - point.y) < 1, 'legal checkpoint restored without fallback spawn');
}

async function openSpecies(page, spirit) {
  await pressGameplayKey(page, 'p', s => s.companionRosterOpen);
  const labels = await collectUiText(page);
  for (const item of model.spirits) assert.ok(labels.some(label => label.text === item.name.hant), `roster shows ${item.id}`);
  await clickCanvasText(page, spirit.name.hant);
  const state = await read(page);
  assert.equal(state.selected, spirit.id);
  assert.equal(state.panel, 'intro');
}

function expectOtherSpecies(before, after, id) {
  for (const spirit of model.spirits) if (spirit.id !== id) assert.deepEqual(after[spirit.id], before[spirit.id], `${id} must not change ${spirit.id}`);
}

async function expectGrowth(page, spirit, fed, folder) {
  const stage = fed === 3 ? 'growing' : 'guardian';
  const texture = spirit.id === 'xiezhi' ? `companion-${stage}` : `world-${spirit.id}-${stage}`;
  await page.waitForFunction(({ id, texture }) => {
    const s = window.sandboxGame.scene.keys.world;
    const p = id === 'xiezhi' ? s.companion : id === 'baize' ? s.baizeFollower : id === 'pixiu' ? s.pixiuFollower : s.lateFollowers.get(id);
    return p?.texture.key === texture;
  }, { id: spirit.id, texture });
  const state = await read(page);
  const pet = state.pets[spirit.id];
  const width = (fed === 3 ? 108 : 128) * (spirit.id === 'xiezhi' ? 1.25 : 1);
  assert.ok(Math.abs(pet.width - width) < .01, `${spirit.id} ${stage} width ${pet.width}, expected ${width}`);
  assert.ok(Math.abs(pet.height - width * 724 / 543) < .01, `${spirit.id} ${stage} height`);
  const form = spirit.forms.find(form => form.id === stage);
  assert.ok((await collectUiText(page)).some(item => item.text === form.hant), `${stage} form name visible in actual UI`);
  await snapshot(page, folder, `fed-${fed}-ui`);
  return { fed, stage, texture: pet.texture, width: pet.width, height: pet.height };
}

async function animation(page, spirit, fed, folder) {
  await clickCanvasText(page, '回到街區');
  await page.mouse.move(0, 0); // Real pointer leave clears pointer-facing aim.
  const start = await read(page);
  const moving = [];
  await page.keyboard.down('w');
  try {
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(80); // Observe real RAF; no accelerated game clock.
      const state = await read(page);
      moving.push({ player: state.player, walking: state.walking, pet: state.pets[spirit.id] });
      if (start.player.y - state.player.y >= 180 && new Set(moving.map(sample => sample.pet.frame)).size >= 2) break;
    }
  } finally { await page.keyboard.up('w'); }
  await page.waitForFunction(() => !window.sandboxGame.scene.keys.world.walking);
  const idle = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(80);
    const state = await read(page);
    idle.push({ player: state.player, walking: state.walking, pet: state.pets[spirit.id] });
  }
  const evidence = { fed, start, moving, idle };
  await writeFile(path.join(folder, `fed-${fed}-animation.json`), JSON.stringify(evidence, null, 2));
  assert.ok(start.player.y - moving.at(-1).player.y >= 180, 'observable real keyboard displacement reaches 180px on Y');
  assert.ok(moving.every(sample => Math.abs(sample.player.x - start.player.x) < .1), 'vertical-only input preserves player X');
  assert.ok(new Set(moving.filter(sample => sample.walking).map(sample => sample.pet.frame)).size >= 2, `${spirit.id} walk sheet actually changes frames during Y movement`);
  assert.ok(moving.every(sample => sample.pet.frame >= 0 && sample.pet.frame <= 3), 'side-facing sheet uses frames 0–3, without pretending to have front/back rows');
  assert.ok(idle.every(sample => !sample.walking && sample.pet.frame === 0), `${spirit.id} legs stop at idle frame 0`);
  await snapshot(page, folder, `fed-${fed}-idle`);
  return { fed, movingFrames: [...new Set(moving.map(sample => sample.pet.frame))], idleFrames: [...new Set(idle.map(sample => sample.pet.frame))], yDisplacement: start.player.y - moving.at(-1).player.y };
}

async function speciesCase(spirit) {
  const entry = { id: spirit.id, status: 'running', pickups: [], growth: [], animations: [], checkpointSetups: [], errors: [] };
  report.results.push(entry);
  const folder = path.join(output, spirit.id);
  await mkdir(folder, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'zh-TW' });
  await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
  const fruits = model.layout.filter(fruit => fruit.spiritId === spirit.id);
  assert.equal(fruits.length, 6);
  const fixture = { ...model.storage, [SAVE.checkpoint]: JSON.stringify(checkpoint(fruits[0].region, fruits[0])) };
  await writeFile(path.join(folder, 'generated-initial-fixture.json'), JSON.stringify({ kind: report.fixtureKind, storage: fixture }, null, 2));
  await setupFixture(context, fixture);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => entry.errors.push(String(error.stack || error)));
  page.on('console', message => { if (message.type() === 'error') entry.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) entry.errors.push(`HTTP ${response.status()} ${response.url()}`); });
  try {
    await page.goto(baseUrl, { waitUntil: 'commit' });
    await boot(page);
    const initial = await read(page);
    assert.equal(initial.ground.length, 36);
    for (const item of Object.values(initial.progress)) assert.deepEqual(item, { claimedSnackIds: [], snacks: 0, fed: 0 });
    for (const [index, fruit] of fruits.entries()) {
      if (index) await relocateFixture(page, fruit.region, fruit, entry);
      const before = await read(page);
      assert.ok(before.markers.includes(fruit.id), 'actual ground marker exists before pickup');
      // Six following pets overlap the fruit artwork at a same-tile checkpoint. The
      // lower part of the existing 66px pickup circle remains outside their hitboxes.
      await clickWorldPoint(page, fruit.x, fruit.y + 40);
      await page.waitForFunction(() => window.sandboxGame.scene.keys.world.companionPanelMode === 'quiz' && Boolean(window.sandboxGame.scene.keys.world.companionLayer));
      const quiz = await read(page);
      assert.equal(quiz.selected, spirit.id);
      assert.equal(quiz.activeSnackId, fruit.id);
      assert.equal(quiz.questionIndex, index);
      const ui = await collectUiText(page);
      const clean = text => text.replace(/\s/g, '');
      assert.ok(ui.some(item => clean(item.text).includes(clean(model.questions[spirit.id][index][0]))), `dedicated question ${index + 1} actually displayed`);
      if (!index) await snapshot(page, folder, 'first-dedicated-quiz');
      await clickQuizAnswer(page, { correct: true });
      await page.waitForFunction(({ id, snacks }) => window.sandboxGame.scene.keys.world.spiritProgress[id].snacks === snacks, { id: spirit.id, snacks: index + 1 });
      const after = await read(page);
      assert.deepEqual(before.ground.filter(id => !after.ground.includes(id)), [fruit.id], 'only answered fruit disappears globally');
      assert.deepEqual(after.ground, before.ground.filter(id => id !== fruit.id));
      assert.deepEqual(after.markers, before.markers.filter(id => id !== fruit.id), 'other current-area markers preserved');
      assert.deepEqual(after.progress[spirit.id], { claimedSnackIds: fruits.slice(0, index + 1).map(item => item.id), snacks: index + 1, fed: 0 });
      expectOtherSpecies(before.progress, after.progress, spirit.id);
      assert.deepEqual(after.storedProgress, after.progress, 'actual quiz rewards persisted');
      entry.pickups.push({ id: fruit.id, questionIndex: quiz.questionIndex, displayedQuestion: model.questions[spirit.id][index][0], snacks: after.progress[spirit.id].snacks, groundCount: after.ground.length });
      await clickCanvasText(page, '回到街區');
      console.log(`PASS ${spirit.id} dedicated fruit ${index + 1}/6`);
      await persist();
    }
    await relocateFixture(page, 'hq', { x: 1190, y: 1120 }, entry);
    await openSpecies(page, spirit);
    const beforeFeeding = await read(page);
    const young = beforeFeeding.pets[spirit.id];
    assert.equal(young.texture, spirit.id === 'xiezhi' ? 'xiezhi-sprites' : `world-${spirit.id}-young`);
    assert.ok(Math.abs(young.width - 88) < .01);
    entry.growth.push({ fed: 0, stage: 'young', texture: young.texture, width: young.width, height: young.height });
    for (let fed = 1; fed <= 6; fed++) {
      const before = await read(page);
      await clickCanvasText(page, before.panel === 'intro' ? '投餵零食' : '再餵一顆');
      await page.waitForFunction(({ id, fed }) => window.sandboxGame.scene.keys.world.spiritProgress[id].fed === fed, { id: spirit.id, fed });
      const after = await read(page);
      assert.equal(after.progress[spirit.id].snacks, 6 - fed);
      expectOtherSpecies(before.progress, after.progress, spirit.id);
      assert.deepEqual(after.ground, beforeFeeding.ground, 'feeding never removes other ground fruit');
      assert.deepEqual(after.storedProgress, after.progress);
      if (fed === 3 || fed === 6) {
        entry.growth.push(await expectGrowth(page, spirit, fed, folder));
        entry.animations.push(await animation(page, spirit, fed, folder));
        if (fed === 3) await openSpecies(page, spirit);
      }
    }
    await relocateFixture(page, 'hq', { x: 1190, y: 1120 }, entry);
    const restored = await read(page);
    assert.deepEqual(restored.progress[spirit.id], { claimedSnackIds: fruits.map(item => item.id), snacks: 0, fed: 6 });
    expectOtherSpecies(initial.progress, restored.progress, spirit.id);
    entry.finalState = restored;
    await snapshot(page, folder, 'guardian-restored');
    await writeFile(path.join(folder, 'actual-ui-earned-storage.json'), JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), null, 2));
    assert.deepEqual(entry.errors, [], 'no browser/runtime/asset errors');
    entry.status = 'passed';
    console.log(`PASS ${spirit.id}: 6 quizzes, 6 feeds, growing/guardian textures+size, Y gait+idle, reload`);
  } catch (error) {
    entry.status = 'failed';
    entry.error = String(error.stack || error);
    process.exitCode = 1;
    console.error(`FAIL ${spirit.id}: ${error.message}`);
    await snapshot(page, folder, 'failure').catch(() => {});
    await writeFile(path.join(folder, 'failure.html'), await page.content()).catch(() => {});
  } finally {
    await persist();
    await context.close();
  }
}

try {
  const moduleUrl = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href
    : new URL('../../outputs/browser-deps/node_modules/playwright/index.mjs', import.meta.url).href;
  const { chromium } = await import(moduleUrl);
  server = await createServer({
    root, configFile: false, base: '/', clearScreen: false, cacheDir: path.join(output, `vite-cache-${Date.now()}`),
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/outputs/**'] } },
    optimizeDeps: { entries: ['tests/browser/index.html'], include: ['phaser'] },
  });
  await server.listen();
  baseUrl = `${server.resolvedUrls.local[0]}tests/browser/index.html`;
  report.url = baseUrl;
  const preflight = await fetch(baseUrl, { signal: AbortSignal.timeout(50000) });
  assert.equal(preflight.status, 200, 'own loopback Vite harness responds before Chrome navigation');
  await preflight.text();
  browser = await chromium.launch({ executablePath: chromePath, headless: process.env.HEADED !== '1',
    args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browserVersion = browser.version();
  console.log(`Chrome ${report.browserVersion}; generated-fixture discovery at ${baseUrl}`);
  const discovery = await browser.newPage();
  await discovery.goto(baseUrl, { waitUntil: 'commit', timeout: 60000 });
  model = await discovery.evaluate(async () => {
    const [{ spirits }, { lateActs }, { thirdActSteps }, second, world, geometry, fruits, quiz] = await Promise.all([
      import('/src/game/spirits.ts'), import('/src/game/late-acts.ts'), import('/src/game/act-three.ts'),
      import('/src/game/act-two.ts'), import('/src/game/world-data.ts'), import('/src/game/world-geometry.ts'),
      import('/src/game/fruit-world.ts'), import('/src/game/chapter-fruits.ts'),
    ]);
    const seed = 20261123;
    const layout = fruits.createWorldFruitLayout(seed);
    for (const fruit of layout) if (!geometry.canOccupyWorldPosition(fruit.x, fruit.y, world.districtMaps[fruit.region].blockers, world.DISTRICT_WIDTH, world.DISTRICT_HEIGHT)) throw new Error(`Illegal fixture fruit ${fruit.id}`);
    let actTwo = second.createActTwoState();
    for (let step; (step = second.getActTwoNextStep(actTwo));) actTwo = second.completeActTwoStep(actTwo, step);
    actTwo = second.claimActTwoReward(actTwo);
    const late = Object.fromEntries([4, 5, 6].map(act => [act, {
      completed: lateActs[act].steps.map(step => step.id),
      evidence: Object.fromEntries(lateActs[act].steps.map(step => [step.id, step.choices[0].evidence])), rewardClaimed: true,
    }]));
    return {
      spirits, layout, questions: quiz.spiritQuestions,
      tutorial: Object.fromEntries(['moved', 'mentor', 'supervisor', 'file', 'notebook', 'map', 'helpUsed', 'oldTown', 'informant'].map(key => [key, true])),
      clues: [...new Set(world.worldInteractions.flatMap(npc => npc.choices.flatMap(choice => choice.clue ? [choice.clue] : [])))],
      visited: world.worldInteractions.map(npc => npc.id), regions: Object.keys(world.districtMaps),
      storage: {
        'under-shadow-current-chapter': '6', 'under-shadow-xiezhi-chapter1-claimed-v2': 'true',
        'under-shadow-act-two-v1': JSON.stringify(actTwo),
        'under-shadow-act-three-v1': JSON.stringify({ completed: thirdActSteps.map(step => step.id), rewardClaimed: true }),
        'under-shadow-late-acts-v1': JSON.stringify(late),
        'under-shadow-species-fruits-v1': JSON.stringify(Object.fromEntries(spirits.map(spirit => [spirit.id, { claimedSnackIds: [], snacks: 0, fed: 0 }]))),
        'under-shadow-xiezhi-v3': JSON.stringify({ claimedSnackIds: [], snacks: 0, fed: 0 }),
        'under-shadow-fruit-layout-seed-v1': String(seed),
      },
    };
  });
  model.storage = { ...freshFixture(), ...model.storage };
  await writeFile(path.join(output, 'discovered-data.json'), JSON.stringify(model, null, 2));
  await discovery.close();
  for (const id of selected) {
    const spirit = model.spirits.find(spirit => spirit.id === id);
    assert.ok(spirit, `Unknown SPECIES_CASES entry: ${id}`);
    await speciesCase(spirit);
  }
} catch (error) {
  report.fatalError = String(error.stack || error);
  process.exitCode = 1;
  console.error(report.fatalError);
} finally {
  report.finishedAt = new Date().toISOString();
  await persist();
  await browser?.close();
  await server?.close();
}
