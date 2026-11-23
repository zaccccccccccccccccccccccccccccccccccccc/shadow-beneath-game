import type Phaser from 'phaser';

const failed = new WeakSet<Phaser.Scene>();

/** Report actual decoded assets, not a fixed timeout masquerading as a missing upload. */
export function trackSceneLoading(scene: Phaser.Scene): void {
  failed.delete(scene);
  document.body.dataset.bootStage = scene.scene.key + '-download';
  scene.load.maxParallelDownloads = 4;
  scene.load.on('progress', (progress: number) => {
    window.dispatchEvent(new CustomEvent('under-shadow-load-progress', { detail: { progress, stage: scene.scene.key } }));
  });
  scene.load.on('filecomplete', (key: string) => {
    document.body.dataset.bootStage = scene.scene.key + ':decoded:' + key;
  });
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    failed.add(scene);
    window.dispatchEvent(new CustomEvent('under-shadow-load-error', { detail: { file: file.src } }));
  });
}

export function sceneAssetsFailed(scene: Phaser.Scene): boolean { return failed.has(scene); }
