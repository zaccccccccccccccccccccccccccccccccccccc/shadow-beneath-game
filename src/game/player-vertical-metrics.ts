/**
 * Latest FOUR-frame player-vertical-walk-v2.png only: front A/B, back A/B.
 * Actual image 1266x1242, nominal cells 633x621, NOT 627x627. Independent
 * sourceBBox crops preserve every alpha>=16 pixel; outside residual alpha<=1.
 *
 * Default UNIFORM scale=180/627, consistent with the approved side art's 627px
 * source-cell height. Body heights become about 158..162px versus old idle's
 * 279*180/313=160.45px. 119/313 as a UNIFORM scale would make the new bodies
 * about 209..215px high, so it is retained only as a candidate, not the default.
 * The new illustration is wider: uniform scaling cannot reproduce the old
 * idle's separate x/y scaling exactly. Head position is matched, not head size.
 *
 * Register each sourceBBox using texture.add(frameName,0,x,y,width,height).
 * Model rendering: origin(.5,1), setScale(model.scale), position(offsetX,offsetY)
 * in the existing player container. No per-pose setDisplaySize is necessary.
 * Offsets align measured head TOP/CENTER to old player-action-sheet idle frames
 * 0/3 with origin(.5,1), position(0,0), displays front119/back118,height180.
 * Head x is the median of alpha>=224 body pixels in its upper20%; y is opaque
 * hair top. This is an estimated head anchor, not a fitted face/eye landmark.
 * Alternate uniform scales can use getPlayerVerticalRuntimeModel; offsets are
 * recomputed to retain identical head position. No PNG editing or brown-art data.
 */
export const playerVerticalMetrics = {
  assetPath: "src/assets/player-vertical-walk-v2.png",
  textureKey: "player-vertical-walk-v2",
  sha256: "2c1f13ed4e0052a73c0dfcc2f9363f65614731a96b5be6f99e3e77e8cb26c6b0",
  idleSha256: "9f5680d50647aed325d5ee017ff8ae044ab79c37ad204d15aec04f2c550290d5",
  imageWidth: 1266,
  imageHeight: 1242,
  alpha: {"min":0,"max":255,"transparentPixels":1203103,"totalPixels":1572372},
  virtualCell: {"width":633,"height":621},
  uniformScales: {"recommended":0.28708133971291866,"virtualCellHeight":0.2898550724637681,"oldFrontHorizontal":0.3801916932907348,"oldBackHorizontal":0.3769968051118211},
  oldIdle: {"front":{"frame":0,"frameWidth":313,"frameHeight":313,"displayWidth":119,"displayHeight":180,"headAnchor":{"x":158.5,"y":18},"headWorld":{"x":0.7603833865814696,"y":-169.6485623003195}},"back":{"frame":3,"frameWidth":313,"frameHeight":313,"displayWidth":118,"displayHeight":180,"headAnchor":{"x":157.5,"y":18},"headWorld":{"x":0.3769968051118211,"y":-169.6485623003195}}},
  outsideSourceAlpha: {"max":1,"alpha16plusPixels":0,"nonzeroPixels":14430},
  frames: [
    {"index":0,"facing":"front","pose":"a","sourceBBox":{"x":214,"y":14,"width":257,"height":566},"headAnchor":{"x":127.5,"y":8},"scale":0.28708133971291866,"displayWidth":73.77990430622009,"displayHeight":162.48803827751195,"offsetX":1.0474647262943884,"offsetY":-9.45717474051088,"frameName":"0"},
    {"index":1,"facing":"front","pose":"b","sourceBBox":{"x":781,"y":15,"width":256,"height":565},"headAnchor":{"x":129.5,"y":8},"scale":0.28708133971291866,"displayWidth":73.49282296650718,"displayHeight":162.20095693779905,"offsetX":0.3297613770120916,"offsetY":-9.744256080223806,"frameName":"1"},
    {"index":2,"facing":"back","pose":"a","sourceBBox":{"x":217,"y":635,"width":271,"height":580},"headAnchor":{"x":132.5,"y":8},"scale":0.28708133971291866,"displayWidth":77.79904306220095,"displayHeight":166.5071770334928,"offsetX":1.2382408242505771,"offsetY":-5.438035984530018,"frameName":"2"},
    {"index":3,"facing":"back","pose":"b","sourceBBox":{"x":785,"y":635,"width":270,"height":581},"headAnchor":{"x":129.5,"y":8},"scale":0.28708133971291866,"displayWidth":77.51196172248804,"displayHeight":166.79425837320574,"offsetX":1.9559441735328738,"offsetY":-5.150954644817119,"frameName":"3"},
  ],
} as const;

export type PlayerVerticalFrameMetrics = (typeof playerVerticalMetrics.frames)[number];
export interface PlayerVerticalRuntimeModel {
  readonly textureKey: string;
  readonly index: number;
  readonly frameName: string;
  readonly sourceBBox: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}
export function getPlayerVerticalRuntimeModel(
  facing: 'front' | 'back', pose: 'a' | 'b',
  scale: number = playerVerticalMetrics.uniformScales.recommended,
): PlayerVerticalRuntimeModel {
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('scale must be finite and positive');
  const frame = playerVerticalMetrics.frames[(facing === 'front' ? 0 : 2) + (pose === 'a' ? 0 : 1)];
  const target = playerVerticalMetrics.oldIdle[facing].headWorld;
  return {
    textureKey: playerVerticalMetrics.textureKey, index: frame.index, frameName: frame.frameName, sourceBBox: frame.sourceBBox,
    scale, originX: .5, originY: 1,
    offsetX: target.x - (frame.headAnchor.x - frame.sourceBBox.width / 2) * scale,
    offsetY: target.y - (frame.headAnchor.y - frame.sourceBBox.height) * scale,
  };
}
export const playerVerticalRuntimeModel = {
  sheet: playerVerticalMetrics,
  resolve: getPlayerVerticalRuntimeModel,
} as const;
