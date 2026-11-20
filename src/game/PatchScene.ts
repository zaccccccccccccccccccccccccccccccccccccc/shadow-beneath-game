import Phaser from 'phaser';
import { nextLevelPatch } from './level-data';
import { localizedText, t } from './localization';

const WIDTH = 1600;
const HEIGHT = 900;

export class PatchScene extends Phaser.Scene {
  constructor() { super(nextLevelPatch.sceneKey); }

  create(): void {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x09131e);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 900, 570, 0x153141).setStrokeStyle(3, 0xdcb467);
    localizedText(this, WIDTH / 2, 220, t('chapterSwitch'), { fontSize: '18px', color: '#d9b96b', letterSpacing: 7 }).setOrigin(0.5);
    localizedText(this, WIDTH / 2, 302, t('nextChapter'), { fontSize: '43px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5);
    localizedText(this, WIDTH / 2, 370, t('nextTitle'), { fontSize: '29px', color: '#9fcfc0' }).setOrigin(0.5);
    localizedText(this, WIDTH / 2, 467, t('nextSummary'), { fontSize: '21px', color: '#d8e4dc', align: 'center', wordWrap: { width: 650 }, lineSpacing: 9 }).setOrigin(0.5);
    localizedText(this, WIDTH / 2, 632, t('patchStatus'), { fontSize: '17px', color: '#d9b96b', backgroundColor: '#0c212d', padding: { x: 18, y: 10 } }).setOrigin(0.5);
    const restart = localizedText(this, WIDTH / 2, 720, t('returnTutorial'), { fontSize: '19px', color: '#26353b', backgroundColor: '#f4cf79', padding: { x: 30, y: 12 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => this.scene.start('tutorial'));
    this.cameras.main.fadeIn(460, 7, 16, 25);
  }
}
