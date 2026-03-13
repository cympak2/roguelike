import Phaser from 'phaser';
import gameConfig from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { InventoryScene } from './scenes/InventoryScene';
import { DialogueScene } from './scenes/DialogueScene';
import { GameOverScene } from './scenes/GameOverScene';

// Add scenes to the config
gameConfig.scene = [BootScene, MainMenuScene, GameScene, InventoryScene, DialogueScene, GameOverScene];

// Create the game instance
const game = new Phaser.Game(gameConfig);

// Log game instance for debugging
console.log('Roguelike game initialized:', game);

export default game;
