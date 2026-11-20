import Phaser from 'phaser';
import { actOneEvents, type ActEvent } from './case-data';
import {
  captureEvent,
  classifyEvidence,
  createGameState,
  drainLamp,
  type Classification,
  type GameState,
} from './domain';
import { hoverKeepsTarget, keyboardDirection, resolveFacing, type PlayerFacing } from './input';
import { actOneLevel, constrainToWalkable } from './level-data';
import { isClueRevealed } from './discovery';
import { getPlayerName } from './profile';
import { localizedEvent, localizedText, t } from './localization';
import courtyardBackground from '../assets/macau-courtyard-act-one.png';
import playerLantern from '../assets/player-lantern.png';
import playerLeft from '../assets/player-left.png';
import playerRight from '../assets/player-right.png';

const WIDTH = 1600;
const HEIGHT = 900;
const MOVE_SPEED = 310;
const INTERACTION_DISTANCE = 105;

const classificationLabels: Array<{ id: Classification; title: Parameters<typeof t>[0]; sub: Parameters<typeof t>[0]; color: number }> = [
  { id: 'courtesy', title: 'courtesy', sub: 'courtesySub', color: 0x5eac8d },
  { id: 'declaration', title: 'declaration', sub: 'declarationSub', color: 0xe6bb57 },
  { id: 'corruption', title: 'corruption', sub: 'corruptionSub', color: 0xcf6370 },
];

export class ActOneScene extends Phaser.Scene {
  private state: GameState = createGameState();
  private player!: Phaser.GameObjects.Container;
  private playerTarget = new Phaser.Math.Vector2(actOneLevel.spawn.x, actOneLevel.spawn.y);
  private playerSprites!: Record<PlayerFacing, Phaser.GameObjects.Image>;
  private playerFacing: PlayerFacing = 'back';
  private lampGlow!: Phaser.GameObjects.Arc;
  private darkness!: Phaser.GameObjects.Rectangle;
  private actionButton!: Phaser.GameObjects.Container;
  private oilFill!: Phaser.GameObjects.Rectangle;
  private oilText!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private currentNearby: ActEvent | null = null;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private eventMarkers = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super('act-one');
  }

  preload(): void {
    this.load.image('act-one-courtyard', courtyardBackground);
    this.load.image('act-one-player', playerLantern);
    this.load.image('player-left', playerLeft);
    this.load.image('player-right', playerRight);
  }

  create(): void {
    this.cameras.main.fadeIn(460, 8, 16, 25);
    this.drawWorld();
    this.createCharacters();
    this.createHud();
    this.createLight();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.state.phase === 'roam' && !this.currentNearby && currentlyOver.length === 0) {
        const target = constrainToWalkable({ x: pointer.worldX, y: pointer.worldY }, actOneLevel);
        this.playerTarget.set(target.x, target.y);
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const retainedTarget = hoverKeepsTarget({ x: this.playerTarget.x, y: this.playerTarget.y });
      this.playerTarget.set(retainedTarget.x, retainedTarget.y);
      if (!this.isKeyboardHeld()) {
        this.setFacing(resolveFacing({ x: 0, y: 0 }, { x: pointer.worldX - this.player.x, y: pointer.worldY - this.player.y }, this.playerFacing));
      }
    });

    this.keys = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    this.showIntro();
  }

  update(_: number, delta: number): void {
    this.updateLamp(delta);
    if (this.state.phase === 'roam') {
      this.movePlayer(delta);
      this.updateInteraction();
    }
    this.updateLightMask();
  }

  private drawWorld(): void {
    this.add.image(WIDTH / 2, HEIGHT / 2, 'act-one-courtyard').setDisplaySize(WIDTH, HEIGHT).setDepth(0);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x142535, 0.08).setDepth(1);
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, label: string): void {
    g.fillStyle(color).fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(0xe9dfbd).fillRoundedRect(x + 10, y + 12, w - 20, 10, 3);
    g.fillStyle(0x25424b).fillRect(x + w * 0.39, y + h - 86, w * 0.22, 86);
    g.fillStyle(0xf3c976, 0.64).fillRect(x + w * 0.42, y + h - 76, w * 0.16, 58);
    for (let wx = x + 35; wx < x + w - 30; wx += 78) {
      g.fillStyle(0x274552).fillRoundedRect(wx, y + 62, 46, 62, 5);
      g.fillStyle(0xf3c976, 0.53).fillRect(wx + 6, y + 69, 34, 45);
      g.lineStyle(3, 0xe5d7b7).strokeLineShape(new Phaser.Geom.Line(wx + 23, y + 67, wx + 23, y + 119));
    }
    const sign = localizedText(this, x + w / 2, y + 34, label, {
      fontSize: '17px', color: '#f6e7c8', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(2);
    sign.setShadow(0, 2, '#283d42', 3);
  }

  private drawForeground(g: Phaser.GameObjects.Graphics): void {
    for (const [x, y] of [[90, 632], [295, 665], [540, 642], [780, 668], [1350, 646], [1490, 651]] as Array<[number, number]>) {
      g.fillStyle(0x28514a).fillCircle(x, y, 26).fillCircle(x + 18, y - 12, 21).fillCircle(x - 16, y - 10, 19);
      g.fillStyle(0xc6d382).fillCircle(x + 8, y - 19, 4).fillCircle(x - 10, y - 5, 3);
    }
    g.fillStyle(0xb67955).fillRect(980, 650, 95, 32);
    g.fillStyle(0x805248).fillRect(982, 681, 8, 38).fillRect(1068, 681, 8, 38);
  }

  private createCharacters(): void {
    this.player = this.add.container(actOneLevel.spawn.x, actOneLevel.spawn.y).setDepth(12);
    this.playerSprites = {
      back: this.add.image(0, -72, 'act-one-player').setDisplaySize(108, 150),
      left: this.add.image(0, -72, 'player-left').setDisplaySize(118, 150).setVisible(false),
      right: this.add.image(0, -72, 'player-right').setDisplaySize(118, 150).setVisible(false),
    };
    this.player.add(Object.values(this.playerSprites));
    this.lampGlow = this.add.circle(823, 603, 205, 0xf5c565, 0.18).setDepth(21);
    this.lampGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.makePerson(420, 510, 0x8b654e, 0x355b67, 0xf3bf64).setDepth(7).setScale(1.1);
    this.makePerson(1110, 485, 0x764e42, 0x535c7c, 0xe1846b).setDepth(7).setScale(1.1);
    this.makePerson(1155, 485, 0x9a715d, 0x605174, 0xe1846b).setDepth(7).setScale(1.1);

    for (const event of actOneEvents) {
      const marker = this.add.container(event.x, event.y - 45).setDepth(8);
      const ring = this.add.circle(0, 0, 17, event.palette, 0.24);
      const dot = this.add.circle(0, 0, 6, event.palette, 1);
      const alert = localizedText(this, 0, -39, '!', { fontSize: '39px', color: '#fff4bd', fontStyle: 'bold', stroke: '#703e31', strokeThickness: 7 }).setOrigin(0.5);
      marker.add([ring, dot, alert]).setVisible(false);
      this.tweens.add({ targets: ring, scale: 1.35, alpha: 0.06, yoyo: true, repeat: -1, duration: 1200 });
      this.tweens.add({ targets: alert, y: -48, yoyo: true, repeat: -1, duration: 560, ease: 'Sine.InOut' });
      this.eventMarkers.set(event.id, marker);
    }
  }

  private makePerson(x: number, y: number, skin: number, clothes: number, accent: number, hasLamp = false): Phaser.GameObjects.Container {
    const person = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 17, 34, 12, 0x13212c, 0.35);
    const body = this.add.ellipse(0, 1, 29, 37, clothes);
    const head = this.add.circle(0, -23, 14, skin);
    const hair = this.add.arc(0, -27, 15, 188, 352, false, 0x2a2228);
    const collar = this.add.rectangle(0, -7, 15, 8, accent);
    person.add([shadow, body, head, hair, collar]);
    if (hasLamp) {
      const arm = this.add.line(13, 4, 0, 0, 12, 12, 0xf0d1a8, 4);
      const lamp = this.add.rectangle(17, 15, 10, 13, 0xf5c565);
      person.add([arm, lamp]);
    }
    return person;
  }

  private createHud(): void {
    const hud = this.add.container(32, 29).setDepth(50);
    const plate = this.add.rectangle(0, 0, 470, 112, 0x142533, 0.91).setOrigin(0).setStrokeStyle(1, 0x5b7e81, 0.8);
    const label = localizedText(this, 20, 13, t('deskLabel', { name: getPlayerName() }), { fontSize: '16px', color: '#e9c979', letterSpacing: 1 });
    const sceneTitle = localizedText(this, 20, 39, t('actOne'), { fontSize: '27px', color: '#f7e7c1', fontStyle: 'bold' });
    const sub = localizedText(this, 20, 79, t('oil'), { fontSize: '16px', color: '#9fc1b6' });
    const oilBack = this.add.rectangle(88, 89, 290, 14, 0x263e47).setOrigin(0, 0.5);
    this.oilFill = this.add.rectangle(88, 89, 290, 14, 0xf1bd57).setOrigin(0, 0.5);
    this.oilText = localizedText(this, 392, 78, '100%', { fontSize: '16px', color: '#f7e7c1' });
    hud.add([plate, label, sceneTitle, sub, oilBack, this.oilFill, this.oilText]);

    this.statusText = localizedText(this, WIDTH - 38, 34, t('firstPrompt'), {
      fontSize: '18px', color: '#d6ebdf', backgroundColor: '#142533cc', padding: { x: 16, y: 11 },
    }).setOrigin(1, 0).setDepth(50);

    this.prompt = localizedText(this, WIDTH / 2, 785, t('controls'), {
      fontSize: '18px', color: '#f7e7c1', backgroundColor: '#142533d9', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(50);

    this.actionButton = this.createActionButton();
  }

  private createActionButton(): Phaser.GameObjects.Container {
    const button = this.add.container(WIDTH / 2, 744).setDepth(52).setVisible(false);
    const card = this.add.rectangle(0, 0, 236, 58, 0xf2d79c).setStrokeStyle(3, 0x4a5551).setInteractive({ useHandCursor: true });
    const text = localizedText(this, 0, 0, t('captureTitle'), { fontSize: '22px', color: '#26353b', fontStyle: 'bold' }).setOrigin(0.5);
    card.on('pointerdown', () => this.captureNearby());
    card.on('pointerover', () => card.setFillStyle(0xffe8ad));
    card.on('pointerout', () => card.setFillStyle(0xf2d79c));
    button.add([card, text]);
    return button;
  }

  private createLight(): void {
    this.darkness = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.34).setDepth(20);
    this.updateLightMask();
  }

  private updateLightMask(): void {
    if (!this.player) return;
    this.lampGlow.setPosition(this.player.x + 22, this.player.y + 10);
  }

  private movePlayer(delta: number): void {
    let dx = 0;
    let dy = 0;
    const wasd = keyboardDirection({
      W: this.wasd.W?.isDown ?? false,
      A: this.wasd.A?.isDown ?? false,
      S: this.wasd.S?.isDown ?? false,
      D: this.wasd.D?.isDown ?? false,
    });
    if (this.keys.left?.isDown) dx -= 1;
    if (this.keys.right?.isDown) dx += 1;
    if (this.keys.up?.isDown) dy -= 1;
    if (this.keys.down?.isDown) dy += 1;
    dx += wasd.x;
    dy += wasd.y;

    if (dx !== 0 || dy !== 0) {
      this.setFacing(resolveFacing({ x: dx, y: dy }, { x: 0, y: 0 }, this.playerFacing));
      const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale((MOVE_SPEED * delta) / 1000);
      const target = constrainToWalkable({ x: this.player.x + direction.x, y: this.player.y + direction.y }, actOneLevel);
      this.playerTarget.set(target.x, target.y);
    }

    const safeTarget = constrainToWalkable({ x: this.playerTarget.x, y: this.playerTarget.y }, actOneLevel);
    const target = new Phaser.Math.Vector2(safeTarget.x, safeTarget.y);
    const position = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const distance = Phaser.Math.Distance.BetweenPoints(position, target);
    if (distance > 2) {
      const step = Math.min(distance, (MOVE_SPEED * delta) / 1000);
      position.lerp(target, step / distance);
      this.player.setPosition(position.x, position.y);
    }
    this.lampGlow.setPosition(this.player.x + 23, this.player.y + 18);
  }

  private setFacing(facing: PlayerFacing): void {
    this.playerFacing = facing;
    (Object.keys(this.playerSprites) as PlayerFacing[]).forEach((key) => this.playerSprites[key].setVisible(key === facing));
  }

  private isKeyboardHeld(): boolean {
    return Boolean(this.keys.left?.isDown || this.keys.right?.isDown || this.keys.up?.isDown || this.keys.down?.isDown
      || this.wasd.W?.isDown || this.wasd.A?.isDown || this.wasd.S?.isDown || this.wasd.D?.isDown);
  }

  private updateLamp(delta: number): void {
    if (this.state.phase !== 'roam') return;
    this.state = drainLamp(this.state, delta * 0.0014);
    this.oilFill.width = 240 * (this.state.lampOil / 100);
    this.oilText.setText(`${Math.ceil(this.state.lampOil)}%`);
    if (this.state.phase === 'replay') {
      this.actionButton.setVisible(false);
      this.statusText.setText(t('lampOut'));
      this.prompt.setText(t('restart'));
    }
  }

  private updateInteraction(): void {
    for (const event of actOneEvents) {
      const revealed = !this.state.resolvedEventIds.includes(event.id)
        && isClueRevealed({ x: this.player.x + 23, y: this.player.y + 18 }, { x: event.x, y: event.y }, 205);
      this.eventMarkers.get(event.id)?.setVisible(revealed);
    }
    const nearby = actOneEvents.find((event) => !this.state.resolvedEventIds.includes(event.id)
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, event.x, event.y) < INTERACTION_DISTANCE) ?? null;
    this.currentNearby = nearby;
    this.actionButton.setVisible(Boolean(nearby));
    if (nearby) {
      this.prompt.setText(t('discovered', { title: localizedEvent(nearby.id).title }));
      this.statusText.setText(t('approachForEvidence'));
    } else if (this.state.phase === 'roam') {
      this.prompt.setText(t('idleControls'));
      this.statusText.setText(t('firstPrompt'));
    }
  }

  private captureNearby(): void {
    if (!this.currentNearby) return;
    const event = this.currentNearby;
    const nextState = captureEvent(this.state, event.id);
    if (nextState === this.state) return;
    this.state = nextState;
    this.actionButton.setVisible(false);
    this.eventMarkers.get(event.id)?.setVisible(false);
    this.showEvidenceCard(event);
  }

  private showEvidenceCard(event: ActEvent): void {
    const copy = localizedEvent(event.id);
    const layer = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(70);
    const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x071019, 0.62).setInteractive();
    const panel = this.add.rectangle(0, 0, 690, 520, 0xf6edd9).setStrokeStyle(4, 0x31474c);
    const strap = this.add.rectangle(0, -215, 690, 48, event.palette);
    const headline = localizedText(this, 0, -214, t('evidenceFile'), { fontSize: '20px', color: '#183039', letterSpacing: 8 }).setOrigin(0.5);
    const title = localizedText(this, -278, -139, copy.title, { fontSize: '38px', color: '#20383d', fontStyle: 'bold' });
    const witness = localizedText(this, -278, -84, copy.witness, { fontSize: '18px', color: '#66756f' });
    const category = localizedText(this, -278, -111, t(event.caseCategory === 'academic-integrity' ? 'academic' : 'ordinary'), { fontSize: '15px', color: '#7e8b80' });
    const description = localizedText(this, -278, -42, copy.description, { fontSize: '21px', color: '#303d3b', wordWrap: { width: 552 }, lineSpacing: 8 });
    const instruction = localizedText(this, 0, 114, t('classify'), { fontSize: '19px', color: '#48605d' }).setOrigin(0.5);
    layer.add([shade, panel, strap, headline, title, category, witness, description, instruction]);

    classificationLabels.forEach((choice, index) => {
      const x = -210 + index * 210;
      const card = this.add.rectangle(x, 212, 184, 128, choice.color, 0.96).setStrokeStyle(3, 0xffffff, 0.65).setInteractive({ useHandCursor: true });
      const label = localizedText(this, x, 191, t(choice.title), { fontSize: '21px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      const sub = localizedText(this, x, 232, t(choice.sub), { fontSize: '13px', color: '#ffffff', align: 'center', wordWrap: { width: 154 } }).setOrigin(0.5);
      card.on('pointerover', () => card.setScale(1.04));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => this.resolveEvidence(layer, event, choice.id));
      layer.add([card, label, sub]);
    });
  }

  private resolveEvidence(layer: Phaser.GameObjects.Container, event: ActEvent, classification: Classification): void {
    const result = classifyEvidence(this.state, event.id, classification);
    this.state = result.state;
    if (result.outcome === 'ignored') return;
    layer.destroy(true);
    this.oilFill.width = 240 * (this.state.lampOil / 100);
    this.oilText.setText(`${Math.ceil(this.state.lampOil)}%`);

    const correct = result.outcome === 'correct';
    const copy = localizedEvent(event.id);
    const message = correct ? copy.correctConsequence : copy.incorrectConsequence;
    const banner = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(80);
    const back = this.add.rectangle(0, 0, 680, 180, correct ? 0x315f57 : 0x7b4149, 0.97).setStrokeStyle(3, correct ? 0xa8d7bb : 0xf0a399);
    const stamp = localizedText(this, 0, -48, correct ? t('done') : t('redline'), { fontSize: '32px', color: '#fff2d5', fontStyle: 'bold' }).setOrigin(0.5);
    const body = localizedText(this, 0, 11, message, { fontSize: '20px', color: '#fff2d5', align: 'center', wordWrap: { width: 565 }, lineSpacing: 7 }).setOrigin(0.5);
    const close = localizedText(this, 0, 66, t('continue'), { fontSize: '16px', color: '#dce9dc' }).setOrigin(0.5);
    banner.add([back, stamp, body, close]);
    this.input.once('pointerdown', () => {
      banner.destroy(true);
      if (this.state.resolvedEventIds.length === actOneEvents.length) {
        this.state = { ...this.state, phase: 'replay' };
        this.actionButton.setVisible(false);
        this.statusText.setText(t('archived'));
        this.prompt.setText(t('nextSoon'));
        this.time.delayedCall(680, () => this.transitionToPatch());
      }
    });
  }

  private showIntro(): void {
    const intro = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(90);
    const shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x071019, 0.74).setInteractive();
    const frame = this.add.rectangle(0, 0, 710, 375, 0x173342, 0.97).setStrokeStyle(3, 0xdeb86a);
    const kicker = localizedText(this, 0, -132, t('actOneKicker'), { fontSize: '17px', color: '#e9c979', letterSpacing: 5 }).setOrigin(0.5);
    const title = localizedText(this, 0, -74, t('actOneTitle'), { fontSize: '47px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5);
    const copy = localizedText(this, 0, 7, t('actOneBody'), {
      fontSize: '21px', color: '#d8e4dc', align: 'center', lineSpacing: 9,
    }).setOrigin(0.5);
    const cue = localizedText(this, 0, 153, t('startingPatrol'), { fontSize: '19px', color: '#2d3f43', backgroundColor: '#f4cf79', padding: { x: 30, y: 12 } }).setOrigin(0.5);
    intro.add([shade, frame, kicker, title, copy, cue]);
    this.tweens.add({ targets: intro, alpha: 0, delay: 1450, duration: 360, onComplete: () => intro.destroy(true) });
  }

  private transitionToPatch(): void {
    this.cameras.main.fadeOut(520, 7, 16, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('next-patch'));
  }
}
