import Phaser from 'phaser';
import baizeYoung from '../assets/spirit-baize-young-walk-v3.png';
import baizeGrowing from '../assets/spirit-baize-growing-walk.png';
import baizeGuardian from '../assets/spirit-baize-guardian-walk.png';
import pixiuYoung from '../assets/spirit-pixiu-young-walk.png';
import pixiuGrowing from '../assets/spirit-pixiu-growing-walk.png';
import pixiuGuardian from '../assets/spirit-pixiu-guardian-walk.png';
import qilinYoung from '../assets/spirit-qilin-young-walk.png';
import qilinGrowing from '../assets/spirit-qilin-growing-walk.png';
import qilinGuardian from '../assets/spirit-qilin-guardian-walk.png';
import qinglongYoung from '../assets/spirit-qinglong-young-walk.png';
import qinglongGrowing from '../assets/spirit-qinglong-growing-walk.png';
import qinglongGuardian from '../assets/spirit-qinglong-guardian-walk.png';
import xiezhiYoung from '../assets/spirit-xiezhi-young-walk-v2.png';
import xiezhiGrowing from '../assets/spirit-xiezhi-growing-walk.png';
import xiezhiGuardian from '../assets/spirit-xiezhi-guardian-walk.png';
import xuanwuYoung from '../assets/spirit-xuanwu-young-walk.png';
import xuanwuGrowing from '../assets/spirit-xuanwu-growing-walk.png';
import xuanwuGuardian from '../assets/spirit-xuanwu-guardian-walk.png';
import { getLocale, localizedText } from './localization';
import { getSpirit, spirits, type SpiritGrowthId, type SpiritId } from './spirits';
import { getWalkLabSpriteHeight } from './spirit-walk-lab';

const WIDTH = 1600;
const HEIGHT = 900;
const FRAME_WIDTH = 543;
const FRAME_HEIGHT = 724;
const WALK_TEXTURES: Record<SpiritId, Record<SpiritGrowthId, string>> = {
  xiezhi: { young: 'lab-xiezhi-young', growing: 'lab-xiezhi-growing', guardian: 'lab-xiezhi-guardian' },
  baize: { young: 'lab-baize-young', growing: 'lab-baize-growing', guardian: 'lab-baize-guardian' },
  pixiu: { young: 'lab-pixiu-young', growing: 'lab-pixiu-growing', guardian: 'lab-pixiu-guardian' },
  qilin: { young: 'lab-qilin-young', growing: 'lab-qilin-growing', guardian: 'lab-qilin-guardian' },
  xuanwu: { young: 'lab-xuanwu-young', growing: 'lab-xuanwu-growing', guardian: 'lab-xuanwu-guardian' },
  qinglong: { young: 'lab-qinglong-young', growing: 'lab-qinglong-growing', guardian: 'lab-qinglong-guardian' },
};
const WALK_ASSETS: Record<SpiritId, Record<SpiritGrowthId, string>> = {
  xiezhi: { young: xiezhiYoung, growing: xiezhiGrowing, guardian: xiezhiGuardian },
  baize: { young: baizeYoung, growing: baizeGrowing, guardian: baizeGuardian },
  pixiu: { young: pixiuYoung, growing: pixiuGrowing, guardian: pixiuGuardian },
  qilin: { young: qilinYoung, growing: qilinGrowing, guardian: qilinGuardian },
  xuanwu: { young: xuanwuYoung, growing: xuanwuGrowing, guardian: xuanwuGuardian },
  qinglong: { young: qinglongYoung, growing: qinglongGrowing, guardian: qinglongGuardian },
};
const STAGES: SpiritGrowthId[] = ['young', 'growing', 'guardian'];

interface Runner {
  id: SpiritId;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  x: number;
  direction: 1 | -1;
  speed: number;
}

export class SpiritWalkLabScene extends Phaser.Scene {
  private runners: Runner[] = [];
  private stage: SpiritGrowthId = 'young';
  private running = true;
  private elapsed = 0;
  private status!: Phaser.GameObjects.Text;
  private controlLayer!: Phaser.GameObjects.Container;
  private frameIndex = 0;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  constructor() { super('spirit-walk-lab'); }

  preload(): void {
    spirits.forEach((spirit) => STAGES.forEach((stage) => {
      this.load.spritesheet(WALK_TEXTURES[spirit.id][stage], WALK_ASSETS[spirit.id][stage], { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    }));
  }

  create(): void {
    document.body.dataset.gameUi = 'world';
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c1722);
    for (let row = 0; row < 6; row += 1) {
      const y = 226 + row * 128;
      this.add.rectangle(WIDTH / 2, y, 1480, 86, row % 2 ? 0x122531 : 0x10212d, .92).setStrokeStyle(1, 0x405e62);
      this.add.graphics().lineStyle(2, 0x7aa89a, .32).lineBetween(60, y + 28, 1540, y + 28);
    }
    this.add.rectangle(WIDTH / 2, 62, WIDTH, 116, 0x102a37, .98).setStrokeStyle(2, 0xe9c66f);
    const title = getLocale() === 'zh-Hans' ? '六灵兽步态实验室 · 18 组逐帧测试' : '六靈獸步態實驗室 · 18 組逐格測試';
    this.add.text(44, 25, title, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '28px', color: '#fff0cf', fontStyle: 'bold' });
    this.status = localizedText(this, 44, 75, '', { fontSize: '16px', color: '#a6d7ba' });
    this.controlLayer = this.add.container(0, 0).setDepth(20);
    this.makeControls();
    this.spawnRunners();
    this.updateStatus();
    this.input.keyboard?.on('keydown-SPACE', () => { this.running = !this.running; this.updateStatus(); this.makeControls(); });
    if (this.input.keyboard) {
      this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }
    this.input.keyboard?.on('keydown-ESC', () => window.location.reload());
  }

  private button(x: number, label: string, action: () => void, selected = false, width = 145): void {
    const box = this.add.rectangle(x, 61, width, 45, selected ? 0xe9c66f : 0x1e4954).setStrokeStyle(2, 0xffe7a2).setInteractive({ useHandCursor: true });
    const text = localizedText(this, x, 61, label, { fontSize: '16px', color: selected ? '#19323d' : '#fff0cf', fontStyle: 'bold' }).setOrigin(.5);
    box.on('pointerdown', action);
    this.controlLayer.add([box, text]);
  }

  private makeControls(): void {
    this.controlLayer.removeAll(true);
    const hans = getLocale() === 'zh-Hans';
    const stageLabels = hans ? ['幼体', '成长体', '守护体'] : ['幼體', '成長體', '守護體'];
    STAGES.forEach((stage, index) => this.button(1010 + index * 155, stageLabels[index], () => {
      this.stage = stage;
      this.frameIndex = 0;
      this.applyStage();
    }, this.stage === stage));
    this.button(1500, this.running ? (hans ? '暂停' : '暫停') : (hans ? '继续' : '繼續'), () => {
      this.running = !this.running;
      this.makeControls();
      this.updateStatus();
    }, false, 120);
  }

  private spawnRunners(): void {
    spirits.forEach((spirit, lane) => {
      const y = 226 + lane * 128;
      const shadow = this.add.ellipse(155, y + 29, 104, 18, 0x05080b, .42).setDepth(2);
      const image = this.add.image(155, y + 30, WALK_TEXTURES[spirit.id][this.stage]).setOrigin(.5, 1).setDepth(3).setScale(getWalkLabSpriteHeight(this.stage) / FRAME_HEIGHT);
      const label = localizedText(this, 78, y - 28, '', { fontSize: '16px', color: '#fff0cf', backgroundColor: '#102631', padding: { x: 8, y: 4 } }).setDepth(4);
      this.runners.push({ id: spirit.id, image, shadow, label, x: 155, direction: 1, speed: 116 + lane * 12 });
    });
    this.applyStage();
  }

  private applyStage(): void {
    this.runners.forEach((runner) => {
      runner.image.setTexture(WALK_TEXTURES[runner.id][this.stage]).setFrame(this.frameIndex).setCrop().setScale(getWalkLabSpriteHeight(this.stage) / FRAME_HEIGHT).setVisible(true);
    });
    this.updateStatus();
  }

  private updateStatus(): void {
    const hans = getLocale() === 'zh-Hans';
    const stageLabel = hans
      ? ({ young: '幼体', growing: '成长体', guardian: '守护体' } as const)[this.stage]
      : ({ young: '幼體', growing: '成長體', guardian: '守護體' } as const)[this.stage];
    const state = this.running ? (hans ? '六只同时行走中' : '六隻同時行走中') : (hans ? '已暂停，可用 ← / → 逐帧检查' : '已暫停，可用 ← / → 逐格檢查');
    this.status.setText(`${state}  ·  当前形态：${stageLabel}  ·  6 只 × 3 形态 = 18 组  ·  帧 ${this.frameIndex + 1}/4  ·  Space：暂停／继续`);
  }

  update(_: number, delta: number): void {
    this.elapsed += delta;
    if (this.leftKey && Phaser.Input.Keyboard.JustDown(this.leftKey)) { this.running = false; this.frameIndex = (this.frameIndex + 3) % 4; this.applyStage(); this.makeControls(); }
    if (this.rightKey && Phaser.Input.Keyboard.JustDown(this.rightKey)) { this.running = false; this.frameIndex = (this.frameIndex + 1) % 4; this.applyStage(); this.makeControls(); }
    if (this.running) this.frameIndex = Math.floor(this.elapsed / 200) % 4;
    this.runners.forEach((runner, lane) => {
      if (this.running) {
        runner.x += runner.direction * runner.speed * delta / 1000;
        if (runner.x > 1460 || runner.x < 145) { runner.direction *= -1; runner.x = Phaser.Math.Clamp(runner.x, 145, 1460); }
        runner.image.setFrame(this.frameIndex);
      }
      const y = 226 + lane * 128;
      runner.image.setPosition(runner.x, y + 30).setFlipX(runner.direction < 0).setAngle(0);
      runner.shadow.setPosition(runner.x, y + 31);
      const spirit = getSpirit(runner.id);
      const form = spirit.forms[STAGES.indexOf(this.stage)];
      const name = getLocale() === 'zh-Hans' ? spirit.name.hans : spirit.name.hant;
      const formName = getLocale() === 'zh-Hans' ? form.hans : form.hant;
      const phase = this.running ? `步态 ${this.frameIndex + 1}/4` : `检查帧 ${this.frameIndex + 1}/4`;
      runner.label.setText(`${name} · ${formName} · ${phase}`);
      runner.label.setX(Math.max(78, Math.min(1300, runner.x - 74)));
    });
    if (this.running) this.updateStatus();
  }
}
