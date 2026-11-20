import Phaser from 'phaser';

/** A shared, visible ground sign; destination and collision coordinates stay original. */
export function addWaystoneSign(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, destination: string): void {
  const sign = scene.add.text(0, 112, `↗ ${destination}\nE / 空格 · 走近互動`, {
    fontFamily: 'Noto Sans TC, Noto Sans SC, sans-serif', fontSize: '19px',
    fontStyle: 'bold', align: 'center', color: '#ffe6a0', backgroundColor: '#091e2cf5',
    stroke: '#091e2c', strokeThickness: 2, padding: { x: 14, y: 9 },
  }).setOrigin(.5, 0);
  parent.add(sign);
}
