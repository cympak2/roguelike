import Phaser from 'phaser';
import loadingScreenUrl from '../screen.txt?url';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.text('loading-screen', loadingScreenUrl);
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const loadingScreenText = this.cache.text.get('loading-screen');

    this.add.text(centerX, centerY, loadingScreenText, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#ffffff',
      lineSpacing: 0,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(centerX, this.scale.height - 30, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#00ff00',
    }).setOrigin(0.5);

    // Simulate loading delay and transition to main menu
    this.time.delayedCall(2000, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
