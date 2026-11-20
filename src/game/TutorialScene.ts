import Phaser from 'phaser';
import { hoverKeepsTarget, keyboardDirection, resolveFacing, type PlayerFacing } from './input';
import { constrainToWalkable, tutorialLevel } from './level-data';
import { allowsPointerNavigation, canEnterActOne, type TutorialStep } from './scene-flow';
import { isClueRevealed } from './discovery';
import { localizedText, t } from './localization';
import { setMusicZone } from './music';
import tutorialBackground from '../assets/tutorial-courtyard.png';
import playerBack from '../assets/player-lantern.png';
import playerLeft from '../assets/player-left.png';
import playerRight from '../assets/player-right.png';

const WIDTH = 1600;
const HEIGHT = 900;
const SPEED = 310;

export class TutorialScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private sprites!: Record<PlayerFacing, Phaser.GameObjects.Image>;
  private target = new Phaser.Math.Vector2(tutorialLevel.spawn.x, tutorialLevel.spawn.y);
  private facing: PlayerFacing = 'back';
  private glow!: Phaser.GameObjects.Arc;
  private prompt!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private action!: Phaser.GameObjects.Container;
  private observationMarker!: Phaser.GameObjects.Container;
  private step: TutorialStep = 'move';
  private isTransitioning = false;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() { super('tutorial'); }

  preload(): void {
    this.load.image('tutorial-courtyard', tutorialBackground);
    this.load.image('tutorial-player-back', playerBack);
    this.load.image('tutorial-player-left', playerLeft);
    this.load.image('tutorial-player-right', playerRight);
  }

  create(): void {
    setMusicZone('tutorial');
    this.add.image(WIDTH / 2, HEIGHT / 2, 'tutorial-courtyard').setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0b1721, 0.11);
    this.add.rectangle(WIDTH / 2, 850, WIDTH, 100, 0x071019, 0.26);
    this.player = this.add.container(tutorialLevel.spawn.x, tutorialLevel.spawn.y).setDepth(10);
    this.sprites = {
      back: this.add.image(0, -72, 'tutorial-player-back').setDisplaySize(108, 150),
      left: this.add.image(0, -72, 'tutorial-player-left').setDisplaySize(118, 150).setVisible(false),
      right: this.add.image(0, -72, 'tutorial-player-right').setDisplaySize(118, 150).setVisible(false),
    };
    this.player.add(Object.values(this.sprites));
    this.glow = this.add.circle(this.player.x + 23, this.player.y + 18, 190, 0xf4c867, 0.17).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.createHud();
    this.createObservationPoint();
    this.keys = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || !allowsPointerNavigation(this.step)) return;
      const point = constrainToWalkable({ x: pointer.worldX, y: pointer.worldY }, tutorialLevel);
      this.target.set(point.x, point.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const retainedTarget = hoverKeepsTarget({ x: this.target.x, y: this.target.y });
      this.target.set(retainedTarget.x, retainedTarget.y);
      if (!this.isKeyboardHeld()) {
        this.setFacing(resolveFacing({ x: 0, y: 0 }, { x: pointer.worldX - this.player.x, y: pointer.worldY - this.player.y }, this.facing));
      }
    });
    this.cameras.main.fadeIn(460, 7, 16, 25);
    this.showOpening();
  }

  update(_: number, delta: number): void {
    this.move(delta);
    this.glow.setPosition(this.player.x + 23, this.player.y + 18);
    const reachedObservation = Phaser.Math.Distance.Between(this.player.x, this.player.y, 875, 558) < 105;
    const reachedExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, tutorialLevel.exit.x, tutorialLevel.exit.y) < tutorialLevel.exit.radius;
    const revealed = isClueRevealed({ x: this.player.x + 23, y: this.player.y + 18 }, { x: 875, y: 558 }, 190);
    this.observationMarker.setVisible(revealed);
    if (this.step === 'move' && Phaser.Math.Distance.Between(this.player.x, this.player.y, tutorialLevel.spawn.x, tutorialLevel.spawn.y) > 90) {
      this.step = 'observe';
      this.objective.setText(t('tutorialStep2'));
      this.prompt.setText(t('tutorialApproach'));
    }
    if (this.step === 'observe' && reachedObservation) this.action.setVisible(true);
    if (this.step === 'observe' && revealed && !reachedObservation) this.prompt.setText(t('clueNear'));
    if (reachedExit && canEnterActOne(this.step)) this.beginActOne();
  }

  private createHud(): void {
    const plate = this.add.rectangle(32, 29, 420, 94, 0x142533, 0.92).setOrigin(0).setStrokeStyle(1, 0x5b7e81);
    localizedText(this, 52, 44, t('tutorialHeader'), { fontSize: '18px', color: '#e9c979', letterSpacing: 2 });
    this.objective = localizedText(this, 52, 75, t('tutorialStep1'), { fontSize: '24px', color: '#f7e7c1', fontStyle: 'bold' });
    this.prompt = localizedText(this, WIDTH / 2, 784, t('tutorialMove'), { fontSize: '18px', color: '#f7e7c1', backgroundColor: '#142533d9', padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(30);
    this.action = this.createActionButton();
  }

  private createObservationPoint(): void {
    const marker = this.add.container(875, 558).setDepth(7).setVisible(false);
    const ring = this.add.circle(0, 0, 24, 0xe8bb5a, 0.2);
    const note = this.add.rectangle(0, 0, 24, 17, 0xf4e2b4).setAngle(-8);
    const alert = localizedText(this, 0, -45, '!', { fontSize: '42px', color: '#fff4bd', fontStyle: 'bold', stroke: '#71452b', strokeThickness: 7 }).setOrigin(0.5);
    marker.add([ring, note, alert]);
    this.tweens.add({ targets: ring, scale: 1.4, alpha: 0.05, yoyo: true, repeat: -1, duration: 950 });
    this.tweens.add({ targets: alert, y: -54, yoyo: true, repeat: -1, duration: 560, ease: 'Sine.InOut' });
    this.observationMarker = marker;
  }

  private createActionButton(): Phaser.GameObjects.Container {
    const button = this.add.container(WIDTH / 2, 715).setDepth(31).setVisible(false);
    const card = this.add.rectangle(0, 0, 280, 58, 0xf2d79c).setStrokeStyle(3, 0x4a5551).setInteractive({ useHandCursor: true });
    const text = localizedText(this, 0, 0, t('capture'), { fontSize: '22px', color: '#26353b', fontStyle: 'bold' }).setOrigin(0.5);
    card.on('pointerdown', () => this.finishObservation());
    button.add([card, text]);
    return button;
  }

  private move(delta: number): void {
    let dx = (this.keys.right?.isDown ? 1 : 0) - (this.keys.left?.isDown ? 1 : 0);
    let dy = (this.keys.down?.isDown ? 1 : 0) - (this.keys.up?.isDown ? 1 : 0);
    const keys = keyboardDirection({ W: this.wasd.W?.isDown ?? false, A: this.wasd.A?.isDown ?? false, S: this.wasd.S?.isDown ?? false, D: this.wasd.D?.isDown ?? false });
    dx += keys.x; dy += keys.y;
    if (dx || dy) {
      this.setFacing(resolveFacing({ x: dx, y: dy }, { x: 0, y: 0 }, this.facing));
      const movement = new Phaser.Math.Vector2(dx, dy).normalize().scale((SPEED * delta) / 1000);
      const point = constrainToWalkable({ x: this.player.x + movement.x, y: this.player.y + movement.y }, tutorialLevel);
      this.target.set(point.x, point.y);
    }
    const safe = constrainToWalkable({ x: this.target.x, y: this.target.y }, tutorialLevel);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, safe.x, safe.y);
    if (distance > 2) this.player.setPosition(Phaser.Math.Linear(this.player.x, safe.x, Math.min(1, (SPEED * delta) / 1000 / distance)), Phaser.Math.Linear(this.player.y, safe.y, Math.min(1, (SPEED * delta) / 1000 / distance)));
  }

  private setFacing(facing: PlayerFacing): void {
    this.facing = facing;
    (Object.keys(this.sprites) as PlayerFacing[]).forEach((key) => this.sprites[key].setVisible(key === facing));
  }

  private isKeyboardHeld(): boolean {
    return Boolean(this.keys.left?.isDown || this.keys.right?.isDown || this.keys.up?.isDown || this.keys.down?.isDown
      || this.wasd.W?.isDown || this.wasd.A?.isDown || this.wasd.S?.isDown || this.wasd.D?.isDown);
  }

  private finishObservation(): void {
    if (this.step !== 'observe') return;
    this.action.setVisible(false);
    this.step = 'exit';
    this.objective.setText(t('step3'));
    this.prompt.setText(t('exitPrompt'));
    const arrow = localizedText(this, tutorialLevel.exit.x, tutorialLevel.exit.y - 108, `→\n${t('actOne')}`, { fontSize: '25px', color: '#fff0bd', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: arrow, y: arrow.y - 10, yoyo: true, repeat: -1, duration: 720 });
  }

  private beginActOne(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(520, 7, 16, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('act-one'));
  }

  private showOpening(): void {
    const card = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(50);
    card.add([
      this.add.rectangle(0, 0, 690, 330, 0x173342, 0.98).setStrokeStyle(3, 0xdeb86a),
      localizedText(this, 0, -106, t('tutorialTitle'), { fontSize: '43px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5),
      localizedText(this, 0, -22, t('tutorialIntro'), { fontSize: '21px', color: '#d8e4dc', align: 'center', lineSpacing: 9 }).setOrigin(0.5),
    ]);
    const cue = localizedText(this, 0, 116, t('starting'), { fontSize: '19px', color: '#2d3f43', backgroundColor: '#f4cf79', padding: { x: 30, y: 12 } }).setOrigin(0.5);
    card.add(cue);
    this.tweens.add({ targets: card, alpha: 0, delay: 1450, duration: 360, onComplete: () => card.destroy(true) });
  }
}
