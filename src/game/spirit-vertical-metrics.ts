import type { SpiritGrowthId, SpiritId } from './spirits';

export interface SpiritVerticalRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export type SpiritVerticalFacing = 'front' | 'back';
export type SpiritVerticalPose = 'idle' | 'a' | 'b';
export interface SpiritVerticalFrameMetrics {
  readonly index: number;
  readonly frameName: string;
  readonly stage: SpiritGrowthId;
  readonly facing: SpiritVerticalFacing;
  readonly pose: SpiritVerticalPose;
  /** Absolute PNG pixels. Register independently using texture.add. */
  readonly sourceBBox: SpiritVerticalRect;
  /** Feet anchor, source-local pixel-edge coordinates (not normalized). */
  readonly anchor: Readonly<{ x: number; y: number }>;
  readonly sourceFootCenterX: number;
  /** Exclusive body bottom relative to sourceBBox.y. */
  readonly sourceFootY: number;
}
export interface SpiritVerticalStageMetrics {
  readonly referenceBodyHeight: number;
  /** Maximum independent crop dimensions in this stage, NOT grid-cell size. */
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}
export interface SpiritVerticalSheetMetrics {
  readonly assetPath: string;
  readonly textureKey: string;
  readonly sha256: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly alpha: Readonly<{ min: number; max: number; transparentPixels: number; totalPixels: number }>;
  readonly outsideSourceAlpha: Readonly<{ max: number; alpha16plusPixels: number; nonzeroPixels: number }>;
  readonly stages: Readonly<Record<SpiritGrowthId, SpiritVerticalStageMetrics>>;
  readonly frames: readonly SpiritVerticalFrameMetrics[];
}
export interface SpiritVerticalRuntimeModel extends SpiritVerticalFrameMetrics {
  readonly textureKey: string;
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
}

/**
 * Alpha-verified BAIZE V3 CANDIDATE, kept separate from the official sheet map.
 * Front/back are three-quarter views; this is an explicit fallback candidate,
 * not a claim that straight-on art is ready. The PNG has alpha 0..255, 42.4%
 * fully transparent pixels. All alpha>=16 pixels fit inside the 18 independent
 * sourceBBox crops; outside max alpha=3/255. No original head/foot truncation
 * was observed. Body cores exclude glow; crops retain original pixels.
 * Same fixed stage scale and source-local foot-origin contract as other sheets.
 * Source boxes request 8px padding and do NOT use a uniform grid. White fur is
 * retained by the crops; the core mask is only a measurement aid, not image editing.
 * Retained as a separately addressable fallback; the official map below now
 * uses a separately measured direct-front/back image at the v2 asset path.
 */
export const baizeVerticalV3CandidateMetrics: SpiritVerticalSheetMetrics & {
  readonly status: 'candidate';
  readonly orientation: 'three-quarter-front-back';
} = {
  status: 'candidate',
  orientation: 'three-quarter-front-back',
  assetPath: "src/assets/spirit-baize-vertical-v3-candidate.png",
  textureKey: "spirit-baize-vertical-v3-candidate",
  sha256: "aac0f0b3355abee12580ac6e04d276d77304ca2dbb11895b6ef22d24f4a0e577",
  imageWidth: 887,
  imageHeight: 1774,
  alpha: {"min":0,"max":255,"transparentPixels":667480,"totalPixels":1573538},
  outsideSourceAlpha: {"max":3,"alpha16plusPixels":0,"nonzeroPixels":36296},
  stages: {"young":{"referenceBodyHeight":213,"sourceWidth":215,"sourceHeight":229},"growing":{"referenceBodyHeight":238,"sourceWidth":250,"sourceHeight":254},"guardian":{"referenceBodyHeight":263,"sourceWidth":328,"sourceHeight":279}},
  frames: [
    {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":16,"y":87,"width":194,"height":213},"anchor":{"x":110.5,"y":205},"sourceFootCenterX":110.5,"sourceFootY":205},
    {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":249,"y":56,"width":243,"height":245},"anchor":{"x":140,"y":237},"sourceFootCenterX":140,"sourceFootY":237},
    {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":535,"y":30,"width":318,"height":271},"anchor":{"x":184,"y":263},"sourceFootCenterX":184,"sourceFootY":263},
    {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":18,"y":365,"width":215,"height":210},"anchor":{"x":121,"y":202},"sourceFootCenterX":121,"sourceFootY":202},
    {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":252,"y":330,"width":247,"height":248},"anchor":{"x":142,"y":240},"sourceFootCenterX":142,"sourceFootY":240},
    {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":539,"y":308,"width":328,"height":270},"anchor":{"x":189,"y":262},"sourceFootCenterX":189,"sourceFootY":262},
    {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":17,"y":643,"width":202,"height":209},"anchor":{"x":114.5,"y":201},"sourceFootCenterX":114.5,"sourceFootY":201},
    {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":250,"y":608,"width":246,"height":244},"anchor":{"x":141.5,"y":236},"sourceFootCenterX":141.5,"sourceFootY":236},
    {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":538,"y":585,"width":321,"height":268},"anchor":{"x":185.5,"y":260},"sourceFootCenterX":185.5,"sourceFootY":260},
    {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":19,"y":929,"width":188,"height":225},"anchor":{"x":102,"y":217},"sourceFootCenterX":102,"sourceFootY":217},
    {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":253,"y":901,"width":245,"height":254},"anchor":{"x":138.5,"y":246},"sourceFootCenterX":138.5,"sourceFootY":246},
    {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":544,"y":879,"width":315,"height":278},"anchor":{"x":187,"y":270},"sourceFootCenterX":187,"sourceFootY":270},
    {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":18,"y":1209,"width":192,"height":229},"anchor":{"x":104,"y":221},"sourceFootCenterX":104,"sourceFootY":221},
    {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":253,"y":1186,"width":246,"height":252},"anchor":{"x":139,"y":244},"sourceFootCenterX":139,"sourceFootY":244},
    {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":539,"y":1161,"width":318,"height":279},"anchor":{"x":188.5,"y":271},"sourceFootCenterX":188.5,"sourceFootY":271},
    {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":21,"y":1507,"width":186,"height":224},"anchor":{"x":101,"y":216},"sourceFootCenterX":101,"sourceFootY":216},
    {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":254,"y":1477,"width":250,"height":254},"anchor":{"x":141,"y":246},"sourceFootCenterX":141,"sourceFootY":246},
    {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":540,"y":1455,"width":319,"height":279},"anchor":{"x":189,"y":271},"sourceFootCenterX":189,"sourceFootY":271},
  ],
};

/** Resolver for the retained three-quarter fallback, not the official direct-view asset. */
export function getBaizeVerticalV3CandidateRuntimeModel(
  stage: SpiritGrowthId, facing: SpiritVerticalFacing, pose: SpiritVerticalPose, stageSize: number,
): SpiritVerticalRuntimeModel {
  if (!Number.isFinite(stageSize) || stageSize <= 0) throw new RangeError('stageSize must be finite and positive');
  const sheet = baizeVerticalV3CandidateMetrics;
  const frame = sheet.frames.find(value => value.stage === stage && value.facing === facing && value.pose === pose)!;
  return {
    ...frame, textureKey: sheet.textureKey,
    scale: stageSize / sheet.stages[stage].referenceBodyHeight,
    originX: frame.sourceFootCenterX / frame.sourceBBox.width,
    originY: frame.sourceFootY / frame.sourceBBox.height,
  };
}

/**
 * Latest accepted vertical-v2 sheets, with one consistent interface.
 * Baize uses the alpha-verified direct-front/back sheet, measured independently.
 * Its row labels follow the supplied idle/A/B order; front idle has a raised paw
 * and front A/B appear similar, so true alternating gait still needs visual review.
 * Load as an IMAGE, then texture.add(frame.frameName,0,sourceBBox.x,sourceBBox.y,
 * sourceBBox.width,sourceBBox.height). NEVER slice a uniform 3x6 grid.
 * Ordering: stage columns young/growing/guardian, front idle/A/B then back idle/A/B.
 *
 * Runtime: resolve(...,stage.size), then setTexture(model.textureKey,model.frameName),
 * setOrigin(model.originX,model.originY), setScale(model.scale), setPosition(feetX,feetY).
 * All poses of a stage share scale=stage.size/referenceBodyHeight. Do NOT call
 * setDisplaySize per pose. Source rectangles retain original pixels unchanged.
 *
 * Alpha/core measurement: JS/zlib RGBA8 decoder; alpha>=224 minus near-white
 * candidates, 18 main connected bodies, nearby detached details, padding up to
 * 8px limited by neighboring body mid-gaps/image edges. Xiezhi guardian has only
 * 1-2px padding on some row edges. All alpha>=16 pixels are inside the crops;
 * outside residual alpha<=4/255. No severe original head/foot truncation found.
 * Feet x: idle bottom-8% 20/80 x percentiles. A/B retain idle feet-to-body-center
 * bias for that stage/direction, avoiding shifts toward the single planted foot.
 * Feet y: measured exclusive body bottom. Anchors are estimates, not rig joints;
 * final visual polish may require hand adjustment. Hashes lock the measurements.
 * No v1 fallback, PNG modification, extra metrics imports, or animation API edits.
 */
export const spiritVerticalMetrics: Readonly<Record<SpiritId, SpiritVerticalSheetMetrics | null>> = {
  baize: {
    assetPath: "src/assets/spirit-baize-vertical-v2.png",
    textureKey: "spirit-baize-vertical-v2",
    sha256: "a338aba481821fb2717db99c0116073f4f14c29effb41bd6b4402ed6a687ba0a",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":690243,"totalPixels":1573538},
    outsideSourceAlpha: {"max":2,"alpha16plusPixels":0,"nonzeroPixels":2236},
    stages: {"young":{"referenceBodyHeight":220,"sourceWidth":187,"sourceHeight":236},"growing":{"referenceBodyHeight":258,"sourceWidth":265,"sourceHeight":274},"guardian":{"referenceBodyHeight":276,"sourceWidth":331,"sourceHeight":288}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":33,"y":83,"width":187,"height":222},"anchor":{"x":92.5,"y":214},"sourceFootCenterX":92.5,"sourceFootY":214},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":262,"y":44,"width":260,"height":262},"anchor":{"x":126,"y":254},"sourceFootCenterX":126,"sourceFootY":254},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":533,"y":17,"width":328,"height":284},"anchor":{"x":157,"y":281},"sourceFootCenterX":157,"sourceFootY":281},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":33,"y":363,"width":186,"height":221},"anchor":{"x":92,"y":213},"sourceFootCenterX":92,"sourceFootY":213},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":263,"y":322,"width":259,"height":263},"anchor":{"x":125.5,"y":255},"sourceFootCenterX":125.5,"sourceFootY":255},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":534,"y":301,"width":328,"height":278},"anchor":{"x":157,"y":275},"sourceFootCenterX":157,"sourceFootY":275},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":33,"y":640,"width":187,"height":221},"anchor":{"x":92.5,"y":213},"sourceFootCenterX":92.5,"sourceFootY":213},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":263,"y":602,"width":259,"height":260},"anchor":{"x":125.5,"y":252},"sourceFootCenterX":125.5,"sourceFootY":252},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":534,"y":579,"width":328,"height":283},"anchor":{"x":157,"y":275},"sourceFootCenterX":157,"sourceFootY":275},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":32,"y":923,"width":184,"height":236},"anchor":{"x":95.5,"y":228},"sourceFootCenterX":95.5,"sourceFootY":228},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":261,"y":889,"width":265,"height":274},"anchor":{"x":135.5,"y":266},"sourceFootCenterX":135.5,"sourceFootY":266},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":535,"y":868,"width":331,"height":288},"anchor":{"x":165,"y":284},"sourceFootCenterX":165,"sourceFootY":284},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":32,"y":1205,"width":185,"height":236},"anchor":{"x":96,"y":228},"sourceFootCenterX":96,"sourceFootY":228},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":264,"y":1172,"width":260,"height":272},"anchor":{"x":133,"y":264},"sourceFootCenterX":133,"sourceFootY":264},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":536,"y":1156,"width":330,"height":288},"anchor":{"x":164.5,"y":280},"sourceFootCenterX":164.5,"sourceFootY":280},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":31,"y":1497,"width":186,"height":236},"anchor":{"x":96.5,"y":228},"sourceFootCenterX":96.5,"sourceFootY":228},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":261,"y":1466,"width":264,"height":267},"anchor":{"x":135,"y":259},"sourceFootCenterX":135,"sourceFootY":259},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":537,"y":1448,"width":329,"height":288},"anchor":{"x":164,"y":280},"sourceFootCenterX":164,"sourceFootY":280},
    ],
  },
  xiezhi: {
    assetPath: "src/assets/spirit-xiezhi-vertical-v2.png",
    textureKey: "spirit-xiezhi-vertical-v2",
    sha256: "a0752482a5116380c35fd9f9145f19cab26e25660616804c3cf125890e905a3b",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":832773,"totalPixels":1573538},
    outsideSourceAlpha: {"max":2,"alpha16plusPixels":0,"nonzeroPixels":1844},
    stages: {"young":{"referenceBodyHeight":209,"sourceWidth":181,"sourceHeight":225},"growing":{"referenceBodyHeight":282,"sourceWidth":239,"sourceHeight":298},"guardian":{"referenceBodyHeight":317,"sourceWidth":352,"sourceHeight":323}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":30,"y":105,"width":181,"height":225},"anchor":{"x":103,"y":217},"sourceFootCenterX":103,"sourceFootY":217},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":269,"y":32,"width":239,"height":298},"anchor":{"x":103.5,"y":290},"sourceFootCenterX":103.5,"sourceFootY":290},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":524,"y":0,"width":347,"height":323},"anchor":{"x":168,"y":322},"sourceFootCenterX":168,"sourceFootY":322},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":31,"y":407,"width":178,"height":218},"anchor":{"x":101.5,"y":210},"sourceFootCenterX":101.5,"sourceFootY":210},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":269,"y":339,"width":239,"height":288},"anchor":{"x":103.5,"y":280},"sourceFootCenterX":103.5,"sourceFootY":280},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":529,"y":323,"width":339,"height":297},"anchor":{"x":164,"y":295},"sourceFootCenterX":164,"sourceFootY":295},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":30,"y":703,"width":181,"height":219},"anchor":{"x":103,"y":211},"sourceFootCenterX":103,"sourceFootY":211},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":269,"y":636,"width":239,"height":286},"anchor":{"x":103.5,"y":278},"sourceFootCenterX":103.5,"sourceFootY":278},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":521,"y":620,"width":352,"height":297},"anchor":{"x":170.5,"y":295},"sourceFootCenterX":170.5,"sourceFootY":295},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":73,"y":986,"width":144,"height":203},"anchor":{"x":62,"y":195},"sourceFootCenterX":62,"sourceFootY":195},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":293,"y":935,"width":198,"height":255},"anchor":{"x":80,"y":247},"sourceFootCenterX":80,"sourceFootY":247},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":523,"y":917,"width":311,"height":270},"anchor":{"x":177.5,"y":269},"sourceFootCenterX":177.5,"sourceFootY":269},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":72,"y":1255,"width":146,"height":208},"anchor":{"x":63,"y":200},"sourceFootCenterX":63,"sourceFootY":200},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":290,"y":1198,"width":202,"height":265},"anchor":{"x":82,"y":257},"sourceFootCenterX":82,"sourceFootY":257},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":526,"y":1187,"width":315,"height":275},"anchor":{"x":179.5,"y":271},"sourceFootCenterX":179.5,"sourceFootY":271},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":73,"y":1531,"width":142,"height":219},"anchor":{"x":61,"y":211},"sourceFootCenterX":61,"sourceFootY":211},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":291,"y":1478,"width":201,"height":273},"anchor":{"x":81.5,"y":265},"sourceFootCenterX":81.5,"sourceFootY":265},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":519,"y":1462,"width":323,"height":289},"anchor":{"x":183.5,"y":281},"sourceFootCenterX":183.5,"sourceFootY":281},
    ],
  },
  pixiu: {
    assetPath: "src/assets/spirit-pixiu-vertical-v2.png",
    textureKey: "spirit-pixiu-vertical-v2",
    sha256: "c7ad93d84077ba2ca720b86825e694d17a5343884756c68b7da735205005ed04",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":652185,"totalPixels":1573538},
    outsideSourceAlpha: {"max":2,"alpha16plusPixels":0,"nonzeroPixels":2648},
    stages: {"young":{"referenceBodyHeight":216,"sourceWidth":188,"sourceHeight":232},"growing":{"referenceBodyHeight":266,"sourceWidth":258,"sourceHeight":282},"guardian":{"referenceBodyHeight":278,"sourceWidth":363,"sourceHeight":290}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":30,"y":63,"width":185,"height":224},"anchor":{"x":104,"y":216},"sourceFootCenterX":104,"sourceFootY":216},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":248,"y":20,"width":258,"height":270},"anchor":{"x":137,"y":262},"sourceFootCenterX":137,"sourceFootY":262},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":524,"y":0,"width":363,"height":289},"anchor":{"x":192.5,"y":283},"sourceFootCenterX":192.5,"sourceFootY":283},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":29,"y":346,"width":188,"height":226},"anchor":{"x":105.5,"y":218},"sourceFootCenterX":105.5,"sourceFootY":218},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":250,"y":304,"width":255,"height":282},"anchor":{"x":135.5,"y":274},"sourceFootCenterX":135.5,"sourceFootY":274},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":524,"y":289,"width":363,"height":289},"anchor":{"x":192.5,"y":281},"sourceFootCenterX":192.5,"sourceFootY":281},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":29,"y":637,"width":188,"height":228},"anchor":{"x":105.5,"y":220},"sourceFootCenterX":105.5,"sourceFootY":220},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":251,"y":595,"width":256,"height":270},"anchor":{"x":136,"y":262},"sourceFootCenterX":136,"sourceFootY":262},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":524,"y":578,"width":363,"height":286},"anchor":{"x":192,"y":278},"sourceFootCenterX":192,"sourceFootY":278},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":51,"y":932,"width":165,"height":230},"anchor":{"x":83.5,"y":222},"sourceFootCenterX":83.5,"sourceFootY":222},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":266,"y":885,"width":240,"height":281},"anchor":{"x":122,"y":273},"sourceFootCenterX":122,"sourceFootY":273},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":525,"y":884,"width":362,"height":283},"anchor":{"x":192,"y":275},"sourceFootCenterX":192,"sourceFootY":275},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":53,"y":1224,"width":164,"height":232},"anchor":{"x":83,"y":224},"sourceFootCenterX":83,"sourceFootY":224},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":266,"y":1178,"width":241,"height":281},"anchor":{"x":122.5,"y":273},"sourceFootCenterX":122.5,"sourceFootY":273},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":533,"y":1170,"width":354,"height":290},"anchor":{"x":188.5,"y":282},"sourceFootCenterX":188.5,"sourceFootY":282},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":53,"y":1525,"width":162,"height":230},"anchor":{"x":82,"y":222},"sourceFootCenterX":82,"sourceFootY":222},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":266,"y":1479,"width":240,"height":280},"anchor":{"x":122,"y":272},"sourceFootCenterX":122,"sourceFootY":272},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":541,"y":1475,"width":346,"height":285},"anchor":{"x":184,"y":277},"sourceFootCenterX":184,"sourceFootY":277},
    ],
  },
  qilin: {
    assetPath: "src/assets/spirit-qilin-vertical-v2.png",
    textureKey: "spirit-qilin-vertical-v2",
    sha256: "f22a9df9232f655ff264f010172a3512de63e338eb79406429e0fd3ad8d4753b",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":640800,"totalPixels":1573538},
    outsideSourceAlpha: {"max":4,"alpha16plusPixels":0,"nonzeroPixels":75847},
    stages: {"young":{"referenceBodyHeight":214,"sourceWidth":160,"sourceHeight":230},"growing":{"referenceBodyHeight":260,"sourceWidth":219,"sourceHeight":276},"guardian":{"referenceBodyHeight":273,"sourceWidth":307,"sourceHeight":289}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":43,"y":56,"width":157,"height":215},"anchor":{"x":101.5,"y":207},"sourceFootCenterX":101.5,"sourceFootY":207},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":288,"y":12,"width":216,"height":271},"anchor":{"x":137.5,"y":263},"sourceFootCenterX":137.5,"sourceFootY":263},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":553,"y":1,"width":305,"height":282},"anchor":{"x":168.5,"y":274},"sourceFootCenterX":168.5,"sourceFootY":274},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":43,"y":341,"width":159,"height":226},"anchor":{"x":102.5,"y":218},"sourceFootCenterX":102.5,"sourceFootY":218},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":287,"y":303,"width":216,"height":267},"anchor":{"x":137.5,"y":259},"sourceFootCenterX":137.5,"sourceFootY":259},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":553,"y":292,"width":307,"height":279},"anchor":{"x":169.5,"y":271},"sourceFootCenterX":169.5,"sourceFootY":271},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":43,"y":632,"width":159,"height":226},"anchor":{"x":102.5,"y":218},"sourceFootCenterX":102.5,"sourceFootY":218},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":287,"y":592,"width":217,"height":270},"anchor":{"x":138,"y":262},"sourceFootCenterX":138,"sourceFootY":262},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":555,"y":582,"width":303,"height":280},"anchor":{"x":167.5,"y":272},"sourceFootCenterX":167.5,"sourceFootY":272},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":45,"y":925,"width":156,"height":230},"anchor":{"x":100.5,"y":222},"sourceFootCenterX":100.5,"sourceFootY":222},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":286,"y":885,"width":217,"height":276},"anchor":{"x":137.5,"y":268},"sourceFootCenterX":137.5,"sourceFootY":268},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":557,"y":874,"width":297,"height":287},"anchor":{"x":167,"y":279},"sourceFootCenterX":167,"sourceFootY":279},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":42,"y":1222,"width":159,"height":227},"anchor":{"x":102,"y":219},"sourceFootCenterX":102,"sourceFootY":219},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":285,"y":1182,"width":216,"height":273},"anchor":{"x":137,"y":265},"sourceFootCenterX":137,"sourceFootY":265},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":557,"y":1171,"width":297,"height":287},"anchor":{"x":167,"y":279},"sourceFootCenterX":167,"sourceFootY":279},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":42,"y":1518,"width":160,"height":229},"anchor":{"x":102.5,"y":221},"sourceFootCenterX":102.5,"sourceFootY":221},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":284,"y":1476,"width":219,"height":276},"anchor":{"x":138.5,"y":268},"sourceFootCenterX":138.5,"sourceFootY":268},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":555,"y":1466,"width":302,"height":289},"anchor":{"x":169.5,"y":281},"sourceFootCenterX":169.5,"sourceFootY":281},
    ],
  },
  xuanwu: {
    assetPath: "src/assets/spirit-xuanwu-vertical-v2.png",
    textureKey: "spirit-xuanwu-vertical-v2",
    sha256: "0591a0fdc94a7233089f1afc96b2bd454ea0922fd5f9310b5fbd540461134662",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":935636,"totalPixels":1573538},
    outsideSourceAlpha: {"max":3,"alpha16plusPixels":0,"nonzeroPixels":10518},
    stages: {"young":{"referenceBodyHeight":162,"sourceWidth":185,"sourceHeight":178},"growing":{"referenceBodyHeight":228,"sourceWidth":230,"sourceHeight":244},"guardian":{"referenceBodyHeight":230,"sourceWidth":269,"sourceHeight":246}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":62,"y":115,"width":178,"height":168},"anchor":{"x":88,"y":160},"sourceFootCenterX":88,"sourceFootY":160},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":326,"y":49,"width":230,"height":237},"anchor":{"x":118,"y":229},"sourceFootCenterX":118,"sourceFootY":229},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":601,"y":42,"width":269,"height":246},"anchor":{"x":140.5,"y":238},"sourceFootCenterX":140.5,"sourceFootY":238},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":61,"y":390,"width":180,"height":178},"anchor":{"x":89,"y":170},"sourceFootCenterX":89,"sourceFootY":170},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":326,"y":328,"width":229,"height":238},"anchor":{"x":117.5,"y":230},"sourceFootCenterX":117.5,"sourceFootY":230},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":601,"y":322,"width":269,"height":246},"anchor":{"x":140.5,"y":238},"sourceFootCenterX":140.5,"sourceFootY":238},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":55,"y":677,"width":185,"height":173},"anchor":{"x":91.5,"y":165},"sourceFootCenterX":91.5,"sourceFootY":165},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":328,"y":612,"width":229,"height":236},"anchor":{"x":117.5,"y":228},"sourceFootCenterX":117.5,"sourceFootY":228},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":603,"y":607,"width":265,"height":246},"anchor":{"x":138.5,"y":238},"sourceFootCenterX":138.5,"sourceFootY":238},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":65,"y":978,"width":174,"height":169},"anchor":{"x":86.5,"y":161},"sourceFootCenterX":86.5,"sourceFootY":161},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":332,"y":908,"width":221,"height":239},"anchor":{"x":110,"y":231},"sourceFootCenterX":110,"sourceFootY":231},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":604,"y":904,"width":265,"height":243},"anchor":{"x":131,"y":235},"sourceFootCenterX":131,"sourceFootY":235},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":59,"y":1268,"width":178,"height":171},"anchor":{"x":88.5,"y":163},"sourceFootCenterX":88.5,"sourceFootY":163},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":327,"y":1196,"width":230,"height":244},"anchor":{"x":114.5,"y":236},"sourceFootCenterX":114.5,"sourceFootY":236},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":603,"y":1195,"width":265,"height":246},"anchor":{"x":131,"y":238},"sourceFootCenterX":131,"sourceFootY":238},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":63,"y":1566,"width":178,"height":171},"anchor":{"x":88.5,"y":163},"sourceFootCenterX":88.5,"sourceFootY":163},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":330,"y":1495,"width":226,"height":242},"anchor":{"x":112.5,"y":234},"sourceFootCenterX":112.5,"sourceFootY":234},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":606,"y":1491,"width":264,"height":246},"anchor":{"x":130.5,"y":238},"sourceFootCenterX":130.5,"sourceFootY":238},
    ],
  },
  qinglong: {
    assetPath: "src/assets/spirit-qinglong-vertical-v2.png",
    textureKey: "spirit-qinglong-vertical-v2",
    sha256: "88c3df71db90fef1ad3dd09a85293965f0a3fb202342927c29b6dffd08ffec2a",
    imageWidth: 887,
    imageHeight: 1774,
    alpha: {"min":0,"max":255,"transparentPixels":973425,"totalPixels":1573538},
    outsideSourceAlpha: {"max":3,"alpha16plusPixels":0,"nonzeroPixels":4338},
    stages: {"young":{"referenceBodyHeight":197,"sourceWidth":167,"sourceHeight":213},"growing":{"referenceBodyHeight":228,"sourceWidth":226,"sourceHeight":244},"guardian":{"referenceBodyHeight":235,"sourceWidth":260,"sourceHeight":251}},
    frames: [
      {"index":0,"frameName":"0","stage":"young","facing":"front","pose":"idle","sourceBBox":{"x":56,"y":58,"width":160,"height":210},"anchor":{"x":92.5,"y":202},"sourceFootCenterX":92.5,"sourceFootY":202},
      {"index":1,"frameName":"1","stage":"growing","facing":"front","pose":"idle","sourceBBox":{"x":316,"y":38,"width":221,"height":236},"anchor":{"x":127,"y":228},"sourceFootCenterX":127,"sourceFootY":228},
      {"index":2,"frameName":"2","stage":"guardian","facing":"front","pose":"idle","sourceBBox":{"x":601,"y":28,"width":256,"height":247},"anchor":{"x":137.5,"y":239},"sourceFootCenterX":137.5,"sourceFootY":239},
      {"index":3,"frameName":"3","stage":"young","facing":"front","pose":"a","sourceBBox":{"x":50,"y":354,"width":167,"height":211},"anchor":{"x":96,"y":203},"sourceFootCenterX":96,"sourceFootY":203},
      {"index":4,"frameName":"4","stage":"growing","facing":"front","pose":"a","sourceBBox":{"x":319,"y":326,"width":219,"height":244},"anchor":{"x":126,"y":236},"sourceFootCenterX":126,"sourceFootY":236},
      {"index":5,"frameName":"5","stage":"guardian","facing":"front","pose":"a","sourceBBox":{"x":601,"y":320,"width":259,"height":251},"anchor":{"x":139,"y":243},"sourceFootCenterX":139,"sourceFootY":243},
      {"index":6,"frameName":"6","stage":"young","facing":"front","pose":"b","sourceBBox":{"x":55,"y":650,"width":163,"height":211},"anchor":{"x":94,"y":203},"sourceFootCenterX":94,"sourceFootY":203},
      {"index":7,"frameName":"7","stage":"growing","facing":"front","pose":"b","sourceBBox":{"x":310,"y":624,"width":226,"height":240},"anchor":{"x":129.5,"y":232},"sourceFootCenterX":129.5,"sourceFootY":232},
      {"index":8,"frameName":"8","stage":"guardian","facing":"front","pose":"b","sourceBBox":{"x":601,"y":614,"width":257,"height":251},"anchor":{"x":138,"y":243},"sourceFootCenterX":138,"sourceFootY":243},
      {"index":9,"frameName":"9","stage":"young","facing":"back","pose":"idle","sourceBBox":{"x":56,"y":943,"width":161,"height":213},"anchor":{"x":93,"y":205},"sourceFootCenterX":93,"sourceFootY":205},
      {"index":10,"frameName":"10","stage":"growing","facing":"back","pose":"idle","sourceBBox":{"x":318,"y":921,"width":219,"height":235},"anchor":{"x":102.5,"y":227},"sourceFootCenterX":102.5,"sourceFootY":227},
      {"index":11,"frameName":"11","stage":"guardian","facing":"back","pose":"idle","sourceBBox":{"x":603,"y":913,"width":259,"height":244},"anchor":{"x":123,"y":236},"sourceFootCenterX":123,"sourceFootY":236},
      {"index":12,"frameName":"12","stage":"young","facing":"back","pose":"a","sourceBBox":{"x":53,"y":1239,"width":164,"height":213},"anchor":{"x":94.5,"y":205},"sourceFootCenterX":94.5,"sourceFootY":205},
      {"index":13,"frameName":"13","stage":"growing","facing":"back","pose":"a","sourceBBox":{"x":318,"y":1216,"width":219,"height":236},"anchor":{"x":102.5,"y":228},"sourceFootCenterX":102.5,"sourceFootY":228},
      {"index":14,"frameName":"14","stage":"guardian","facing":"back","pose":"a","sourceBBox":{"x":604,"y":1208,"width":258,"height":244},"anchor":{"x":122.5,"y":236},"sourceFootCenterX":122.5,"sourceFootY":236},
      {"index":15,"frameName":"15","stage":"young","facing":"back","pose":"b","sourceBBox":{"x":55,"y":1535,"width":162,"height":213},"anchor":{"x":93.5,"y":205},"sourceFootCenterX":93.5,"sourceFootY":205},
      {"index":16,"frameName":"16","stage":"growing","facing":"back","pose":"b","sourceBBox":{"x":321,"y":1513,"width":217,"height":235},"anchor":{"x":101.5,"y":227},"sourceFootCenterX":101.5,"sourceFootY":227},
      {"index":17,"frameName":"17","stage":"guardian","facing":"back","pose":"b","sourceBBox":{"x":601,"y":1506,"width":260,"height":242},"anchor":{"x":123.5,"y":234},"sourceFootCenterX":123.5,"sourceFootY":234},
    ],
  },
};

export function getSpiritVerticalRuntimeModel(
  id: SpiritId, stage: SpiritGrowthId, facing: SpiritVerticalFacing,
  pose: SpiritVerticalPose, stageSize: number,
): SpiritVerticalRuntimeModel | null {
  if (!Number.isFinite(stageSize) || stageSize <= 0) throw new RangeError('stageSize must be finite and positive');
  const sheet = spiritVerticalMetrics[id];
  if (!sheet) return null;
  const frame = sheet.frames.find(value => value.stage === stage && value.facing === facing && value.pose === pose);
  if (!frame) return null;
  return {
    ...frame, textureKey: sheet.textureKey,
    scale: stageSize / sheet.stages[stage].referenceBodyHeight,
    originX: frame.sourceFootCenterX / frame.sourceBBox.width,
    originY: frame.sourceFootY / frame.sourceBBox.height,
  };
}

export const spiritVerticalRuntimeModel = {
  sheets: spiritVerticalMetrics,
  resolve: getSpiritVerticalRuntimeModel,
} as const;
