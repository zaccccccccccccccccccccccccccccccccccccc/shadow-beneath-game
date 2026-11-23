import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserPrologueSpeech, createProloguePlayback, prologueReadingMs, type PrologueSpeech } from '../src/game/prologue-voice';
import { IntroScene } from '../src/game/IntroScene';

// Only the rendering engine is replaced; exercise the actual scene's transition guards.
vi.mock('phaser', () => ({ default: {
  Scene: class {},
  Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: 'fadeout' } } },
} }));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function setup(speech?: PrologueSpeech) {
  vi.useFakeTimers();
  const advance = vi.fn();
  return { advance, playback: createProloguePlayback({ advance, speech }) };
}

describe('prologue playback', () => {
  it('ignores an end event following an error so the readable fallback is not cut short', () => {
    let end!: () => void;
    let error!: () => void;
    const { advance, playback } = setup({
      speak: (_text, done, fail) => { end = done; error = fail; }, cancel: () => {},
    });
    playback.play('字'.repeat(100), true);
    error();
    end();
    vi.advanceTimersByTime(4200);
    expect(advance).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it('gives long Chinese cards enough reading time without voice support', () => {
    const { advance, playback } = setup();
    playback.play('字'.repeat(100), true);
    vi.advanceTimersByTime(4200);
    expect(advance).not.toHaveBeenCalled();
    expect(prologueReadingMs('字'.repeat(100))).toBeGreaterThanOrEqual(30000);
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('waits for speech end beyond 4.2 seconds and ignores duplicate callbacks', () => {
    let end!: () => void;
    const speech: PrologueSpeech = { speak: (_text, done) => { end = done; }, cancel: vi.fn() };
    const { advance, playback } = setup(speech);
    playback.play('字'.repeat(100), true);
    vi.advanceTimersByTime(10000);
    expect(advance).not.toHaveBeenCalled();
    end();
    end();
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('advances when a gesture-blocked browser never emits speech events', () => {
    const { advance, playback } = setup({ speak: () => {}, cancel: () => {} });
    playback.play('開場', true);
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['error', 'throw'] as const)('keeps the text readable after speech %s', (failure) => {
    const { advance, playback } = setup({
      speak: (_text, _end, error) => { if (failure === 'throw') throw new Error('blocked'); error(); },
      cancel: () => {},
    });
    playback.play('字'.repeat(100), true);
    vi.advanceTimersByTime(4200);
    expect(advance).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('invalidates old speech and timers when changing cards or toggling voice', () => {
    const callbacks: (() => void)[] = [];
    const { advance, playback } = setup({ speak: (_text, end) => { callbacks.push(end); }, cancel: () => {} });
    playback.play('第一頁', true);
    playback.play('第二頁', false);
    callbacks[0]();
    expect(advance).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('cancels speech synchronously without allowing cancellation callbacks to advance', () => {
    let end = () => {};
    let cancelled = 0;
    const { advance, playback } = setup({
      speak: (_text, done) => { end = done; },
      cancel: () => { cancelled++; end(); },
    });
    playback.play('開場', true);
    playback.dispose();
    playback.dispose();
    playback.play('離開後', true);
    end();
    vi.runAllTimers();
    expect(cancelled).toBe(1);
    expect(advance).not.toHaveBeenCalled();
  });

  it('does not invoke speech until the player opts in', () => {
    const speak = vi.fn();
    const { playback, advance } = setup({ speak, cancel: () => {} });
    playback.play('開場', false);
    expect(speak).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(advance).toHaveBeenCalledTimes(1);
  });
});

describe('browser Chinese narration', () => {
  it('is optional on browsers without speech APIs', () => {
    vi.stubGlobal('window', {});
    expect(createBrowserPrologueSpeech()).toBeUndefined();
  });

  it('uses a Chinese voice loaded at speaking time and disconnects callbacks before cancel', () => {
    class Utterance {
      lang = ''; rate = 1; voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    let spoken!: Utterance;
    let voices: { lang: string }[] = [];
    vi.stubGlobal('window', {
      SpeechSynthesisUtterance: Utterance,
      speechSynthesis: {
        getVoices: () => voices,
        speak: (utterance: Utterance) => { spoken = utterance; },
        cancel: () => { spoken.onend?.(); },
      },
    });
    const speech = createBrowserPrologueSpeech()!;
    voices = [{ lang: 'en-US' }, { lang: 'zh-TW' }];
    const end = vi.fn();
    speech.speak('我們出發吧', end, () => {});
    expect(spoken.text).toBe('我們出發吧');
    expect(spoken.lang).toBe('zh-TW');
    expect(spoken.voice).toEqual({ lang: 'zh-TW' });
    speech.cancel();
    expect(end).not.toHaveBeenCalled();
    expect(spoken.onend).toBeNull();
  });
});

describe('intro skip and next lifecycle', () => {
  function sceneHarness() {
    const scene = new IntroScene() as unknown as {
      advance(): void; beginWorld(): void; showCard(): void;
      cardCopy(kind: 'Kicker' | 'Title' | 'Body'): string;
      playback: ReturnType<typeof createProloguePlayback>;
      index: number;
      tweens: { add(config: { onComplete(): void }): void; killAll(): void; killTweensOf(): void };
      time: { removeAllEvents(): void };
      cameras: { main: { fade: ReturnType<typeof vi.fn>; once: ReturnType<typeof vi.fn> } };
      scene: { start: ReturnType<typeof vi.fn> };
    };
    const fades: (() => void)[] = [];
    const cardTransitions: (() => void)[] = [];
    scene.tweens = { add: config => { cardTransitions.push(config.onComplete); }, killAll: vi.fn(), killTweensOf: vi.fn() };
    scene.time = { removeAllEvents: vi.fn() };
    scene.cameras = { main: { fade: vi.fn(), once: vi.fn((_event, callback) => { fades.push(callback); }) } };
    scene.scene = { start: vi.fn() };
    scene.showCard = vi.fn();
    scene.playback = createProloguePlayback({ advance: () => scene.advance() });
    return { scene, fades, cardTransitions };
  }

  it('skips once, cancels pending auto advance, and overrides an initial camera fade', () => {
    vi.useFakeTimers();
    const { scene, fades, cardTransitions } = sceneHarness();
    scene.playback.play('開場', false);
    scene.beginWorld();
    scene.beginWorld();
    vi.runAllTimers();
    expect(cardTransitions).toHaveLength(0);
    expect(fades).toHaveLength(1);
    expect(scene.cameras.main.fade).toHaveBeenCalledWith(460, 7, 16, 25, true);
    fades[0]();
    expect(scene.scene.start).toHaveBeenCalledTimes(1);
    expect(scene.scene.start).toHaveBeenCalledWith('world');
  });

  it('ignores repeated next taps and an in-flight card transition after skip', () => {
    const { scene, cardTransitions } = sceneHarness();
    scene.advance();
    scene.advance();
    expect(cardTransitions).toHaveLength(1);
    scene.beginWorld();
    cardTransitions[0]();
    expect(scene.index).toBe(0);
    expect(scene.showCard).not.toHaveBeenCalled();
  });

  it('uses the distinct fourth and fifth localized cards for reading and narration', () => {
    const { scene } = sceneHarness();
    scene.index = 3;
    expect(scene.cardCopy('Title')).toBe('從一名見習生開始');
    expect(scene.cardCopy('Body')).toContain('暫時不知道的');
    scene.index = 4;
    expect(scene.cardCopy('Title')).toBe('我們出發吧');
    expect(scene.cardCopy('Body')).toContain('先熟悉總部和街區');
  });
});
