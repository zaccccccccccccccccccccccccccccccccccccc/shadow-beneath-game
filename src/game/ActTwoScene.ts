import Phaser from 'phaser';
import campusBackground from '../assets/district-campus.png';
import hqBackground from '../assets/district-hq.png';
import oldTownBackground from '../assets/district-old-town.png';
import harborBackground from '../assets/district-harbor.png';
import hillBackground from '../assets/district-hill.png';
import npcAtlas from '../assets/investigation-npc-atlas.png';
import playerWalkCycle from '../assets/player-action-sheet.png';
import playerSideApproved from '../assets/player-side-walk-v2.png';
import yongqiExpressions from '../assets/character-yongqi-expressions.png';
import huigeExpressions from '../assets/character-huige-expressions.png';
import baizeArt from '../assets/spirit-baize-evolution.png';
import xiezhiArt from '../assets/spirit-xiezhi-evolution.png';
import pixiuArt from '../assets/spirit-pixiu-evolution.png';
import qilinArt from '../assets/spirit-qilin-evolution.png';
import xuanwuArt from '../assets/spirit-xuanwu-evolution.png';
import qinglongArt from '../assets/spirit-qinglong-evolution.png';
import clarityFruit from '../assets/fruit-clarity.png';
import xiezhiSpriteSheet from '../assets/xiezhi-sprite-sheet.png';
import testimonyFruit from '../assets/fruit-testimony.png';
import boundaryFruit from '../assets/fruit-boundary.png';
import calmFruit from '../assets/fruit-calm.png';
import recordFruit from '../assets/fruit-record.png';
import daylightFruit from '../assets/fruit-daylight.png';
import { canCompleteActTwoStep, canTravelActTwoRegion, claimActTwoReward, completeActTwoStep, createActTwoState, getActTwoMissingSteps, getActTwoNextStep, isActTwoComplete, type ActTwoRegion, type ActTwoState, type ActTwoStep } from './act-two';
import { DISTRICT_HEIGHT, DISTRICT_WIDTH, districtMaps, worldInteractions, type RegionId } from './world-data';
import { t } from './localization';
import rongJieWorld from '../assets/rong-jie-world.png';
import { canOccupyWorldPosition, findWorldPath, getFeetDepth, getWallOcclusionAlpha, moveAlongWalkableAxes, sortWorldObjectsByDepth } from './world-geometry';
import { getSideWalkSprite } from './player-animation';
import { getLocale, localizedText } from './localization';
import { spirits } from './spirits';
import { getCompanionGrowthStage, getCompanionTrailPoint, type CompanionProgress } from './companion';
import { getActTwoWorldPortals, readChapterOneCompanion } from './act-two-world';
import { setMusicZone } from './music';
import { addWaystoneSign } from './waystone-sign';
import { loadCompanionForms, applyCompanionForm } from './companion-art';
import { wrapCjkText } from './text-layout';
import { findUiHitTarget, toGamePoint, type UiHitTarget } from './ui-hit-test';
import mapOverview from '../assets/macau-investigation-world.png';

const WIDTH = 1600;
const HEIGHT = 900;
const ACT_TWO_KEY = 'under-shadow-act-two-v1';
const SPEED = 300;
const INTERACT_RADIUS = 122;
const REGIONS: ActTwoRegion[] = ['hq', 'oldTown', 'campus', 'harbor', 'hill'];

type Facing = 'front' | 'back' | 'left' | 'right';
type WorldSpot = { step: ActTwoStep; region: ActTwoRegion; x: number; y: number; kind: 'ledger' | 'yongqi' | 'huige' | 'register'; cell?: number };
type Portal = { from: ActTwoRegion; to: ActTwoRegion; x: number; y: number; width: number; height: number; spawn: { x: number; y: number } };
type OverlayKind = 'prologue' | 'dialogue' | 'reply' | 'map' | 'clues' | 'help' | 'law' | 'reward' | 'collection';

const spots: WorldSpot[] = [
  { step: 'ledger', region: 'campus', x: 1165, y: 980, kind: 'ledger' },
  { step: 'yongqi', region: 'campus', x: 1430, y: 1000, kind: 'yongqi', cell: 5 },
  { step: 'tea-house', region: 'oldTown', x: 1430, y: 650, kind: 'huige', cell: 2 },
  { step: 'register', region: 'harbor', x: 2050, y: 920, kind: 'register' },
];

const portals: Portal[] = getActTwoWorldPortals();

type Copy = {
  title: string; subtitle: string; list: string; tasks: Record<ActTwoStep, string>; regionNames: Record<ActTwoRegion, string>;
  story: Record<ActTwoStep, string>; evidence: Record<ActTwoStep, string>; conclusion: string; law: string; reward: string;
  locked: string; oil: string; clueBook: string; map: string; interact: string; continue: string; back: string;
};

function copy(): Copy {
  if (getLocale() === 'zh-Hans') return {
    title: '第二幕 · 账本的空白页', subtitle: '三笔活动费都写着“已结清”，却没人说得清钱去了哪里。先记录，再核实。', list: '调查清单',
    tasks: { ledger: '检查校园社团账簿', yongqi: '向詠琪核对物资签收', 'tea-house': '前往旧城茶馆询问辉哥', register: '到海边港口核对登记簿' },
    regionNames: { hq: '联署总部', oldTown: '旧城茶馆', campus: '校园社团', harbor: '海边港口', hill: '山坡街区' },
    story: {
      ledger: '账簿上有三笔同日活动费，金额递增，凭证编号却空着。先把异常记下来，不急着判断原因。',
      yongqi: '詠琪说她只签收过一批物资。群组通知和签收时间可以互相核对，她愿意把记录交给你。',
      'tea-house': '辉哥确认每周三有人来茶馆会面。他记得时间和座位，但没有看过文件袋里的内容。',
      register: '港口登记簿被雨水打湿。灯光照出同一名经手人的签名，与账簿缺失页的日期相同。',
    },
    evidence: {
      ledger: '已记录：三笔日期相同、凭证编号缺失的活动费。',
      yongqi: '已核对：詠琪签收的物资与两笔报销项目不一致。',
      'tea-house': '已记录：每周三有会面；文件袋内容仍未确认。',
      register: '已核实：登记簿经手签名与账簿缺页日期吻合，形成待审查线索。',
    },
    conclusion: '你把账簿、签收、会面和登记逐项对上，并将无法确认的部分留作待查。下一步应保全原始记录，交由主管继续核实。',
    law: '若涉案经费属于公共财产，且行为人利用职务便利侵占，可能涉及《刑法》第382、383条贪污相关规定。若只是账目错误或管理违规，应先依财务制度核查。证据不足时只记录异常；是否构成犯罪，仍须结合身份、金额、证据和主观目的判断。',
    reward: '白泽 · 求证核实之灵加入图鉴。它提醒你：快一点的结论，不会比准确的证据更有价值。',
    locked: '先完成当前调查，再沿碑前往：{place}', oil: '灯油', clueBook: '线索记录', map: '街区地图', interact: '靠近人物或物件，按 E／空格互动', continue: '继续调查', back: '返回街区',
  };
  return {
    title: '第二幕 · 帳本的空白頁', subtitle: '三筆活動費都寫着「已結清」，卻沒有人說得清錢去了哪裏。先記錄，再核實。', list: '調查清單',
    tasks: { ledger: '檢查校園社團帳簿', yongqi: '向詠琪核對物資簽收', 'tea-house': '前往舊城茶館詢問輝哥', register: '到海邊港口核對登記簿' },
    regionNames: { hq: '聯署總部', oldTown: '舊城茶館', campus: '校園社團', harbor: '海邊港口', hill: '山坡街區' },
    story: {
      ledger: '帳簿上有三筆同日活動費，金額遞增，憑證編號卻空着。先把異常記下來，不急着判斷原因。',
      yongqi: '詠琪說她只簽收過一批物資。群組通知和簽收時間可以互相核對，她願意把記錄交給你。',
      'tea-house': '輝哥確認每週三有人來茶館會面。他記得時間和座位，但沒有看過文件袋裏的內容。',
      register: '港口登記簿被雨水打濕。燈光照出同一名經手人的簽名，與帳簿缺頁的日期相同。',
    },
    evidence: {
      ledger: '已記錄：三筆日期相同、憑證編號缺失的活動費。',
      yongqi: '已核對：詠琪簽收的物資與兩筆報銷項目不一致。',
      'tea-house': '已記錄：每週三有會面；文件袋內容仍未確認。',
      register: '已核實：登記簿經手簽名與帳簿缺頁日期吻合，形成待審查線索。',
    },
    conclusion: '你把帳簿、簽收、會面和登記逐項對上，並將無法確認的部分留作待查。下一步應保全原始記錄，交由主管繼續核實。',
    law: '若涉案經費屬於公共財產，且行為人利用職務便利侵佔，可能涉及《刑法》第382、383條貪污相關規定。若只是帳目錯誤或管理違規，應先依財務制度核查。證據不足時只記錄異常；是否構成犯罪，仍須結合身份、金額、證據和主觀目的判斷。',
    reward: '白澤 · 求證核實之靈加入圖鑑。牠提醒你：快一點的結論，不會比準確的證據更有價值。',
    locked: '先完成目前調查，再沿碑前往：{place}', oil: '燈油', clueBook: '線索記錄', map: '街區地圖', interact: '靠近人物或物件，按 E／空白鍵互動', continue: '繼續調查', back: '返回街區',
  };
}

export class ActTwoScene extends Phaser.Scene {
  private state: ActTwoState = createActTwoState();
  private region: ActTwoRegion = 'campus';
  private visited = new Set<ActTwoRegion>(['campus']);
  private worldLayer!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Container;
  private actorSprite!: Phaser.GameObjects.Sprite;
  private companion: Phaser.GameObjects.Sprite | null = null;
  private companionUnlocked = false;
  private companionProgress: CompanionProgress = { claimedSnackIds: [], snacks: 0, fed: 0 };
  private companionTrail: Array<{ x: number; y: number }> = [];
  private companionPhase = 0;
  private facing: Facing = 'back';
  private walking = false;
  private gaitDistance = 0;
  private moveTarget = new Phaser.Math.Vector2(1200, 1080);
  private path: Phaser.Math.Vector2[] = [];
  private pathIndex = 0;
  private keys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; interact: Phaser.Input.Keyboard.Key; map: Phaser.Input.Keyboard.Key; clues: Phaser.Input.Keyboard.Key; esc: Phaser.Input.Keyboard.Key };
  private touchAxis = new Phaser.Math.Vector2();
  private ui!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private overlayAction: (() => void) | null = null;
  private overlayKind: OverlayKind | null = null;
  private overlayButtons: UiHitTarget<() => void>[] = [];
  private hudButtons: UiHitTarget<() => void>[] = [];
  private nearbySpot: WorldSpot | null = null;
  private nearbyPortal: Portal | null = null;
  private toast: Phaser.GameObjects.Text | null = null;
  private lantern!: Phaser.Textures.CanvasTexture;
  private movingPixels = 0;
  private transitioning = false;
  private started = false;
  private clues: string[] = [];
  private objectivePointerStartY: number | null = null;

  constructor() { super('act-two'); }

  private get touchLayout(): boolean { return window.matchMedia('(pointer: coarse)').matches; }

  preload(): void {
    loadCompanionForms(this);
    this.load.maxParallelDownloads = 5;
    this.load.image('act2-campus', campusBackground);
    this.load.image('act2-mentor-world', rongJieWorld);
    this.load.image('act2-hq', hqBackground);
    this.load.image('act2-oldtown', oldTownBackground);
    this.load.image('act2-harbor', harborBackground);
    this.load.image('act2-hill', hillBackground);
    this.load.image('act2-world-overview', mapOverview);
    this.load.spritesheet('act2-npc-atlas', npcAtlas, { frameWidth: 443, frameHeight: 443 });
    this.load.spritesheet('act2-player-walk', playerWalkCycle, { frameWidth: 313, frameHeight: 313 });
    this.load.spritesheet('act2-player-side', playerSideApproved, { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('act2-xiezhi-follow', xiezhiSpriteSheet, { frameWidth: 313, frameHeight: 313 });
    this.load.spritesheet('act2-yongqi', yongqiExpressions, { frameWidth: 724, frameHeight: 724 });
    this.load.spritesheet('act2-huige', huigeExpressions, { frameWidth: 724, frameHeight: 724 });
    this.load.image('act2-baize', baizeArt);
    this.load.image('act2-xiezhi', xiezhiArt);
    this.load.image('act2-pixiu', pixiuArt);
    this.load.image('act2-qilin', qilinArt);
    this.load.image('act2-xuanwu', xuanwuArt);
    this.load.image('act2-qinglong', qinglongArt);
    this.load.image('fruit-clarity', clarityFruit);
    this.load.image('fruit-testimony', testimonyFruit);
    this.load.image('fruit-boundary', boundaryFruit);
    this.load.image('fruit-calm', calmFruit);
    this.load.image('fruit-record', recordFruit);
    this.load.image('fruit-daylight', daylightFruit);
  }

  create(): void {
    document.body.dataset.gameUi = 'world';
    this.loadState();
    this.worldLayer = this.add.container(0, 0).setDepth(0);
    this.ui = this.add.container(0, 0).setScrollFactor(0).setDepth(80);
    this.player = this.add.container(1200, 1080).setDepth(getFeetDepth(1080));
    this.player.setData('worldDepth', getFeetDepth(1080));
    this.actorSprite = this.add.sprite(0, 0, 'act2-player-walk', 14).setDisplaySize(116, 174).setOrigin(.5, 1);
    this.player.add(this.actorSprite);
    this.worldLayer.add(this.player);
    if (this.companionUnlocked) {
      const stage = getCompanionGrowthStage(this.companionProgress.fed);
      this.companion = this.add.sprite(this.player.x - 62, this.player.y + 12, 'act2-xiezhi-follow', 0)
        .setDisplaySize(stage.size, stage.size).setOrigin(.5, 1);
      this.companion.setData('worldDepth', getFeetDepth(this.companion.y));
      this.companionTrail = [{ x: this.player.x - 62, y: this.player.y + 12 }];
      this.worldLayer.add(this.companion);
    }
    const mask = this.textures.createCanvas('act2-lantern-mask', WIDTH / 2, HEIGHT / 2);
    if (!mask) throw new Error('Unable to create act two lantern mask');
    this.lantern = mask;
    this.add.image(WIDTH / 2, HEIGHT / 2, 'act2-lantern-mask').setDisplaySize(WIDTH, HEIGHT).setScrollFactor(0).setDepth(65);
    this.populateRegion();
    this.renderHud();
    this.setupInput();
    this.cameras.main.setBounds(0, 0, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    this.cameras.main.startFollow(this.player, true, .12, .12);
    this.cameras.main.fadeIn(520, 7, 16, 25);
    window.addEventListener('under-shadow-touch-axis', this.onTouchAxis as EventListener);
    window.addEventListener('under-shadow-action', this.onTouchAction as EventListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('under-shadow-touch-axis', this.onTouchAxis as EventListener);
      window.removeEventListener('under-shadow-action', this.onTouchAction as EventListener);
    });
    this.showPrologue();
  }

  update(_: number, delta: number): void {
    this.handleKeys();
    if (!this.overlay && !this.transitioning && this.started) this.movePlayer(delta);
    else if (this.walking) { this.walking = false; this.syncPose(); }
    this.player.setDepth(getFeetDepth(this.player.y));
    this.player.setData('worldDepth', getFeetDepth(this.player.y));
    this.updateCompanion(delta);
    sortWorldObjectsByDepth(this.worldLayer.list, (object) => Number(object.getData('worldDepth') ?? 0));
    this.player.setAlpha(getWallOcclusionAlpha(this.player.x, this.player.y, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
    this.updateProximity();
    this.updateLantern();
  }

  private loadState(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(ACT_TWO_KEY) || 'null') as Partial<ActTwoState> | null;
      if (stored && Array.isArray(stored.completed)) this.state = {
        completed: stored.completed.filter((item): item is ActTwoStep => ['ledger', 'yongqi', 'tea-house', 'register'].includes(item)),
        lampOil: Math.max(0, Math.min(100, Number(stored.lampOil) || 100)), rewardClaimed: Boolean(stored.rewardClaimed),
      };
    } catch { this.state = createActTwoState(); }
    try {
      const companion = readChapterOneCompanion(
        localStorage.getItem('under-shadow-xiezhi-chapter1-claimed-v2'),
        localStorage.getItem('under-shadow-xiezhi-v3'),
      );
      this.companionUnlocked = companion.unlocked;
      this.companionProgress = companion.progress;
    } catch {
      this.companionUnlocked = false;
      this.companionProgress = { claimedSnackIds: [], snacks: 0, fed: 0 };
    }
    this.clues = this.state.completed.map((step) => copy().evidence[step]);
  }

  private updateCompanion(delta: number): void {
    if (!this.companion) return;
    const last = this.companionTrail[this.companionTrail.length - 1];
    if (!last || Phaser.Math.Distance.Between(this.player.x, this.player.y, last.x, last.y) > 8) {
      this.companionTrail.push({ x: this.player.x, y: this.player.y });
      if (this.companionTrail.length > 120) this.companionTrail.shift();
    }
    const target = getCompanionTrailPoint(this.player, this.companionTrail, 84);
    const dx = target.x - this.companion.x;
    const dy = target.y - this.companion.y;
    const distance = Math.hypot(dx, dy);
    const follow = Math.min(1, delta / 135);
    this.companion.setPosition(this.companion.x + dx * follow, this.companion.y + dy * follow);
    const moving = this.walking && distance > .55;
    if (moving) this.companionPhase += delta * .009;
    const col = ({ front: 0, left: 1, right: 2, back: 3 } as const)[this.facing];
    const row = moving ? (Math.floor(this.companionPhase / .55) % 2) + 1 : 0;
    const stage = getCompanionGrowthStage(this.companionProgress.fed);
    this.companion.setTexture('act2-xiezhi-follow', row * 4 + col).setFlipX(false).setDisplaySize(stage.size, stage.size);
    applyCompanionForm(this.companion, this.companionProgress.fed, this.facing, moving, this.companionPhase);
    this.companion.setDepth(getFeetDepth(this.companion.y));
    this.companion.setData('worldDepth', getFeetDepth(this.companion.y));
    this.companion.setAlpha(getWallOcclusionAlpha(this.companion.x, this.companion.y, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
  }

  private resetCompanionTrail(): void {
    if (!this.companion) return;
    this.companionTrail = [{ x: this.player.x - 62, y: this.player.y + 12 }];
    this.companion.setPosition(this.player.x - 62, this.player.y + 12);
  }

  private saveState(): void {
    try { localStorage.setItem(ACT_TWO_KEY, JSON.stringify(this.state)); } catch { /* Progress remains usable for this session. */ }
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W), down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A), right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      interact: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E), map: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      clues: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L), esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP); keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT); keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.overlay && !pointer.wasTouch && Math.hypot(pointer.worldX - this.player.x, pointer.worldY - this.player.y) > 26) this.setFacing(this.facingFor(pointer.worldX - this.player.x, pointer.worldY - this.player.y));
    });
    this.game.canvas.addEventListener('pointerdown', this.onCanvasPointerDown, true);
    this.game.canvas.addEventListener('pointerup', this.onCanvasPointerUp, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown, true);
      this.game.canvas.removeEventListener('pointerup', this.onCanvasPointerUp, true);
    });
  }

  private onCanvasPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.overlay) { this.objectivePointerStartY = null; return; }
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const point = toGamePoint(event.clientX, event.clientY, bounds, WIDTH, HEIGHT);
    this.objectivePointerStartY = point.x >= 24 && point.x <= 464 && point.y >= 24 && point.y <= 365 ? point.y : null;
  };

  private onCanvasPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const { x, y } = toGamePoint(event.clientX, event.clientY, bounds, WIDTH, HEIGHT);
    if (this.overlay) {
      const action = findUiHitTarget(x, y, this.overlayButtons);
      if (action) action();
      else if (this.overlayKind === 'map') this.handleExpandedMapPointer(x, y);
      return;
    }
    const hudAction = findUiHitTarget(x, y, this.hudButtons);
    if (hudAction) { hudAction(); this.objectivePointerStartY = null; return; }
    if (x >= WIDTH - 286 && x <= WIDTH && y >= 18 && y <= 225) { this.toggleMap(); return; }
    if (x >= 24 && x <= 464 && y >= 24 && y <= 365) {
      this.objectivePointerStartY = null;
      return;
    }
    this.objectivePointerStartY = null;
    if (!this.started || this.transitioning) return;
    const point = this.cameras.main.getWorldPoint(x, y);
    const spot = spots.filter((item) => item.region === this.region && Math.abs(point.x - item.x) <= 110 && point.y >= item.y - 175 && point.y <= item.y + 35)
      .sort((a, b) => Phaser.Math.Distance.Between(point.x, point.y, a.x, a.y) - Phaser.Math.Distance.Between(point.x, point.y, b.x, b.y))[0];
    if (spot) { this.activateSpot(spot); return; }
    const resident = worldInteractions.find((npc) => npc.region === this.region && npc.id !== 'case-file' && Math.abs(point.x - npc.x) < 65 && point.y < npc.y + 20 && point.y > npc.y - 160);
    if (resident) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, resident.x, resident.y) > INTERACT_RADIUS) this.navigateNear(resident.x, resident.y, 82);
      else {
        const layer = this.createOverlay('dialogue');
        layer.add(localizedText(this, 800, 340, t(resident.name), { fontSize: '28px', color: '#e9c66f' }).setOrigin(.5));
        layer.add(localizedText(this, 800, 440, wrapCjkText(t(resident.intro), 35), { fontSize: '22px', color: '#fff0cf' }).setOrigin(.5));
        this.addUiButton(layer, 800, 640, 300, copy().back, () => this.closeOverlay());
      }
      return;
    }
    const portal = portals.find((item) => item.from === this.region && Math.abs(point.x - item.x) <= item.width / 2 + 36 && Math.abs(point.y - item.y) <= item.height / 2 + 36);
    if (portal) { this.activatePortal(portal); return; }
    this.navigateTo(point.x, point.y);
  };

  private handleKeys(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.map)) { this.toggleMap(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.clues)) { this.openClueBook(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) { if (this.overlay) this.closeOverlay(); return; }
    const keyboard = this.input.keyboard;
    if (this.overlay) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.interact) || Phaser.Input.Keyboard.JustDown(keyboard!.keys[Phaser.Input.Keyboard.KeyCodes.SPACE]!)) this.overlayAction?.();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) || Phaser.Input.Keyboard.JustDown(keyboard!.keys[Phaser.Input.Keyboard.KeyCodes.SPACE]!)) {
      if (this.nearbySpot) this.activateSpot(this.nearbySpot);
      else if (this.nearbyPortal) this.activatePortal(this.nearbyPortal);
    }
  }

  private onTouchAxis = (event: CustomEvent<{ x: number; y: number }>): void => { this.touchAxis.set(event.detail.x, event.detail.y); };
  private onTouchAction = (event: CustomEvent<string>): void => {
    if (event.detail === 'interact' && this.overlay) { this.overlayAction?.(); return; }
    if (event.detail === 'map') this.toggleMap();
    if (event.detail === 'notebook') this.openClueBook();
    if (event.detail === 'help') this.openHelp();
    if (event.detail === 'interact') { if (this.nearbySpot) this.activateSpot(this.nearbySpot); else if (this.nearbyPortal) this.activatePortal(this.nearbyPortal); }
  };

  private openHelp(): void {
    if (this.overlay) { this.closeOverlay(); return; }
    const hans = getLocale() === 'zh-Hans';
    const layer = this.createOverlay('help');
    layer.add(localizedText(this, WIDTH / 2, 245, hans ? '调查提示 · 按线索一步步核实' : '調查提示 · 按線索一步步核實', { fontSize: '29px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    const tips = hans
      ? ['移动：WASD／方向键，或点击地面走过去。鼠标移动只改变朝向。', '调查：靠近当前发光目标后按 E／空格，或点右下角互动。选择对话问题会记录线索。', '传送：按 M 看校园、旧城茶馆、海边港口；首次到访要先走到发光传送碑。', '整理：按 L 查看已确认事实。每项线索按顺序开放；证据不足时保留待查，不直接定罪。']
      : ['移動：WASD／方向鍵，或點擊地面前往。滑鼠移動只改變朝向。', '調查：靠近目前發光目標後按 E／空白鍵，或點右下角互動。選擇對話問題會記錄線索。', '傳送：按 M 查看校園、舊城茶館、海邊港口；首次到訪要先走到發光傳送碑。', '整理：按 L 查看已確認事實。每項線索按順序開放；證據不足時保留待查，不直接定罪。'];
    tips.forEach((tip, index) => layer.add(localizedText(this, 430, 330 + index * 70, wrapCjkText(`${index + 1}. ${tip}`, 42), { fontSize: '18px', color: '#d8e4dc', lineSpacing: 8 })));
    this.addUiButton(layer, WIDTH / 2, 660, 240, hans ? '知道了' : '知道了', () => this.closeOverlay());
    this.setOverlayAction(() => this.closeOverlay());
  }

  private movePlayer(delta: number): void {
    const keyboard = this.input.keyboard!;
    const up = this.keys.up.isDown || keyboard.keys[Phaser.Input.Keyboard.KeyCodes.UP]?.isDown;
    const down = this.keys.down.isDown || keyboard.keys[Phaser.Input.Keyboard.KeyCodes.DOWN]?.isDown;
    const left = this.keys.left.isDown || keyboard.keys[Phaser.Input.Keyboard.KeyCodes.LEFT]?.isDown;
    const right = this.keys.right.isDown || keyboard.keys[Phaser.Input.Keyboard.KeyCodes.RIGHT]?.isDown;
    let dx = Number(Boolean(right)) - Number(Boolean(left)) + this.touchAxis.x;
    let dy = Number(Boolean(down)) - Number(Boolean(up)) + this.touchAxis.y;
    const manual = Boolean(up || down || left || right || this.touchAxis.length() > .05);
    const strength = this.touchAxis.length() > .05 && !up && !down && !left && !right ? Math.min(1, this.touchAxis.length()) : 1;
    if (manual) {
      const magnitude = Math.hypot(dx, dy) || 1;
      dx /= magnitude; dy /= magnitude;
      this.path = []; this.pathIndex = 0;
      this.moveTarget.set(this.player.x + dx * 100, this.player.y + dy * 100);
      this.setFacing(this.facingFor(dx, dy));
    } else if (this.pathIndex < this.path.length) {
      this.moveTarget.copy(this.path[this.pathIndex]);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y) < 20) {
        this.pathIndex += 1;
        if (this.pathIndex < this.path.length) this.moveTarget.copy(this.path[this.pathIndex]);
      }
    } else this.moveTarget.set(this.player.x, this.player.y);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
    if (distance < 3) { this.walking = false; this.syncPose(); return; }
    const step = Math.min(distance, SPEED * strength * delta / 1000);
    const nx = this.player.x + (this.moveTarget.x - this.player.x) / distance * step;
    const ny = this.player.y + (this.moveTarget.y - this.player.y) / distance * step;
    const previousX = this.player.x; const previousY = this.player.y;
    const next = moveAlongWalkableAxes(previousX, previousY, nx, ny, (x, y) => canOccupyWorldPosition(x, y, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
    this.player.setPosition(next.x, next.y);
    this.walking = next.moved;
    if (next.moved) this.gaitDistance += Math.hypot(next.x - previousX, next.y - previousY);
    this.setFacing(this.facingFor(this.moveTarget.x - this.player.x, this.moveTarget.y - this.player.y));
    this.syncPose();
    if (next.moved) this.movingPixels += Math.hypot(next.x - previousX, next.y - previousY);
    if (this.movingPixels >= 520) { this.state = { ...this.state, lampOil: Math.max(0, this.state.lampOil - 1) }; this.movingPixels = 0; this.renderHud(); }
  }

  private navigateTo(x: number, y: number): void {
    const route = findWorldPath({ x: this.player.x, y: this.player.y }, { x, y }, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    if (!route) return;
    this.path = route.map((point) => new Phaser.Math.Vector2(point.x, point.y)); this.pathIndex = 0;
    if (this.path.length) this.moveTarget.copy(this.path[0]);
  }

  private navigateNear(x: number, y: number, radius: number): void {
    const candidates = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
    }).filter((point) => canOccupyWorldPosition(point.x, point.y, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT));
    let best: Phaser.Math.Vector2[] | null = null;
    for (const candidate of candidates) {
      const route = findWorldPath({ x: this.player.x, y: this.player.y }, candidate, districtMaps[this.region].blockers, DISTRICT_WIDTH, DISTRICT_HEIGHT);
      if (route && (!best || route.length < best.length)) best = route.map((point) => new Phaser.Math.Vector2(point.x, point.y));
    }
    if (best) { this.path = best; this.pathIndex = 0; if (best.length) this.moveTarget.copy(best[0]); }
  }

  private facingFor(dx: number, dy: number): Facing {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'back' : 'front';
  }

  private setFacing(facing: Facing): void { this.facing = facing; this.syncPose(); }

  private syncPose(): void {
    if (!this.actorSprite) return;
    if (this.walking && (this.facing === 'left' || this.facing === 'right')) {
      const pose = getSideWalkSprite(this.facing, this.gaitDistance);
      this.actorSprite.setTexture('act2-player-side', pose.frame).setFlipX(pose.flipX).setDisplaySize(116, 174).setAngle(0);
      return;
    }
    const col = ({ front: 0, left: 1, right: 2, back: 3 } as const)[this.facing];
    const row = this.walking ? (Math.floor(this.gaitDistance / 24) % 2) + 1 : (Math.floor(this.time.now / 1000) % 7 === 0 ? 3 : 0);
    this.actorSprite.setTexture('act2-player-walk', row * 4 + col).setFlipX(false).setDisplaySize(116, 174).setAngle(0);
  }

  private populateRegion(): void {
    setMusicZone(this.region);
    this.worldLayer.remove(this.player, false);
    if (this.companion) this.worldLayer.remove(this.companion, false);
    this.worldLayer.removeAll(true);
    const backgroundKey = ({ hq: 'act2-hq', campus: 'act2-campus', oldTown: 'act2-oldtown', harbor: 'act2-harbor', hill: 'act2-hill' } as const)[this.region];
    this.worldLayer.add(this.add.image(0, 0, backgroundKey).setOrigin(0).setDisplaySize(DISTRICT_WIDTH, DISTRICT_HEIGHT).setDepth(-2).setData('worldDepth', -2));
    this.worldLayer.add(this.add.rectangle(DISTRICT_WIDTH / 2, DISTRICT_HEIGHT / 2, DISTRICT_WIDTH, DISTRICT_HEIGHT, 0x101820, .025).setDepth(-1).setData('worldDepth', -1));
    for (const spot of spots.filter((candidate) => candidate.region === this.region)) this.addWorldSpot(spot);
    for (const npc of worldInteractions.filter((item) => item.region === this.region && item.id !== 'case-file')) {
      const marker = this.add.container(npc.x, npc.y).setData('worldDepth', getFeetDepth(npc.y));
      marker.add(this.add.ellipse(0, 9, 42, 13, 0x10171a, .42));
      marker.add(npc.id === 'mentor'
        ? this.add.image(0, 0, 'act2-mentor-world').setDisplaySize(100, 148).setOrigin(.5, 1)
        : this.add.image(0, 0, 'act2-npc-atlas', npc.atlasCell).setDisplaySize(132, 132).setOrigin(.5, 1));
      marker.add(localizedText(this, 0, npc.id === 'mentor' ? -167 : -151, t(npc.name), { fontSize: '15px', color: '#fff0cf', backgroundColor: '#102631', padding: { x: 10, y: 6 } }).setOrigin(.5));
      this.worldLayer.add(marker);
    }
    for (const portal of portals.filter((candidate) => candidate.from === this.region)) this.addWaystone(portal);
    this.worldLayer.add(this.player);
    if (this.companion) this.worldLayer.add(this.companion);
    sortWorldObjectsByDepth(this.worldLayer.list, (object) => Number(object.getData('worldDepth') ?? 0));
    this.cameras.main.setBounds(0, 0, DISTRICT_WIDTH, DISTRICT_HEIGHT);
    this.renderHud();
  }

  private addWorldSpot(spot: WorldSpot): void {
    const completed = this.state.completed.includes(spot.step);
    const active = getActTwoNextStep(this.state) === spot.step;
    const marker = this.add.container(spot.x, spot.y).setDepth(getFeetDepth(spot.y) + .01);
    marker.setData('worldDepth', getFeetDepth(spot.y) + .01);
    marker.add(this.add.ellipse(0, 12, 72, 18, 0x08121a, .42));
    if (spot.kind === 'ledger' || spot.kind === 'register') {
      marker.add(this.add.rectangle(0, -35, 54, 64, 0xead9ac).setStrokeStyle(3, 0x685b42).setAngle(-4));
      [-52, -39, -26].forEach((y) => marker.add(this.add.rectangle(-1, y, 31, 3, 0x967a52)));
    } else {
      const sprite = this.add.sprite(0, 0, 'act2-npc-atlas', spot.cell).setDisplaySize(110, 132).setOrigin(.5, 1);
      marker.add(sprite);
    }
    const badgeText = completed ? '✓' : active ? '!' : '·';
    const badge = this.add.text(0, -160, badgeText, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '35px', color: completed ? '#9dd8b7' : '#ffd45e', stroke: '#17333d', strokeThickness: 5, fontStyle: 'bold' }).setOrigin(.5);
    marker.add(badge);
    const name = this.spotName(spot.kind);
    const tag = this.add.text(0, -140, name, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '16px', color: '#fff0cf', backgroundColor: '#102631e8', padding: { x: 9, y: 6 } }).setOrigin(.5, 1);
    marker.add(tag);
    if (active) this.tweens.add({ targets: badge, y: -170, duration: 540, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.worldLayer.add(marker);
  }

  private addWaystone(portal: Portal): void {
    const available = canTravelActTwoRegion(this.state, portal.to, [...this.visited]);
    const marker = this.add.container(portal.x, portal.y).setDepth(getFeetDepth(portal.y) + .02);
    marker.setData('worldDepth', getFeetDepth(portal.y) + .02);
    const ring = this.add.ellipse(0, 1, 120, 42, available ? 0x68c4aa : 0x66747a, .22).setStrokeStyle(3, available ? 0xe9c66f : 0x738186, .9);
    const slab = this.add.rectangle(0, -34, 46, 78, 0x1a3942, .98).setStrokeStyle(3, available ? 0xe9c66f : 0x7c898d);
    const rune = this.add.text(0, -37, '碑', { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '22px', color: available ? '#f5d882' : '#a4adae', fontStyle: 'bold' }).setOrigin(.5);
    const label = this.add.text(0, -94, `${copy().regionNames[portal.to]} ${available ? '· 可通行' : '· 未解锁'}`, { fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '15px', color: '#fff0cf', backgroundColor: '#102631e8', padding: { x: 8, y: 5 } }).setOrigin(.5);
    marker.add([ring, slab, rune, label]);
    addWaystoneSign(this, marker, t(districtMaps[portal.to].label));
    if (available && portal.to !== this.region) this.tweens.add({ targets: ring, alpha: { from: .35, to: .85 }, scaleX: { from: .93, to: 1.05 }, duration: 900, yoyo: true, repeat: -1 });
    this.worldLayer.add(marker);
  }

  private spotName(kind: WorldSpot['kind']): string {
    const hans = getLocale() === 'zh-Hans';
    return kind === 'ledger' ? (hans ? '社团账簿' : '社團帳簿') : kind === 'yongqi' ? '詠琪' : kind === 'huige' ? (hans ? '辉哥' : '輝哥') : (hans ? '港口登记簿' : '港口登記簿');
  }

  private updateProximity(): void {
    this.nearbySpot = null; this.nearbyPortal = null;
    const current = getActTwoNextStep(this.state);
    let closest = INTERACT_RADIUS;
    for (const spot of spots.filter((candidate) => candidate.region === this.region && !this.state.completed.includes(candidate.step))) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y);
      if (distance < closest && (spot.step === current || !canCompleteActTwoStep(this.state, spot.step))) { this.nearbySpot = spot; closest = distance; }
    }
    let portalDistance = INTERACT_RADIUS;
    for (const portal of portals.filter((candidate) => candidate.from === this.region)) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
      if (distance < portalDistance) { this.nearbyPortal = portal; portalDistance = distance; }
    }
    this.renderPrompt();
  }

  private renderPrompt(): void {
    const old = this.ui.getByName('act2-prompt');
    if (old) { this.ui.remove(old, true); }
    if (this.overlay || !this.started) return;
    let label = '';
    if (this.nearbySpot) label = `${getLocale() === 'zh-Hans' ? 'E 互动 · ' : 'E 互動 · '}${this.spotName(this.nearbySpot.kind)}`;
    else if (this.nearbyPortal) label = `${getLocale() === 'zh-Hans' ? 'E 进入碑门 · ' : 'E 進入碑門 · '}${copy().regionNames[this.nearbyPortal.to]}`;
    if (!label) return;
    this.ui.add(localizedText(this, WIDTH / 2, HEIGHT - 92, label, { fontSize: '19px', color: '#fff0c2', backgroundColor: '#102631ed', padding: { x: 16, y: 9 }, fontStyle: 'bold' }).setOrigin(.5).setName('act2-prompt'));
  }

  private updateLantern(): void {
    if (this.time.now % 2 > 1) return;
    const context = this.lantern.getContext();
    const width = WIDTH / 2; const height = HEIGHT / 2;
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(4, 11, 20, 0.43)'; context.fillRect(0, 0, width, height);
    const cam = this.cameras.main;
    const x = (this.player.x - cam.scrollX) / 2; const y = (this.player.y - 90 - cam.scrollY) / 2;
    const radius = Math.max(112, 235 * Math.sqrt(Math.max(.12, this.state.lampOil / 100))) / 2;
    context.globalCompositeOperation = 'destination-out';
    const glow = context.createRadialGradient(x, y, 5, x, y, radius);
    glow.addColorStop(0, 'rgba(0,0,0,.99)'); glow.addColorStop(.25, 'rgba(0,0,0,.92)'); glow.addColorStop(.7, 'rgba(0,0,0,.42)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    context.globalCompositeOperation = 'source-over'; this.lantern.refresh();
  }

  private activateSpot(spot: WorldSpot): void {
    if (!canCompleteActTwoStep(this.state, spot.step)) {
      const next = getActTwoNextStep(this.state);
      this.showToast(next ? copy().tasks[next] : (getLocale() === 'zh-Hans' ? '证据已经全部核对' : '證據已全部核對'));
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) > INTERACT_RADIUS) {
      this.navigateNear(spot.x, spot.y, 82);
      this.showToast(getLocale() === 'zh-Hans' ? `走近${this.spotName(spot.kind)}后按 E` : `走近${this.spotName(spot.kind)}後按 E`);
      return;
    }
    this.showSpotDialog(spot);
  }

  private activatePortal(portal: Portal): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y) > INTERACT_RADIUS) {
      this.navigateNear(portal.x, portal.y, 70); return;
    }
    if (!canTravelActTwoRegion(this.state, portal.to, [...this.visited])) {
      const step = portal.to === 'oldTown' || portal.to === 'hq' ? 'yongqi' : 'tea-house';
      this.showToast(copy().locked.replace('{place}', copy().regionNames[portal.to]).replace('先完成当前调查', `先完成「${copy().tasks[step]}」`));
      return;
    }
    this.changeRegion(portal.to, portal.spawn);
  }

  private changeRegion(region: ActTwoRegion, spawn: { x: number; y: number }): void {
    if (region === this.region) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(320, 5, 12, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.region = region; this.visited.add(region);
      this.path = []; this.pathIndex = 0; this.player.setPosition(spawn.x, spawn.y); this.moveTarget.set(spawn.x, spawn.y);
      this.resetCompanionTrail(); this.populateRegion(); this.cameras.main.startFollow(this.player, true, .12, .12); this.cameras.main.fadeIn(420, 5, 12, 18);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false;
        const extra = region === 'hq' || region === 'hill'
          ? (getLocale() === 'zh-Hans' ? ' · 本幕线索仍在校园、旧城、港口' : ' · 本幕線索仍在校園、舊城、港口')
          : '';
        this.showToast(`${getLocale() === 'zh-Hans' ? '抵达：' : '抵達：'}${copy().regionNames[region]}${extra}`);
      });
    });
  }

  private showSpotDialog(spot: WorldSpot): void {
    const c = copy();
    const isNpc = spot.kind === 'yongqi' || spot.kind === 'huige';
    const hans = getLocale() === 'zh-Hans';
    const speaker = spot.kind === 'yongqi' ? (hans ? '詠琪 · 社团经手人' : '詠琪 · 社團經手人') : spot.kind === 'huige' ? (hans ? '辉哥 · 茶馆线人' : '輝哥 · 茶館線人') : spot.kind === 'ledger' ? c.regionNames.campus : c.regionNames.harbor;
    const portraitKey = spot.kind === 'yongqi' ? 'act2-yongqi' : 'act2-huige';
    const portraitFrame = spot.kind === 'yongqi' ? 1 : 0;
    const layer = this.createOverlay('reply');
    layer.add(localizedText(this, WIDTH / 2, 264, isNpc ? speaker : (hans ? '现场记录' : '現場記錄'), { fontSize: '25px', color: '#e9c66f', fontStyle: 'bold' }).setOrigin(.5));
    if (isNpc) layer.add(this.add.image(488, 465, portraitKey, portraitFrame).setDisplaySize(200, 200));
    else this.addEvidenceDrawing(layer, spot.kind);
    const x = isNpc ? 910 : WIDTH / 2;
    const width = isNpc ? 25 : 37;
    layer.add(localizedText(this, x, 376, wrapCjkText(c.story[spot.step], width), { fontSize: isNpc ? '23px' : '25px', color: '#fff0cf', align: 'center', lineSpacing: 12 }).setOrigin(.5));
    const choices = spot.kind === 'yongqi'
      ? [hans ? '核对签收日期' : '核對簽收日期', hans ? '核对物资数量' : '核對物資數量']
      : spot.kind === 'huige'
        ? [hans ? '只记录亲眼见到的会面时间' : '只記錄親眼見到的會面時間', hans ? '追问文件袋里的东西' : '追問文件袋裏的東西']
        : [hans ? '将异常记入线索本' : '將異常記入線索簿'];
    choices.forEach((label, index) => this.addUiButton(layer, isNpc ? 850 : 800, 566 + index * 68, isNpc ? 440 : 380, label, () => {
      this.state = completeActTwoStep(this.state, spot.step);
      if (!this.clues.includes(c.evidence[spot.step])) this.clues.push(c.evidence[spot.step]);
      this.saveState(); this.renderHud(); this.populateRegion();
      const response = spot.kind === 'yongqi'
        ? (index === 0 ? (hans ? '通知时间与签收单日期能对上。我只签收过一批物资，后面那两笔我没有经手。' : '通知時間與簽收單日期能對上。我只簽收過一批物資，後面那兩筆我沒有經手。') : (hans ? '清单里的数量和签收数量不一样。可能是录入错误，也可能还有记录没找到。' : '清單裏的數量和簽收數量不一樣。可能是輸入錯誤，也可能還有記錄未找到。'))
        : spot.kind === 'huige'
          ? (index === 0 ? (hans ? '我只敢确认那几次会面。袋子里有什么，我没看见，不能替你猜。' : '我只敢確認那幾次會面。袋子裏有甚麼，我沒看見，不能替你猜。') : (hans ? '那只袋子后来被人带走了，但我不知道里面装着什么。你最好去核对港口登记。' : '那隻袋子後來被人帶走了，但我不知道裏面裝着甚麼。你最好去核對港口登記。'))
          : c.evidence[spot.step];
      this.showSpotReply(spot, response);
    }));
    this.addUiButton(layer, 1360, 263, 190, c.back, () => this.closeOverlay(), false);
    this.setOverlayAction(() => this.closeOverlay());
  }

  private showSpotReply(spot: WorldSpot, response: string): void {
    const layer = this.createOverlay('prologue');
    const isNpc = spot.kind === 'yongqi' || spot.kind === 'huige';
    const key = spot.kind === 'yongqi' ? 'act2-yongqi' : 'act2-huige';
    if (isNpc) layer.add(this.add.image(505, 455, key, spot.kind === 'yongqi' ? 2 : 1).setDisplaySize(205, 205));
    else this.addEvidenceDrawing(layer, spot.kind);
    const x = isNpc ? 940 : WIDTH / 2;
    const wrap = isNpc ? 25 : 36;
    layer.add(localizedText(this, x, 330, getLocale() === 'zh-Hans' ? '线索已归档' : '線索已歸檔', { fontSize: '23px', color: '#e9c66f', fontStyle: 'bold' }).setOrigin(.5));
    layer.add(localizedText(this, x, 430, wrapCjkText(response, wrap), { fontSize: '22px', color: '#fff0cf', align: 'center', lineSpacing: 12 }).setOrigin(.5));
    layer.add(localizedText(this, x, 560, wrapCjkText(copy().evidence[spot.step], wrap), { fontSize: '18px', color: '#a6d7ba', align: 'center', lineSpacing: 9 }).setOrigin(.5));
    this.addUiButton(layer, WIDTH / 2, 675, 310, copy().continue, () => this.closeOverlay());
    this.setOverlayAction(() => this.closeOverlay());
  }

  private addEvidenceDrawing(layer: Phaser.GameObjects.Container, kind: WorldSpot['kind']): void {
    const cx = WIDTH / 2; const cy = 465;
    layer.add(this.add.ellipse(cx, cy + 65, 150, 28, 0x071019, .55));
    layer.add(this.add.rectangle(cx, cy, 110, 142, 0xe9d9b4).setStrokeStyle(4, 0x907a52).setAngle(-3));
    [-39, -22, -5, 12, 29].forEach((dy, index) => layer.add(this.add.rectangle(cx - 4, cy + dy, index === 1 ? 56 : 72, 4, 0x927a54).setAngle(-3)));
    layer.add(localizedText(this, cx, cy + 92, kind === 'register' ? (getLocale() === 'zh-Hans' ? '登记簿' : '登記簿') : (getLocale() === 'zh-Hans' ? '账目副本' : '帳目副本'), { fontSize: '17px', color: '#e9c66f' }).setOrigin(.5));
  }

  private renderHud(): void {
    if (!this.ui) return;
    this.ui.removeAll(true);
    this.hudButtons = [];
    const c = copy();
    this.ui.add(this.add.rectangle(24, 24, 440, 340, 0x10232e, .93).setOrigin(0).setStrokeStyle(2, 0x5b7e81, .9));
    this.ui.add(localizedText(this, 46, 39, c.title, { fontSize: '18px', color: '#e7c36d', letterSpacing: 2 }));
    this.ui.add(localizedText(this, 46, 68, c.list, { fontSize: '23px', color: '#fff0d0', fontStyle: 'bold' }));
    this.ui.add(localizedText(this, 420, 73, `${this.state.completed.length}/4`, { fontSize: '14px', color: '#93bdb1' }).setOrigin(1, 0));
    const current = getActTwoNextStep(this.state);
    this.ui.add(localizedText(this, 46, 101, wrapCjkText(c.subtitle, 27), { fontSize: '13px', color: '#bfd0c9', lineSpacing: 4 }));
    this.ui.add(localizedText(this, 46, 139, `${c.oil} ${this.state.lampOil}%`, { fontSize: '13px', color: '#f2d17b' }));
    this.ui.add(this.add.rectangle(312, 149, 168, 7, 0x1b303a));
    this.ui.add(this.add.rectangle(228 + 168 * this.state.lampOil / 200, 149, 168 * this.state.lampOil / 100, 7, 0xe9c66f));
    const next = getActTwoNextStep(this.state);
    (['ledger', 'yongqi', 'tea-house', 'register'] as ActTwoStep[]).forEach((step, index) => {
      const done = this.state.completed.includes(step);
      const active = step === next;
      const label = `${done ? '✓' : active ? '◆' : '○'}  ${c.tasks[step]}`;
      const y = 171 + index * 28;
      this.ui.add(localizedText(this, 48, y, wrapCjkText(label, 25), { fontSize: '15px', color: done ? '#9dd8b7' : active ? '#ffdb7a' : '#9eaeab', fontStyle: active ? 'bold' : 'normal' }));
    });
    this.addUiButton(this.ui, 145, 320, 206, getLocale() === 'zh-Hans' ? '✦ 求救 / 操作提示' : '✦ 求救 / 操作提示', () => this.openHelp());
    this.drawRouteMap();
    const regionText = `${getLocale() === 'zh-Hans' ? '当前地点' : '目前地點'} · ${c.regionNames[this.region]}`;
    this.ui.add(localizedText(this, WIDTH / 2, 26, regionText, { fontSize: '19px', color: '#f5d987', backgroundColor: '#102631dd', padding: { x: 20, y: 9 } }).setOrigin(.5, 0));
    this.ui.add(localizedText(this, WIDTH / 2, HEIGHT - 30, `${getLocale() === 'zh-Hans' ? 'WASD／方向键移动 · 点击地面行走 · 鼠标移动转向' : 'WASD／方向鍵移動 · 點擊地面行走 · 滑鼠移動轉向'}     E／Space 互动     M 地图     L 线索`, { fontSize: '15px', color: '#f7e7c1', backgroundColor: '#102631dd', padding: { x: 18, y: 9 } }).setOrigin(.5, 1));
    this.addUiButton(this.ui, WIDTH - 258, HEIGHT - 68, 110, getLocale() === 'zh-Hans' ? 'M 地图' : 'M 地圖', () => this.toggleMap());
    this.addUiButton(this.ui, WIDTH - 124, HEIGHT - 68, 110, getLocale() === 'zh-Hans' ? 'L 线索' : 'L 線索', () => this.openClueBook());
    this.renderPrompt();
    if (isActTwoComplete(this.state)) this.addUiButton(this.ui, WIDTH / 2, 87, 390, getLocale() === 'zh-Hans' ? '结案 · 学习规则与领取白泽' : '結案 · 學習規則與領取白澤', () => this.showConclusion());
  }

  private drawRouteMap(): void {
    const c = copy();
    this.ui.add(this.add.rectangle(WIDTH - 18, 18, 270, 206, 0x0d1d28, .94).setOrigin(1, 0).setStrokeStyle(2, 0x9b8455));
    this.ui.add(this.add.image(WIDTH - 28, 52, 'act2-world-overview').setDisplaySize(248, 146).setOrigin(1, 0));
    this.ui.add(localizedText(this, WIDTH - 40, 28, c.map, { fontSize: '15px', color: '#f1d17b', fontStyle: 'bold' }).setOrigin(1, 0));
    this.ui.add(localizedText(this, WIDTH - 40, 201, getLocale() === 'zh-Hans' ? '按 M 展开地图' : '按 M 展開地圖', { fontSize: '12px', color: '#c6d8ce' }).setOrigin(1, 0));
    const graph = this.add.graphics();
    const left = WIDTH - 28 - 248; const top = 52;
    const mapPoint = (region: ActTwoRegion) => {
      const point = districtMaps[region].overview;
      return { x: left + point.x / 360 * 248, y: top + point.y / 430 * 146 };
    };
    const links = [...new Map(portals.map(({ from, to }) => [[from, to].sort().join(':'), [from, to] as [ActTwoRegion, ActTwoRegion]])).values()];
    links.forEach(([a, b]) => {
      const story = (a === 'campus' && b === 'oldTown') || (a === 'oldTown' && b === 'harbor');
      const p = mapPoint(a); const q = mapPoint(b);
      graph.lineStyle(story ? 2 : 1, story ? 0xf2d47e : 0x6f8786, story ? .9 : .55);
      graph.lineBetween(p.x, p.y, q.x, q.y);
    });
    REGIONS.forEach((region) => {
      const p = mapPoint(region);
      graph.fillStyle(region === this.region ? 0xffe08a : this.visited.has(region) ? 0xa6d7ba : 0x6a777b, 1).fillCircle(p.x, p.y, region === this.region ? 7 : 5);
      if (region === this.region) graph.lineStyle(2, 0xffdf82, 1).strokeCircle(p.x, p.y, 11);
    });
    this.ui.add(graph);
  }

  private createOverlay(kind: OverlayKind = 'dialogue'): Phaser.GameObjects.Container {
    this.closeOverlay();
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(110);
    this.overlay = layer;
    this.overlayKind = kind;
    this.overlayButtons = [];
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x071019, .74));
    layer.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, 1260, 820, 0x102631, .98).setStrokeStyle(3, 0xdcb96b));
    this.renderPrompt();
    return layer;
  }

  private closeOverlay(): void {
    this.overlay?.destroy(true); this.overlay = null; this.overlayAction = null; this.overlayKind = null; this.overlayButtons = []; this.renderPrompt();
  }

  private setOverlayAction(action: () => void): void { this.overlayAction = action; }

  private addUiButton(layer: Phaser.GameObjects.Container, x: number, y: number, width: number, label: string, action: () => void, primary = true): void {
    const height = this.touchLayout ? 88 : 54;
    const box = this.add.rectangle(x, y, width, height, primary ? 0xe9c66f : 0x29434d).setStrokeStyle(2, 0xffe3a0);
    const text = localizedText(this, x, y, wrapCjkText(label, Math.max(8, Math.floor(width / 26))), { fontSize: this.touchLayout ? '20px' : '16px', color: primary ? '#19323d' : '#fff0cf', fontStyle: 'bold', align: 'center', lineSpacing: 4, wordWrap: { width: width - 18 } }).setOrigin(.5);
    const target = { centerX: x, centerY: y, width, height, action };
    if (layer === this.ui) this.hudButtons.push(target); else this.overlayButtons.push(target);
    layer.add([box, text]);
  }

  private showPrologue(): void {
    const hans = getLocale() === 'zh-Hans';
    const layer = this.createOverlay();
    layer.add(this.add.image(490, 460, 'act2-yongqi', 0).setDisplaySize(220, 220));
    layer.add(localizedText(this, 490, 592, '詠琪', { fontSize: '20px', color: '#e9c66f', fontStyle: 'bold' }).setOrigin(.5));
    layer.add(localizedText(this, 900, 322, hans ? '第二幕 · 账本的空白页' : '第二幕 · 帳本的空白頁', { fontSize: '31px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    const body = hans
      ? '一份匿名材料提到三笔社团活动费。账上写着“已结清”，签收人却说只收到一批物资。\n\n今晚，你要从校园账簿出发，沿碑前往旧城茶馆，再到海边港口核对登记。先记下看到的，再判断哪些仍需核实。'
      : '一份匿名材料提到三筆社團活動費。帳上寫着「已結清」，簽收人卻說只收到一批物資。\n\n今晚，你要從校園帳簿出發，沿碑前往舊城茶館，再到海邊港口核對登記。先記下看見的，再判斷哪些仍需核實。';
    layer.add(localizedText(this, 920, 426, wrapCjkText(body, 28), { fontSize: '21px', color: '#d8e4dc', align: 'center', lineSpacing: 12 }).setOrigin(.5));
    this.addUiButton(layer, 920, 650, 280, hans ? '开始调查' : '開始調查', () => { this.started = true; this.closeOverlay(); });
    this.setOverlayAction(() => { this.started = true; this.closeOverlay(); });
  }

  private showToast(message: string): void {
    this.toast?.destroy();
    this.toast = localizedText(this, WIDTH / 2, HEIGHT - 125, message, { fontSize: '17px', color: '#fff0cf', backgroundColor: '#102631ee', padding: { x: 14, y: 9 } }).setOrigin(.5).setScrollFactor(0).setDepth(125);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2100, duration: 300, onComplete: () => { this.toast?.destroy(); this.toast = null; } });
  }

  private toggleMap(): void {
    if (this.overlay) { this.closeOverlay(); return; }
    const c = copy(); const layer = this.createOverlay('map');
    const hans = getLocale() === 'zh-Hans';
    layer.add(localizedText(this, WIDTH / 2, 93, c.map, { fontSize: '30px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    const mapX = 250; const mapY = 140; const mapW = 1100; const mapH = 733;
    layer.add(this.add.image(WIDTH / 2, 455, 'act2-world-overview').setDisplaySize(mapW, mapH).setAlpha(.9));
    const graph = this.add.graphics();
    const links = [...new Map(portals.map(({ from, to }) => [[from, to].sort().join(':'), [from, to] as [ActTwoRegion, ActTwoRegion]])).values()];
    const point = (region: ActTwoRegion) => {
      const overview = districtMaps[region].overview;
      return { x: mapX + overview.x / 360 * mapW, y: mapY + overview.y / 430 * mapH };
    };
    graph.lineStyle(5, 0xe7c36d, .9);
    links.forEach(([from, to]) => { const a = point(from); const b = point(to); graph.lineBetween(a.x, a.y, b.x, b.y); });
    graph.fillStyle(0x102631, .98);
    const destinations: string[] = [];
    REGIONS.forEach((region) => {
      const pos = point(region);
      const visited = this.visited.has(region);
      const unlocked = canTravelActTwoRegion(this.state, region, [...this.visited]);
      const active = region === this.region;
      graph.fillStyle(active ? 0xffdf82 : visited ? 0x9ad1b5 : 0x6e7e82, 1).fillCircle(pos.x, pos.y, active ? 17 : 13);
      layer.add(localizedText(this, pos.x + 19, pos.y - 10, c.regionNames[region], { fontSize: '16px', color: '#fff0cf', backgroundColor: '#102631dd', padding: { x: 7, y: 4 } }));
      const label = active ? (hans ? '当前位置' : '目前位置') : visited ? (hans ? '已到访 · 需步行' : '已到訪 · 需步行') : unlocked ? (hans ? '步行至传送碑' : '步行至傳送碑') : (hans ? '调查后开放' : '調查後開放');
      destinations.push(`${active ? '●' : visited ? '●' : '○'} ${c.regionNames[region]} · ${label}`);
    });
    layer.add(graph);
    layer.add(localizedText(this, WIDTH / 2, 137, hans ? '地图只作指引：沿街道走到碑前，按 E 进入' : '地圖只作指引：沿街道走到碑前，按 E 進入', { fontSize: '17px', color: '#fff0cf', backgroundColor: '#102631dc', padding: { x: 14, y: 7 } }).setOrigin(.5));
    const currentDestinations = portals.filter((portal) => portal.from === this.region).map((portal) => {
      const ready = canTravelActTwoRegion(this.state, portal.to, [...this.visited]);
      return `→ ${c.regionNames[portal.to]} · ${ready ? (hans ? '可步行前往' : '可步行前往') : (hans ? '完成当前调查后开放' : '完成目前調查後開放')}`;
    });
    layer.add(localizedText(this, 1050, 666, [hans ? '本区传送碑去向' : '本區傳送碑去向', ...currentDestinations, '', ...destinations].join('\n'), {
      fontSize: '17px', color: '#fff0cf', backgroundColor: '#102631f2', padding: { x: 18, y: 14 }, lineSpacing: 9,
    }));
    this.addUiButton(layer, WIDTH / 2, 830, 250, hans ? '关闭地图' : '關閉地圖', () => this.closeOverlay());
    this.setOverlayAction(() => this.closeOverlay());
  }

  private handleExpandedMapPointer(x: number, y: number): void {
    const mapX = 250; const mapY = 140; const mapW = 1100; const mapH = 733;
    for (const region of REGIONS) {
      const overview = districtMaps[region].overview;
      const px = mapX + overview.x / 360 * mapW;
      const py = mapY + overview.y / 430 * mapH;
      if (Phaser.Math.Distance.Between(x, y, px, py) > (this.touchLayout ? 58 : 34)) continue;
      if (region === this.region) this.showToast(getLocale() === 'zh-Hans' ? '此地图只显示位置；请沿路步行到传送碑。' : '此地圖只顯示位置；請沿路步行到傳送碑。');
      else if (!this.visited.has(region) && !canTravelActTwoRegion(this.state, region, [...this.visited])) this.showToast(copy().locked.replace('{place}', copy().regionNames[region]));
      else this.showToast(getLocale() === 'zh-Hans' ? '不会从地图直接传送；请走到对应传送碑并按 E。' : '不會從地圖直接傳送；請走到對應傳送碑並按 E。');
      return;
    }
    if (Math.abs(y - 830) <= (this.touchLayout ? 48 : 36) && Math.abs(x - WIDTH / 2) <= 140) this.closeOverlay();
  }

  private openClueBook(): void {
    if (this.overlay) { this.closeOverlay(); return; }
    const layer = this.createOverlay('clues'); const hans = getLocale() === 'zh-Hans';
    layer.add(localizedText(this, WIDTH / 2, 260, hans ? '调查记录 · 事实与待核实内容分开保存' : '調查記錄 · 事實與待核實內容分開保存', { fontSize: '25px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    if (!this.clues.length) layer.add(localizedText(this, WIDTH / 2, 440, hans ? '还没有线索。按清单前往调查点。' : '還沒有線索。按清單前往調查點。', { fontSize: '20px', color: '#b9ccc5' }).setOrigin(.5));
    this.clues.forEach((clue, index) => layer.add(localizedText(this, 390, 330 + index * 58, wrapCjkText(`• ${clue}`, 46), { fontSize: '19px', color: '#d8e4dc', lineSpacing: 7 })));
    this.addUiButton(layer, WIDTH / 2, 660, 230, hans ? '关闭记录本' : '關閉記錄簿', () => this.closeOverlay());
    this.setOverlayAction(() => this.closeOverlay());
  }

  private showConclusion(): void {
    const c = copy(); const hans = getLocale() === 'zh-Hans';
    const layer = this.createOverlay('law');
    layer.add(localizedText(this, WIDTH / 2, 250, hans ? '第二幕完成 · 先看规则，再领取灵兽' : '第二幕完成 · 先看規則，再領取靈獸', { fontSize: '31px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    layer.add(localizedText(this, WIDTH / 2, 316, wrapCjkText(c.conclusion, 42), { fontSize: '18px', color: '#cbdad4', align: 'center', lineSpacing: 8 }).setOrigin(.5));
    layer.add(this.add.rectangle(WIDTH / 2, 486, 900, 190, 0x193742).setStrokeStyle(2, 0xe9c66f));
    layer.add(localizedText(this, 390, 410, hans ? '规则提示 · 不等于定罪' : '規則提示 · 不等於定罪', { fontSize: '20px', color: '#e9c66f', fontStyle: 'bold' }));
    layer.add(localizedText(this, 390, 450, wrapCjkText(c.law, 48), { fontSize: '16px', color: '#e2e6db', lineSpacing: 8 }));
    this.addUiButton(layer, WIDTH / 2, 650, 320, hans ? '查看奖励 · 白泽' : '查看獎勵 · 白澤', () => this.showReward());
    this.setOverlayAction(() => this.showReward());
  }

  private showReward(): void {
    if (!this.state.rewardClaimed) {
      const reward = claimActTwoReward(this.state);
      if (reward) { this.state = reward; this.saveState(); }
    }
    const c = copy(); const hans = getLocale() === 'zh-Hans';
    const layer = this.createOverlay('reward');
    const light = this.add.circle(510, 445, 160, 0xb7efff, .14);
    layer.add(light);
    this.tweens.add({ targets: light, scale: 1.2, alpha: .3, duration: 1100, yoyo: true, repeat: -1 });
    const beast = this.add.image(510, 454, 'act2-baize').setDisplaySize(560, 187).setAlpha(0);
    layer.add(beast);
    this.tweens.add({ targets: beast, alpha: 1, y: 434, duration: 1200, ease: 'Sine.Out' });
    layer.add(localizedText(this, 1040, 354, hans ? '幕末礼物 · 求证之灵' : '幕末禮物 · 求證之靈', { fontSize: '18px', color: '#e9c66f', letterSpacing: 2 }));
    layer.add(localizedText(this, 1040, 410, hans ? '白泽' : '白澤', { fontSize: '34px', color: '#fff0cf', fontStyle: 'bold' }));
    layer.add(localizedText(this, 1040, 468, wrapCjkText(c.reward, 24), { fontSize: '18px', color: '#d8e4dc', lineSpacing: 9 }));
    this.addUiButton(layer, 1040, 615, 280, c.back, () => { this.closeOverlay(); this.scene.start('world'); });
    this.addUiButton(layer, 1040, 700, 320, hans ? '下一份档案 · 第三幕预告' : '下一份檔案 · 第三幕預告', () => {
      const next = this.createOverlay('dialogue');
      next.add(localizedText(this, 800, 285, hans ? '第三幕 · 礼物的边界（筹备中）' : '第三幕 · 禮物的邊界（籌備中）', { fontSize: '30px', color: '#ffe0a0' }).setOrigin(.5));
      next.add(localizedText(this, 800, 440, wrapCjkText(hans
        ? '旧城的地产商带来一份礼物，声称只是朋友间的人情。接下来的调查将沿原有街区与传送碑，核对送礼时点、审批往来与真实目的。貔貅提醒你：守住边界。此处为剧情预告，第三幕调查尚未开放。'
        : '舊城的地產商帶來一份禮物，聲稱只是朋友間的人情。接下來的調查將沿原有街區與傳送碑，核對送禮時點、審批往來與真實目的。貔貅提醒你：守住邊界。此處為劇情預告，第三幕調查尚未開放。', 35), { fontSize: '23px', color: '#e0e9df', lineSpacing: 12 }).setOrigin(.5));
      this.addUiButton(next, 800, 675, 300, c.back, () => this.closeOverlay());
    });
    this.setOverlayAction(() => { this.closeOverlay(); this.scene.start('world'); });
  }

  private showCollection(): void {
    const c = copy(); const layer = this.createOverlay('collection');
    layer.add(localizedText(this, WIDTH / 2, 210, getLocale() === 'zh-Hans' ? '六灵图鉴 · 每幕完成后加入' : '六靈圖鑑 · 每幕完成後加入', { fontSize: '28px', color: '#fff0cf', fontStyle: 'bold' }).setOrigin(.5));
    const artKeys: Record<string, string> = { xiezhi: 'act2-xiezhi', baize: 'act2-baize', pixiu: 'act2-pixiu', qilin: 'act2-qilin', xuanwu: 'act2-xuanwu', qinglong: 'act2-qinglong' };
    const fruitKeys: Record<string, string> = { xiezhi: 'fruit-clarity', baize: 'fruit-testimony', pixiu: 'fruit-boundary', qilin: 'fruit-calm', xuanwu: 'fruit-record', qinglong: 'fruit-daylight' };
    spirits.forEach((spirit, index) => {
      const col = index % 3; const row = Math.floor(index / 3); const x = 420 + col * 380; const y = 350 + row * 220;
      const unlocked = spirit.unlockAct <= 2;
      layer.add(this.add.rectangle(x, y, 330, 188, unlocked ? 0x193742 : 0x1b2931).setStrokeStyle(2, unlocked ? 0xe9c66f : 0x58666a));
      layer.add(this.add.image(x, y - 20, artKeys[spirit.id]).setDisplaySize(210, 70).setAlpha(unlocked ? 1 : .18));
      const name = getLocale() === 'zh-Hans' ? spirit.name.hans : spirit.name.hant;
      const virtue = getLocale() === 'zh-Hans' ? spirit.virtue.hans : spirit.virtue.hant;
      const fruit = getLocale() === 'zh-Hans' ? spirit.fruit.hans : spirit.fruit.hant;
      layer.add(this.add.image(x - 92, y + 58, fruitKeys[spirit.id]).setDisplaySize(34, 34).setAlpha(unlocked ? 1 : .2));
      layer.add(localizedText(this, x + 14, y + 47, unlocked ? `${name} · ${virtue}` : c.locked.replace('{place}', `${spirit.unlockAct}${getLocale() === 'zh-Hans' ? '幕' : '幕'}`), { fontSize: '17px', color: unlocked ? '#fff0cf' : '#98a3a3' }).setOrigin(.5));
      if (unlocked) layer.add(localizedText(this, x + 14, y + 76, `${getLocale() === 'zh-Hans' ? '灵果' : '靈果'} · ${fruit}`, { fontSize: '14px', color: '#a6d7ba' }).setOrigin(.5));
    });
    this.addUiButton(layer, WIDTH / 2, 700, 230, c.back, () => this.closeOverlay());
    this.setOverlayAction(() => this.closeOverlay());
  }

}
