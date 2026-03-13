import Phaser from 'phaser';

export class ModalBackground {
  private rect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number,
    tileSize: number = 12
  ) {
    this.rect = scene.add.rectangle(
      panelX * tileSize,
      panelY * tileSize,
      panelWidth * tileSize,
      panelHeight * tileSize,
      0x000000,
      0.95
    );
    this.rect.setOrigin(0, 0);
    this.rect.setVisible(false);
    this.rect.setDepth(-1);
  }

  show(): void {
    this.rect.setVisible(true);
  }

  hide(): void {
    this.rect.setVisible(false);
  }

  destroy(): void {
    this.rect.destroy();
  }
}

export default ModalBackground;
