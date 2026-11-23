/** Real canvas pixels, including the canvas's CSS scale and letterboxing offset. */
export function canvasClientPoint(bounds, x, y) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('Canvas has no visible bounds');
  if (x < 0 || x > 1600 || y < 0 || y > 900) throw new Error(`Game point is outside 1600x900: ${x},${y}`);
  return { x: bounds.x + x * bounds.width / 1600, y: bounds.y + y * bounds.height / 900 };
}

export function cameraPoint(matrix, x, y) {
  return { x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f };
}

/** Seed only a new isolated context, once per origin. Reloads preserve the real save. */
export async function setupFixture(context, values) {
  await context.addInitScript(save => {
    if (!/^https?:$/.test(location.protocol)) return;
    if (sessionStorage.getItem('sandbox-fixture-seeded')) return;
    localStorage.clear();
    for (const [key, value] of Object.entries(save)) localStorage.setItem(key, String(value));
    sessionStorage.setItem('sandbox-fixture-seeded', 'true');
  }, values);
}

export async function clickCanvas(page, x, y, { touch = false } = {}) {
  const canvas = page.locator('#sandbox-stage canvas');
  await canvas.waitFor({ state: 'visible' });
  const point = canvasClientPoint(await canvas.boundingBox(), x, y);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

/** Read-only inspection of real scene fields; never calls gameplay methods. */
export async function inspectScene(page, key = 'world') {
  return page.evaluate(sceneKey => {
    const game = window.sandboxGame;
    const scene = game?.scene.keys[sceneKey];
    if (!scene) return null;
    const sprite = item => item ? { x: item.x, y: item.y, visible: item.visible, texture: item.texture?.key } : null;
    return {
      active: game.scene.isActive(sceneKey), key: sceneKey,
      chapter: scene.chapter, area: scene.area, index: scene.index,
      player: sprite(scene.player), tutorial: scene.tutorial,
      companionUnlocked: scene.companionUnlocked,
      companions: {
        xiezhi: sprite(scene.companion), baize: sprite(scene.baizeFollower), pixiu: sprite(scene.pixiuFollower),
        late: [...(scene.lateFollowers?.keys() ?? [])],
      },
      selectedSpirit: scene.selectedSpirit, progress: scene.spiritProgress,
      panel: scene.companionLayer ? scene.companionPanelMode : null,
      quizRetryAt: scene.quizRetryAt, correctFirst: scene.correctFirst,
      activeSnackId: scene.activeSnackId,
      fruitLayout: scene.fruitLayout,
      panels: { chapter: Boolean(scene.chapterLayer), map: Boolean(scene.mapLayerUi), notebook: Boolean(scene.notebookLayer), dialogue: Boolean(scene.dialogueLayer) },
      camera: scene.cameras?.main ? { scrollX: scene.cameras.main.scrollX, scrollY: scene.cameras.main.scrollY, zoom: scene.cameras.main.zoom } : null,
    };
  }, key);
}

/** Includes nested Phaser Text objects; ignores invisible/destroyed ancestors. */
export async function collectUiText(page, key = 'world') {
  return page.evaluate(sceneKey => {
    const scene = window.sandboxGame?.scene.keys[sceneKey];
    const found = [];
    const visit = object => {
      if (!object || object.visible === false || object.active === false) return;
      if (typeof object.text === 'string' && object.text) {
        const matrix = object.getWorldTransformMatrix();
        const camera = scene.cameras.main;
        let factorX = object.scrollFactorX;
        let factorY = object.scrollFactorY;
        let companionPanel = false;
        for (let parent = object.parentContainer; parent; parent = parent.parentContainer) {
          if (parent === scene.companionLayer) companionPanel = true;
          factorX *= parent.scrollFactorX;
          factorY *= parent.scrollFactorY;
        }
        const view = camera.matrixCombined;
        const x = matrix.tx + camera.scrollX * (1 - factorX);
        const y = matrix.ty + camera.scrollY * (1 - factorY);
        found.push({ text: object.text, scope: companionPanel ? 'companion' : 'scene',
          x: view.a * x + view.c * y + view.e,
          y: view.b * x + view.d * y + view.f });
      }
      if (Array.isArray(object.list)) object.list.forEach(visit);
    };
    scene?.children?.list?.forEach(visit);
    return found;
  }, key);
}

/** Read the randomized answer ordering; click the displayed labels, not fixed button slots. */
export async function clickQuizAnswer(page, { correct, touch = false }) {
  const scene = await inspectScene(page);
  if (scene.panel !== 'quiz') throw new Error('Expected an open quiz');
  const options = (await collectUiText(page))
    .filter(item => item.scope === 'companion' && item.y >= 600 && item.y <= 780)
    .sort((first, second) => first.y - second.y || first.x - second.x);
  if (options.length !== 2) throw new Error(`Expected two rendered quiz choices, got ${JSON.stringify(options)}`);
  const index = scene.correctFirst === correct ? 0 : 1;
  await clickCanvas(page, options[index].x, options[index].y, { touch });
}

export async function clickCanvasText(page, pattern, options = {}) {
  const text = await collectUiText(page, options.scene ?? 'world');
  const matches = text.filter(item => typeof pattern === 'string' ? item.text === pattern : pattern.test(item.text));
  if (matches.length !== 1) throw new Error(`Expected one canvas label ${pattern}, found ${matches.length}: ${text.map(item => item.text).join(' | ')}`);
  await clickCanvas(page, matches[0].x, matches[0].y, options);
}

export async function clickWorldPoint(page, x, y, options = {}) {
  const matrix = await page.evaluate(() => {
    const camera = window.sandboxGame.scene.keys.world.cameras.main;
    const { a, b, c, d, e, f } = camera.matrixCombined;
    return { a, b, c, d, e, f };
  });
  const point = cameraPoint(matrix, x, y);
  await clickCanvas(page, point.x, point.y, options);
}

export async function waitForScene(page, key, timeout = 45000) {
  await page.waitForFunction(sceneKey => {
    if (document.body.dataset.sandbox === 'error') throw new Error(document.querySelector('#error')?.textContent ?? 'Sandbox runtime error');
    const scene = window.sandboxGame?.scene.keys[sceneKey];
    return window.sandboxGame?.scene.isActive(sceneKey) && (sceneKey !== 'world' || scene.checkpointReady);
  }, key, { timeout });
}

export async function waitForWorld(page, predicate, timeout = 10000) {
  // Callers pass a browser predicate over the scene; only read from it.
  await page.waitForFunction(({ source }) => {
    if (document.body.dataset.sandbox === 'error') throw new Error(document.querySelector('#error')?.textContent ?? 'Sandbox runtime error');
    const scene = window.sandboxGame?.scene.keys.world;
    return scene && (0, eval)(`(${source})`)(scene);
  }, { source: predicate.toString() }, { timeout });
}

/** Phaser polls JustDown during update; an immediate keyup can erase the input first. */
export async function pressGameplayKey(page, key, predicate, timeout = 10000) {
  await page.keyboard.down(key);
  try { await waitForWorld(page, predicate, timeout); }
  finally { await page.keyboard.up(key); }
}
