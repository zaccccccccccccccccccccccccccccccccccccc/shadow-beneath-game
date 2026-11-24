import Phaser from 'phaser';
import '@fontsource/noto-sans-tc/chinese-traditional-400.css';
import '@fontsource/noto-sans-tc/chinese-traditional-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import { IntroScene } from './game/IntroScene';
import { WorldScene } from './game/WorldScene';
import { SpiritWalkLabScene } from './game/SpiritWalkLabScene';
import { CharacterGalleryScene } from './game/CharacterGalleryScene';
import { setPlayerName } from './game/profile';
import { hasGameSave, startFreshGame } from './game/save-session';
import { getJoystickVector, requiresLandscapePrompt } from './game/mobile';
import { getLocale, setLocale, t } from './game/localization';
import { installMusicAutoplay, isMusicEnabled, setMusicEnabled } from './game/music';
import './styles.css';
import './music-ui.css';

function startGame(mode: 'game' | 'resume' | 'walk-lab' | 'gallery' = 'game'): void {
  new Phaser.Game({
    type: new URLSearchParams(location.search).get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
    loader: { imageLoadType: 'HTMLImageElement', timeout: 30000 },
    callbacks: { postBoot: game => {
      document.body.dataset.renderer = game.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl';
      document.body.dataset.bootStage = 'engine-ready';
    } },
    parent: 'app',
    width: 1600,
    height: 900,
    backgroundColor: '#101a28',
    scene: mode === 'walk-lab' ? [SpiritWalkLabScene] : mode === 'gallery' ? [CharacterGalleryScene] : mode === 'resume' ? [WorldScene, CharacterGalleryScene] : [IntroScene, WorldScene, CharacterGalleryScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
  });
}

const gate = document.querySelector<HTMLElement>('#profile-gate');
const nameInput = document.querySelector<HTMLInputElement>('#player-name');
const startButton = document.querySelector<HTMLButtonElement>('#start-game');
const continueButton = document.querySelector<HTMLButtonElement>('#continue-game');
const walkLabButton = document.querySelector<HTMLButtonElement>('#start-walk-lab');
const characterGalleryButton = document.querySelector<HTMLButtonElement>('#view-character-gallery');
const localeSelect = document.querySelector<HTMLSelectElement>('#game-locale');
const musicToggle = document.querySelector<HTMLInputElement>('#music-enabled');
const loadingOverlay = document.querySelector<HTMLElement>('#asset-loading');
const loadingTitle = document.querySelector<HTMLElement>('#asset-loading-title');
const loadingDetail = document.querySelector<HTMLElement>('#asset-loading-detail');
const loadingProgress = document.querySelector<HTMLProgressElement>('#asset-loading-progress');
const retryLoading = document.querySelector<HTMLButtonElement>('#retry-loading');
const compatibleRenderer = document.querySelector<HTMLButtonElement>('#compatible-renderer');
let lastLoadProgressAt = 0;
retryLoading?.addEventListener('click', () => location.reload());
compatibleRenderer?.addEventListener('click', () => { const url = new URL(location.href); url.searchParams.set('renderer', 'canvas'); location.assign(url.href); });
const localeFields: Array<[string, Parameters<typeof t>[0]]> = [
  ['gate-kicker', 'gateKicker'], ['game-title', 'gameTitle'], ['gate-help', 'gateHelp'], ['name-label', 'nameLabel'],
  ['language-label', 'languageLabel'], ['start-game', 'start'], ['rotate-title', 'rotateTitle'], ['rotate-body', 'rotateBody'], ['continue-portrait', 'continuePortrait'],
  ['mobile-help', 'mobileHelp'],
  ['mobile-interact', 'mobileInteract'], ['mobile-notebook', 'mobileNotebook'], ['mobile-map', 'mobileMap'],
];
function applyLocale(): void {
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.title = locale === 'zh-Hans' ? '阴影之下 · 六幕连续调查' : '陰影之下 · 六幕連續調查';
  if (localeSelect) localeSelect.value = locale;
  localeFields.forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = t(key);
  });
  const options = localeSelect?.options;
  if (options?.[0]) options[0].text = t('traditional');
  if (options?.[1]) options[1].text = t('simplified');
  if (characterGalleryButton) characterGalleryButton.textContent = locale === 'zh-Hans' ? '人物表情档案预览' : '人物表情檔案預覽';
  if (startButton) startButton.textContent = locale === 'zh-Hans' ? '新游戏 · 从教学开始' : '新遊戲 · 從教學開始';
  if (continueButton) {
    continueButton.textContent = locale === 'zh-Hans' ? '继续调查 · 读取存档' : '繼續調查 · 讀取存檔';
    try { continueButton.hidden = !hasGameSave(localStorage); } catch { continueButton.hidden = true; }
  }
  const musicLabel = document.getElementById('music-label');
  if (musicLabel) musicLabel.textContent = locale === 'zh-Hans' ? '背景音乐' : '背景音樂';
  if (retryLoading) retryLoading.textContent = locale === 'zh-Hans' ? '重新载入 · 保留存档' : '重新載入 · 保留存檔';
  if (compatibleRenderer) compatibleRenderer.textContent = locale === 'zh-Hans' ? '使用兼容显示模式' : '使用相容顯示模式';
  const touchHelp = document.getElementById('touch-help');
  const petsButton = document.getElementById('mobile-pets');
  if (petsButton) petsButton.textContent = locale === 'zh-Hans' ? '精灵' : '精靈';
  if (touchHelp) touchHelp.textContent = t('touchHelp');
  if (nameInput && (!nameInput.value.trim() || nameInput.value === '见习生' || nameInput.value === '見習生')) {
    nameInput.value = locale === 'zh-Hans' ? '见习生' : '見習生';
  }
}
setLocale(getLocale());
installMusicAutoplay();
applyLocale();
localeSelect?.addEventListener('change', () => {
  setLocale(localeSelect.value === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant');
  applyLocale();
});
if (musicToggle) {
  musicToggle.checked = isMusicEnabled();
  musicToggle.addEventListener('change', () => setMusicEnabled(musicToggle.checked));
}
let gameStarted = false;
let introReady = false;
let initialLoadFailed = false;
window.addEventListener('under-shadow-intro-ready', () => {
  introReady = true;
  if (loadingOverlay) loadingOverlay.dataset.visible = 'false';
  document.body.dataset.bootStage = 'intro-ready';
  gate?.remove();
}, { once: true });
window.addEventListener('under-shadow-load-progress', (event) => {
  const detail = (event as CustomEvent<{ progress: number; label?: string; stage?: string }>).detail;
  lastLoadProgressAt = Date.now();
  if (initialLoadFailed) return;
  document.body.dataset.gameUi = 'loading';
  if (!loadingOverlay || !loadingTitle || !loadingProgress || !loadingDetail) return;
  loadingOverlay.dataset.visible = 'true';
  loadingTitle.textContent = getLocale() === 'zh-Hans' ? (detail.stage === 'intro' ? '正在载入序幕' : '正在载入调查区域') : (detail.stage === 'intro' ? '正在載入序幕' : '正在載入調查區域');
  loadingProgress.value = detail.progress;
  loadingDetail.textContent = detail.label || (getLocale() === 'zh-Hans' ? `资源载入 ${Math.round(detail.progress * 100)}%` : `資源載入 ${Math.round(detail.progress * 100)}%`);
});
window.addEventListener('under-shadow-load-error', (event) => {
  const detail = (event as CustomEvent<{ file: string }>).detail;
  const fileName = detail.file.split(/[\\/]/).pop() || detail.file;
  initialLoadFailed = true;
  if (retryLoading) retryLoading.hidden = false;
  if (compatibleRenderer) compatibleRenderer.hidden = false;
  if (loadingOverlay && loadingTitle && loadingDetail) {
    loadingOverlay.dataset.visible = 'true';
    loadingTitle.textContent = getLocale() === 'zh-Hans' ? '有游戏素材未能加载' : '有遊戲素材未能載入';
    loadingDetail.textContent = `${fileName} · ${getLocale() === 'zh-Hans' ? '网络或素材解码失败，可重新载入重试；存档会保留。' : '網絡或素材解碼失敗，可重新載入重試；存檔會保留。'}`;
  }
  const help = gate?.querySelector('#gate-help');
  if (!introReady && help) help.textContent = getLocale() === 'zh-Hans' ? `素材加载失败：${fileName}` : `素材載入失敗：${fileName}`;
});
window.addEventListener('under-shadow-preview-ready', () => {
  document.body.dataset.gameUi = 'preview';
  if (loadingOverlay) loadingOverlay.dataset.visible = 'false';
});
window.addEventListener('under-shadow-world-ready', () => {
  if (loadingOverlay) loadingOverlay.dataset.visible = 'false';
}, { once: true });
window.setInterval(() => {
  if (!gameStarted || document.body.dataset.gameUi !== 'loading' || initialLoadFailed || Date.now() - lastLoadProgressAt < 30000) return;
  if (retryLoading) retryLoading.hidden = false;
  if (compatibleRenderer) compatibleRenderer.hidden = false;
  if (loadingDetail) loadingDetail.textContent = getLocale() === 'zh-Hans' ? '连接较慢，可继续等待，或重新载入；存档会保留。' : '連線較慢，可繼續等待，或重新載入；存檔會保留。';
}, 1000);
const begin = (resume = false) => {
  if (gameStarted) return;
  gameStarted = true;
  document.body.dataset.gameUi = 'loading';
  lastLoadProgressAt = Date.now();
  if (loadingOverlay) loadingOverlay.dataset.visible = 'true';
  if (startButton) startButton.disabled = true;
  setPlayerName(nameInput?.value ?? '');
  const help = gate?.querySelector('#gate-help');
  if (help) help.textContent = getLocale() === 'zh-Hans' ? '正在载入开场场景，请稍候…' : '正在載入開場場景，請稍候…';
  try {
    if (!resume) startFreshGame(localStorage);
    startGame(resume ? 'resume' : 'game');
    if (resume) { introReady = true; gate?.remove(); }
    setupMobileControls();

  } catch (error) {
    gameStarted = false;
    document.body.dataset.gameUi = 'gate';
    if (startButton) startButton.disabled = false;
    if (gate) {
      const help = gate.querySelector('#gate-help');
      if (help) help.textContent = getLocale() === 'zh-Hans' ? '游戏启动失败，请刷新页面后重试。' : '遊戲啟動失敗，請重新整理頁面後重試。';
      gate.style.display = 'block';
    }
    console.error('Unable to start the game:', error);
  }
};
const beginWalkLab = () => {
  if (gameStarted) return;
  gameStarted = true;
  lastLoadProgressAt = Date.now();
  if (loadingOverlay) loadingOverlay.dataset.visible = 'true';
  document.body.dataset.gameUi = 'loading';
  setPlayerName(nameInput?.value ?? '');
  gate?.remove();
  startGame('walk-lab');
};
const beginCharacterGallery = () => {
  if (gameStarted) return;
  gameStarted = true;
  lastLoadProgressAt = Date.now();
  if (loadingOverlay) loadingOverlay.dataset.visible = 'true';
  document.body.dataset.gameUi = 'loading';
  gate?.remove();
  startGame('gallery');
};
document.body.dataset.gameUi = 'gate';
startButton?.addEventListener('click', () => begin(false));
continueButton?.addEventListener('click', () => begin(true));
walkLabButton?.addEventListener('click', beginWalkLab);
characterGalleryButton?.addEventListener('click', beginCharacterGallery);
nameInput?.addEventListener('keydown', (event) => { if (event.key === 'Enter') begin(); });
[startButton, continueButton, walkLabButton, characterGalleryButton].forEach(button => { if (button) button.disabled = false; });

if (new URLSearchParams(window.location.search).has('walk-lab')) beginWalkLab();
if (new URLSearchParams(window.location.search).has('characters')) beginCharacterGallery();

let portraitAllowed = false;
const syncMobileLayout = () => {
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  document.body.dataset.orientationHint = String(!portraitAllowed && requiresLandscapePrompt({ width: window.innerWidth, height: window.innerHeight, coarsePointer }));
};
document.getElementById('continue-portrait')?.addEventListener('click', () => { portraitAllowed = true; syncMobileLayout(); });
syncMobileLayout();
window.addEventListener('resize', syncMobileLayout);
window.addEventListener('orientationchange', syncMobileLayout);

function setupMobileControls(): void {
  const stick = document.getElementById('mobile-stick');
  const knob = document.getElementById('mobile-knob');
  if (!stick || !knob) return;
  let activePointer: number | null = null;
  const emitAxis = (x: number, y: number) => window.dispatchEvent(new CustomEvent('under-shadow-touch-axis', { detail: { x, y } }));
  const updateStick = (event: PointerEvent) => {
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.33;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    const axis = getJoystickVector(dx, dy, radius);
    emitAxis(axis.x, axis.y);
  };
  stick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    activePointer = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  stick.addEventListener('pointermove', (event) => { if (event.pointerId === activePointer) updateStick(event); });
  const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    knob.style.transform = 'translate(0, 0)';
    emitAxis(0, 0);
  };
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);
  stick.addEventListener('lostpointercapture', releaseStick);
  window.addEventListener('blur', () => { activePointer = null; knob.style.transform = 'translate(0, 0)'; emitAxis(0, 0); });
  document.getElementById('mobile-interact')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('under-shadow-action', { detail: 'interact' })));
  document.getElementById('mobile-help')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('under-shadow-action', { detail: 'help' })));
  document.getElementById('mobile-notebook')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('under-shadow-action', { detail: 'notebook' })));
  document.getElementById('mobile-map')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('under-shadow-action', { detail: 'map' })));
  document.getElementById('mobile-pets')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('under-shadow-action', { detail: 'pets' })));
}


