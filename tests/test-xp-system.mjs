/**
 * XP System Test
 * Demonstrates XP gain, level-up, and stat choice mechanics
 */

import Phaser from 'phaser';
import { Player } from './src/entities/player';
import { Monster } from './src/entities/monster';
import { XPSystem, StatChoice } from './src/systems/xp-system';
import { MessageLog, MessageType } from './src/ui/message-log';
import { ASCIIRenderer } from './src/ui/ascii-renderer';
import { CombatSystem } from './src/systems/combat-system';
import { GameMap } from './src/world/map';

class XPTestScene extends Phaser.Scene {
  private player!: Player;
  private xpSystem!: XPSystem;
  private messageLog!: MessageLog;
  private renderer!: ASCIIRenderer;
  private combatSystem!: CombatSystem;
  private gameMap!: GameMap;
  private testMonster!: Monster;

  constructor() {
    super({ key: 'XPTestScene' });
  }

  create() {
    console.log('=== XP System Test ===\n');

    // Initialize systems
    this.messageLog = new MessageLog(50);
    this.renderer = new ASCIIRenderer(this, 80, 40);
    this.xpSystem = new XPSystem(this, this.messageLog, this.renderer);
    this.combatSystem = new CombatSystem(this.messageLog);
    this.gameMap = new GameMap(80, 40);

    // Create test player (Warrior, level 1)
    this.player = new Player(10, 10, 'warrior');
    this.gameMap.addEntity(this.player);
    
    console.log('Player created:');
    console.log(`  Class: ${this.player.playerClass}`);
    console.log(`  Level: ${this.player.level}`);
    console.log(`  HP: ${this.player.currentHP}/${this.player.maxHP}`);
    console.log(`  Attack: ${this.player.attack}`);
    console.log(`  Defense: ${this.player.defense}`);
    console.log(`  Speed: ${this.player.speed}`);
    console.log(`  XP: ${this.player.xp}/${this.player.xpForNextLevel}\n`);

    // Create test monster
    this.testMonster = new Monster(
      15, 10,
      'Goblin',
      'g',
      0x00ff00,
      10, 5, 2, 5,
      undefined,
      50 // XP reward
    );
    this.gameMap.addEntity(this.testMonster);

    // Run test sequence
    this.runTests();
  }

  private async runTests() {
    console.log('--- Test 1: Award XP (not enough to level) ---');
    this.xpSystem.awardXP(this.player, 30);
    console.log(`XP: ${this.player.xp}/${this.player.xpForNextLevel}`);
    console.log(`Progress: ${this.xpSystem.getXPProgress(this.player)}%\n`);

    await this.delay(1000);

    console.log('--- Test 2: Award more XP (still not enough) ---');
    this.xpSystem.awardXP(this.player, 30);
    console.log(`XP: ${this.player.xp}/${this.player.xpForNextLevel}`);
    console.log(`Progress: ${this.xpSystem.getXPProgress(this.player)}%\n`);

    await this.delay(1000);

    console.log('--- Test 3: Award XP to trigger level-up ---');
    console.log('This should show the level-up UI...');
    this.xpSystem.awardXP(this.player, 50);
    // UI should now be showing - player must select a stat
    
    // Simulate choosing MAX_HP after 2 seconds
    await this.delay(2000);
    console.log('\nSimulating stat choice selection (pressing DOWN arrow)...');
    this.input.keyboard?.emit('keydown', { key: 'ArrowDown' });
    
    await this.delay(500);
    console.log('Pressing ENTER to confirm...');
    this.input.keyboard?.emit('keydown', { key: 'Enter' });
    
    await this.delay(1000);
    
    console.log('\n--- After Level-Up ---');
    console.log(`Level: ${this.player.level}`);
    console.log(`HP: ${this.player.currentHP}/${this.player.maxHP}`);
    console.log(`Attack: ${this.player.attack}`);
    console.log(`Defense: ${this.player.defense}`);
    console.log(`XP: ${this.player.xp}/${this.player.xpForNextLevel}\n`);

    console.log('--- Test 4: XP Level Thresholds ---');
    for (let level = 1; level <= 10; level++) {
      const xpNeeded = this.xpSystem.getXPForLevel(level);
      console.log(`Level ${level}: ${xpNeeded} XP`);
    }
    console.log('');

    console.log('--- Test 5: Combat Integration ---');
    console.log('Attacking goblin...');
    const result = this.combatSystem.meleeAttack(this.player, this.testMonster);
    console.log(`Hit: ${result.hit}, Damage: ${result.damage}, Killed: ${result.killed}`);
    
    if (result.killed) {
      console.log('Monster killed! Awarding XP...');
      const loot = this.combatSystem.handleDeath(this.testMonster, this.gameMap);
      
      // Award XP manually (should be integrated in combat system)
      this.xpSystem.awardXP(this.player, this.testMonster.xpReward);
      console.log(`Loot dropped: ${loot.length} items`);
    }
    
    console.log('\n=== All Tests Complete ===');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  update() {
    // Render scene
    this.renderer.clear();
    
    // Draw title
    this.renderer.drawText(2, 2, '=== XP SYSTEM TEST ===', 0xff00ff);
    
    // Draw player stats
    let y = 4;
    this.renderer.drawText(2, y++, `Player: Level ${this.player.level} ${this.player.playerClass}`, 0xffffff);
    this.renderer.drawText(2, y++, `HP: ${this.player.currentHP}/${this.player.maxHP}`, 0x00ff00);
    this.renderer.drawText(2, y++, `Attack: ${this.player.attack} | Defense: ${this.player.defense}`, 0xffff00);
    this.renderer.drawText(2, y++, `XP: ${this.player.xp}/${this.player.xpForNextLevel} (${this.xpSystem.getXPProgress(this.player)}%)`, 0x00ffff);
    
    // Draw XP bar
    y++;
    const barWidth = 30;
    const progress = this.xpSystem.getXPProgress(this.player);
    const filledWidth = Math.floor((progress / 100) * barWidth);
    const bar = '[' + '='.repeat(filledWidth) + ' '.repeat(barWidth - filledWidth) + ']';
    this.renderer.drawText(2, y++, `XP: ${bar} ${progress}%`, 0xffdd00);
    
    // Draw message log
    y += 2;
    this.renderer.drawText(2, y++, '--- Message Log ---', 0x888888);
    const recentMessages = this.messageLog.messages.slice(-10);
    recentMessages.forEach(msg => {
      this.renderer.drawText(2, y++, msg.text, msg.color || 0xffffff);
    });
  }
}

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: [XPTestScene],
  parent: 'game-container',
};

// Create game instance
const game = new Phaser.Game(config);

console.log('XP System test started. Check the browser console and game window.');
