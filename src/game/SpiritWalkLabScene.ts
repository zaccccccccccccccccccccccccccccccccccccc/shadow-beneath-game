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
import type { PlayerFacing } from './player-animation';
import { loadSpiritDirections, prepareSpiritDirections, applySpiritDirection } from './spirit-art';
import { trackSceneLoading, sceneAssetsFailed } from './scene-loading';

const WIDTH = 1600;
const HEIGHT = 900;
const FRAME_WIDTH = 543;
const FRAME_HEIGHT = 724;
const WALK_TEXTURES: Record<SpiritId, Record<SpiritGrowthId, string>> = {
  xiezhi: { young: 'world-xiezhi-young', growing: 'world-xiezhi-growing', guardian: 'world-xiezhi-guardian' },
  baize: { young: 'world-baize-young', growing: 'world-baize-growing', guardian: 'world-baize-guardian' },
  pixiu: { young: 'world-pixiu-young', growing: 'world-pixiu-growing', guardian: 'world-pixiu-guardian' },
  qilin: { young: 'world-qilin-young', growing: 'world-qilin-growing', guardian: 'world-qilin-guardian' },
  xuanwu: { young: 'world-xuanwu-young', growing: 'world-xuanwu-growing', guardian: 'world-xuanwu-guardian' },
  qinglong: { young: 'world-qinglong-young', growing: 'world-qinglong-growing', guardian: 'world-qinglong-guardian' },
};
const WALK_ASSETS: Record<SpiritId, Record<SpiritGrowthId, string>> = {
  xiezhi: { young: xiezhiYoung, growing: xiezhiGrowing, guardian: xiezhiGuardian },
  baize: { young: baizeYoung, growing: baizeGrowing, guardian: baizeGuardian },
  pixiu: { young: pixiuYoung, growing: pixiuGrowing, guardian: pixiuGuardian },
  qilin: { young: qilinYoung, growing: qilinGrowing, guardian: qilinGuardian },
  xuanwu: { young: xuanwuYoung, growing: xuanwuGrowing, guardian: xuanwuGuardian },
  qinglong: { young: qinglongYoung, growing: qinglongGrowing, guardian: qinglongGuardian },
};
const STAGES = ['young', 'growing', 'guardian'] as const;
const FED: Record<SpiritGrowthId, number> = { young: 0, growing: 3, guardian: 6 };
const FACINGS: PlayerFacing[] = ['back', 'front', 'left', 'right'];
// Same uniform multiplier on both axes; tallest side cell = 109.23px.
const LAB_SCALE = .64;
const LANE_TOP = 166, LANE_STRIDE = 118, FOOT_OFFSET = 112;
const CENTER_X = 660, LABEL_X = 1180, WALK_SPEED = 96, CYCLE_DISTANCE = 192;
interface Runner {
  id: SpiritId;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
}

export class SpiritWalkLabScene extends Phaser.Scene {
  private runners: Runner[] = [];
  private stage: SpiritGrowthId = 'young';
  private facing: PlayerFacing = 'front';
  private running = true;
  private stationary = true;
  private showIdle = false;
  private distance = 0;
  private initialized = false;
  private preloadError = false;
  private status!: Phaser.GameObjects.Text;
  private controlLayer!: Phaser.GameObjects.Container;
  constructor() { super('spirit-walk-lab'); }

  preload(): void {
    trackSceneLoading(this);
    this.preloadError = false;
    try { loadSpiritDirections(this); } catch (error) {
      this.preloadError = true;
      this.reportLoadError(error);
      return;
    }
    for (const spirit of spirits) for (const stage of STAGES) {
      const key = WALK_TEXTURES[spirit.id][stage];
      // The shared module also queues xiezhi sides. All 18 keys stay world-id-stage.
      const queued = Array.from(this.load.list).some(file => file.key === key);
      if (!this.textures.exists(key) && !queued) this.load.spritesheet(key, WALK_ASSETS[spirit.id][stage], { frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT });
    }
  }

  create(): void {
    this.initialized = false;
    if (this.preloadError || sceneAssetsFailed(this)) return;
    this.runners = [];
    this.stage = 'young'; this.facing = 'front'; this.running = true;
    this.stationary = true; this.showIdle = false; this.distance = 0;
    document.body.dataset.bootStage = 'spirit-walk-lab-create';
    try {
      prepareSpiritDirections(this);
      this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c1722);
      this.add.rectangle(WIDTH / 2, 79, WIDTH, 158, 0x102a37).setStrokeStyle(2, 0xe9c66f);
      const hans = getLocale() === 'zh-Hans';
      localizedText(this, 36, 16, hans ? '六灵兽 · 四方向步态实验室' : '六靈獸 · 四方向步態實驗室', { fontSize: '27px', color: '#fff0cf', fontStyle: 'bold' });
      this.status = localizedText(this, 36, 53, '', { fontSize: '16px', color: '#a6d7ba' });
      localizedText(this, 36, 140, hans
        ? '↑↓←→ / WASD：方向 · 1/2/3：形态 · Space：暂停 · [ / ]：逐帧 · I：站立 · M：定点/位移 · Esc：返回'
        : '↑↓←→ / WASD：方向 · 1/2/3：形態 · Space：暫停 · [ / ]：逐格 · I：站立 · M：定點/位移 · Esc：返回', { fontSize: '13px', color: '#accac8' });
      this.controlLayer = this.add.container(0, 0).setDepth(20);
      spirits.forEach((spirit, lane) => {
        const top = LANE_TOP + lane * LANE_STRIDE, feetY = top + FOOT_OFFSET;
        this.add.rectangle(WIDTH / 2, top + 56, 1480, 114, lane % 2 ? 0x122531 : 0x10212d, .92).setStrokeStyle(1, 0x405e62);
        this.add.graphics().lineStyle(1, 0x7aa89a, .35).lineBetween(90, feetY, 1110, feetY);
        const shadow = this.add.ellipse(CENTER_X, feetY, 62, 9, 0x05080b, .42).setDepth(2);
        const sprite = this.add.sprite(CENTER_X, feetY, WALK_TEXTURES[spirit.id].young, 0).setDepth(3);
        const label = localizedText(this, LABEL_X, top + 30, '', { fontSize: '17px', color: '#fff0cf', lineSpacing: 7 }).setDepth(4);
        this.runners.push({ id: spirit.id, sprite, shadow, label });
      });
      this.refresh();
    } catch (error) {
      this.reportLoadError(error);
      return;
    }
    this.initialized = true;
    document.body.dataset.gameUi = 'world';
    const keyboard = this.input.keyboard;
    keyboard?.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    keyboard?.on('keydown', this.onKeyDown, this);
    // Hide the shared overlay only after decoded-frame setup AND a first render.
    const announceReady = () => {
      document.body.dataset.bootStage = 'spirit-walk-lab-ready';
      window.dispatchEvent(new CustomEvent('under-shadow-preview-ready', { detail: { scene: 'spirit-walk-lab' } }));
    };
    this.game.events.once('postrender', announceReady);
    this.events.once('shutdown', () => {
      this.initialized = false;
      keyboard?.off('keydown', this.onKeyDown, this);
      this.game.events.off('postrender', announceReady);
    });
  }

  private reportLoadError(error: unknown): void {
    document.body.dataset.bootStage = 'spirit-walk-lab-failed';
    window.dispatchEvent(new CustomEvent('under-shadow-load-error', { detail: { file: error instanceof Error ? error.message : String(error) } }));
  }

  private button(x: number, label: string, action: () => void, selected = false, width = 105): void {
    const box = this.add.rectangle(x, 108, width, 40, selected ? 0xe9c66f : 0x1e4954)
      .setStrokeStyle(2, 0xffe7a2).setInteractive({ useHandCursor: true });
    const text = localizedText(this, x, 108, label, { fontSize: '15px', color: selected ? '#19323d' : '#fff0cf', fontStyle: 'bold' }).setOrigin(.5);
    box.on('pointerdown', action);
    this.controlLayer.add([box, text]);
  }

  private makeControls(): void {
    this.controlLayer.removeAll(true);
    const hans = getLocale() === 'zh-Hans';
    const stageLabels = hans ? ['1 幼体', '2 成长体', '3 守护体'] : ['1 幼體', '2 成長體', '3 守護體'];
    STAGES.forEach((stage, index) => this.button(100 + index * 125, stageLabels[index], () => this.selectStage(stage), this.stage === stage));
    FACINGS.forEach((facing, index) => this.button(510 + index * 100, ['↑ 上', '↓ 下', '← 左', '→ 右'][index], () => this.selectFacing(facing), this.facing === facing, 88));
    this.button(945, this.running ? (hans ? '暂停' : '暫停') : (hans ? '继续' : '繼續'), () => this.togglePause());
    this.button(1060, hans ? '[ 前一帧' : '[ 前一格', () => this.step(-1));
    this.button(1175, hans ? '] 后一帧' : '] 後一格', () => this.step(1));
    this.button(1285, 'I 站立', () => this.idle(), this.showIdle, 95);
    this.button(1440, this.stationary ? (hans ? 'M 定点行走' : 'M 定點行走') : 'M 沿方向位移', () => {
      this.stationary = !this.stationary; this.refresh();
    }, !this.stationary, 175);
  }

  private selectStage(stage: SpiritGrowthId): void { this.stage = stage; this.distance = 0; this.refresh(); }
  private selectFacing(facing: PlayerFacing): void { this.facing = facing; this.distance = 0; this.refresh(); }
  private togglePause(): void {
    this.running = !this.running;
    if (this.running) this.showIdle = false;
    this.refresh();
  }
  private idle(): void { this.running = false; this.showIdle = true; this.distance = 0; this.refresh(); }
  private step(direction: 1 | -1): void {
    const wasIdle = this.showIdle;
    this.running = false; this.showIdle = false;
    const stride = this.facing === 'front' || this.facing === 'back' ? 96 : 48;
    const count = CYCLE_DISTANCE / stride;
    const current = wasIdle && direction > 0 ? -1 : Math.floor((this.distance % CYCLE_DISTANCE) / stride);
    this.distance = ((current + direction + count) % count) * stride;
    this.refresh();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    const directions: Record<string, PlayerFacing> = { arrowup: 'back', w: 'back', arrowdown: 'front', s: 'front', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    if (directions[key]) { event.preventDefault(); this.selectFacing(directions[key]); return; }
    if (key === ' ') { event.preventDefault(); this.togglePause(); }
    else if (key === '[' || key === ',') this.step(-1);
    else if (key === ']' || key === '.') this.step(1);
    else if (key === '1' || key === '2' || key === '3') this.selectStage(STAGES[Number(key) - 1]);
    else if (key === 'i') this.idle();
    else if (key === 'm') { this.stationary = !this.stationary; this.refresh(); }
    else if (key === 'escape') window.location.reload();
  }

  private refresh(): void { this.makeControls(); this.renderRunners(); }
  private renderRunners(): void {
    const hans = getLocale() === 'zh-Hans';
    const directionLabel = ({ back: '↑ 上', front: '↓ 下', left: '← 左', right: '→ 右' } as const)[this.facing];
    const vertical = this.facing === 'front' || this.facing === 'back', count = vertical ? 2 : 4;
    const frame = Math.floor((this.distance % CYCLE_DISTANCE) / (CYCLE_DISTANCE / count));
    const phase = this.showIdle ? 'idle 0' : `${frame + 1}/${count}`;
    this.runners.forEach((runner, lane) => {
      const feetY = LANE_TOP + lane * LANE_STRIDE + FOOT_OFFSET;
      let x = CENTER_X, y = feetY;
      if (!this.stationary) {
        const range = vertical ? 8 : 680, offset = ((this.distance + range / 2) % range) - range / 2;
        if (vertical) y += (this.facing === 'front' ? 1 : -1) * offset;
        else x += (this.facing === 'right' ? 1 : -1) * offset;
      }
      // Pause keeps the walking pose frozen; only explicit idle passes false.
      applySpiritDirection(runner.sprite, runner.id, FED[this.stage], this.facing, !this.showIdle, this.distance);
      runner.sprite.setScale(runner.sprite.scaleX * LAB_SCALE, runner.sprite.scaleY * LAB_SCALE).setPosition(x, y).setAngle(0);
      runner.shadow.setPosition(x, y);
      const spirit = getSpirit(runner.id), form = spirit.forms[STAGES.indexOf(this.stage)];
      runner.label.setText(`${hans ? spirit.name.hans : spirit.name.hant} · ${hans ? form.hans : form.hant}\n${directionLabel} · ${hans ? '步态' : '步態'} ${phase}`);
    });
    const stageLabel = (hans ? ['幼体', '成长体', '守护体'] : ['幼體', '成長體', '守護體'])[STAGES.indexOf(this.stage)];
    const state = this.showIdle ? 'idle' : this.running ? '行走中' : (hans ? '已暂停，保留步态' : '已暫停，保留步態');
    this.status.setText(`${state} · ${stageLabel} · ${directionLabel} · ${hans ? '相位' : '相位'} ${phase} · 6 × 3 ${hans ? '形态' : '形態'} × 4 方向 · ${this.stationary ? (hans ? '定点检查脚步' : '定點檢查腳步') : '有限 lane 位移'}`);
  }

  update(_: number, delta: number): void {
    if (!this.initialized || !this.running) return;
    this.distance += Math.max(0, delta) * WALK_SPEED / 1000;
    this.renderRunners();
  }
}
