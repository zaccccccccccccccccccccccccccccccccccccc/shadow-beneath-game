import Phaser from 'phaser';
import growing from '../assets/spirit-xiezhi-growing-walk.png';
import guardian from '../assets/spirit-xiezhi-guardian-walk.png';
import { getCompanionGrowthStage } from './companion';

export function loadCompanionForms(scene: Phaser.Scene): void {
  scene.load.spritesheet('companion-growing', growing, { frameWidth: 543, frameHeight: 724 });
  scene.load.spritesheet('companion-guardian', guardian, { frameWidth: 543, frameHeight: 724 });
}

export function applyCompanionForm(sprite: Phaser.GameObjects.Sprite, fed: number, facing: string, moving: boolean, phase: number): void {
  const stage = getCompanionGrowthStage(fed);
  if (stage.id === 'young') return;
  const frame = moving ? Math.floor(phase / 1.8) % 4 : 0;
  sprite.setTexture(`companion-${stage.id}`, frame).setFlipX(facing === 'left');
  sprite.setDisplaySize(stage.size * 1.25, stage.size * 1.25 * 724 / 543);
}
