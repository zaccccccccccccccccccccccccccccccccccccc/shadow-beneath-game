import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpiritId } from '../src/game/spirits';
import type { PlayerFacing } from '../src/game/player-animation';
import { getCompanionGrowthStage } from '../src/game/companion';
import { getSpiritVerticalRuntimeModel } from '../src/game/spirit-vertical-metrics';

const art = vi.hoisted(() => ({
  load: vi.fn<(scene: unknown) => void>(), prepare: vi.fn(),
  apply: vi.fn<(sprite: unknown, id: SpiritId, fed: number, facing: PlayerFacing, moving: boolean, distance: number) => void>(),
  track: vi.fn(), failed: vi.fn(() => false),
}));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../src/game/spirit-art', () => ({ loadSpiritDirections: art.load, prepareSpiritDirections: art.prepare, applySpiritDirection: art.apply }));
vi.mock('../src/game/scene-loading', () => ({ trackSceneLoading: art.track, sceneAssetsFailed: art.failed }));
vi.mock('../src/game/localization', () => ({
  getLocale: () => 'zh-Hant',
  localizedText: (scene: { add: { text: (...args: unknown[]) => unknown } }, ...args: unknown[]) => scene.add.text(...args),
}));
import { SpiritWalkLabScene } from '../src/game/SpiritWalkLabScene';

class Signals {
  listeners: Array<{ event: string; fn: (...args: any[]) => void; context?: unknown; once: boolean }> = [];
  on(event: string, fn: (...args: any[]) => void, context?: unknown) { this.listeners.push({ event, fn, context, once: false }); return this; }
  once(event: string, fn: (...args: any[]) => void, context?: unknown) { this.listeners.push({ event, fn, context, once: true }); return this; }
  off(event: string, fn: (...args: any[]) => void, context?: unknown) { this.listeners = this.listeners.filter(l => l.event !== event || l.fn !== fn || l.context !== context); return this; }
  emit(event: string, ...args: unknown[]) { for (const l of [...this.listeners]) if (l.event === event) { if (l.once) this.off(event, l.fn, l.context); l.fn.apply(l.context, args); } }
  addCapture = vi.fn();
}

class Display extends Signals {
  x: number; y: number; width: number; height: number;
  scaleX = 1; scaleY = 1; originX = .5; originY = .5;
  text = ''; destroyed = false; interactive = false; children: Display[] = [];
  constructor(readonly kind: string, x: number, y: number, width = 1, height = 1) { super(); this.x = x; this.y = y; this.width = width; this.height = height; }
  setOrigin(x: number, y = x) { this.originX = x; this.originY = y; return this; }
  setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setText(text: string) { this.text = text; return this; }
  setDepth() { return this; } setAngle() { return this; } setStrokeStyle() { return this; }
  setInteractive() { this.interactive = true; return this; }
  lineStyle() { return this; } lineBetween() { return this; }
  add(children: Display[]) { this.children.push(...children); return this; }
  removeAll(destroy: boolean) { if (destroy) this.children.forEach(c => c.destroyed = true); this.children = []; return this; }
  bounds() { const width = this.width * this.scaleX, height = this.height * this.scaleY; return { left: this.x - width * this.originX, top: this.y - height * this.originY, right: this.x + width * (1 - this.originX), bottom: this.y + height * (1 - this.originY), height }; }
}

function harness() {
  const scene = new SpiritWalkLabScene(), nodes: Display[] = [], keyboard = new Signals(), gameEvents = new Signals(), events = new Signals();
  const list = new Set<{ key: string }>();
  const make = (kind: string, x: number, y: number, w?: number, h?: number) => { const obj = new Display(kind, x, y, w, h); nodes.push(obj); return obj; };
  const load = { list, spritesheet: vi.fn((key: string) => list.add({ key })) };
  Object.assign(scene, {
    load, textures: { exists: vi.fn(() => false) }, input: { keyboard }, events,
    game: { events: gameEvents },
    add: {
      rectangle: (x: number, y: number, w: number, h: number) => make('rectangle', x, y, w, h),
      ellipse: (x: number, y: number, w: number, h: number) => make('ellipse', x, y, w, h),
      sprite: (x: number, y: number) => make('sprite', x, y),
      text: (x: number, y: number, text: string) => make('text', x, y).setText(text),
      graphics: () => make('graphics', 0, 0), container: () => make('container', 0, 0),
    },
  });
  const key = (key: string, repeat = false) => keyboard.emit('keydown', { key, repeat, preventDefault: vi.fn() });
  const click = (x: number) => {
    const box = [...nodes].reverse().find(n => n.kind === 'rectangle' && n.interactive && !n.destroyed && n.x === x);
    expect(box).toBeDefined(); box!.emit('pointerdown');
  };
  return { scene, nodes, keyboard, gameEvents, events, load, key, click, sprites: () => nodes.filter(n => n.kind === 'sprite') };
}

beforeEach(() => {
  vi.clearAllMocks(); art.failed.mockReturnValue(false); art.prepare.mockImplementation(() => undefined);
  vi.stubGlobal('document', { body: { dataset: { gameUi: 'loading' } } });
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), location: { reload: vi.fn() } });
  art.load.mockImplementation(scene => { const { load } = scene as { load: { list: Set<{ key: string }> } }; for (const stage of ['young', 'growing', 'guardian']) load.list.add({ key: `world-xiezhi-${stage}` }); });
  // Contract double uses measured source dimensions/origins for accepted species.
  // Until baize art is available, use xiezhi as a conservative geometry fixture;
  // the real shared preparation module is separately required to reject missing art.
  art.apply.mockImplementation((sprite, id, fed, facing, moving, distance) => {
    const display = sprite as Display, stage = getCompanionGrowthStage(fed);
    if (facing === 'left' || facing === 'right') {
      display.width = 543; display.height = 724; display.setOrigin(.5, 1).setScale(stage.size / 543);
    } else {
      const pose = !moving ? 'idle' : Math.floor(distance / 96) % 2 === 0 ? 'a' : 'b';
      const model = getSpiritVerticalRuntimeModel(id, stage.id, facing, pose, stage.size) ?? getSpiritVerticalRuntimeModel('xiezhi', stage.id, facing, pose, stage.size)!;
      display.width = model.sourceBBox.width; display.height = model.sourceBBox.height;
      display.setOrigin(model.originX, model.originY).setScale(model.scale);
    }
  });
});

describe('directional spirit walk lab scene', () => {
  it('loads all 18 approved sides under world keys, without requeueing shared xiezhi', () => {
    const h = harness(); h.scene.preload();
    expect(art.track).toHaveBeenCalledWith(h.scene); expect(art.load).toHaveBeenCalledWith(h.scene);
    expect(art.track.mock.invocationCallOrder[0]).toBeLessThan(art.load.mock.invocationCallOrder[0]);
    expect(h.load.spritesheet).toHaveBeenCalledTimes(15);
    expect(new Set([...h.load.list].map(f => f.key)).size).toBe(18);
    expect([...h.load.list].every(f => /^world-/.test(f.key))).toBe(true);
  });

  it('prepares frames first and reports ready only once after the first render', () => {
    const h = harness(); h.scene.create();
    expect(art.prepare.mock.invocationCallOrder[0]).toBeLessThan(art.apply.mock.invocationCallOrder[0]);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    h.gameEvents.emit('postrender'); h.gameEvents.emit('postrender');
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    const event = vi.mocked(window.dispatchEvent).mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('under-shadow-preview-ready'); expect(event.detail.scene).toBe('spirit-walk-lab');
    h.events.emit('shutdown'); art.apply.mockClear(); h.key('ArrowUp'); h.scene.update(0, 100);
    expect(art.apply).not.toHaveBeenCalled();
  });

  it('does not signal ready for failed downloads or missing decoded directional frames', () => {
    const a = harness(); art.failed.mockReturnValue(true); a.scene.create(); a.gameEvents.emit('postrender');
    expect(a.sprites()).toHaveLength(0); expect(window.dispatchEvent).not.toHaveBeenCalled();
    art.failed.mockReturnValue(false); art.prepare.mockImplementation(() => { throw new Error('Missing verified directional art: baize'); });
    const b = harness(); b.scene.create(); b.gameEvents.emit('postrender'); b.scene.update(0, 100);
    const events = vi.mocked(window.dispatchEvent).mock.calls.map(([event]) => event.type);
    expect(events).toEqual(['under-shadow-load-error']);
    expect(art.apply).not.toHaveBeenCalled();
  });

  it('reports manifest setup errors and cancels readiness when shut down before rendering', () => {
    art.load.mockImplementation(() => { throw new Error('baize asset not ready'); });
    const failed = harness(); failed.scene.preload(); failed.scene.create(); failed.gameEvents.emit('postrender');
    expect(vi.mocked(window.dispatchEvent).mock.calls.map(([event]) => event.type)).toEqual(['under-shadow-load-error']);
    expect(failed.sprites()).toHaveLength(0);
    vi.mocked(window.dispatchEvent).mockClear();
    const stopped = harness(); stopped.scene.create(); stopped.events.emit('shutdown'); stopped.gameEvents.emit('postrender');
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('maps arrows/WASD and pointer buttons to the shared four-direction interface', () => {
    const h = harness(); h.scene.create();
    for (const [key, facing] of [['ArrowUp', 'back'], ['ArrowDown', 'front'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['w', 'back'], ['s', 'front'], ['a', 'left'], ['d', 'right']]) {
      art.apply.mockClear(); h.key(key);
      expect(art.apply).toHaveBeenCalledTimes(6);
      expect(art.apply.mock.calls.every(c => c[3] === facing && c[5] === 0)).toBe(true);
    }
    for (const [x, facing] of [[510, 'back'], [610, 'front'], [710, 'left'], [810, 'right']] as const) {
      h.click(x); expect(art.apply.mock.lastCall?.[3]).toBe(facing);
    }
  });

  it('changes all six species through fed 0/3/6 and keeps guardian visibly larger', () => {
    const h = harness(); h.scene.create(); const heights: number[] = [];
    for (const [key, fed] of [['1', 0], ['2', 3], ['3', 6]] as const) {
      art.apply.mockClear(); h.key(key); expect(art.apply.mock.calls.every(c => c[2] === fed)).toBe(true);
      expect(art.apply.mock.calls).toHaveLength(6); heights.push(h.sprites()[0].bounds().height);
    }
    expect(heights[1]).toBeGreaterThan(heights[0]); expect(heights[2]).toBeGreaterThan(heights[1]);
  });

  it('freezes a walk pose on pause and steps through full vertical and side cycles', () => {
    const h = harness(); h.scene.create(); h.scene.update(0, 500); h.key(' ');
    expect(art.apply.mock.lastCall?.slice(4)).toEqual([true, 48]);
    art.apply.mockClear(); h.scene.update(0, 1000); expect(art.apply).not.toHaveBeenCalled();
    for (const [key, distance] of [[']', 96], [']', 0], ['[', 96]] as const) { h.key(key); expect(art.apply.mock.lastCall?.slice(4)).toEqual([true, distance]); }
    h.key('ArrowRight');
    for (const distance of [48, 96, 144, 0]) { h.key(']'); expect(art.apply.mock.lastCall?.[5]).toBe(distance); }
    h.click(1060); expect(art.apply.mock.lastCall?.[5]).toBe(144);
    h.click(1175); expect(art.apply.mock.lastCall?.[5]).toBe(0);
    h.key('i'); expect(art.apply.mock.lastCall?.slice(4)).toEqual([false, 0]);
    h.key(']'); expect(art.apply.mock.lastCall?.slice(4)).toEqual([true, 0]);
    h.key('i');
    h.key(' '); h.scene.update(0, 1000); expect(art.apply.mock.lastCall?.slice(4)).toEqual([true, 96]);
  });

  it('keeps all source bounds and feet below the header and inside 900px without squeezing', () => {
    const h = harness(); h.scene.create(); h.key('m');
    for (const stage of ['1', '2', '3']) for (const facing of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      h.key(stage); h.key(facing);
      for (let frame = 0; frame < 4; frame++) {
        h.key(']');
        for (const s of h.sprites()) {
          const b = s.bounds(); expect(b.top).toBeGreaterThanOrEqual(160); expect(b.bottom).toBeLessThan(900);
          expect(b.left).toBeGreaterThan(60); expect(b.right).toBeLessThan(1180);
          expect(s.scaleX).toBeCloseTo(s.scaleY, 12);
        }
      }
    }
    const labels = h.nodes.filter(n => n.kind === 'text' && n.x === 1180);
    expect(labels).toHaveLength(6); expect(labels.every(n => n.x > Math.max(...h.sprites().map(s => s.bounds().right)))).toBe(true);
  });

  it('keeps automatic movement bounded in the chosen direction and labels fixed on the right', () => {
    const h = harness(); h.scene.create();
    h.scene.update(0, 100); expect(h.sprites().every(s => s.x === 660)).toBe(true);
    h.key('m'); h.key('ArrowRight'); h.scene.update(0, 100); expect(h.sprites()[0].x).toBeGreaterThan(660);
    for (const facing of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      h.key(facing);
      for (const delta of [100, 1000, 7000, 1000000]) {
        h.scene.update(0, delta);
        h.sprites().forEach((s, lane) => { expect(s.x).toBeGreaterThanOrEqual(320); expect(s.x).toBeLessThanOrEqual(1000); expect(Math.abs(s.y - (278 + lane * 118))).toBeLessThanOrEqual(4); });
      }
    }
    expect(h.nodes.filter(n => n.kind === 'text' && n.text.includes('步態')).filter(n => n.x === 1180)).toHaveLength(6);
  });
});
