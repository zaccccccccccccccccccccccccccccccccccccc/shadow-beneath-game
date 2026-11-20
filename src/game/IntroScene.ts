import Phaser from 'phaser';
import tutorialBackground from '../assets/tutorial-courtyard.png';
import rongJiePortrait from '../assets/rong-jie-portrait.png';
import playerFrontPortrait from '../assets/player-portrait-front.png';
import protagonistBust from '../assets/character-protagonist-expressions.png';
import mentorBust from '../assets/rong-jie-expressions.png';
import { prologueAutoAdvanceMs, prologueCards } from './scene-flow';
import { getPlayerName } from './profile';
import { prologueCopy, t } from './localization';
import { localizedText } from './localization';
import { setMusicZone } from './music';
import { wrapCjkText } from './text-layout';

const WIDTH = 1600;
const HEIGHT = 900;

export class IntroScene extends Phaser.Scene {
  private index = 0;
  private transitioning = false;
  private card!: Phaser.GameObjects.Container;

  constructor() { super('intro'); }

  preload(): void {
    this.load.maxParallelDownloads = 4;
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      window.dispatchEvent(new CustomEvent('under-shadow-load-error', { detail: { file: file.src } }));
    });
    this.load.image('intro-courtyard', tutorialBackground);
    this.load.image('rong-jie-portrait', rongJiePortrait);
    this.load.image('intro-player-front-portrait', playerFrontPortrait);
    this.load.spritesheet('intro-player-bust', protagonistBust, { frameWidth: 724, frameHeight: 724 });
    this.load.spritesheet('intro-mentor-bust', mentorBust, { frameWidth: 724, frameHeight: 724 });
  }

  create(): void {
    setMusicZone('tutorial');
    document.body.dataset.gameUi = 'intro';
    const background = this.add.image(WIDTH / 2, HEIGHT / 2, 'intro-courtyard').setDisplaySize(WIDTH, HEIGHT).setTint(0x65737c);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.67);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0e2531, 0.19);
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
    const nameplate = this.add.rectangle(-390, -8, 190, 46, 0xe6c36d).setOrigin(0.5).setDepth(3);
    const speakerName = item.actor === 'player' ? getPlayerName() : t('rongJie');
    const speaker = localizedText(this, -390, -8, speakerName, { fontSize: '22px', color: '#17303b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3);
    const kicker = localizedText(this, -210, -17, prologueCopy('Kicker', this.index), { fontSize: '17px', color: '#e6c36d', letterSpacing: 2 }).setDepth(3);
    const title = localizedText(this, -210, 24, prologueCopy('Title', this.index), { fontSize: '38px', color: '#fff0cf', fontStyle: 'bold' }).setDepth(3);
    const body = localizedText(this, -210, 93, wrapCjkText(prologueCopy('Body', this.index), 28), { fontSize: '26px', color: '#d8e4dc', wordWrap: { width: 800 }, lineSpacing: 12 }).setDepth(3);
    const cue = localizedText(this, 555, 245, `${t('replay')}  ${this.index + 1}/${prologueCards.length}`, { fontSize: '16px', color: '#92bdb2', letterSpacing: 2 }).setOrigin(1).setDepth(3);
    this.card.add([panel, portrait, nameplate, speaker, kicker, title, body, cue]);
    this.card.setAlpha(0).setY(HEIGHT / 2 + 34);
    portrait.setX(-500).setAlpha(0);
    this.tweens.add({ targets: this.card, alpha: 1, y: HEIGHT / 2, duration: 360, ease: 'Cubic.Out' });
    this.tweens.add({ targets: portrait, x: -390, alpha: 1, duration: 560, ease: 'Back.Out' });
    this.time.delayedCall(prologueAutoAdvanceMs, () => this.advance());
  }

  private advance(): void {
    if (this.transitioning) return;
    if (this.index === prologueCards.length - 1) {
      this.beginWorld();
      return;
    }
    this.tweens.add({ targets: this.card, alpha: 0, y: HEIGHT / 2 - 26, duration: 220, onComplete: () => { this.index += 1; this.showCard(); } });
  }

  private beginWorld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(460, 7, 16, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('world'));
  }
}
