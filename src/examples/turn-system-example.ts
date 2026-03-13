/**
 * Turn System Integration Example
 * Demonstrates how to use the TurnSystem in a game scene
 */

import Phaser from 'phaser';
import { TurnSystem, PlayerAction } from '../systems/turn-system';
import { Player } from '../entities/player';
import { Monster, AIBehavior } from '../entities/monster';
import { GameMap } from '../world/map';
import { FOVSystem } from '../world/fov';

/**
 * Example Game Scene using TurnSystem
 */
export class GameSceneExample extends Phaser.Scene {
  private turnSystem!: TurnSystem;
  private player!: Player;
  private monsters: Monster[] = [];
  private map!: GameMap;
  private fovSystem!: FOVSystem;

  create() {
    // Initialize game systems
    this.map = new GameMap(80, 40);
    this.fovSystem = new FOVSystem();
    this.turnSystem = new TurnSystem(this.fovSystem);

    // Create player
    this.player = new Player(10, 10, 'warrior');
    this.map.addEntity(this.player);

    // Create some monsters
    this.createMonsters();

    // Calculate initial FOV
    this.fovSystem.compute(this.map, this.player.x, this.player.y);

    // Set up input handling
    this.setupInputHandlers();
  }

  private createMonsters(): void {
    // Aggressive orc
    const orc = new Monster(
      15, 10,
      'Orc Warrior',
      'o',
      0x00ff00,
      30, 12, 5, 5,
      AIBehavior.AGGRESSIVE,
      50
    );
    this.monsters.push(orc);
    this.map.addEntity(orc);

    // Wandering slime
    const slime = new Monster(
      20, 15,
      'Slime',
      's',
      0x00ff00,
      15, 5, 2, 3,
      AIBehavior.WANDERER,
      20
    );
    this.monsters.push(slime);
    this.map.addEntity(slime);

    // Cowardly rabbit
    const rabbit = new Monster(
      8, 8,
      'Rabbit',
      'r',
      0xcccccc,
      8, 3, 1, 10,
      AIBehavior.COWARDLY,
      10
    );
    this.monsters.push(rabbit);
    this.map.addEntity(rabbit);
  }

  private setupInputHandlers(): void {
    // Listen for keyboard input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.turnSystem.isPlayerTurn()) {
        return; // Don't process input if not player's turn
      }

      const action = this.parseInputToAction(event.key);
      if (action) {
        this.processTurn(action);
      }
    });
  }

  private parseInputToAction(key: string): PlayerAction | null {
    // Arrow keys for movement
    const keyLower = key.toLowerCase();
    
    switch (keyLower) {
      case 'arrowup':
      case 'k':
        return { type: 'move', dx: 0, dy: -1 };
      case 'arrowdown':
      case 'j':
        return { type: 'move', dx: 0, dy: 1 };
      case 'arrowleft':
      case 'h':
        return { type: 'move', dx: -1, dy: 0 };
      case 'arrowright':
      case 'l':
        return { type: 'move', dx: 1, dy: 0 };
      
      // Diagonal movement (vi-keys)
      case 'y':
        return { type: 'move', dx: -1, dy: -1 };
      case 'u':
        return { type: 'move', dx: 1, dy: -1 };
      case 'b':
        return { type: 'move', dx: -1, dy: 1 };
      case 'n':
        return { type: 'move', dx: 1, dy: 1 };
      
      // Wait
      case ' ':
      case '.':
        return { type: 'wait' };
      
      default:
        return null;
    }
  }

  private processTurn(action: PlayerAction): void {
    // Process the full turn cycle
    const success = this.turnSystem.processTurn(
      this.player,
      this.monsters,
      this.map,
      action
    );

    if (success) {
      // Turn was completed successfully
      console.log(`Turn ${this.turnSystem.getTurnCount()} completed`);
      
      // Update rendering
      this.renderGame();
      
      // Check game state
      this.checkGameState();
    } else {
      // Turn failed (invalid action)
      console.log('Invalid action - try again');
    }
  }

  private renderGame(): void {
    // TODO: Update ASCII renderer or sprite positions
    // This is where you would update your visual representation
    console.log(`Player: (${this.player.x}, ${this.player.y}) HP: ${this.player.currentHP}/${this.player.maxHP}`);
    
    this.monsters.forEach(monster => {
      if (!monster.isDead()) {
        console.log(`${monster.name}: (${monster.x}, ${monster.y}) HP: ${monster.currentHP}/${monster.maxHP}`);
      }
    });
  }

  private checkGameState(): void {
    // Check if player is dead
    if (this.player.isDead()) {
      console.log('GAME OVER - You died!');
      this.scene.start('GameOverScene');
      return;
    }

    // Remove dead monsters
    this.monsters = this.monsters.filter(monster => {
      if (monster.isDead()) {
        this.map.removeEntity(monster);
        return false;
      }
      return true;
    });

    // Check if all monsters are dead (level complete)
    if (this.monsters.length === 0) {
      console.log('LEVEL COMPLETE - All monsters defeated!');
      this.scene.start('VictoryScene');
    }
  }

  update(time: number, delta: number): void {
    // Phaser update loop
    // The turn system is event-driven, so we don't need to do anything here
    // unless you want to add animations or other effects
  }
}

/**
 * Usage Example - Integration Points
 * 
 * 1. INITIALIZATION:
 *    - Create TurnSystem with FOVSystem
 *    - Create Player and Monsters
 *    - Add entities to GameMap
 *    - Calculate initial FOV
 * 
 * 2. INPUT HANDLING:
 *    - Convert keyboard/mouse input to PlayerAction
 *    - Check if it's player's turn with isPlayerTurn()
 *    - Call processTurn() with the action
 * 
 * 3. TURN PROCESSING:
 *    - TurnSystem automatically:
 *      * Validates and executes player action
 *      * Processes all monster AI
 *      * Recalculates FOV
 *      * Increments turn counter
 * 
 * 4. POST-TURN:
 *    - Update rendering (ASCII/sprites)
 *    - Check game state (player death, victory, etc.)
 *    - Handle any UI updates
 * 
 * 5. LEVEL TRANSITIONS:
 *    - Call turnSystem.reset() when changing levels
 *    - This resets turn counter and pathfinding cache
 */

/**
 * Quick Start Example:
 * 
 * ```typescript
 * // In your scene's create():
 * this.turnSystem = new TurnSystem();
 * this.player = new Player(10, 10, 'warrior');
 * this.monsters = [...]; // Create monsters
 * 
 * // In your input handler:
 * if (this.turnSystem.isPlayerTurn()) {
 *   const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
 *   this.turnSystem.processTurn(this.player, this.monsters, this.map, action);
 * }
 * ```
 */
