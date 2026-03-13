import Phaser from 'phaser';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 960,
  height: 480,
  parent: 'game-container',
  render: {
    pixelArt: true,
    antialias: false,
  },
  scene: [],
};

export default gameConfig;
