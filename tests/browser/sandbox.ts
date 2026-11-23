import Phaser from 'phaser';
import '@fontsource/noto-sans-tc/chinese-traditional-400.css';
import '@fontsource/noto-sans-tc/chinese-traditional-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';

declare global {
  interface Window { sandboxGame?: Phaser.Game }
}

const status = document.querySelector<HTMLElement>('#status')!;
const fresh = document.querySelector<HTMLButtonElement>('#sandbox-fresh')!;
const resume = document.querySelector<HTMLButtonElement>('#sandbox-resume')!;
function failure(error: unknown): void {
  document.body.dataset.sandbox = 'error';
  const output = document.querySelector<HTMLElement>('#error')!;
  output.hidden = false;
  output.textContent = String(error instanceof Error ? error.stack : error);
  status.textContent = 'Boot/runtime failed; see details below.';
}
window.addEventListener('error', event => failure(event.error ?? event.message));
window.addEventListener('unhandledrejection', event => failure(event.reason));
window.addEventListener('under-shadow-load-error', event => {
  failure(`Asset load failed: ${(event as CustomEvent<{ file: string }>).detail.file}`);
});
window.addEventListener('under-shadow-load-progress', event => {
  status.textContent = `Loading world: ${Math.round((event as CustomEvent<{ progress: number }>).detail.progress * 100)}%`;
});
window.addEventListener('under-shadow-intro-ready', () => {
  document.body.dataset.sandbox = 'intro';
  status.textContent = 'Intro ready · voice is opt-in · Escape skips';
});
window.addEventListener('under-shadow-world-ready', () => {
  document.body.dataset.sandbox = 'world';
  status.textContent = 'World ready · WASD/arrows · E/Space interact · M map · L notebook · H help';
});

try {
  const [{ IntroScene }, { WorldScene }, { startFreshGame }] = await Promise.all([
    import('../../src/game/IntroScene'),
    import('../../src/game/WorldScene'),
    import('../../src/game/save-session'),
  ]);
  const start = (mode: 'fresh' | 'resume') => {
    if (window.sandboxGame) return;
    fresh.disabled = resume.disabled = true;
    document.body.dataset.sandbox = 'booting';
    if (mode === 'fresh') startFreshGame(localStorage);
    window.sandboxGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'sandbox-stage',
      width: 1600, height: 900, backgroundColor: '#101a28',
      scene: mode === 'resume' ? [WorldScene, IntroScene] : [IntroScene, WorldScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, pixelArt: false },
      audio: { noAudio: true }, // Narration still uses the real browser speech API.
    });
  };
  fresh.addEventListener('click', () => { try { start('fresh'); } catch (error) { failure(error); } });
  resume.addEventListener('click', () => { try { start('resume'); } catch (error) { failure(error); } });
  fresh.disabled = resume.disabled = false;
  document.body.dataset.sandbox = 'ready';
  status.textContent = 'Choose fresh or resume. This page never loads production main.ts.';
  const auto = new URLSearchParams(location.search).get('auto');
  if (auto === 'fresh' || auto === 'resume') start(auto);
} catch (error) { failure(error); }
