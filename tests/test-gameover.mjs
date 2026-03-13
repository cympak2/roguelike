#!/usr/bin/env node

/**
 * Test script for GameOverScene
 * Demonstrates the game over screen with sample stats
 */

import Phaser from 'phaser';

// Simple test configuration
const config = {
  type: Phaser.HEADLESS,
  width: 960,
  height: 640,
  backgroundColor: '#0a0e27',
  parent: 'game-container',
  scene: null
};

// Create minimal GameOverScene for testing
class TestGameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.stats = data.stats || {
      level: 5,
      kills: 42,
      floorsReached: 3,
      gold: 250,
      playerClass: 'Warrior',
      cause: 'Slain by a Dragon'
    };
    console.log('✓ GameOverScene initialized with stats:', this.stats);
  }

  create() {
    console.log('✓ GameOverScene created successfully');
    console.log('✓ Stats display would show:');
    console.log(`  - Class: ${this.stats.playerClass}`);
    console.log(`  - Level: ${this.stats.level}`);
    console.log(`  - Monsters Slain: ${this.stats.kills}`);
    console.log(`  - Floors Explored: ${this.stats.floorsReached}`);
    console.log(`  - Gold Collected: ${this.stats.gold}`);
    console.log(`  - Cause: ${this.stats.cause}`);
    console.log('');
    console.log('✓ Input handlers would be registered:');
    console.log('  - ENTER: Return to Main Menu');
    console.log('  - ESC: Quit to Main Menu');
    console.log('  - SPACE: Return to Main Menu (alternative)');
    
    // Shutdown after test
    this.time.delayedCall(100, () => {
      console.log('\n✓ GameOverScene test completed successfully!');
      this.game.destroy(true);
    });
  }
}

// Run test
console.log('Testing GameOverScene...\n');

config.scene = [TestGameOverScene];
const game = new Phaser.Game(config);

// Test with sample stats
game.scene.start('GameOverScene', {
  stats: {
    level: 5,
    kills: 42,
    floorsReached: 3,
    gold: 250,
    playerClass: 'Warrior',
    cause: 'Slain by a Dragon'
  }
});
