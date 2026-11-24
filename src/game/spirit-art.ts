import type Phaser from 'phaser';
import type { SpiritId, SpiritGrowthId } from './spirits';
import type { PlayerFacing } from './player-animation';
import { getCompanionGrowthStage } from './companion';
import { spiritVerticalMetrics, getSpiritVerticalRuntimeModel } from './spirit-vertical-metrics';
import { createSpiritVerticalLayout, getSpiritWalkPose, type SpiritAnimationMetadata } from './spirit-animation';
import xiezhiVertical from '../assets/spirit-xiezhi-vertical-v2.png';
import baizeVertical from '../assets/spirit-baize-vertical-v2.png';
import pixiuVertical from '../assets/spirit-pixiu-vertical-v2.png';
import qilinVertical from '../assets/spirit-qilin-vertical-v2.png';
import xuanwuVertical from '../assets/spirit-xuanwu-vertical-v2.png';
import qinglongVertical from '../assets/spirit-qinglong-vertical-v2.png';
import xiezhiSideYoung from '../assets/spirit-xiezhi-young-walk-v2.png';
import xiezhiSideGrowing from '../assets/spirit-xiezhi-growing-walk.png';
import xiezhiSideGuardian from '../assets/spirit-xiezhi-guardian-walk.png';
const verticalAssets = {xiezhi: xiezhiVertical,baize: baizeVertical,pixiu: pixiuVertical,qilin: qilinVertical,xuanwu: xuanwuVertical,qinglong: qinglongVertical};
export function loadSpiritDirections(scene: Phaser.Scene): void {
  for (const [id,url] of Object.entries(verticalAssets)) scene.load.image(spiritVerticalMetrics[id as SpiritId]!.textureKey,url);
  scene.load.spritesheet('world-xiezhi-young',xiezhiSideYoung,{frameWidth:543,frameHeight:724});
  scene.load.spritesheet('world-xiezhi-growing',xiezhiSideGrowing,{frameWidth:543,frameHeight:724});
  scene.load.spritesheet('world-xiezhi-guardian',xiezhiSideGuardian,{frameWidth:543,frameHeight:724});
}

export function prepareSpiritDirections(scene: Phaser.Scene): void {
  for (const id of Object.keys(verticalAssets) as SpiritId[]) {
    const metrics=spiritVerticalMetrics[id];
    if (!metrics) throw new Error(`Missing verified directional art: ${id}`);
    const texture=scene.textures.get(metrics.textureKey);
    for (const frame of metrics.frames) {
      const b=frame.sourceBBox;
      if (!texture.has(frame.frameName)) texture.add(frame.frameName,0,b.x,b.y,b.width,b.height);
    }
  }
}

const layouts = Object.fromEntries((Object.keys(verticalAssets) as SpiritId[]).map(id=>[id,{
  vertical:createSpiritVerticalLayout(spiritVerticalMetrics[id]?.textureKey ?? `spirit-${id}-vertical-v2`,1,1),
  side:Object.fromEntries(['young','growing','guardian'].map(stage=>[stage,{texture:`world-${id}-${stage}`,frameWidth:543,frameHeight:724,frames:[0,1,2,3]}])),
}])) as unknown as SpiritAnimationMetadata;

export function applySpiritDirection(sprite: Phaser.GameObjects.Sprite,id: SpiritId,fed: number,facing: PlayerFacing,moving: boolean,distance: number): void {
  const stage=getCompanionGrowthStage(fed);
  const pose=getSpiritWalkPose(id,stage.id,facing,distance,moving,layouts);
  sprite.setTexture(pose.texture,pose.frame).setFlipX(pose.flipX);
  if (facing==='left'||facing==='right') {
    sprite.setOrigin(.5,1).setDisplaySize(stage.size,stage.size*724/543);
  } else {
    const model=getSpiritVerticalRuntimeModel(id,stage.id,facing,pose.poseIndex===1?'a':pose.poseIndex===2?'b':'idle',stage.size);
    if (!model) throw new Error(`Missing vertical pose ${id}/${stage.id}/${facing}`);
    sprite.setTexture(model.textureKey,model.frameName).setOrigin(model.originX,model.originY).setScale(model.scale);
  }
}
