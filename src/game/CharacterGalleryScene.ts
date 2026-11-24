import Phaser from 'phaser';
import { trackSceneLoading, sceneAssetsFailed } from './scene-loading';
import { CHARACTER_DOSSIER, PORTRAIT_FRAMES } from './character-dossier';
import { getLocale } from './localization';

const WIDTH = 1600;
const HEIGHT = 900;
const frameNames = ['neutral', 'concerned', 'resolved'] as const;

export class CharacterGalleryScene extends Phaser.Scene {
  constructor() { super('character-gallery'); }

  preload(): void {
    trackSceneLoading(this);
    for (const character of CHARACTER_DOSSIER) this.load.spritesheet(character.texture, character.image, { frameWidth: 724, frameHeight: 724 });
  }

  create(): void {
    if (sceneAssetsFailed(this)) { this.scene.pause(); return; }
    const hans = getLocale() === 'zh-Hans';
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x101a28);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 36, HEIGHT - 36, 0x122b38, 0.96).setStrokeStyle(2, 0x7c9c93);
    this.add.text(WIDTH / 2, 45, hans ? '人物档案 · 五幕调查关系人' : '人物檔案 · 五幕調查關係人', { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '32px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5, 0);
    this.add.text(WIDTH / 2, 96, hans ? '点击表情按钮，查看同一角色在对话中的情绪变化' : '點擊表情按鈕，查看同一角色在對話中的情緒變化', { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '17px', color: '#abc7be' }).setOrigin(.5, 0);

    CHARACTER_DOSSIER.forEach((character, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 205 + col * 397;
      const y = row === 0 ? 330 : 695;
      const label = hans ? character.name : character.traditional;
      const role = hans ? character.role : character.roleTraditional;
      this.add.rectangle(x, y, 350, 328, 0x193744, 0.98).setStrokeStyle(2, 0x597c78);
      const portrait = this.add.image(x, y - 49, character.texture, PORTRAIT_FRAMES.neutral).setDisplaySize(180, 180);
      this.add.text(x, y + 56, label, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '24px', color: '#edca76', fontStyle: 'bold' }).setOrigin(.5);
      this.add.text(x, y + 88, role, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '15px', color: '#cfddd4' }).setOrigin(.5);
      frameNames.forEach((emotion, emotionIndex) => {
        const buttonX = x - 96 + emotionIndex * 96;
        const emotionLabel = hans ? ['平静', '担忧', '坚定'][emotionIndex] : ['平靜', '擔憂', '堅定'][emotionIndex];
        const box = this.add.rectangle(buttonX, y + 133, 88, 32, emotionIndex === 0 ? 0xe9c66f : 0x294854).setStrokeStyle(1, 0xe9c66f).setInteractive({ useHandCursor: true });
        const text = this.add.text(buttonX, y + 133, emotionLabel, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '14px', color: emotionIndex === 0 ? '#19323d' : '#f2e7d0', fontStyle: 'bold' }).setOrigin(.5);
        box.on('pointerdown', () => {
          portrait.setFrame(PORTRAIT_FRAMES[emotion]);
          this.children.list.filter((item) => item instanceof Phaser.GameObjects.Rectangle && Math.abs(item.y - (y + 133)) < 1 && Math.abs(item.x - (x - 96)) <= 192)
            .forEach((button) => (button as Phaser.GameObjects.Rectangle).setFillStyle(button === box ? 0xe9c66f : 0x294854));
          this.children.list.filter((item) => item instanceof Phaser.GameObjects.Text && Math.abs(item.y - (y + 133)) < 1 && Math.abs(item.x - (x - 96)) <= 192)
            .forEach((caption) => (caption as Phaser.GameObjects.Text).setColor(caption === text ? '#19323d' : '#f2e7d0'));
        });
      });
    });

    const backLabel = hans ? '返回首页' : '返回首頁';
    const back = this.add.rectangle(WIDTH - 100, HEIGHT - 27, 160, 42, 0xe9c66f).setInteractive({ useHandCursor: true });
    this.add.text(back.x, back.y, backLabel, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '17px', color: '#19323d', fontStyle: 'bold' }).setOrigin(.5);
    back.on('pointerdown', () => window.location.reload());
    this.cameras.main.fadeIn(280, 8, 18, 26);
    window.dispatchEvent(new CustomEvent('under-shadow-preview-ready'));
  }
}
