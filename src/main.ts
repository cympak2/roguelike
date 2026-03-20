import Phaser from 'phaser';
import gameConfig from './config/gameConfig';
import {
  BootScene,
  MainMenuScene,
  GameScene,
  InventoryScene,
  DialogueScene,
  GameOverScene,
  ShopScene,
  HelpScene,
  QuestLogScene,
} from './scenes';

// Add scenes to the config
gameConfig.scene = [
  BootScene,
  MainMenuScene,
  GameScene,
  InventoryScene,
  DialogueScene,
  ShopScene,
  HelpScene,
  QuestLogScene,
  GameOverScene,
];

// Create the game instance
const game = new Phaser.Game(gameConfig);

// Log game instance for debugging
console.log('Roguelike game initialized:', game);

export default game;
