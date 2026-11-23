import Phaser from 'phaser';
import tutorialBackground from '../assets/tutorial-courtyard.png';
import protagonistBust from '../assets/character-protagonist-expressions.png';
import mentorBust from '../assets/rong-jie-expressions.png';
import { prologueAutoAdvanceMs, prologueCards } from './scene-flow';
import { getPlayerName } from './profile';
import { getLocale, localizedText, prologueCopy, t } from './localization';
import { setMusicZone } from './music';
import { wrapCjkText } from './text-layout';
import { createBrowserPrologueSpeech, createProloguePlayback } from './prologue-voice';

const WIDTH = 1600;
const HEIGHT = 900;

export class IntroScene extends Phaser.Scene {
  private index = 0;
  private transitioning = false;
  private advancing = false;
  private voiceEnabled = false;
  private playback?: ReturnType<typeof createProloguePlayback>;
  private controls?: HTMLDivElement;
  private card!: Phaser.GameObjects.Container;

  constructor() { super('intro'); }

  preload(): void {
    this.load.maxParallelDownloads = 4;
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      window.dispatchEvent(new CustomEvent('under-shadow-load-error', { detail: { file: file.src } }));
    });
    this.load.image('intro-courtyard', tutorialBackground);
    this.load.spritesheet('intro-player-bust', protagonistBust, { frameWidth: 724, frameHeight: 724 });
    this.load.spritesheet('intro-mentor-bust', mentorBust, { frameWidth: 724, frameHeight: 724 });
  }

  create(): void {
    this.index = 0;
    this.transitioning = false;
    this.advancing = false;
    this.voiceEnabled = false;
    this.playback = createProloguePlayback({ advance: () => this.advance(), speech: createBrowserPrologueSpeech() });
    this.createControls();
    setMusicZone('tutorial');
    document.body.dataset.gameUi = 'intro';
    const background = this.add.image(WIDTH / 2, HEIGHT / 2, 'intro-courtyard').setDisplaySize(WIDTH, HEIGHT).setTint(0x65737c);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.67);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e2531, 0.19);
    localizedText(this, 92, 82, 'CCAC  /  見習生的第一天', { fontSize: '24px', color: '#f1d79a', letterSpacing: 3 });
    localizedText(this, 92, 122, '陰影之下 · 序幕', { fontSize: '18px', color: '#afc6c5' });
    const lanternGlow = this.add.circle(WIDTH * 0.69, HEIGHT * 0.58, 225, 0xe9b64d, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: background, scale: 1.08, x: WIDTH * 0.47, y: HEIGHT * 0.47, duration: prologueAutoAdvanceMs * prologueCards.length, ease: 'Sine.InOut' });
    this.tweens.add({ targets: lanternGlow, alpha: 0.22, scale: 1.15, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
    this.card = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(10);
    this.showCard();
    this.cameras.main.fadeIn(520, 7, 16, 25);
    window.dispatchEvent(new CustomEvent('under-shadow-intro-ready'));
  }

  private showCard(): void {
    const item = prologueCards[this.index];
    this.card.removeAll(true);
    const isMentor = item.actor === 'rong-jie';
    const panel = this.add.rectangle(0, 105, 1200, 350, 0x102631, 0.96).setStrokeStyle(3, 0xdeb86a);
    const portrait = this.add.image(-390, 145, isMentor ? 'intro-mentor-bust' : 'intro-player-bust', 0)
      .setDisplaySize(330, 330).setOrigin(0.5, 1).setDepth(2);
    const nameplate = this.add.rectangle(-390, 181, 190, 46, 0xe6c36d).setOrigin(0.5).setDepth(3);
    const speakerName = item.actor === 'player' ? getPlayerName() : item.speaker;
    const speaker = localizedText(this, -390, 181, speakerName, { fontSize: '22px', color: '#17303b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3);
    const kicker = localizedText(this, -210, -17, this.cardCopy('Kicker'), { fontSize: '17px', color: '#e6c36d', letterSpacing: 2 }).setDepth(3);
    const title = localizedText(this, -210, 24, this.cardCopy('Title'), { fontSize: '38px', color: '#fff0cf', fontStyle: 'bold' }).setDepth(3);
    const body = localizedText(this, -210, 93, wrapCjkText(this.cardCopy('Body'), 28), { fontSize: '24px', color: '#d8e4dc', wordWrap: { width: 760 }, lineSpacing: 12 }).setDepth(3);
    const progress = this.add.rectangle(-210, 222, 730 * (this.index + 1) / prologueCards.length, 3, 0xe6c36d).setOrigin(0, .5);
    const cue = localizedText(this, 555, 245, `${t('replay')}  ${this.index + 1}/${prologueCards.length}`, { fontSize: '16px', color: '#92bdb2', letterSpacing: 2 }).setOrigin(1).setDepth(3);
    this.card.add([panel, portrait, nameplate, speaker, kicker, title, body, cue, progress]);
    this.card.setAlpha(0).setY(HEIGHT / 2 + 34);
    portrait.setX(-500).setAlpha(0);
    this.tweens.add({ targets: this.card, alpha: 1, y: HEIGHT / 2, duration: 360, ease: 'Cubic.Out' });
    this.tweens.add({ targets: portrait, x: -390, alpha: 1, duration: 560, ease: 'Back.Out' });
    this.playCard();
  }

  private cardCopy(kind: 'Kicker' | 'Title' | 'Body'): string {
    // prologueCopy currently clamps to card three despite all five translations existing.
    // Resolve the last two here to keep this change inside IntroScene's owned scope.
    if (this.index < 3) return prologueCopy(kind, this.index);
    const keys = [
      { Kicker: 'prologueKicker4', Title: 'prologueTitle4', Body: 'prologueBody4' },
      { Kicker: 'prologueKicker5', Title: 'prologueTitle5', Body: 'prologueBody5' },
    ] as const;
    return t(keys[this.index - 3][kind]);
  }

  private playCard(): void {
    if (this.transitioning || this.advancing || document.hidden) return;
    this.playback?.play(`${this.cardCopy('Title')}。${this.cardCopy('Body')}`, this.voiceEnabled);
  }

  private createControls(): void {
    const simplified = getLocale() === 'zh-Hans';
    const controls = document.createElement('div');
    this.controls = controls;
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '序幕控制');
    Object.assign(controls.style, {
      position: 'fixed', bottom: 'max(12px, env(safe-area-inset-bottom))', left: '50%',
      transform: 'translateX(-50%)', zIndex: '1000', display: 'flex', flexWrap: 'wrap',
      justifyContent: 'center', gap: '8px', width: 'max-content', maxWidth: '96vw',
    });
    const button = (label: string, action: () => void) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = label;
      Object.assign(element.style, {
        minWidth: '100px', minHeight: '48px', padding: '10px 16px', font: 'bold 16px sans-serif',
        color: '#fff0cf', background: '#102631', border: '2px solid #deb86a', borderRadius: '8px',
        cursor: 'pointer', touchAction: 'manipulation',
      });
      element.addEventListener('click', action);
      controls.append(element);
      return element;
    };
    const supported = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
    const voiceLabel = () => simplified
      ? `中文语音：${this.voiceEnabled ? '开' : '关（点击开启）'}`
      : `中文語音：${this.voiceEnabled ? '開' : '關（點擊開啟）'}`;
    const voice = button(voiceLabel(), () => {
      if (this.transitioning) return;
      this.voiceEnabled = !this.voiceEnabled;
      voice.textContent = voiceLabel();
      voice.setAttribute('aria-pressed', String(this.voiceEnabled));
      // Invoke speak synchronously inside the gesture; do not wait for voiceschanged.
      this.playCard();
    });
    voice.setAttribute('aria-pressed', 'false');
    if (!supported) {
      voice.disabled = true;
      voice.textContent = simplified ? '语音不可用 · 自动阅读' : '語音不可用 · 自動閱讀';
    }
    button(simplified ? '下一页' : '下一頁', () => this.advance());
    button(simplified ? '跳过序幕 · Esc' : '跳過序幕 · Esc', () => this.beginWorld());
    document.body.append(controls);

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.beginWorld();
    };
    const visibility = () => {
      if (document.hidden) this.playback?.stop();
      else this.playCard();
    };
    const pagehide = () => this.playback?.stop();
    const pageshow = () => this.playCard();
    window.addEventListener('keydown', keydown);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transitioning = true;
      this.playback?.dispose();
      this.time.removeAllEvents();
      this.tweens.killAll();
      controls.remove();
      this.controls = undefined;
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
    });
  }

  private advance(): void {
    if (this.transitioning || this.advancing) return;
    this.playback?.stop();
    if (this.index === prologueCards.length - 1) {
      this.beginWorld();
      return;
    }
    this.advancing = true;
    this.tweens.killTweensOf(this.card);
    this.tweens.add({ targets: this.card, alpha: 0, y: HEIGHT / 2 - 26, duration: 220, onComplete: () => {
      if (this.transitioning) return;
      this.index += 1;
      this.advancing = false;
      this.showCard();
    } });
  }

  private beginWorld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.playback?.dispose();
    this.time.removeAllEvents();
    this.tweens.killAll();
    if (this.controls) {
      this.controls.querySelectorAll('button').forEach(button => { button.disabled = true; });
    }
    this.cameras.main.fade(460, 7, 16, 25, true);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('world'));
  }
}
