import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeFixture, freshFixture, cooldownFixture } from './fixtures.mjs';
import { canvasClientPoint, cameraPoint, pressGameplayKey } from './helpers.mjs';

test('canvas mapping accounts for letterboxing and CSS scaling', () => {
  assert.deepEqual(canvasClientPoint({ x: 20, y: 80, width: 800, height: 450 }, 800, 450), { x: 420, y: 305 });
  assert.throws(() => canvasClientPoint({ x: 0, y: 0, width: 0, height: 0 }, 1, 1));
});

test('Phaser 4 camera projection applies scroll already contained in its view matrix exactly once', () => {
  assert.deepEqual(cameraPoint({ a: 1, b: 0, c: 0, d: 1, e: -390, f: -670 }, 1135, 1087), { x: 745, y: 417 });
});

test('resume fixture is a serializable chapter-two checkpoint with owned food', () => {
  const save = resumeFixture();
  assert.equal(save['under-shadow-current-chapter'], '2');
  assert.equal(save['under-shadow-xiezhi-chapter1-claimed-v2'], 'true');
  assert.equal(JSON.parse(save['under-shadow-world-checkpoint-v1']).area, 'hq');
  assert.deepEqual(JSON.parse(save['under-shadow-xiezhi-v3']), { claimedSnackIds: [], snacks: 2, fed: 2 });
  assert.equal(freshFixture()['under-shadow-current-chapter'], undefined);
});

test('fixtures do not share mutable progress and cooldown uses the requested clock', () => {
  const first = resumeFixture();
  first['under-shadow-current-chapter'] = '6';
  assert.equal(resumeFixture()['under-shadow-current-chapter'], '2');
  assert.equal(cooldownFixture(1000)['under-shadow-quiz-retry-at-v1'], '31000');
});

test('gameplay hotkeys remain down until the frame-observed state change', async () => {
  const events = [];
  let observed;
  const pending = new Promise(resolve => { observed = resolve; });
  const page = {
    keyboard: { down: async key => { events.push(`down:${key}`); }, up: async key => { events.push(`up:${key}`); } },
    waitForFunction: () => pending,
  };
  const pressing = pressGameplayKey(page, 'm', scene => Boolean(scene.mapLayerUi));
  await Promise.resolve();
  assert.deepEqual(events, ['down:m']);
  observed();
  await pressing;
  assert.deepEqual(events, ['down:m', 'up:m']);
});

test('a failed gameplay hotkey wait always releases the held key', async () => {
  const events = [];
  const page = {
    keyboard: { down: async key => { events.push(`down:${key}`); }, up: async key => { events.push(`up:${key}`); } },
    waitForFunction: async () => { throw new Error('state timeout'); },
  };
  await assert.rejects(pressGameplayKey(page, 'l', scene => Boolean(scene.notebookLayer)), /state timeout/);
  assert.deepEqual(events, ['down:l', 'up:l']);
});
