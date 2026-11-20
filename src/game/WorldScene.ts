import Phaser from 'phaser';
import { createWorldFruitLayout, fruitDescriptions, QUIZ_COOLDOWN_MS, cooldownSeconds, questionDifficulty, type WorldFruit } from './fruit-world';
import { getSpirit } from './spirits';
import { thirdActSteps, completeThirdActStep, thirdActComplete } from './act-three';
import { getChapterFruitSpots, spiritQuestions, spiritNames, fruitNames, type AvailableSpirit } from './chapter-fruits';
import clarityFruit from '../assets/fruit-clarity.png';
import testimonyFruit from '../assets/fruit-testimony.png';
import boundaryFruit from '../assets/fruit-boundary.png';
import baizeGrowing from '../assets/spirit-baize-growing-walk.png';
import baizeGuardian from '../assets/spirit-baize-guardian-walk.png';
import pixiuWalk from '../assets/spirit-pixiu-young-walk.png';
import pixiuGrowing from '../assets/spirit-pixiu-growing-walk.png';
import pixiuGuardian from '../assets/spirit-pixiu-guardian-walk.png';
import { getLocale, localizedText, t, type CopyKey } from './localization';
import { canFastTravelTo, isChapterComplete } from './progression';
import { getPlayerName } from './profile';
import { createActTwoState, completeActTwoStep, getActTwoNextStep, isActTwoComplete, type ActTwoStep } from './act-two';
import baizeRewardArt from '../assets/spirit-baize-evolution.png';
import baizeWalk from '../assets/spirit-baize-young-walk-v3.png';
import { getSideWalkSprite } from './player-animation';
import { wrapCjkText } from './text-layout';
import { hitsButton, toGamePoint } from './ui-hit-test';
import { claimSnack, feedCompanion, getCompanionGrowthStage, getCompanionPose, getCompanionTrailPoint, type CompanionProgress, type TrailPoint } from './companion';
import { setMusicZone } from './music';
import { addWaystoneSign } from './waystone-sign';
import { loadCompanionForms, applyCompanionForm } from './companion-art';
import { getDashedRouteSegments, getPathArrowAngle, getReachableRouteTarget, remainingHints } from './help-navigation';
import { canOccupyWorldPosition, findWorldPath, getFeetDepth, getWallFrontDepth, getWallOcclusionAlpha, isMapBoundary, moveAlongWalkableAxes } from './world-geometry';
import {
  districtMaps,
  DISTRICT_HEIGHT,
  DISTRICT_WIDTH,
  getPortalDestinations,
  companionSnackSpots,
  unlocked,
  worldInteractions,
  type InteractionChoice,
  type RegionId,
  type WorldInteraction,
  type WorldPortal,
} from './world-data';
import mapOverview from '../assets/macau-investigation-world.png';
import hqBackground from '../assets/district-hq.png';
import oldTownBackground from '../assets/district-old-town.png';
import campusBackground from '../assets/district-campus.png';
import harborBackground from '../assets/district-harbor.png';
import hillBackground from '../assets/district-hill.png';
import npcAtlas from '../assets/investigation-npc-atlas.png';
import playerBack from '../assets/player-lantern.png';
import playerLeft from '../assets/player-left.png';
import playerRight from '../assets/player-right.png';
import playerFront from '../assets/player-front-full-optimized.png';
import playerWalkCycle from '../assets/player-action-sheet.png';
import playerSideApproved from '../assets/player-side-walk-v2.png';
import xiezhiGuardian from '../assets/xiezhi-guardian.png';
import xiezhiSpriteSheet from '../assets/xiezhi-sprite-sheet.png';
import rongJieWorld from '../assets/rong-jie-world.png';
import rongJieExpressions from '../assets/rong-jie-expressions.png';
import spiritBiscuit from '../assets/spirit-biscuit.png';
import protagonistExpressions from '../assets/character-protagonist-expressions.png';

const WIDTH = 1600;
const HEIGHT = 900;
const MOVE_SPEED = 300;
const INTERACT_RADIUS = 120;
const NPC_CELL = 443;
const NPC_DISPLAY_SIZE = 132;
const PLAYER_DISPLAY_HEIGHT = 180;
const PLAYER_DISPLAY_WIDTH: Record<Facing, number> = { front: 119, back: 118, left: 123, right: 123 };
const LIGHT_SCALE = 0.5;
const HELP_LIMIT = 3;

const backgroundAssets: Record<RegionId, string> = {
  hq: hqBackground,
  oldTown: oldTownBackground,
  campus: campusBackground,
  harbor: harborBackground,
  hill: hillBackground,
};

type Facing = 'front' | 'back' | 'left' | 'right';
interface Objective { key: CopyKey; complete: boolean; target?: string; title?: string }

export class WorldScene extends Phaser.Scene {
  private chapter: 1 | 2 | 3 = 1;
  private selectedSpirit: AvailableSpirit = 'xiezhi';
  private spiritProgress: Record<AvailableSpirit, CompanionProgress> = {
    xiezhi: { claimedSnackIds: [], snacks: 0, fed: 0 },
    baize: { claimedSnackIds: [], snacks: 0, fed: 0 },
    pixiu: { claimedSnackIds: [], snacks: 0, fed: 0 },
  };
  private thirdSteps: string[] = [];
  private thirdReward = false;
  private pixiuFollower?: Phaser.GameObjects.Sprite;
  private get companionProgress(): CompanionProgress { return this.spiritProgress[this.selectedSpirit]; }
  private set companionProgress(value: CompanionProgress) { this.spiritProgress[this.selectedSpirit] = value; }

  private fruitLayout: WorldFruit[] | null = null;
  private quizRetryAt = 0;
  private quizTimer?: Phaser.GameObjects.Text;
  private activeQuestionIndex = 0;
  private correctFirst = true;

  private availableFruitSpots() {
    if (!this.fruitLayout) {
      let seed = Math.floor(Math.random() * 4294967296);
      try {
        const saved = localStorage.getItem('under-shadow-fruit-layout-seed-v1');
        if (saved !== null && Number.isFinite(Number(saved))) seed = Number(saved);
        localStorage.setItem('under-shadow-fruit-layout-seed-v1', String(seed));
      } catch { /* Keep stable positions for this session. */ }
      this.fruitLayout = createWorldFruitLayout(seed);
    }
    return this.fruitLayout.filter((spot): spot is WorldFruit & { spiritId: AvailableSpirit } => spot.act <= this.chapter && spot.act <= 3 && !this.spiritProgress[spot.spiritId as AvailableSpirit].claimedSnackIds.includes(spot.id));
  }

  private ownsSpirit(id: AvailableSpirit): boolean {
    return id === 'xiezhi' ? this.companionUnlocked : id === 'baize' ? this.secondAct.rewardClaimed : this.thirdReward;
  }

  private secondAct = createActTwoState();
  private chapterTitle?: Phaser.GameObjects.Text;
  private secondActConcluded = false;
  private secondActRewardPage = false;
  private baizeFollower?: Phaser.GameObjects.Sprite;
  private area: RegionId = 'hq';
  private mapLayer!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Container;
  private areaActors: Phaser.GameObjects.Container[] = [];
  private wallFronts: Phaser.GameObjects.Image[] = [];
  private portalMarkers: Array<{ portal: WorldPortal; glow: Phaser.GameObjects.Ellipse; slab: Phaser.GameObjects.Rectangle; inset: Phaser.GameObjects.Rectangle; rune: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }> = [];
  private actorSprite!: Phaser.GameObjects.Sprite;
  private facing: Facing = 'back';
  private walking = false;
  private gaitDistance = 0;
  private moveTarget = new Phaser.Math.Vector2(1190, 1120);
  private path: Phaser.Math.Vector2[] = [];
  private pathIndex = 0;
  private touchAxis = new Phaser.Math.Vector2();
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private lanternTexture!: Phaser.Textures.CanvasTexture;
  private lastLanternDraw = 0;
  private lastLanternX = Number.NaN;
  private lastLanternY = Number.NaN;
  private portalGuide!: Phaser.GameObjects.Text;
  private walkHint: Phaser.GameObjects.Container | null = null;
  private companion: Phaser.GameObjects.Sprite | null = null;
  private companionTrail: TrailPoint[] = [];
  private companionUnlocked = false;
  private companionPhase = 0;
  private companionLayer: Phaser.GameObjects.Container | null = null;
  private companionPanelMode: 'intro' | 'quiz' | 'result' | 'feed' = 'intro';
  private companionLastAnswerCorrect = false;
  private activeSnackId: string | null = null;
  private snackMarkers = new Map<string, Phaser.GameObjects.Container>();
  private mapToggle!: Phaser.Input.Keyboard.Key;
  private notebookToggle!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private helpKey!: Phaser.Input.Keyboard.Key;
  private miniGraphics!: Phaser.GameObjects.Graphics;
  private currentAreaText!: Phaser.GameObjects.Text;
  private objectiveRows: Phaser.GameObjects.Text[] = [];
  private objectiveStatus!: Phaser.GameObjects.Text;
  private objectiveScrollText: Phaser.GameObjects.Text | null = null;
  private objectiveScroll = 0;
  private objectivePointerStartY: number | null = null;
  private objectiveSignature = '';
  private lastEvidenceAt = -10000;
  private objectiveTarget: string | undefined;
  private interactions = new Map<string, Phaser.GameObjects.Container>();
  private alerts = new Map<string, Phaser.GameObjects.Text>();
  private clues: CopyKey[] = [];
  private visited = new Set<string>();
  private visitedAreas = new Set<RegionId>(['hq']);
  private areaPositions = new Map<RegionId, { x: number; y: number }>();
  private tutorial = { moved: false, mentor: false, supervisor: false, file: false, notebook: false, map: false, helpUsed: false, oldTown: false, informant: false };
  private helpUses = 0;
  private currentGameUi = '';
  private activeInteraction: WorldInteraction | null = null;
  private dialogueLayer: Phaser.GameObjects.Container | null = null;
  private responseMode = false;
  private dialogueEmotion: 'neutral' | 'warm' | 'concerned' = 'neutral';
  private mapLayerUi: Phaser.GameObjects.Container | null = null;
  private notebookLayer: Phaser.GameObjects.Container | null = null;
  private helpLayer: Phaser.GameObjects.Container | null = null;
  private chapterLayer: Phaser.GameObjects.Container | null = null;
  private chapterPage: 'law' | 'next' = 'law';
  private semiAutoArrow!: Phaser.GameObjects.Container;
  private semiAutoTarget: Phaser.Math.Vector2 | null = null;
  private semiAutoRoute: Phaser.Math.Vector2[] = [];
  private semiAutoRefreshAt = 0;
  private semiAutoArrivalMessage: CopyKey = 'semiArrivedInteraction';
  private completionShown = false;
  private pendingAchievement = false;
  private harborHintShown = false;
  private transitioning = false;
  private nearbyInteraction: WorldInteraction | null = null;
  private nearbyPortal: WorldPortal | null = null;
  private notifiedPortal: WorldPortal | null = null;
  private pendingInteraction: WorldInteraction | null = null;

  constructor() { super('world'); }

  private get touchLayout(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  private syncGameUi(): void {
    const mode = this.dialogueLayer || this.companionLayer ? 'dialogue' : this.helpLayer ? 'help' : this.mapLayerUi ? 'map' : this.notebookLayer ? 'notebook' : this.chapterLayer ? 'achievement' : 'world';
    if (mode === this.currentGameUi) return;
    this.currentGameUi = mode;
    document.body.dataset.gameUi = mode;
  }

  private spawnCompanion(): void {
    if (this.companion) return;
    const stage = getCompanionGrowthStage(this.companionProgress.fed);
    this.companion = this.add.sprite(this.player.x - 55, this.player.y + 12, 'xiezhi-sprites', 0)
      .setDisplaySize(stage.size, stage.size).setOrigin(0.5, 1).setDepth(getFeetDepth(this.player.y + 12));
    this.companionTrail = [{ x: this.player.x - 55, y: this.player.y + 12 }];
  }

  private loadCompanionProgress(): void {
    try {
      const stored = JSON.parse(localStorage.getItem('under-shadow-xiezhi-v3') || 'null') as Partial<CompanionProgress> | null;
      if (stored && Array.isArray(stored.claimedSnackIds)) {
        this.companionProgress = { claimedSnackIds: stored.claimedSnackIds, snacks: Math.max(0, Number(stored.snacks) || 0), fed: Math.max(0, Number(stored.fed) || 0) };
      }
    } catch { /* A new in-memory progress record remains available. */ }
    try {
      const stored = JSON.parse(localStorage.getItem('under-shadow-species-fruits-v1') || 'null');
      if (stored) for (const id of ['xiezhi','baize','pixiu'] as AvailableSpirit[]) {
        const p = stored[id];
        if (p && Array.isArray(p.claimedSnackIds)) this.spiritProgress[id] = { claimedSnackIds: p.claimedSnackIds.filter((v: unknown) => typeof v === 'string'), snacks: Math.max(0, Number(p.snacks) || 0), fed: Math.max(0, Number(p.fed) || 0) };
      }
      else {
        // All rewards in the former shared system belonged to the first companion.
        this.spiritProgress.xiezhi.claimedSnackIds = this.spiritProgress.xiezhi.claimedSnackIds.map(id => id.includes(':') ? id : 'xiezhi:' + id);
      }
    } catch { /* Keep migrated legacy progress. */ }
  }

  private saveCompanionProgress(): void {
    try { localStorage.setItem('under-shadow-species-fruits-v1', JSON.stringify(this.spiritProgress)); localStorage.setItem('under-shadow-xiezhi-v3', JSON.stringify(this.spiritProgress.xiezhi)); } catch { /* Keep the current session playable. */ }
  }

  private updateCompanion(delta: number): void {
    if (this.baizeFollower) {
      const dx = this.player.x - 100 - this.baizeFollower.x;
      const dy = this.player.y + 32 - this.baizeFollower.y;
      const moving = this.walking;
      this.baizeFollower.setPosition(this.baizeFollower.x + dx * Math.min(1, delta / 220), this.baizeFollower.y + dy * Math.min(1, delta / 220));
      this.baizeFollower.setTexture('world-baize-' + getCompanionGrowthStage(this.spiritProgress.baize.fed).id, moving ? Math.floor(this.gaitDistance / 48) % 4 : 0).setDisplaySize(getCompanionGrowthStage(this.spiritProgress.baize.fed).size, getCompanionGrowthStage(this.spiritProgress.baize.fed).size * 724 / 543).setFlipX(this.facing === 'left').setDepth(getFeetDepth(this.baizeFollower.y));
    }
    if (this.pixiuFollower) {
      const p = this.pixiuFollower;
      p.x += (this.player.x + 90 - p.x) * Math.min(1, delta / 240);
      p.y += (this.player.y + 35 - p.y) * Math.min(1, delta / 240);
      const stage = getCompanionGrowthStage(this.spiritProgress.pixiu.fed);
      p.setTexture('world-pixiu-' + stage.id, this.walking ? Math.floor(this.gaitDistance / 48) % 4 : 0).setFlipX(this.facing === 'left').setDisplaySize(stage.size, stage.size * 724 / 543).setDepth(getFeetDepth(p.y));
    }
    const companion = this.companion;
    if (!companion) return;
    const latest = this.companionTrail[this.companionTrail.length - 1];
    if (!latest || Math.hypot(this.player.x - latest.x, this.player.y - latest.y) > 9) {
      this.companionTrail.push({ x: this.player.x, y: this.player.y });
      if (this.companionTrail.length > 90) this.companionTrail.shift();
    }
    const target = getCompanionTrailPoint(this.player, this.companionTrail, 78);
    const follow = Math.min(1, delta / 130);
    const dx = target.x - companion.x;
    const dy = target.y - companion.y;
    // Animate gait only while the player is actively walking. The pet may
    // finish easing into place, but its legs stop with the player's input.
    const moving = this.walking;
    companion.setPosition(companion.x + dx * follow, companion.y + dy * follow);
    const pose = getCompanionPose(dx, dy, moving, this.companionPhase);
    if (moving) this.companionPhase += delta / 240;
    const col = ({ front: 0, left: 1, right: 2, back: 3 } as const)[this.facing];
    const row = moving ? (Math.floor(this.companionPhase) % 2) + 1 : (Math.floor(this.time.now / 900) % 5 === 0 ? 3 : 0);
    const stage = getCompanionGrowthStage(this.spiritProgress.xiezhi.fed);
    companion.setTexture('xiezhi-sprites', row * 4 + col).setFlipX(false).setDisplaySize(stage.size, stage.size);
    applyCompanionForm(companion, this.spiritProgress.xiezhi.fed, this.facing, moving, this.companionPhase);
    companion.setDepth(getFeetDepth(companion.y));
    companion.setAlpha(getWallOcclusionAlpha(companion.x, companion.y, districtMaps[this.area].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
  }

  private resetCompanionAfterTravel(): void {
    this.baizeFollower?.setPosition(this.player.x - 100, this.player.y + 32);
    this.pixiuFollower?.setPosition(this.player.x + 90, this.player.y + 35);
    this.companionTrail = [{ x: this.player.x - 55, y: this.player.y + 12 }];
    this.companion?.setPosition(this.player.x - 55, this.player.y + 12);
  }

  private unlockCompanion(): void {
    if (this.companionUnlocked) return;
    this.companionUnlocked = true;
    try { localStorage.setItem('under-shadow-xiezhi-chapter1-claimed-v2', 'true'); } catch { /* The reward remains available during this session. */ }
    this.spawnCompanion();
    this.addSnackPickups(this.area);
  }

  preload(): void {
    for (const [key, asset] of Object.entries({ 'world-baize-young': baizeWalk, 'world-baize-growing': baizeGrowing, 'world-baize-guardian': baizeGuardian, 'world-pixiu-young': pixiuWalk, 'world-pixiu-growing': pixiuGrowing, 'world-pixiu-guardian': pixiuGuardian })) this.load.spritesheet(key, asset, { frameWidth: 543, frameHeight: 724 });
    this.load.image('fruit-xiezhi', clarityFruit);
    this.load.image('fruit-baize', testimonyFruit);
    this.load.image('fruit-pixiu', boundaryFruit);
    this.load.image('world-baize-reward', baizeRewardArt);
    loadCompanionForms(this);
    this.load.maxParallelDownloads = 4;
    this.load.on('progress', (progress: number) => {
      window.dispatchEvent(new CustomEvent('under-shadow-load-progress', { detail: { progress } }));
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      window.dispatchEvent(new CustomEvent('under-shadow-load-error', { detail: { file: file.src } }));
    });
    this.load.image('world-overview', mapOverview);
    this.load.spritesheet('npc-atlas', npcAtlas, { frameWidth: NPC_CELL, frameHeight: NPC_CELL });
    this.load.image('rong-jie-world', rongJieWorld);
    this.load.spritesheet('rong-jie-expressions', rongJieExpressions, { frameWidth: 724, frameHeight: 724 });
    this.load.spritesheet('protagonist-expressions', protagonistExpressions, { frameWidth: 724, frameHeight: 724 });
    this.load.image('player-back', playerBack);
    this.load.image('player-left', playerLeft);
    this.load.image('player-right', playerRight);
    this.load.image('player-front', playerFront);
    this.load.spritesheet('player-walk-cycle', playerWalkCycle, { frameWidth: 313, frameHeight: 313 });
    this.load.spritesheet('player-side-approved', playerSideApproved, { frameWidth: 627, frameHeight: 627 });
    this.load.image('xiezhi-guardian', xiezhiGuardian);
    this.load.image('spirit-biscuit', spiritBiscuit);
    // The generated 4x4 sheet is 1254px square, so each cell is 313px; 256px
    // cuts through the creatures and makes a single pet render as fragments.
    this.load.spritesheet('xiezhi-sprites', xiezhiSpriteSheet, { frameWidth: 313, frameHeight: 313 });
    (Object.keys(backgroundAssets) as RegionId[]).forEach((id) => this.load.image(`district-${id}`, backgroundAssets[id]));
  }

  create(): void {
    document.body.dataset.gameUi = 'world';
    this.area = 'hq';
    this.mapLayer = this.add.container(0, 0).setDepth(0);
    this.player = this.add.container(1190, 1120).setDepth(getFeetDepth(1120));
    this.actorSprite = this.add.sprite(0, 0, 'player-walk-cycle', 12).setDisplaySize(PLAYER_DISPLAY_WIDTH.back, PLAYER_DISPLAY_HEIGHT).setOrigin(0.5, 1);
    this.player.add(this.actorSprite);
    this.syncPlayerPose();
    const arrowGlyph = this.add.graphics();
    arrowGlyph.fillStyle(0xffd04f, 1).lineStyle(5, 0x122b36, 1);
    arrowGlyph.beginPath().moveTo(0, -31).lineTo(-16, -5).lineTo(-6, -5).lineTo(-6, 20).lineTo(6, 20).lineTo(6, -5).lineTo(16, -5).closePath().fillPath().strokePath();
    this.semiAutoArrow = this.add.container(this.player.x, this.player.y - 194, [arrowGlyph]).setDepth(68).setVisible(false);
    this.routeGraphics = this.add.graphics().setDepth(4);
    if (this.textures.exists('world-lantern-mask')) this.textures.remove('world-lantern-mask');
    const lanternTexture = this.textures.createCanvas('world-lantern-mask', WIDTH * LIGHT_SCALE, HEIGHT * LIGHT_SCALE);
    if (!lanternTexture) throw new Error('Unable to create lantern light mask');
    this.lanternTexture = lanternTexture;
    this.add.image(WIDTH / 2, HEIGHT / 2, 'world-lantern-mask')
      .setDisplaySize(WIDTH, HEIGHT).setScrollFactor(0).setDepth(65);
    try { this.companionUnlocked = localStorage.getItem('under-shadow-xiezhi-chapter1-claimed-v2') === 'true'; } catch { this.companionUnlocked = false; }
    this.loadCompanionProgress();
    try { this.quizRetryAt = Number(localStorage.getItem('under-shadow-quiz-retry-at-v1')) || 0; } catch { /* No active cooldown. */ }
    for (const id of ['xiezhi','baize','pixiu'] as AvailableSpirit[]) {
      this.spiritProgress[id].claimedSnackIds = this.spiritProgress[id].claimedSnackIds.map(key => {
        const oldIndex = companionSnackSpots.findIndex(spot => key === spot.id || key === id + ':' + spot.id);
        return oldIndex < 0 ? key : id + ':fruit-' + oldIndex;
      });
    }
    this.saveCompanionProgress();
    this.populateArea(this.area);
    if (this.companionUnlocked) {
      this.spawnCompanion();
      this.addSnackPickups(this.area);
    }
    this.createHud();
    this.createDialogueControls();
    this.createInput();
    let savedChapterTwo = false;
    try { savedChapterTwo = ['2', '3'].includes(localStorage.getItem('under-shadow-current-chapter') || ''); } catch { /* Use explicit entry. */ }
    if (new URLSearchParams(window.location.search).has('act-two') || savedChapterTwo) {
      Object.keys(this.tutorial).forEach((key) => { (this.tutorial as Record<string, boolean>)[key] = true; });
      this.clues.push('clueAccounts');
      this.completionShown = true;
      let resumeThird = false;
      try { resumeThird = localStorage.getItem('under-shadow-current-chapter') === '3'; } catch { /* Use current chapter. */ }
      this.enterActTwo();
      if (resumeThird) this.enterThirdAct();
    }
    this.cameras.main.setBounds(0, 0, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(520, 7, 16, 25);
    this.showAreaBanner(t('districtHQ'));
    window.addEventListener('under-shadow-touch-axis', this.onTouchAxis as EventListener);
    window.addEventListener('under-shadow-action', this.onTouchAction as EventListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('under-shadow-touch-axis', this.onTouchAxis as EventListener);
      window.removeEventListener('under-shadow-action', this.onTouchAction as EventListener);
    });
    window.dispatchEvent(new CustomEvent('under-shadow-world-ready'));
  }

  update(_: number, delta: number): void {
    if (this.quizTimer?.active) {
      const seconds = cooldownSeconds(this.quizRetryAt, Date.now());
      this.quizTimer.setText(seconds ? '答錯冷卻中 · ' + seconds + ' 秒後可再試' : '每題答錯需冷卻30秒 · 果實會留在原地');
    }
    this.handleKeys();
    this.syncGameUi();
    if (!this.transitioning && !this.dialogueLayer && !this.companionLayer && !this.mapLayerUi && !this.notebookLayer && !this.helpLayer && !this.chapterLayer) this.movePlayer(delta);
    else if (this.walking) { this.walking = false; this.syncPlayerPose(); }
    if (this.pendingInteraction && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pendingInteraction.x, this.pendingInteraction.y) <= INTERACT_RADIUS) {
      this.pendingInteraction = null;
      this.showToast(t('arrivedInteract'));
    }
    this.player.setDepth(getFeetDepth(this.player.y));
    this.player.setAlpha(getWallOcclusionAlpha(this.player.x, this.player.y, districtMaps[this.area].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
    this.updateCompanion(delta);
    this.updateLanternLight();
    this.updateSemiAutoArrow();
    this.updateNearby();
    this.updateAlerts();
    this.updateObjectives();
    this.drawMiniMap();
  }

  private updateLanternLight(): void {
    const camera = this.cameras.main;
    const x = (this.player.x - camera.scrollX) * LIGHT_SCALE;
    const y = (this.player.y - 76 - camera.scrollY) * LIGHT_SCALE;
    if (Number.isFinite(this.lastLanternX) && this.time.now - this.lastLanternDraw < 50) return;
    if (Math.hypot(x - this.lastLanternX, y - this.lastLanternY) < 1.5) return;
    this.lastLanternDraw = this.time.now;
    this.lastLanternX = x;
    this.lastLanternY = y;

    const context = this.lanternTexture.getContext();
    const width = WIDTH * LIGHT_SCALE;
    const height = HEIGHT * LIGHT_SCALE;
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(4, 12, 23, 0.57)';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'destination-out';
    const radius = 190;
    const beam = context.createRadialGradient(x, y, 12, x, y, radius);
    beam.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
    beam.addColorStop(0.28, 'rgba(0, 0, 0, 0.87)');
    beam.addColorStop(0.7, 'rgba(0, 0, 0, 0.36)');
    beam.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = beam;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    context.globalCompositeOperation = 'source-over';
    const warmth = context.createRadialGradient(x, y, 0, x, y, radius * 0.75);
    warmth.addColorStop(0, 'rgba(255, 197, 94, 0.055)');
    warmth.addColorStop(1, 'rgba(255, 197, 94, 0)');
    context.fillStyle = warmth;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    this.lanternTexture.refresh();
  }

  private populateArea(area: RegionId): void {
    setMusicZone(area);
    this.areaActors.forEach((actor) => actor.destroy(true));
    this.areaActors = [];
    this.wallFronts.forEach((wall) => wall.destroy());
    this.wallFronts = [];
    this.portalMarkers.forEach(({ glow }) => this.tweens.killTweensOf(glow));
    this.portalMarkers = [];
    this.mapLayer.removeAll(true);
    this.walkHint = null;
    this.interactions.clear();
    this.alerts.clear();
    this.snackMarkers.clear();
    const map = districtMaps[area];
    const background = this.add.image(0, 0, `district-${area}`, '__BASE').setOrigin(0).setDisplaySize(DISTRICT_WIDTH, DISTRICT_HEIGHT);
    this.mapLayer.add(background);
    this.mapLayer.add(this.add.rectangle(DISTRICT_WIDTH / 2, DISTRICT_HEIGHT / 2, DISTRICT_WIDTH, DISTRICT_HEIGHT, 0x10202c, 0.035));

    map.blockers.forEach((block) => {
      const wall = this.add.rectangle(block.x + block.width / 2, block.y + block.height / 2, block.width, block.height, 0x101820, 0.001);
      this.mapLayer.add(wall);
    });
    this.addWallFronts(area, map.blockers);

    if (area === 'hq') this.addGroundWalkHint();

    worldInteractions.filter((item) => item.region === area).forEach((item) => this.addInteraction(item));
    this.addSnackPickups(area);
    map.portals.forEach((portal) => this.addPortal(portal));
    this.cameras.main.setBounds(0, 0, DISTRICT_WIDTH, DISTRICT_HEIGHT);
  }

  private addSnackPickups(area: RegionId): void {
    this.availableFruitSpots()
      .filter((spot) => spot.region === area && !this.snackMarkers.has(spot.id))
      .forEach((spot) => {
        const marker = this.add.container(spot.x, spot.y).setDepth(getFeetDepth(spot.y) + 1);
        const glow = this.add.circle(0, -28, 45, 0xffca61, 0.20);
        const food = this.add.image(0, -28, 'fruit-' + spot.spiritId).setDisplaySize(68, 68);
        const label = localizedText(this, 0, 19, this.ownsSpirit(spot.spiritId) ? spiritNames[spot.spiritId] + ' · ' + fruitNames[spot.spiritId] : '神秘的果實 · 用途未知', { fontSize: '14px', color: '#fff0bd', backgroundColor: '#102631dd', padding: { x: 8, y: 4 } }).setOrigin(.5);
        marker.add([glow, food, label]);
        this.tweens.add({ targets: [glow, food], y: '+=7', duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.areaActors.push(marker);
        this.snackMarkers.set(spot.id, marker);
      });
  }

  private addInteraction(item: WorldInteraction): void {
    const marker = this.add.container(item.x, item.y).setDepth(getFeetDepth(item.y));
    this.areaActors.push(marker);
    const characterHeight = item.id === 'case-file' ? 57 : item.id === 'mentor' ? 148 : NPC_DISPLAY_SIZE;
    if (item.id === 'case-file') {
      marker.add([
        this.add.ellipse(0, 12, 48, 16, 0x10171a, 0.36),
        this.add.rectangle(0, -38, 48, 57, 0xf0dfb3).setStrokeStyle(3, 0x6c614d).setAngle(-4),
        this.add.rectangle(-2, -49, 27, 3, 0x997448),
        this.add.rectangle(-2, -40, 27, 3, 0x997448),
        this.add.rectangle(-2, -31, 22, 3, 0x997448),
      ]);
    } else {
      const sprite = item.id === 'mentor'
        ? this.add.image(0, 0, 'rong-jie-world').setDisplaySize(100, 148).setOrigin(0.5, 1)
        : this.add.image(0, 0, 'npc-atlas', item.atlasCell).setDisplaySize(NPC_DISPLAY_SIZE, NPC_DISPLAY_SIZE).setOrigin(0.5, 1);
      marker.add([this.add.ellipse(0, 9, 42, 13, 0x10171a, 0.42), sprite]);
    }
    const tagWidth = Math.max(102, Math.min(200, t(item.name).length * 19 + 34));
    const tagY = -characterHeight - 19;
    const tag = this.add.rectangle(0, tagY, tagWidth, 31, 0x102631, 0.9).setStrokeStyle(1, 0xd5b86d, 0.75);
    const tagText = localizedText(this, 0, tagY, t(item.name), { fontSize: '15px', color: '#f7e7c1', align: 'center' }).setOrigin(0.5);
    const alert = localizedText(this, 0, tagY - 38, '!', { fontSize: '34px', color: '#fff0a8', fontStyle: 'bold', stroke: '#633d2f', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    marker.add([tag, tagText, alert]);
    this.interactions.set(item.id, marker);
    this.alerts.set(item.id, alert);
  }

  private addPortal(portal: WorldPortal): void {
    const marker = this.add.container(portal.x + portal.width / 2, portal.y + portal.height / 2);
    const unlocked = this.portalUnlocked(portal);
    const horizontal = portal.width > portal.height;
    const width = horizontal ? Math.min(148, portal.width - 16) : 82;
    const height = horizontal ? 78 : Math.min(144, portal.height - 20);
    const glow = this.add.ellipse(0, 0, width + 38, height + 26, unlocked ? 0xe5bb60 : 0x64737a, 0.18);
    const base = this.add.rectangle(0, height * 0.38, width + 18, 20, 0x34444a, 0.98).setStrokeStyle(2, 0xbda878, 0.9);
    const slab = this.add.rectangle(0, -3, width, height, unlocked ? 0x65706b : 0x535e63, 0.98).setStrokeStyle(4, unlocked ? 0xe0c57c : 0x8a9698, 0.95);
    const inset = this.add.rectangle(0, -3, width - 14, height - 14, 0x223b41, 0.96).setStrokeStyle(2, unlocked ? 0xf1d47f : 0x899394, 0.9);
    const rune = localizedText(this, 0, -height * 0.23, t('waystoneGlyph'), { fontSize: '28px', color: unlocked ? '#ffdf83' : '#aab4b1', fontStyle: 'bold' }).setOrigin(0.5);
    const label = localizedText(this, 0, height * 0.7 + 18, `${t(districtMaps[portal.target].label)} · ${t(unlocked ? 'portalReady' : 'portalLocked')}`, {
      fontSize: '15px', color: '#fff0bd', align: 'center', fontStyle: 'bold',
      backgroundColor: '#102631e8', padding: { x: 10, y: 5 },
    }).setOrigin(0.5);
    marker.add([
      glow, base, slab, inset, rune, label,
    ]);
    addWaystoneSign(this, marker, t(districtMaps[portal.target].label));
    this.mapLayer.add(marker);
    this.portalMarkers.push({ portal, glow, slab, inset, rune, label });
    this.tweens.add({ targets: glow, alpha: 0.06, scale: 1.12, yoyo: true, repeat: -1, duration: 1150, ease: 'Sine.InOut' });
  }

  private addWallFronts(area: RegionId, blockers: typeof districtMaps[RegionId]['blockers']): void {
    const texture = this.textures.get(`district-${area}`);
    const source = texture.getSourceImage() as HTMLImageElement;
    const scaleX = source.width / DISTRICT_WIDTH;
    const scaleY = source.height / DISTRICT_HEIGHT;
    blockers.filter((block) => !isMapBoundary(block, DISTRICT_WIDTH, DISTRICT_HEIGHT) && block.width < DISTRICT_WIDTH * 0.95 && block.height < DISTRICT_HEIGHT * 0.6)
      .forEach((block, index) => {
        const stripHeight = Math.min(58, Math.max(34, block.height * 0.13));
        const frameName = `front-${index}`;
        if (!texture.has(frameName)) texture.add(frameName, 0,
          Math.round(block.x * scaleX), Math.round((block.y + block.height - stripHeight) * scaleY),
          Math.round(block.width * scaleX), Math.round(stripHeight * scaleY));
        const front = this.add.image(block.x, block.y + block.height - stripHeight, `district-${area}`, frameName)
          .setOrigin(0)
          .setDisplaySize(block.width, stripHeight)
          .setDepth(getWallFrontDepth(block));
        this.wallFronts.push(front);
      });
  }

  private addGroundWalkHint(): void {
    const sign = this.add.container(1190, 1370).setDepth(4);
    const plate = this.add.rectangle(0, 0, 560, 74, 0x182d33, 0.78).setStrokeStyle(3, 0xdabb68, 0.8);
    const text = localizedText(this, 0, 0, t('groundWalkHint'), { fontSize: '23px', color: '#fff0c2', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    const arrow = this.add.triangle(0, -65, -18, -10, 18, -10, 0, 18, 0xffd476).setStrokeStyle(3, 0x17303b);
    sign.add([plate, text, arrow]);
    this.mapLayer.add(sign);
    this.walkHint = sign;
    this.tweens.add({ targets: arrow, y: -50, yoyo: true, repeat: -1, duration: 620, ease: 'Sine.InOut' });
  }

  private createHud(): void {
    const plate = this.add.rectangle(24, 24, 440, this.touchLayout ? 160 : 340, 0x10232e, 0.93).setOrigin(0).setStrokeStyle(2, 0x5b7e81, 0.9).setScrollFactor(0).setDepth(70);
    this.chapterTitle = localizedText(this, 46, 39, t('worldChapter'), { fontSize: '18px', color: '#e7c36d', letterSpacing: 2 }).setScrollFactor(0).setDepth(71);
    localizedText(this, 46, 68, t('objectiveHeading'), { fontSize: '23px', color: '#fff0d0', fontStyle: 'bold' }).setScrollFactor(0).setDepth(71);
    this.objectiveStatus = localizedText(this, 420, 73, '0/6', { fontSize: '14px', color: '#93bdb1' }).setOrigin(1, 0).setScrollFactor(0).setDepth(71);
    this.objectiveRows = Array.from({ length: this.touchLayout ? 1 : 7 }, (_, index) => localizedText(this, 50, 107 + index * 23, '', { fontSize: this.touchLayout ? '23px' : '15px', color: '#d9e3da', wordWrap: { width: 390 } }).setScrollFactor(0).setDepth(71));
    if (!this.touchLayout) {
      localizedText(this, 56, 274, '▲', { fontSize: '19px', color: '#ffdc79' }).setScrollFactor(0).setDepth(72);
      localizedText(this, 418, 274, '▼', { fontSize: '19px', color: '#ffdc79' }).setOrigin(1, 0).setScrollFactor(0).setDepth(72);
      this.objectiveScrollText = localizedText(this, 235, 275, '', { fontSize: '15px', color: '#a7c4b8' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(72);
    }
    this.currentAreaText = localizedText(this, WIDTH / 2, 26, '', { fontSize: '19px', color: '#f5d987', backgroundColor: '#102631dd', padding: { x: 20, y: 9 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(72);
    const miniBg = this.add.rectangle(WIDTH - 18, 18, 270, 206, 0x0d1d28, 0.94).setOrigin(1, 0).setStrokeStyle(2, 0x9b8455).setScrollFactor(0).setDepth(70);
    const miniImage = this.add.image(WIDTH - 28, 52, 'world-overview').setDisplaySize(248, 146).setOrigin(1, 0).setScrollFactor(0).setDepth(71);
    localizedText(this, WIDTH - 40, 28, t('mapLabel'), { fontSize: '15px', color: '#f1d17b', fontStyle: 'bold' }).setOrigin(1, 0).setScrollFactor(0).setDepth(72);
    this.miniGraphics = this.add.graphics().setScrollFactor(0).setDepth(73);
    localizedText(this, WIDTH - 40, 201, t('mapExpand'), { fontSize: '12px', color: '#c6d8ce' }).setOrigin(1, 0).setScrollFactor(0).setDepth(72);
    this.portalGuide = localizedText(this, WIDTH - 282, 237, '', {
      fontSize: '14px', color: '#f5e4bd', backgroundColor: '#102631ee',
      padding: { x: 11, y: 10 }, lineSpacing: 7,
    }).setScrollFactor(0).setDepth(72);
    const controls = localizedText(this, WIDTH / 2, HEIGHT - 30, `${t('moveHint')}     ${t('interactHint')}     ${t('notebookHint')}`, {
      fontSize: '15px', color: '#f7e7c1', backgroundColor: '#102631dd', padding: { x: 18, y: 9 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(70);
    if (!this.touchLayout) {
      const helpButton = this.add.graphics().setScrollFactor(0).setDepth(75);
      helpButton.fillStyle(0x183540, 0.98).fillRoundedRect(42, 294, 206, 48, 12);
      helpButton.lineStyle(2, 0xe7c36d, 1).strokeRoundedRect(42, 294, 206, 48, 12);
      localizedText(this, 64, 317, '✦', { fontSize: '24px', color: '#ffdc79' }).setOrigin(0.5).setScrollFactor(0).setDepth(76);
      localizedText(this, 151, 317, t('helpButton'), { fontSize: '17px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(76);
    }
    void miniBg; void controls;
    this.updateObjectives(true);
  }

  private createDialogueControls(): void {
    this.mapToggle = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.notebookToggle = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.helpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  }

  private createInput(): void {
    const keys = this.input.keyboard;
    keys?.addKeys('W,A,S,D');
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dialogueLayer || this.mapLayerUi || this.notebookLayer || pointer.wasTouch) return;
      const angleX = pointer.worldX - this.player.x;
      const angleY = pointer.worldY - this.player.y;
      if (Math.hypot(angleX, angleY) > 28) this.setFacing(this.facingFor(angleX, angleY));
    });
    this.game.canvas.addEventListener('pointerup', this.onCanvasPointerUp, true);
    this.game.canvas.addEventListener('pointerdown', this.onCanvasPointerDown, true);
    this.game.canvas.addEventListener('wheel', this.onCanvasWheel, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.canvas.removeEventListener('pointerup', this.onCanvasPointerUp, true);
      this.game.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown, true);
      this.game.canvas.removeEventListener('wheel', this.onCanvasWheel);
    });
    void keys;
  }

  private onCanvasPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const { x, y } = toGamePoint(event.clientX, event.clientY, bounds, WIDTH, HEIGHT);

    if (this.companionLayer) { this.handleCompanionPointer(x, y); return; }
    if (this.dialogueLayer) { this.handleDialoguePointer(x, y); return; }
    if (this.chapterLayer) { this.handleChapterPointer(x, y); return; }
    if (this.helpLayer) { this.handleHelpPointer(x, y); return; }
    if (this.mapLayerUi) { this.handleMapPointer(x, y); return; }
    if (this.notebookLayer) { this.handleNotebookPointer(x, y); return; }
    if (this.transitioning) return;
    if (x >= 24 && x <= 464 && y >= 24 && y <= (this.touchLayout ? 184 : 300)) {
      if (!this.touchLayout) {
        const swipe = this.objectivePointerStartY === null ? 0 : y - this.objectivePointerStartY;
        if (Math.abs(swipe) > 28) this.scrollObjectives(swipe < 0 ? 2 : -2);
        else if (y >= 260 && x < 150) this.scrollObjectives(-1);
        else if (y >= 260 && x > 330) this.scrollObjectives(1);
      }
      this.objectivePointerStartY = null;
      return;
    }
    this.objectivePointerStartY = null;
    if (!this.touchLayout && x >= 42 && x <= 246 && y >= 286 && y <= 344) { this.toggleHelp(); return; }
    if (x >= WIDTH - 280 && y <= 225) { this.toggleMap(); return; }

    const point = this.cameras.main.getWorldPoint(x, y);
    const pets: Array<[AvailableSpirit, Phaser.GameObjects.Sprite | null | undefined]> = [['baize', this.baizeFollower], ['pixiu', this.pixiuFollower]];
    for (const [id, pet] of pets) if (pet && Math.abs(point.x - pet.x) < 50 && point.y >= pet.y - 120 && point.y < pet.y + 18) { this.selectedSpirit = id; this.openCompanionPanel(); return; }
    if (this.companionUnlocked && this.companion && Math.abs(point.x - this.companion.x) < 70 && point.y >= this.companion.y - 112 && point.y <= this.companion.y + 24) {
      this.selectedSpirit = 'xiezhi'; this.openCompanionPanel(); return;
    }
    const snackSpot = this.availableFruitSpots().find((spot) => spot.region === this.area && Phaser.Math.Distance.Between(point.x, point.y, spot.x, spot.y - 18) < 66);
    if (snackSpot) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, snackSpot.x, snackSpot.y) <= INTERACT_RADIUS) this.openSnackQuiz(snackSpot.id);
      else { this.navigateNear(snackSpot.x, snackSpot.y, 72); this.showToast(getLocale() === 'zh-Hans' ? '走近发光零食，回答问题后领取。' : '走近發光零食，回答問題後領取。'); }
      return;
    }
    const clickedInteraction = worldInteractions
      .filter((item) => item.region === this.area && Math.abs(point.x - item.x) <= 100 && point.y >= item.y - 200 && point.y <= item.y + 30)
      .sort((a, b) => Phaser.Math.Distance.Between(point.x, point.y, a.x, a.y - 70) - Phaser.Math.Distance.Between(point.x, point.y, b.x, b.y - 70))[0];
    if (clickedInteraction) { this.activateInteraction(clickedInteraction); return; }

    const portal = districtMaps[this.area].portals.find((item) => point.x >= item.x - 30 && point.x <= item.x + item.width + 30 && point.y >= item.y - 45 && point.y <= item.y + item.height + 45);
    if (portal) {
      if (!this.portalUnlocked(portal)) { this.showToast(this.lockMessage(portal)); return; }
      const px = portal.x + portal.width / 2; const py = portal.y + portal.height / 2;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, px, py) < 145) this.enterPortal(portal);
      else this.navigateNear(px, py, 92);
      return;
    }

    this.pendingInteraction = null;
    this.navigateTo(point.x, point.y);
  };

  private onCanvasPointerDown = (event: PointerEvent): void => {
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = toGamePoint(event.clientX, event.clientY, bounds, WIDTH, HEIGHT);
    this.objectivePointerStartY = point.x >= 24 && point.x <= 464 && point.y >= 24 && point.y <= 300 ? point.y : null;
  };

  private onCanvasWheel = (event: WheelEvent): void => {
    if (this.touchLayout || this.dialogueLayer || this.helpLayer || this.mapLayerUi || this.notebookLayer || this.chapterLayer) return;
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = toGamePoint(event.clientX, event.clientY, bounds, WIDTH, HEIGHT);
    if (point.x < 24 || point.x > 464 || point.y < 24 || point.y > 300) return;
    event.preventDefault();
    this.scrollObjectives(event.deltaY > 0 ? 1 : -1);
  };

  private activateInteraction(item: WorldInteraction): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) <= INTERACT_RADIUS) {
      this.pendingInteraction = null;
      this.openDialogue(item);
    } else {
      this.pendingInteraction = item;
      this.navigateNear(item.x, item.y, 82);
      this.showToast(t('clickApproach', { target: t(item.name) }));
    }
  }

  private handleKeys(): void {
    if (this.companionLayer) { if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.closeCompanionPanel(); return; }
    if (this.chapterLayer) {
      if (Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.eKey) || Phaser.Input.Keyboard.JustDown(this.escKey)) {
        if (this.chapter >= 2) this.handleChapterPointer(800, 720);
        else if (this.chapterPage === 'law') this.claimCompanionAndShowNext(); else this.enterActTwo();
      }
      return;
    }
    if (this.helpLayer) {
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.toggleHelp();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.mapToggle)) this.toggleMap();
    if (Phaser.Input.Keyboard.JustDown(this.notebookToggle)) this.toggleNotebook();
    if (Phaser.Input.Keyboard.JustDown(this.helpKey)) this.toggleHelp();
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.closePanels();
    if (Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (this.dialogueLayer) this.confirmDialogue();
      else if (this.nearbyInteraction) this.openDialogue(this.nearbyInteraction);
      else if (this.nearbyPortal) this.enterPortal(this.nearbyPortal);
    }
  }

  private movePlayer(delta: number): void {
    const keyboard = this.input.keyboard;
    const left = Boolean(keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.A]?.isDown || keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.LEFT]?.isDown);
    const right = Boolean(keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.D]?.isDown || keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.RIGHT]?.isDown);
    const up = Boolean(keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.W]?.isDown || keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.UP]?.isDown);
    const down = Boolean(keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.S]?.isDown || keyboard?.keys[Phaser.Input.Keyboard.KeyCodes.DOWN]?.isDown);
    let dx = (right ? 1 : 0) - (left ? 1 : 0) + this.touchAxis.x;
    let dy = (down ? 1 : 0) - (up ? 1 : 0) + this.touchAxis.y;
    const keyboardMoving = left || right || up || down || this.touchAxis.length() > 0.05;
    const moveStrength = !keyboardMoving || left || right || up || down ? 1 : Math.min(1, this.touchAxis.length());
    if (keyboardMoving) {
      const mag = Math.hypot(dx, dy) || 1;
      dx /= mag; dy /= mag;
      this.path = [];
      this.pathIndex = 0;
      this.moveTarget.set(this.player.x + dx * 100, this.player.y + dy * 100);
      this.setFacing(this.facingFor(dx, dy));
    } else if (this.pathIndex < this.path.length) {
      this.moveTarget.copy(this.path[this.pathIndex]);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y) < 24) {
        this.pathIndex += 1;
        if (this.pathIndex < this.path.length) this.moveTarget.copy(this.path[this.pathIndex]);
      }
    } else {
      this.moveTarget.set(this.player.x, this.player.y);
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
    if (distance < 4) {
      this.walking = false;
      this.syncPlayerPose();
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1190, 1120) > 90 && !this.tutorial.moved) { this.tutorial.moved = true; this.updateObjectives(true); }
      return;
    }
    const step = Math.min(distance, MOVE_SPEED * moveStrength * delta / 1000);
    const nx = this.player.x + (this.moveTarget.x - this.player.x) / distance * step;
    const ny = this.player.y + (this.moveTarget.y - this.player.y) / distance * step;
    const previousX = this.player.x;
    const previousY = this.player.y;
    const next = moveAlongWalkableAxes(previousX, previousY, nx, ny, (x, y) => this.canOccupy(x, y));
    this.player.setPosition(next.x, next.y);
    const moved = next.moved;
    if (moved) this.gaitDistance += Math.hypot(next.x - previousX, next.y - previousY);
    if (moved && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1190, 1120) > 90 && !this.tutorial.moved) { this.tutorial.moved = true; this.updateObjectives(true); }
    this.setFacing(this.facingFor(this.moveTarget.x - this.player.x, this.moveTarget.y - this.player.y));
    this.walking = moved;
    this.syncPlayerPose();
  }

  private canOccupy(x: number, y: number): boolean {
    return canOccupyWorldPosition(x, y, districtMaps[this.area].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
  }

  private navigateNear(x: number, y: number, offset: number): void {
    const angle = Math.atan2(this.player.y - y, this.player.x - x);
    this.navigateTo(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset);
  }

  private navigateTo(x: number, y: number): void {
    const route = findWorldPath(
      { x: this.player.x, y: this.player.y },
      { x, y },
      districtMaps[this.area].blockers,
      DISTRICT_WIDTH,
      DISTRICT_HEIGHT,
    );
    if (!route) return;
    this.path = route.map((point) => new Phaser.Math.Vector2(point.x, point.y));
    this.pathIndex = 0;
    const last = this.path[this.path.length - 1];
    if (last && this.canOccupy(x, y) && Phaser.Math.Distance.Between(last.x, last.y, x, y) < 80) this.path.push(new Phaser.Math.Vector2(x, y));
    if (this.path.length) this.moveTarget.copy(this.path[0]);
  }

  private facingFor(dx: number, dy: number): Facing {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'back' : 'front';
  }

  private setFacing(facing: Facing): void {
    this.facing = facing;
    this.syncPlayerPose();
  }

  private syncPlayerPose(): void {
    if (this.walking && (this.facing === 'left' || this.facing === 'right')) {
      // Bottom-row frames are the approved right-facing stride pair.
      // Left movement is their exact horizontal mirror so each leg exchange matches.
      const sprite = getSideWalkSprite(this.facing, this.gaitDistance);
      this.actorSprite.setTexture('player-side-approved', sprite.frame).setFlipX(sprite.flipX);
      this.actorSprite.setDisplaySize(PLAYER_DISPLAY_WIDTH[this.facing], PLAYER_DISPLAY_HEIGHT).setY(0).setAngle(0);
      return;
    }
    const col = ({ front: 0, left: 1, right: 2, back: 3 } as const)[this.facing];
    const row = this.walking
      ? (Math.floor(this.gaitDistance / 48) % 2) + 1
      : (Math.floor(this.time.now / 220) % 19 === 0 ? 3 : 0);
    this.actorSprite.setTexture('player-walk-cycle', row * 4 + col).setFlipX(false)
      .setDisplaySize(PLAYER_DISPLAY_WIDTH[this.facing], PLAYER_DISPLAY_HEIGHT).setY(0).setAngle(0);
  }

  private updateNearby(): void {
    const previousPortal = this.nearbyPortal;
    this.nearbyInteraction = null;
    let closest = INTERACT_RADIUS;
    for (const item of worldInteractions.filter((candidate) => candidate.region === this.area)) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (distance < closest) { this.nearbyInteraction = item; closest = distance; }
    }
    this.nearbyPortal = districtMaps[this.area].portals.find((portal) => {
      const px = portal.x + portal.width / 2; const py = portal.y + portal.height / 2;
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, px, py) < 145;
    }) ?? null;
    if (this.nearbyPortal && this.nearbyPortal !== previousPortal && this.nearbyPortal !== this.notifiedPortal) {
      this.notifiedPortal = this.nearbyPortal;
      this.showToast(t('waystoneReach'));
    }
    if (!this.nearbyPortal) this.notifiedPortal = null;
  }

  private updateAlerts(): void {
    for (const item of worldInteractions.filter((candidate) => candidate.region === this.area)) {
      const active = !this.visited.has(item.id) && Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < 175;
      this.alerts.get(item.id)?.setVisible(active);
    }
  }

  private objectives(): Objective[] {
    if (this.chapter === 3) return thirdActSteps.map(step => ({ key: 'objectiveFile', title: step.title, target: step.id, complete: this.thirdSteps.includes(step.id) }));
    if (this.chapter === 2) return [
      { key: 'objectiveCampus', complete: this.secondAct.completed.includes('ledger'), target: 'treasurer' },
      { key: 'objectiveFile', complete: this.secondAct.completed.includes('yongqi'), target: 'student' },
      { key: 'objectiveInformant', complete: this.secondAct.completed.includes('tea-house'), target: 'informant' },
      { key: 'objectiveCafe', complete: this.secondAct.completed.includes('register'), target: 'cafe-owner' },
    ];
    if (!this.tutorialComplete()) return [
      { key: 'objectiveMove', complete: this.tutorial.moved },
      { key: 'objectiveHelp', complete: this.tutorial.helpUsed },
      { key: 'objectiveMentor', complete: this.tutorial.mentor, target: 'mentor' },
      { key: 'objectiveSupervisor', complete: this.tutorial.supervisor, target: 'supervisor' },
      { key: 'objectiveFile', complete: this.tutorial.file, target: 'case-file' },
      { key: 'objectiveNotebook', complete: this.tutorial.notebook },
      { key: 'objectiveMap', complete: this.tutorial.map },
      { key: 'objectiveOldTown', complete: this.tutorial.oldTown, target: 'informant' },
      { key: 'objectiveInformant', complete: this.tutorial.informant, target: 'informant' },
    ];
    return [
      { key: 'objectiveInformant', complete: this.tutorial.informant, target: 'informant' },
      { key: 'objectiveCafe', complete: this.clues.includes('clueRegister'), target: 'cafe-owner' },
      { key: 'objectiveCampus', complete: this.clues.includes('clueAccounts'), target: 'treasurer' },
      { key: 'objectiveLedger', complete: this.clues.includes('clueMissingPage'), target: 'case-file' },
    ];
  }

  private tutorialComplete(): boolean {
    return this.trainingReady() && this.tutorial.oldTown && this.tutorial.informant;
  }

  private trainingReady(): boolean {
    return this.tutorial.moved && this.tutorial.helpUsed && this.tutorial.mentor && this.tutorial.supervisor && this.tutorial.file && this.tutorial.notebook && this.tutorial.map;
  }

  private updateObjectives(force = false): void {
    const list = this.objectives();
    const signature = list.map((item) => `${item.key}:${item.complete}`).join('|');
    const changed = signature !== this.objectiveSignature;
    if (!force && !changed) return;
    const newlyCompleted = this.objectiveSignature ? list.find((item) => item.complete && this.objectiveSignature.includes(`${item.key}:false`)) : undefined;
    if (changed && this.objectiveSignature && !this.touchLayout) {
      const focus = list.findIndex((item) => !item.complete);
      if (focus >= this.objectiveScroll + this.objectiveRows.length) this.objectiveScroll = focus - this.objectiveRows.length + 1;
      else if (focus >= 0 && focus < this.objectiveScroll) this.objectiveScroll = focus;
    }
    this.objectiveSignature = signature;
    this.updatePortalGuide();
    this.updatePortalMarkers();
    const done = list.filter((item) => item.complete).length;
    this.objectiveTarget = list.find((item) => !item.complete)?.target;
    this.objectiveStatus.setText(`${done}/${list.length}`);
    this.renderObjectiveRows(list);
    this.walkHint?.setVisible(!this.tutorial.moved);
    if (newlyCompleted && !this.tutorialComplete() && this.time.now - this.lastEvidenceAt > 700) this.showToast(t('objectiveDone', { task: t(newlyCompleted.key) }));
    if (this.chapter === 1 && this.tutorialComplete() && !this.completionShown && isChapterComplete(list.map((item) => item.complete))) {
      this.completionShown = true;
      this.pendingAchievement = true;
      if (!this.dialogueLayer) this.showPendingAchievement();
    }
  }

  private renderObjectiveRows(list: Objective[]): void {
    const pageSize = this.objectiveRows.length;
    this.objectiveScroll = Math.max(0, Math.min(this.objectiveScroll, list.length - pageSize));
    this.objectiveRows.forEach((row, index) => {
      const item = this.touchLayout ? list.find((candidate) => !candidate.complete) ?? list[list.length - 1] : list[this.objectiveScroll + index];
      row.setVisible(Boolean(item));
      const secondLabels: Partial<Record<CopyKey, string>> = { objectiveCampus: '前往校園 · 核對社團帳簿', objectiveFile: '校園 · 向學生核對物資簽收', objectiveInformant: '沿原路回舊城 · 核對會面時間', objectiveCafe: '前往海邊茶館 · 核對港口登記' };
      if (item) row.setText(`${item.complete ? '✓' : '○'}  ${item.title ?? (this.chapter === 2 ? secondLabels[item.key] ?? t(item.key) : t(item.key))}`).setColor(item.complete ? '#8fc5a9' : '#d9e3da');
    });
    this.objectiveScrollText?.setText(`${this.objectiveScroll + 1}–${Math.min(list.length, this.objectiveScroll + pageSize)} / ${list.length}  ·  ${t('scrollTasks')}`);
  }

  private scrollObjectives(delta: number): void {
    if (this.touchLayout) return;
    const list = this.objectives();
    this.objectiveScroll = Math.max(0, Math.min(list.length - this.objectiveRows.length, this.objectiveScroll + delta));
    this.renderObjectiveRows(list);
  }

  private openDialogue(item: WorldInteraction): void {
    if (this.dialogueLayer || this.mapLayerUi || this.notebookLayer) return;
    this.clearSemiAutoArrow();
    this.activeInteraction = item;
    this.responseMode = false;
    this.dialogueEmotion = 'neutral';
    this.visited.add(item.id);
    if (item.id === 'mentor') this.tutorial.mentor = true;
    if (item.id === 'supervisor') this.tutorial.supervisor = true;
    if (item.id === 'case-file') this.tutorial.file = true;
    this.updateObjectives(true);
    this.dialogueLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.dialogueLayer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.48).setInteractive());
    const step = this.chapter === 2 ? this.secondActStepFor(item.id) : undefined;
    this.drawDialogue(item, this.chapter === 3 ? thirdActSteps.find(s => s.id === item.id)?.story ?? t(item.intro) : step ? this.secondActStory(step) : t(item.intro), item.choices);
  }

  private drawDialogue(item: WorldInteraction, body: string, choices: InteractionChoice[] | null): void {
    const layer = this.dialogueLayer;
    if (!layer) return;
    const touch = this.touchLayout;
    const buttonY = touch ? 780 : 828;
    layer.removeAll(true);
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.48).setInteractive());
    layer.add(this.add.rectangle(WIDTH / 2, touch ? 655 : 735, 1440, touch ? 460 : 300, 0x102631, 0.98).setStrokeStyle(3, 0xdcb96b));
    layer.add(this.add.rectangle(250, touch ? 825 : 856, 212, 26, 0x071019, 0.4));
    const portrait = this.responseMode
      ? this.add.image(250, touch ? 820 : 850, 'protagonist-expressions', { neutral: 0, warm: 2, concerned: 1 }[this.dialogueEmotion]).setDisplaySize(286, 286).setOrigin(0.5, 1)
      : item.id === 'mentor'
        ? this.add.image(250, touch ? 820 : 850, 'rong-jie-expressions', { neutral: 0, warm: 1, concerned: 2 }[this.dialogueEmotion]).setDisplaySize(286, 286).setOrigin(0.5, 1)
        : this.add.image(250, touch ? 820 : 850, 'npc-atlas', item.atlasCell).setDisplaySize(286, 286).setOrigin(0.5, 1);
    if (this.dialogueEmotion === 'concerned' && item.id !== 'mentor' && !this.responseMode) portrait.setTint(0xd3e1e3);
    if (this.dialogueEmotion === 'warm' && item.id !== 'mentor' && !this.responseMode) portrait.setTint(0xffebcc);
    layer.add(portrait);
    this.tweens.add({ targets: portrait, alpha: { from: 0.25, to: 1 }, duration: 230 });
    layer.add(localizedText(this, 420, touch ? 500 : 616, t(item.name), { fontSize: touch ? '32px' : '22px', color: '#e7c36d', fontStyle: 'bold' }));
    layer.add(localizedText(this, 420, touch ? 550 : 658, wrapCjkText(body, touch ? 32 : 44), { fontSize: touch ? '29px' : '21px', color: '#f0eee1', wordWrap: { width: 1030 }, lineSpacing: touch ? 11 : 7 }));
    this.addButton(layer, 1370, touch ? 490 : 615, 230, t('dialogueLeave'), () => this.advanceDialogue(), true);
    if (!choices) {
      this.addButton(layer, 1190, buttonY, touch ? 310 : 230, t('dialogueContinue'), () => this.advanceDialogue(), true);
      return;
    }
    const buttonWidth = choices.length === 1 ? 300 : 390;
    const startX = choices.length === 1 ? 1020 : 820;
    choices.forEach((choice, index) => this.addButton(layer, startX + index * (buttonWidth + 30), buttonY, buttonWidth, t(choice.label), () => this.chooseDialogue(item, choice), true));
  }

  private addButton(layer: Phaser.GameObjects.Container, x: number, y: number, width: number, label: string, action: () => void, sceneHitTest = false): void {
    const bg = this.add.rectangle(x, y, width, this.touchLayout ? 88 : 54, 0xe9c66f).setStrokeStyle(2, 0xffe6a9);
    const text = localizedText(this, x, y, label, { fontSize: this.touchLayout ? '25px' : '18px', color: '#1b303a', fontStyle: 'bold', align: 'center', wordWrap: { width: width - 24 } }).setOrigin(0.5);
    if (!sceneHitTest) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0xffdf8c));
      bg.on('pointerout', () => bg.setFillStyle(0xe9c66f));
      bg.on('pointerdown', action);
    }
    layer.add([bg, text]);
  }

  private handleDialoguePointer(x: number, y: number): void {
    if (hitsButton(x, y, 1370, this.touchLayout ? 490 : 615, 230, this.touchLayout ? 88 : 54)) { this.advanceDialogue(); return; }
    const buttonY = this.touchLayout ? 780 : 828;
    if (Math.abs(y - buttonY) > (this.touchLayout ? 48 : 34)) return;
    if (this.responseMode) {
      if (Math.abs(x - 1190) <= (this.touchLayout ? 160 : 125)) this.advanceDialogue();
      return;
    }
    const item = this.activeInteraction;
    if (!item) return;
    const choices = item.choices;
    const buttonWidth = choices.length === 1 ? 300 : 390;
    const startX = choices.length === 1 ? 1020 : 820;
    const index = choices.findIndex((_, i) => Math.abs(x - (startX + i * (buttonWidth + 30))) <= buttonWidth / 2);
    if (index >= 0) this.chooseDialogue(item, choices[index]);
  }

  private chooseDialogue(item: WorldInteraction, choice: InteractionChoice): void {
    if (choice.label === 'endTalk') { this.advanceDialogue(); return; }
    if (this.chapter === 3) {
      const step = thirdActSteps.find(s => s.id === item.id);
      const next = completeThirdActStep(this.thirdSteps, item.id);
      const advanced = next.length > this.thirdSteps.length;
      this.thirdSteps = next;
      this.saveThirdAct();
      this.responseMode = true;
      this.updateObjectives(true);
      this.drawDialogue(item, advanced ? step!.story + '\n【線索已保存】' + step!.evidence : step && !this.thirdSteps.includes(item.id) ? '先依清單核對前一份記錄，再比對這份材料。' : t(choice.reply), null);
      return;
    }
    if (this.chapter === 2) {
      const step = this.secondActStepFor(item.id);
      const next = getActTwoNextStep(this.secondAct);
      const reply = step && step === next ? this.secondActStory(step) + '\n已記錄，請依清單核對下一份證據。' : step && !this.secondAct.completed.includes(step) ? '先核對清單上目前的證據，再把這份記錄對上。' : t(choice.reply);
      if (step) this.secondAct = completeActTwoStep(this.secondAct, step);
      try { localStorage.setItem('under-shadow-act-two-v1', JSON.stringify(this.secondAct)); } catch { /* Session progress remains. */ }
      this.responseMode = true;
      this.updateObjectives(true);
      this.drawDialogue(item, reply, null);
      return;
    }
    if (item.id === 'informant') this.tutorial.informant = true;
    if (choice.clue && !this.clues.includes(choice.clue)) {
      this.clues.push(choice.clue);
      this.lastEvidenceAt = this.time.now;
      this.showEvidenceCard(choice.clue);
    }
    this.responseMode = true;
    this.dialogueEmotion = choice.label === 'askHow' || choice.label === 'optionPolite' ? 'warm' : 'concerned';
    this.updateObjectives(true);
    this.drawDialogue(item, t(choice.reply), null);
  }

  private showEvidenceCard(clue: CopyKey): void {
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(125);
    const top = this.touchLayout ? 265 : 270;
    layer.add(this.add.rectangle(WIDTH / 2, top, 900, 142, 0x163440, 0.97).setStrokeStyle(3, 0xe8c76e));
    layer.add(localizedText(this, WIDTH / 2, top - 31, t('evidenceCardTitle', { count: String(this.clues.length) }), { fontSize: '25px', color: '#ffdc79', fontStyle: 'bold' }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, top + 19, wrapCjkText(t(clue), this.touchLayout ? 29 : 46), { fontSize: this.touchLayout ? '22px' : '19px', color: '#f0eee1', align: 'center' }).setOrigin(0.5));
    layer.setAlpha(0).setY(18);
    this.tweens.add({ targets: layer, alpha: 1, y: 0, duration: 200, ease: 'Cubic.Out' });
    this.tweens.add({ targets: layer, alpha: 0, delay: 2100, duration: 250, onComplete: () => layer.destroy(true) });
  }

  private advanceDialogue(): void {
    const finishedInformant = this.activeInteraction?.id === 'informant' && this.tutorial.informant;
    this.dialogueLayer?.destroy(true);
    this.dialogueLayer = null;
    this.activeInteraction = null;
    this.responseMode = false;
    if (this.chapter === 3 && thirdActComplete(this.thirdSteps) && !this.thirdReward) this.showThirdActConclusion(false);
    if (this.chapter === 2 && isActTwoComplete(this.secondAct) && !this.secondActConcluded) {
      this.secondActConcluded = true;
      this.showSecondActConclusion();
    }
    if (finishedInformant && !this.harborHintShown) {
      this.harborHintShown = true;
      this.showToast(t('headToHarborHint'));
    }
    this.showPendingAchievement();
  }

  private showPendingAchievement(): void {
    if (!this.pendingAchievement || this.dialogueLayer) return;
    this.pendingAchievement = false;
    this.time.delayedCall(260, () => this.showChapterAchievement());
  }

  private confirmDialogue(): void {
    if (!this.dialogueLayer) return;
    if (this.responseMode) { this.advanceDialogue(); return; }
    const item = this.activeInteraction;
    const firstChoice = item?.choices[0];
    if (item && firstChoice) this.chooseDialogue(item, firstChoice);
    else this.advanceDialogue();
  }

  private portalUnlocked(portal: WorldPortal): boolean {
    return unlocked(portal, this.portalProgress());
  }

  private portalProgress(): Parameters<typeof unlocked>[1] {
    return {
      tutorialDone: this.trainingReady(),
      informantInterviewed: this.tutorial.informant,
      hasAccountsClue: this.clues.includes('clueAccounts'),
    };
  }

  private updatePortalGuide(): void {
    if (!this.portalGuide) return;
    const rows = getPortalDestinations(this.area, this.portalProgress()).map(({ target, available }) =>
      `→ ${t(districtMaps[target].label)} · ${t(available ? 'portalReady' : 'portalLocked')}`);
    this.portalGuide.setText([t('portalDestinationList'), ...rows].join('\n'));
  }

  private updatePortalMarkers(): void {
    for (const { portal, glow, slab, inset, rune, label } of this.portalMarkers) {
      const available = this.portalUnlocked(portal);
      glow.setFillStyle(available ? 0xe5bb60 : 0x64737a, 0.18);
      slab.setFillStyle(available ? 0x65706b : 0x535e63, 0.98)
        .setStrokeStyle(4, available ? 0xe0c57c : 0x8a9698, 0.95);
      inset.setStrokeStyle(2, available ? 0xf1d47f : 0x899394, 0.9);
      rune.setColor(available ? '#ffdf83' : '#aab4b1');
      label.setText(`${t(districtMaps[portal.target].label)} · ${t(available ? 'portalReady' : 'portalLocked')}`)
        .setColor(available ? '#fff0bd' : '#aab4b1');
    }
  }

  private lockMessage(portal: WorldPortal): string {
    if (portal.unlock === 'tutorial') return t('tutorialDoorLocked');
    if (portal.unlock === 'informant') return t('informantDoorLocked');
    return t('accountsDoorLocked');
  }

  private enterPortal(portal: WorldPortal): void {
    if (this.transitioning) return;
    if (!this.portalUnlocked(portal)) { this.showToast(this.lockMessage(portal)); return; }
    this.clearSemiAutoArrow();
    this.transitioning = true;
    this.areaPositions.set(this.area, { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(380, 5, 11, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.area = portal.target;
      this.player.setPosition(portal.spawn.x, portal.spawn.y);
      this.moveTarget.set(portal.spawn.x, portal.spawn.y);
      this.resetCompanionAfterTravel();
      this.visitedAreas.add(portal.target);
      this.populateArea(this.area);
      if (this.area === 'oldTown') this.tutorial.oldTown = true;
      this.updateObjectives(true);
      this.showAreaBanner(t(districtMaps[this.area].label));
      this.cameras.main.fadeIn(420, 5, 11, 18);
      this.time.delayedCall(440, () => { this.transitioning = false; this.showToast(t('waystoneDiscovered', { area: t(districtMaps[this.area].label) })); });
    });
  }

  private showAreaBanner(area: string): void {
    this.currentAreaText.setText(area).setAlpha(0).setScale(0.96);
    this.tweens.add({ targets: this.currentAreaText, alpha: 1, scale: 1, duration: 300, yoyo: true, hold: 1400, ease: 'Sine.Out' });
  }

  private toggleNotebook(): void {
    if (this.notebookLayer) { this.notebookLayer.destroy(true); this.notebookLayer = null; return; }
    if (this.dialogueLayer || this.mapLayerUi) return;
    this.tutorial.notebook = true;
    this.updateObjectives(true);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(95);
    this.notebookLayer = layer;
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.62).setInteractive());
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 820, 650, 0xeadfbe, 0.99).setStrokeStyle(4, 0x38525b));
    layer.add(this.add.rectangle(WIDTH / 2, 180, 820, 70, 0x244551));
    layer.add(localizedText(this, WIDTH / 2, 180, t('clueBook'), { fontSize: '27px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5));
    const records = this.chapter === 3 ? thirdActSteps.filter(step => this.thirdSteps.includes(step.id)).map(step => step.evidence) : this.chapter === 2 ? this.secondAct.completed.map(step => this.secondActStory(step)) : this.clues.map(clue => t(clue));
    const body = records.length ? records.map((line, index) => (index + 1) + '  ' + line).join('\n\n') : t('noClues');
    layer.add(localizedText(this, 440, 240, wrapCjkText(body, this.touchLayout ? 24 : 36), { fontSize: this.touchLayout ? '27px' : '21px', color: '#233b43', wordWrap: { width: 720 }, lineSpacing: 12 }));
    this.addButton(layer, WIDTH / 2, 720, 270, t('notebookClose'), () => this.closeNotebook(), true);
  }

  private handleNotebookPointer(x: number, y: number): void {
    if (hitsButton(x, y, WIDTH / 2, 720, 270, this.touchLayout ? 88 : 54)) this.closeNotebook();
  }

  private closeNotebook(): void {
    this.notebookLayer?.destroy(true);
    this.notebookLayer = null;
  }

  private toggleHelp(): void {
    if (this.helpLayer) { this.helpLayer.destroy(true); this.helpLayer = null; return; }
    if (this.dialogueLayer || this.mapLayerUi || this.notebookLayer || this.chapterLayer) return;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(98);
    this.helpLayer = layer;
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.76));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 950, 520, 0x102631, 0.99).setStrokeStyle(4, 0xdcb96b));
    layer.add(localizedText(this, WIDTH / 2, 240, t('helpTitle'), { fontSize: '34px', color: '#ffdc79', fontStyle: 'bold' }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, 338, t('helpBody'), { fontSize: this.touchLayout ? '27px' : '20px', color: '#d8e4dc', align: 'center', wordWrap: { width: 780 } }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, 418, t('helpRemaining', { count: String(remainingHints(this.helpUses, HELP_LIMIT)) }), { fontSize: '22px', color: '#ffdc79' }).setOrigin(0.5));
    this.addButton(layer, WIDTH / 2, 520, 320, t('helpRouteAction'), () => this.startRouteHelp(), true);
    this.addButton(layer, WIDTH / 2, 625, 230, t('helpClose'), () => this.closeHelpLayer(), true);
  }

  private handleHelpPointer(x: number, y: number): void {
    if (Math.abs(y - 520) <= (this.touchLayout ? 48 : 38) && Math.abs(x - WIDTH / 2) <= 170) { this.startRouteHelp(); return; }
    if (Math.abs(y - 625) <= (this.touchLayout ? 48 : 38) && Math.abs(x - WIDTH / 2) <= 120) this.closeHelpLayer();
  }

  private closeHelpLayer(): void {
    this.helpLayer?.destroy(true);
    this.helpLayer = null;
  }

  private startRouteHelp(): void {
    if (remainingHints(this.helpUses, HELP_LIMIT) === 0) { this.closeHelpLayer(); this.showToast(t('helpExhausted')); return; }
    const objective = this.objectives().find((item) => !item.complete && item.key !== 'objectiveHelp');
    if (objective?.key === 'objectiveMove') {
      if (!this.setSemiAutoTarget(1190, 1370, 'semiArrivedWalk')) return;
      this.acceptRouteHelp();
      return;
    }
    const interaction = worldInteractions.find((item) => item.id === objective?.target);
    if (!interaction) { this.closeHelpLayer(); this.showToast(t('helpNoTarget')); return; }
    if (interaction.region === this.area) {
      const approach = this.getApproachPoint(interaction.x, interaction.y, 82);
      if (this.setSemiAutoTarget(approach.x, approach.y, 'semiArrivedInteraction')) this.acceptRouteHelp();
      return;
    }
    const portal = districtMaps[this.area].portals.find((item) => item.target === interaction.region && this.portalUnlocked(item));
    if (portal) {
      const approach = this.getApproachPoint(portal.x + portal.width / 2, portal.y + portal.height / 2, 84);
      if (this.setSemiAutoTarget(approach.x, approach.y, 'semiArrivedPortal')) this.acceptRouteHelp();
      return;
    }
    this.closeHelpLayer();
    this.showToast(t('helpUseMap'));
  }

  private acceptRouteHelp(): void {
    this.helpUses += 1;
    this.tutorial.helpUsed = true;
    this.updateObjectives(true);
    this.closeHelpLayer();
    this.showToast(t('semiAutoArrowOn'));
  }

  private getApproachPoint(x: number, y: number, offset: number): Phaser.Math.Vector2 {
    const angle = Math.atan2(this.player.y - y, this.player.x - x);
    return new Phaser.Math.Vector2(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset);
  }

  private setSemiAutoTarget(x: number, y: number, arrivalMessage: CopyKey): boolean {
    const route = findWorldPath({ x: this.player.x, y: this.player.y }, { x, y }, districtMaps[this.area].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    if (!route) { this.clearSemiAutoArrow(); this.closeHelpLayer(); this.showToast(t('semiNoRoute')); return false; }
    this.path = [];
    this.pathIndex = 0;
    this.pendingInteraction = null;
    const reachableTarget = getReachableRouteTarget({ x, y }, route, (point) => this.canOccupy(point.x, point.y), this.player);
    this.semiAutoTarget = new Phaser.Math.Vector2(reachableTarget.x, reachableTarget.y);
    this.semiAutoRoute = route.map((point) => new Phaser.Math.Vector2(point.x, point.y));
    this.semiAutoArrivalMessage = arrivalMessage;
    this.semiAutoRefreshAt = this.time.now + 220;
    this.semiAutoArrow.setVisible(true);
    this.updateSemiAutoArrow();
    return true;
  }

  private updateSemiAutoArrow(): void {
    const target = this.semiAutoTarget;
    if (!target) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 28) {
      const arrivalMessage = this.semiAutoArrivalMessage;
      this.clearSemiAutoArrow();
      this.showToast(t(arrivalMessage));
      return;
    }
    if (this.time.now >= this.semiAutoRefreshAt) {
      const route = findWorldPath({ x: this.player.x, y: this.player.y }, target, districtMaps[this.area].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
      if (!route) { this.clearSemiAutoArrow(); this.showToast(t('semiNoRoute')); return; }
      this.semiAutoRoute = route.map((point) => new Phaser.Math.Vector2(point.x, point.y));
      this.semiAutoRefreshAt = this.time.now + 220;
    }
    let angle = getPathArrowAngle(this.player, this.semiAutoRoute);
    if (angle === null) angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.semiAutoArrow.setPosition(this.player.x, this.player.y - 194).setRotation(angle + Math.PI / 2);
    this.routeGraphics.clear().lineStyle(7, 0x122b36, 0.9);
    const route = [{ x: this.player.x, y: this.player.y }, ...this.semiAutoRoute];
    const dashes = getDashedRouteSegments(route, 14, 13);
    dashes.forEach(({ from, to }) => this.routeGraphics.lineBetween(from.x, from.y, to.x, to.y));
    this.routeGraphics.lineStyle(4, 0xffdc79, 0.95);
    dashes.forEach(({ from, to }) => this.routeGraphics.lineBetween(from.x, from.y, to.x, to.y));
  }

  private clearSemiAutoArrow(): void {
    this.semiAutoTarget = null;
    this.semiAutoRoute = [];
    this.semiAutoArrow?.setVisible(false);
    this.routeGraphics?.clear();
  }

  private toggleMap(): void {
    if (this.mapLayerUi) { this.mapLayerUi.destroy(true); this.mapLayerUi = null; return; }
    if (this.dialogueLayer || this.notebookLayer) return;
    this.tutorial.map = true;
    this.updateObjectives(true);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(94);
    this.mapLayerUi = layer;
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.76).setInteractive());
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 1260, 820, 0x102631, 0.98).setStrokeStyle(3, 0xdcb96b));
    const mapX = 250; const mapY = 140; const mapW = 1100; const mapH = 733;
    layer.add(this.add.image(WIDTH / 2, 455, 'world-overview').setDisplaySize(mapW, mapH).setAlpha(0.9));
    const graph = this.add.graphics();
    const points = Object.values(districtMaps).map((district) => ({ ...district.overview, id: district.id }));
    const links: Array<[RegionId, RegionId]> = [['hq', 'oldTown'], ['hq', 'harbor'], ['oldTown', 'campus'], ['oldTown', 'harbor'], ['campus', 'harbor'], ['campus', 'hill'], ['harbor', 'hill']];
    const convert = (point: { x: number; y: number }) => ({ x: mapX + point.x / 360 * mapW, y: mapY + point.y / 430 * mapH });
    graph.lineStyle(5, 0xe7c36d, 0.9);
    links.forEach(([a, b]) => { const pa = convert(districtMaps[a].overview); const pb = convert(districtMaps[b].overview); graph.lineBetween(pa.x, pa.y, pb.x, pb.y); });
    graph.fillStyle(0x102631, 0.98);
    const labels: Array<{ x: number; y: number; id: RegionId }> = [];
    points.forEach((point) => {
      const pos = convert(point);
      const open = this.visitedAreas.has(point.id);
      graph.fillStyle(point.id === this.area ? 0xffdf82 : open ? 0x9ad1b5 : 0x6e7e82, 1).fillCircle(pos.x, pos.y, point.id === this.area ? 17 : 13);
      labels.push({ x: pos.x + 18, y: pos.y - 10, id: point.id });
    });
    layer.add(graph);
    labels.forEach(({ x, y, id }) => layer.add(localizedText(this, x, y, t(districtMaps[id].label), { fontSize: '16px', color: '#fff0cf', backgroundColor: '#102631cc', padding: { x: 6, y: 3 } })));
    layer.add(localizedText(this, WIDTH / 2, 102, t('mapFastTravelHint'), { fontSize: '17px', color: '#fff0cf', backgroundColor: '#102631dc', padding: { x: 14, y: 7 } }).setOrigin(0.5));
    const destinations = getPortalDestinations(this.area, this.portalProgress()).map(({ target, available }) =>
      `→ ${t(districtMaps[target].label)} · ${t(available ? 'portalReady' : 'portalLocked')}`);
    layer.add(localizedText(this, 1015, 655, [t('portalDestinationList'), ...destinations].join('\n'), {
      fontSize: '17px', color: '#fff0cf', backgroundColor: '#102631f2',
      padding: { x: 18, y: 14 }, lineSpacing: 9,
    }));
    this.addButton(layer, WIDTH / 2, 830, 250, t('mapClose'), () => { this.mapLayerUi?.destroy(true); this.mapLayerUi = null; }, true);
  }

  private handleMapPointer(x: number, y: number): void {
    if (Math.abs(y - 830) <= (this.touchLayout ? 48 : 36) && Math.abs(x - WIDTH / 2) <= 135) {
      this.mapLayerUi?.destroy(true); this.mapLayerUi = null; return;
    }
    const mapX = 250; const mapY = 140; const mapW = 1100; const mapH = 733;
    for (const district of Object.values(districtMaps)) {
      const px = mapX + district.overview.x / 360 * mapW;
      const py = mapY + district.overview.y / 430 * mapH;
      if (Phaser.Math.Distance.Between(x, y, px, py) > (this.touchLayout ? 58 : 34)) continue;
      if (!this.visitedAreas.has(district.id)) { this.showToast(t('waystoneNotVisited')); return; }
      if (district.id === this.area) { this.showToast(t('alreadyHere')); return; }
      this.fastTravelTo(district.id); return;
    }
  }

  private fastTravelTo(region: RegionId, onArrive?: () => void): void {
    if (!canFastTravelTo(region, this.area, [...this.visitedAreas])) return;
    this.mapLayerUi?.destroy(true); this.mapLayerUi = null;
    this.clearSemiAutoArrow();
    this.areaPositions.set(this.area, { x: this.player.x, y: this.player.y });
    this.pendingInteraction = null; this.path = []; this.pathIndex = 0;
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 5, 11, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.area = region;
      const spawn = this.areaPositions.get(region) ?? districtMaps[region].spawn;
      this.player.setPosition(spawn.x, spawn.y); this.moveTarget.set(spawn.x, spawn.y);
      this.resetCompanionAfterTravel();
      this.visitedAreas.add(region); this.populateArea(region);
      if (region === 'oldTown') this.tutorial.oldTown = true;
      this.updateObjectives(true); this.showAreaBanner(t(districtMaps[region].label));
      this.cameras.main.fadeIn(360, 5, 11, 18);
      this.time.delayedCall(380, () => { this.transitioning = false; onArrive?.(); });
    });
  }

  private showChapterAchievement(page: 'law' | 'next' = 'law'): void {
    this.chapterPage = page;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(110);
    this.chapterLayer = layer;
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, 0.78));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 930, 790, 0x102631, 0.99).setStrokeStyle(4, 0xe4c36d));
    layer.add(this.add.circle(WIDTH / 2, 178, 42, 0xf0c75e, 1).setStrokeStyle(4, 0xffe8a3));
    layer.add(localizedText(this, WIDTH / 2, 178, '★', { fontSize: '43px', color: '#25343a', fontStyle: 'bold' }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, 252, t('achievementKicker'), { fontSize: '17px', color: '#e7c36d', letterSpacing: 3 }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, 302, t('achievementTitle'), { fontSize: '39px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5));
    layer.add(localizedText(this, WIDTH / 2, 348, t('achievementBody'), { fontSize: '19px', color: '#d8e4dc' }).setOrigin(0.5));
    if (page === 'law') {
      layer.add(this.add.rectangle(WIDTH / 2, 475, 800, 188, 0x172f3b).setStrokeStyle(2, 0x8e9f7b));
      layer.add(localizedText(this, 440, 390, t('lawTitle'), { fontSize: '18px', color: '#e7c36d', fontStyle: 'bold' }));
      layer.add(localizedText(this, 440, 423, wrapCjkText(t('lawBody'), 48), { fontSize: '16px', color: '#d8e4dc', lineSpacing: 7 }));
      layer.add(this.add.rectangle(WIDTH / 2, 666, 800, 145, 0x1b3a43).setStrokeStyle(2, 0xe4c36d));
      layer.add(this.add.image(515, 729, 'xiezhi-guardian').setDisplaySize(135, 135).setOrigin(0.5, 1));
      layer.add(localizedText(this, 625, 612, t('companionGift'), { fontSize: '18px', color: '#e7c36d', fontStyle: 'bold' }));
      layer.add(localizedText(this, 625, 646, t('companionName'), { fontSize: '26px', color: '#fff0cf', fontStyle: 'bold' }));
      layer.add(localizedText(this, 625, 684, wrapCjkText(t('companionMeaning'), 31), { fontSize: '16px', color: '#d8e4dc', lineSpacing: 5 }));
      this.addButton(layer, WIDTH / 2, 816, 390, t('achievementClose'), () => this.claimCompanionAndShowNext(), true);
    } else {
      layer.add(this.add.rectangle(WIDTH / 2, 518, 800, 220, 0x1b3a43).setStrokeStyle(2, 0x8e9f7b));
      layer.add(localizedText(this, WIDTH / 2, 420, t('achievementNextLabel'), { fontSize: '18px', color: '#e7c36d' }).setOrigin(0.5));
      layer.add(localizedText(this, WIDTH / 2, 468, t('achievementNextTitle'), { fontSize: '32px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(0.5));
      layer.add(localizedText(this, WIDTH / 2, 530, wrapCjkText(t('achievementNextBody'), 36), { fontSize: '20px', color: '#d8e4dc', align: 'center', lineSpacing: 8 }).setOrigin(0.5));
      this.addButton(layer, WIDTH / 2, 720, 330, getLocale() === 'zh-Hans' ? '进入第二幕' : '進入第二幕', () => this.enterActTwo(), true);
    }
  }

  private handleChapterPointer(x: number, y: number): void {
    if (this.chapter === 3) {
      if (!hitsButton(x, y, 800, 720, 390, this.touchLayout ? 88 : 54)) return;
      if (!this.thirdReward) { this.thirdReward = true; this.saveThirdAct(); this.spawnPixiu(); this.showThirdActConclusion(true); }
      else this.closeChapterAchievement();
      return;
    }
    if (this.chapter === 2) {
      if (!hitsButton(x, y, 800, 720, 390, this.touchLayout ? 88 : 54)) return;
      if (this.secondActRewardPage) this.enterThirdAct();
      else {
        this.secondAct.rewardClaimed = true;
        try { localStorage.setItem('under-shadow-act-two-v1', JSON.stringify(this.secondAct)); } catch { /* Session reward remains. */ }
        this.showSecondActConclusion(true);
      }
      return;
    }
    const buttonY = this.chapterPage === 'law' ? 816 : 720;
    if (hitsButton(x, y, WIDTH / 2, buttonY, this.chapterPage === 'law' ? 390 : 330, this.touchLayout ? 88 : 54)) {
      if (this.chapterPage === 'law') this.claimCompanionAndShowNext(); else this.enterActTwo();
    }
  }

  private claimCompanionAndShowNext(): void {
    this.chapterLayer?.destroy(true); this.chapterLayer = null;
    this.unlockCompanion();
    this.showToast(t('companionJoined'));
    this.showChapterAchievement('next');
  }

  private closeChapterAchievement(): void {
    if (!this.chapterLayer) return;
    this.chapterLayer.destroy(true); this.chapterLayer = null;
  }

  private enterActTwo(): void {
    this.chapterLayer?.destroy(true); this.chapterLayer = null;
    this.chapter = 2;
    this.selectedSpirit = 'xiezhi';
    this.populateArea(this.area);
    try {
      const saved = JSON.parse(localStorage.getItem('under-shadow-act-two-v1') || 'null');
      if (saved && Array.isArray(saved.completed)) this.secondAct = { ...createActTwoState(), completed: saved.completed.filter((s: string) => ['ledger', 'yongqi', 'tea-house', 'register'].includes(s)), rewardClaimed: saved.rewardClaimed === true };
      localStorage.setItem('under-shadow-current-chapter', '2');
    } catch { /* Continue with in-memory state. */ }
    if (this.secondAct.rewardClaimed) this.spawnBaize();
    this.chapterTitle?.setText('第二幕 · 帳本的空白頁');
    this.objectiveScroll = 0;
    this.objectiveSignature = '';
    this.updateObjectives(true);
    this.showToast('第二幕開始 · 你仍在原地。沿街區傳送碑步行前往校園，夥伴會繼續同行。');
  }

  private spawnBaize(): void {
    if (this.baizeFollower) return;
    this.baizeFollower = this.add.sprite(this.player.x - 100, this.player.y + 32, 'world-baize-young', 0).setOrigin(.5, 1).setDisplaySize(92, 92 * 724 / 543).setAlpha(0);
    this.tweens.add({ targets: this.baizeFollower, alpha: 1, duration: 1000 });
  }

  private secondActStepFor(id: string): ActTwoStep | undefined {
    return ({ treasurer: 'ledger', student: 'yongqi', informant: 'tea-house', 'cafe-owner': 'register' } as Record<string, ActTwoStep>)[id];
  }

  private secondActStory(step: ActTwoStep): string {
    return {
      ledger: '財務同學翻開原始帳簿：三筆同日活動費金額遞增，憑證編號卻空着。與第一幕缺頁的日期相同。先記錄異常，再詢問簽收物資的同學。',
      yongqi: '學生拿出簽收記錄：「我只收到一批物資，後兩筆報銷不是我經手的。」通知時間與簽收日期能互相核對。沿原路回舊城，找阿強核對會面。',
      'tea-house': '阿強認出第一幕的記錄：「每週三的會面我能確認。文件袋裏是甚麼，我沒看過。」你把親眼所見與推測分開，下一步去海邊茶館核對港口記錄。',
      register: '茶館老闆取出保存的港口登記副本：經手簽名與帳簿缺頁日期吻合。這是需要繼續審查的線索，不能單憑簽名認定犯罪。',
    }[step];
  }

  private showSecondActConclusion(reward = false): void {
    if (reward) this.spawnBaize();
    this.secondActRewardPage = reward;
    this.chapterLayer?.destroy(true);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(110);
    this.chapterLayer = layer;
    layer.add(this.add.rectangle(800, 450, 1600, 900, 0x071019, .9));
    layer.add(localizedText(this, 800, 220, reward ? '白澤 · 求證核實之靈' : '第二幕完成 · 證據需要互相印證', { fontSize: '32px', color: '#ffe0a0' }).setOrigin(.5));
    if (reward) {
      const art = this.add.image(800, 430, 'world-baize-reward').setDisplaySize(840, 280).setAlpha(0);
      layer.add(art);
      this.tweens.add({ targets: art, alpha: 1, y: 410, duration: 1200 });
      layer.add(localizedText(this, 800, 615, '白澤提醒你：準確的證據，比匆忙的結論更有價值。', { fontSize: '23px', color: '#dcebe1' }).setOrigin(.5));
    } else layer.add(localizedText(this, 800, 430, wrapCjkText('帳簿、物資簽收、會面與登記已逐項核對。請保全原始材料，交由主管繼續核實。涉及公共財產與職務侵佔時，須結合身份、金額、主觀目的及完整證據判斷；帳目異常本身不等於犯罪。', 36), { fontSize: '24px', color: '#dcebe1', lineSpacing: 12 }).setOrigin(.5));
    this.addButton(layer, 800, 720, 390, reward ? '帶白澤同行 · 開始第三幕' : '讀畢規則 · 領取白澤', () => {
      if (!reward) {
        this.secondAct.rewardClaimed = true;
        try { localStorage.setItem('under-shadow-act-two-v1', JSON.stringify(this.secondAct)); } catch { /* Session reward remains. */ }
        this.showSecondActConclusion(true);
      } else this.enterThirdAct();
    }, true);
  }

  private saveThirdAct(): void {
    try { localStorage.setItem('under-shadow-act-three-v1', JSON.stringify({ completed: this.thirdSteps, rewardClaimed: this.thirdReward })); } catch { /* Keep session progress. */ }
  }

  private enterThirdAct(): void {
    this.closeChapterAchievement();
    this.chapter = 3;
    try {
      localStorage.setItem('under-shadow-current-chapter', '3');
      const p = JSON.parse(localStorage.getItem('under-shadow-act-three-v1') || 'null');
      if (p) { this.thirdSteps = thirdActSteps.filter(s => p.completed?.includes(s.id)).map(s => s.id); this.thirdReward = p.rewardClaimed === true; }
    } catch { /* Keep session progress. */ }
    this.chapterTitle?.setText('第三幕 · 禮包裡的名字');
    this.objectiveScroll = 0; this.objectiveSignature = '';
    if (this.thirdReward) this.spawnPixiu();
    this.populateArea(this.area); this.updateObjectives(true);
    this.showToast('柏熹送來廠商禮包，希望換取審批便利。從舊城地產商開始，核實來源、價值、收件人和審批關聯。');
  }

  private spawnPixiu(): void {
    if (this.pixiuFollower) return;
    this.pixiuFollower = this.add.sprite(this.player.x + 90, this.player.y + 35, 'world-pixiu-young', 0).setOrigin(.5, 1).setDisplaySize(92, 123);
  }

  private showThirdActConclusion(reward: boolean): void {
    this.chapterLayer?.destroy(true);
    const layer = this.add.container(0,0).setScrollFactor(0).setDepth(110); this.chapterLayer=layer;
    layer.add(this.add.rectangle(800,450,1600,900,0x071019,.95));
    layer.add(localizedText(this,800,190,reward ? '貔貅 · 守住邊界之靈' : '第三幕完成 · 禮包裡的名字',{fontSize:'32px',color:'#ffe0a0'}).setOrigin(.5));
    if (reward) {
      const pet=this.add.image(800,450,'world-pixiu-young',0).setDisplaySize(240,320).setAlpha(0); layer.add(pet);
      this.tweens.add({targets:pet,alpha:1,y:430,duration:1100});
    } else layer.add(localizedText(this,800,410,wrapCjkText('你保存了禮包來源、發票、收件記錄與審批往來。收禮與請託的關聯仍須由完整證據核實。學習重點：辨識職務便利、財物與不正當利益，不能把一般人情或單一時點直接當作犯罪結論。拒收後仍應依公平程序處理申請。',36),{fontSize:'23px',color:'#dcebe1',lineSpacing:12}).setOrigin(.5));
    this.addButton(layer,800,720,390,reward ? '回到街區 · 投餵守界梨' : '讀畢規則 · 領取貔貅',()=>this.handleChapterPointer(800,720),true);
  }

  private companionCopy(): { intro: string; question: string; answers: [string, string]; win: string; lose: string; snack: string; stage: string; feed: string } {
    const known = this.ownsSpirit(this.selectedSpirit);
    const zhHans = getLocale() === 'zh-Hans';
    const [rawQuestion, correct, wrong] = spiritQuestions[this.selectedSpirit][this.activeQuestionIndex];
    const question = known ? rawQuestion : rawQuestion.replaceAll(spiritNames[this.selectedSpirit], '這枚果實的氣息');
    const win = '答對了！' + (known ? fruitNames[this.selectedSpirit] : '神秘的果實') + '已存入背包。' + fruitDescriptions[this.selectedSpirit];
    const lose = '這個判斷還不夠周全。請仔細比較選項，30秒後再試。果實仍在原地。';
    const stageId = getCompanionGrowthStage(this.companionProgress.fed).id;
    const form = getSpirit(this.selectedSpirit).forms.find(form => form.id === stageId)!;
    const stage = zhHans ? form.hans : form.hant;
    return {
      intro: spiritNames[this.selectedSpirit] + '只接受' + fruitNames[this.selectedSpirit] + '。每幕六道專屬問題；累計投餵3次成長，6次進入守護形態。未領取精靈前可先收集果實。',
      question,
      answers: this.correctFirst ? [correct, wrong] : [wrong, correct],
      win,
      lose,
      snack: zhHans ? `零食 ${this.companionProgress.snacks} · 投喂 ${this.companionProgress.fed}/6 · 3次成长，6次守护` : `零食 ${this.companionProgress.snacks} · 投餵 ${this.companionProgress.fed}/6 · 3次成長，6次守護`,
      stage,
      feed: spiritNames[this.selectedSpirit] + '開心地接住' + fruitNames[this.selectedSpirit] + '，專屬成長值 +1。',
    };
  }

  private openCompanionPanel(): void {
    const owned = this.selectedSpirit === 'xiezhi' ? this.companionUnlocked : this.selectedSpirit === 'baize' ? this.secondAct.rewardClaimed : this.thirdReward;
    if (!owned || this.companionLayer || this.dialogueLayer || this.chapterLayer) return;
    this.activeSnackId = null;
    this.companionPanelMode = 'intro';
    this.renderCompanionPanel();
    if (this.companion) this.tweens.add({ targets: this.companion, scaleX: this.companion.scaleX * 1.1, scaleY: this.companion.scaleY * 1.1, yoyo: true, duration: 210, repeat: 1 });
  }

  private openSnackQuiz(snackId: string): void {
    if (this.companionLayer || this.dialogueLayer || this.chapterLayer) return;
    this.activeSnackId = snackId;
    const spot = this.availableFruitSpots().find(spot => spot.id === snackId);
    if (!spot) return;
    this.selectedSpirit = spot.spiritId;
    this.activeQuestionIndex = Math.min(5, this.companionProgress.claimedSnackIds.length);
    this.correctFirst = Math.random() < .5;
    this.companionPanelMode = 'quiz';
    this.renderCompanionPanel();
  }

  private renderCompanionPanel(message?: string): void {
    this.companionLayer?.destroy(true);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(135);
    this.companionLayer = layer;
    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 180 });
    const copy = this.companionCopy();
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, .68));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 1050, 580, 0x102a37, .98).setStrokeStyle(3, 0xe9c66f));
    const form = getCompanionGrowthStage(this.companionProgress.fed);
    const portrait = this.add.image(460, 620, this.selectedSpirit !== 'xiezhi' ? 'world-' + this.selectedSpirit + '-' + form.id : form.id === 'young' ? 'xiezhi-sprites' : `companion-${form.id}`, 0).setDisplaySize(form.id === 'young' ? 230 : 300, this.selectedSpirit === 'xiezhi' && form.id === 'young' ? 230 : (form.id === 'young' ? 230 : 300) * 724 / 543).setOrigin(.5, 1);
    if (!this.ownsSpirit(this.selectedSpirit)) portrait.setTexture('fruit-' + this.selectedSpirit).setDisplaySize(150,150).setY(510);
    layer.add(portrait);
    this.quizTimer = localizedText(this, 800, 592, '', {fontSize:'16px',color:'#e9c66f'}).setOrigin(.5);
    layer.add(this.quizTimer);
    layer.add(localizedText(this, 650, 228, getLocale() === 'zh-Hans' ? '伙伴档案 · 触碰回应' : '夥伴檔案 · 觸碰回應', { fontSize: '19px', color: '#e9c66f' }));
    layer.add(localizedText(this, 650, 282, this.ownsSpirit(this.selectedSpirit) ? spiritNames[this.selectedSpirit] + ' · ' + fruitNames[this.selectedSpirit] : '神秘的果實 · 用途未知', { fontSize: '28px', color: '#fff0cf', fontStyle: 'bold' }));
    layer.add(localizedText(this, 650, 336, copy.snack, { fontSize: '18px', color: '#a7c9be' }));
    layer.add(localizedText(this, 650, 363, copy.stage, { fontSize: '17px', color: '#e9c66f', fontStyle: 'bold' }));
    const body = this.companionPanelMode === 'intro' ? copy.intro + '\n' + fruitDescriptions[this.selectedSpirit] : this.companionPanelMode === 'quiz' ? fruitDescriptions[this.selectedSpirit] + '\n【第' + (this.activeQuestionIndex + 1) + '/6題 · ' + questionDifficulty(this.activeQuestionIndex) + '】' + copy.question : this.companionPanelMode === 'feed' ? copy.feed : message || copy.win;
    layer.add(localizedText(this, 650, 395, wrapCjkText(body, 30), { fontSize: '21px', color: '#e8e9da', lineSpacing: 10 }));
    if (this.companionPanelMode === 'intro') {
      if (this.companionProgress.snacks > 0) this.addButton(layer, 770, 650, 260, getLocale() === 'zh-Hans' ? '投喂零食' : '投餵零食', () => this.feedCompanion(), true);
      this.addButton(layer, 1110, 650, 250, getLocale() === 'zh-Hans' ? '继续探索' : '繼續探索', () => this.closeCompanionPanel(), true);
    } else if (this.companionPanelMode === 'quiz') {
      this.addButton(layer, 770, 650, 300, copy.answers[0], () => this.answerCompanionQuiz(this.correctFirst), true);
      this.addButton(layer, 1130, 650, 300, copy.answers[1], () => this.answerCompanionQuiz(!this.correctFirst), true);
    } else if (this.companionPanelMode === 'result') {
      if (this.companionLastAnswerCorrect && this.companionProgress.snacks > 0) this.addButton(layer, 770, 650, 260, getLocale() === 'zh-Hans' ? '立即投喂' : '立即投餵', () => this.feedCompanion(), true);
      if (!this.companionLastAnswerCorrect) this.addButton(layer, 770, 650, 260, getLocale() === 'zh-Hans' ? '再想想' : '再想想', () => this.startCompanionQuiz(), true);
      this.addButton(layer, 1080, 650, 280, getLocale() === 'zh-Hans' ? '回到街区' : '回到街區', () => this.closeCompanionPanel(), true);
    } else {
      if (this.companionProgress.snacks > 0) this.addButton(layer, 600, 650, 260, getLocale() === 'zh-Hans' ? '再喂一颗' : '再餵一顆', () => this.feedCompanion(), true);
      this.addButton(layer, 920, 650, 280, getLocale() === 'zh-Hans' ? '回到街区' : '回到街區', () => this.closeCompanionPanel(), true);
    }
  }

  private startCompanionQuiz(): void { if (cooldownSeconds(this.quizRetryAt, Date.now())) return; this.companionPanelMode = 'quiz'; this.renderCompanionPanel(); }
  private answerCompanionQuiz(correct: boolean): void {
    if (cooldownSeconds(this.quizRetryAt, Date.now())) return;
    if (!correct) {
      this.quizRetryAt = Date.now() + QUIZ_COOLDOWN_MS;
      try { localStorage.setItem('under-shadow-quiz-retry-at-v1', String(this.quizRetryAt)); } catch { /* Keep session cooldown. */ }
    }
    const copy = this.companionCopy();
    this.companionLastAnswerCorrect = correct;
    if (correct && this.activeSnackId) {
      this.companionProgress = claimSnack(this.companionProgress, this.activeSnackId, true);
      this.saveCompanionProgress();
      this.snackMarkers.get(this.activeSnackId)?.destroy(true);
      this.snackMarkers.delete(this.activeSnackId);
      this.addSnackPickups(this.area);
      for (let i = 0; i < 8; i += 1) {
        const spark = this.add.circle(this.player.x, this.player.y - 65, 4 + i % 3, 0xffd679).setDepth(137);
        this.tweens.add({ targets: spark, x: spark.x + Math.cos(i * Math.PI / 4) * 100, y: spark.y + Math.sin(i * Math.PI / 4) * 80, alpha: 0, duration: 650, onComplete: () => spark.destroy() });
      }
    }
    this.companionPanelMode = 'result';
    this.renderCompanionPanel(correct ? copy.win : copy.lose);
  }

  private feedCompanion(): void {
    const before = getCompanionGrowthStage(this.companionProgress.fed).id;
    const unlockedPet = this.selectedSpirit === 'xiezhi' ? this.companionUnlocked : this.selectedSpirit === 'baize' ? this.secondAct.rewardClaimed : this.thirdReward;
    if (!unlockedPet) { this.showToast('果實已保存，完成本幕並領取精靈後即可投餵。'); return; }
    const next = feedCompanion(this.companionProgress);
    if (!next) return;
    this.companionProgress = next;
    this.saveCompanionProgress();
    const after = getCompanionGrowthStage(next.fed).id;
    if (before !== after) this.showToast(spiritNames[this.selectedSpirit] + '進化了！新形態已加入同行。');
    this.companionPanelMode = 'feed';
    this.renderCompanionPanel();
    const layer = this.companionLayer;
    if (!layer) return;
    const snack = this.add.image(790, 650, 'fruit-' + this.selectedSpirit).setDisplaySize(62, 62);
    const heart = localizedText(this, 460, 430, '♥', { fontSize: '54px', color: '#ff9a9e', fontStyle: 'bold', stroke: '#fff1c5', strokeThickness: 4 }).setOrigin(.5).setAlpha(0);
    layer.add([snack, heart]);
    this.tweens.add({ targets: snack, x: 460, y: 510, scaleX: .45, scaleY: .45, duration: 620, ease: 'Cubic.easeIn', onComplete: () => {
      snack.destroy();
      this.tweens.add({ targets: heart, y: 380, alpha: 1, scaleX: 1.18, scaleY: 1.18, yoyo: true, duration: 430, repeat: 1 });
      if (this.companion) this.tweens.add({ targets: this.companion, scaleX: this.companion.scaleX * 1.22, scaleY: this.companion.scaleY * 1.22, yoyo: true, duration: 240, repeat: 1 });
    } });
  }

  private handleCompanionPointer(x: number, y: number): void {
    if (hitsButton(x, y, 1110, 650, 250, this.touchLayout ? 88 : 54) && this.companionPanelMode === 'intro') { this.closeCompanionPanel(); return; }
    if (this.companionPanelMode === 'intro' && this.companionProgress.snacks > 0 && hitsButton(x, y, 770, 650, 260, this.touchLayout ? 88 : 54)) { this.feedCompanion(); return; }
    if (this.companionPanelMode === 'quiz') {
      if (hitsButton(x, y, 770, 650, 300, this.touchLayout ? 88 : 54)) { this.answerCompanionQuiz(this.correctFirst); return; }
      if (hitsButton(x, y, 1130, 650, 300, this.touchLayout ? 88 : 54)) { this.answerCompanionQuiz(!this.correctFirst); return; }
    }
    if (this.companionPanelMode === 'result') {
      if (this.companionLastAnswerCorrect && this.companionProgress.snacks > 0 && hitsButton(x, y, 770, 650, 260, this.touchLayout ? 88 : 54)) { this.feedCompanion(); return; }
      if (!this.companionLastAnswerCorrect && hitsButton(x, y, 770, 650, 260, this.touchLayout ? 88 : 54)) { this.startCompanionQuiz(); return; }
      if (hitsButton(x, y, 1080, 650, 280, this.touchLayout ? 88 : 54)) this.closeCompanionPanel();
    }
    if (this.companionPanelMode === 'feed') {
      if (this.companionProgress.snacks > 0 && hitsButton(x, y, 600, 650, 260, this.touchLayout ? 88 : 54)) { this.feedCompanion(); return; }
      if (hitsButton(x, y, 920, 650, 280, this.touchLayout ? 88 : 54)) this.closeCompanionPanel();
    }
  }

  private closeCompanionPanel(): void { this.companionLayer?.destroy(true); this.companionLayer = null; }

  private closePanels(): void {
    if (this.companionLayer) this.closeCompanionPanel();
    if (this.dialogueLayer) this.advanceDialogue();
    if (this.mapLayerUi) { this.mapLayerUi.destroy(true); this.mapLayerUi = null; }
    if (this.notebookLayer) { this.notebookLayer.destroy(true); this.notebookLayer = null; }
    if (this.helpLayer) { this.helpLayer.destroy(true); this.helpLayer = null; }
    if (this.chapterLayer) this.closeChapterAchievement();
  }

  private drawMiniMap(): void {
    if (!this.miniGraphics) return;
    const left = WIDTH - 28 - 248;
    const top = 52;
    const mapW = 248;
    const mapH = 146;
    const pos = (point: { x: number; y: number }) => ({ x: left + point.x / 360 * mapW, y: top + point.y / 430 * mapH });
    this.miniGraphics.clear();
    const links: Array<[RegionId, RegionId]> = [['hq', 'oldTown'], ['oldTown', 'campus'], ['oldTown', 'harbor'], ['campus', 'harbor'], ['campus', 'hill'], ['harbor', 'hill']];
    this.miniGraphics.lineStyle(2, 0xf2d47e, 0.9);
    links.forEach(([a, b]) => { const pa = pos(districtMaps[a].overview); const pb = pos(districtMaps[b].overview); this.miniGraphics.lineBetween(pa.x, pa.y, pb.x, pb.y); });
    Object.values(districtMaps).forEach((district) => {
      const p = pos(district.overview);
      const open = this.visitedAreas.has(district.id);
      this.miniGraphics.fillStyle(district.id === this.area ? 0xffe08a : open ? 0xa6d7ba : 0x6a777b, 1).fillCircle(p.x, p.y, district.id === this.area ? 7 : 5);
    });
    if (this.objectiveTarget) {
      const target = worldInteractions.find((item) => item.id === this.objectiveTarget);
      if (target) {
        const p = pos(districtMaps[target.region].overview);
        this.miniGraphics.lineStyle(2, 0xffdf82, 1).strokeCircle(p.x, p.y, 11);
      }
    }
  }

  private showToast(message: string): void {
    const text = localizedText(this, WIDTH / 2, this.touchLayout ? 90 : 328, wrapCjkText(message, this.touchLayout ? 24 : 58), { fontSize: this.touchLayout ? '23px' : '18px', color: '#fff0cf', backgroundColor: '#102631ed', padding: { x: 22, y: 12 }, align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(120);
    this.tweens.add({ targets: text, alpha: 0, delay: 1700, duration: 250, onComplete: () => text.destroy() });
  }

  private onTouchAxis = (event: CustomEvent<{ x: number; y: number }>): void => {
    this.touchAxis.set(event.detail.x, event.detail.y);
  };

  private onTouchAction = (event: CustomEvent<string>): void => {
    if (event.detail === 'help') this.toggleHelp();
    if (event.detail === 'interact') {
      if (this.chapterLayer) { if (this.chapter >= 2) this.handleChapterPointer(800, 720); else if (this.chapterPage === 'law') this.claimCompanionAndShowNext(); else this.enterActTwo(); return; }
      if (this.helpLayer) return;
      if (this.dialogueLayer) this.confirmDialogue();
      else if (this.nearbyInteraction) this.openDialogue(this.nearbyInteraction);
      else if (this.nearbyPortal) this.enterPortal(this.nearbyPortal);
    }
    if (event.detail === 'map') this.toggleMap();
    if (event.detail === 'notebook') this.toggleNotebook();
  };
}
