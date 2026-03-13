/**
 * Turn-Based Scheduler for Roguelike Gameplay
 * Manages the turn cycle: player action -> monster actions -> FOV update -> render
 */

import { Player } from '../entities/player';
import { Monster, AIBehavior } from '../entities/monster';
import { GameMap } from '../world/map';
import { FOVSystem } from '../world/fov';
import { Pathfinder } from '../world/pathfinding';
import { DialogueTriggerSystem } from './dialogue-trigger-system';
import type { NPC } from '../entities/npc';
import type { Scene } from 'phaser';

/**
 * Represents a player action that can be processed during their turn
 */
export interface PlayerAction {
  type: 'move' | 'attack' | 'wait' | 'use_item' | 'pickup' | 'interact';
  dx?: number;          // For movement/attack direction
  dy?: number;          // For movement/attack direction
  itemId?: string;      // For item usage
  targetX?: number;     // For targeted actions
  targetY?: number;     // For targeted actions
}

/**
 * Result of processing a turn action
 */
export interface TurnResult {
  success: boolean;
  turnConsumed: boolean;
  message?: string;
  needsRender?: boolean;
}

/**
 * Turn-based game scheduler
 * Coordinates the flow of gameplay between player and monsters
 */
export class TurnSystem {
  private fovSystem: FOVSystem;
  private pathfinder: Pathfinder;
  private isWaitingForPlayer: boolean = true;
  private turnCount: number = 0;
  private dialogueTriggerSystem?: DialogueTriggerSystem;
  private scene?: Scene;
  private npcs: NPC[] = [];

  constructor(fovSystem?: FOVSystem, scene?: Scene) {
    this.fovSystem = fovSystem || new FOVSystem();
    this.pathfinder = new Pathfinder(1000, true);
    this.scene = scene;
    if (scene) {
      this.dialogueTriggerSystem = new DialogueTriggerSystem(scene);
    }
  }

  /**
   * Set the scene reference for dialogue system
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.dialogueTriggerSystem = new DialogueTriggerSystem(scene);
  }

  /**
   * Set the NPCs for interaction
   */
  setNPCs(npcs: NPC[]): void {
    this.npcs = npcs;
  }

  // ============================================================================
  // TURN STATE MANAGEMENT
  // ============================================================================

  /**
   * Check if the game is waiting for player input
   * @returns true if it's the player's turn
   */
  isPlayerTurn(): boolean {
    return this.isWaitingForPlayer;
  }

  /**
   * Get the current turn count
   * @returns Total number of turns elapsed
   */
  getTurnCount(): number {
    return this.turnCount;
  }

  // ============================================================================
  // MAIN TURN PROCESSING
  // ============================================================================

  /**
   * Execute one full turn cycle
   * 1. Player acts (movement/attack/use item)
   * 2. Update game state
   * 3. All monsters act (AI-driven)
   * 4. Recalculate FOV
   * 5. Update rendering
   * 
   * @param player - The player entity
   * @param monsters - Array of active monsters
   * @param map - The game map
   * @param action - Player action to execute
   * @returns true if the turn cycle completed successfully
   */
  processTurn(
    player: Player,
    monsters: Monster[],
    map: GameMap,
    action: PlayerAction
  ): boolean {
    // Only process if waiting for player
    if (!this.isWaitingForPlayer) {
      return false;
    }

    // 1. Process player action
    const playerResult = this.playerTurn(player, map, action);
    
    if (!playerResult.turnConsumed) {
      // Player action didn't consume a turn (invalid move, etc.)
      return false;
    }

    // Player turn is complete, now monsters act
    this.isWaitingForPlayer = false;

    // 2. Process all monster turns
    this.monstersPhase(player, monsters, map);

    // 3. Recalculate FOV after all movement
    this.fovSystem.compute(map, player.x, player.y);

    // 4. Increment turn counter
    this.turnCount++;

    // 5. Ready for next player turn
    this.isWaitingForPlayer = true;

    return true;
  }

  // ============================================================================
  // PLAYER TURN PROCESSING
  // ============================================================================

  /**
   * Handle player action during their turn
   * @param player - The player entity
   * @param map - The game map
   * @param action - Player action to execute
   * @returns Result of the player action
   */
  playerTurn(player: Player, map: GameMap, action: PlayerAction): TurnResult {
    switch (action.type) {
      case 'move':
        return this.handlePlayerMove(player, map, action.dx!, action.dy!);
      
      case 'attack':
        return this.handlePlayerAttack(player, map, action.dx!, action.dy!);
      
      case 'wait':
        return this.handlePlayerWait(player);
      
      case 'use_item':
        return this.handlePlayerUseItem(player, action.itemId!);
      
      case 'pickup':
        return this.handlePlayerPickup(player, map);
      
      case 'interact':
        return this.handlePlayerInteract(player, map, action.dx!, action.dy!);
      
      default:
        return {
          success: false,
          turnConsumed: false,
          message: 'Invalid action'
        };
    }
  }

  /**
   * Handle player movement
   */
  private handlePlayerMove(
    player: Player,
    map: GameMap,
    dx: number,
    dy: number
  ): TurnResult {
    const newX = player.x + dx;
    const newY = player.y + dy;

    // Check bounds
    if (!map.isInBounds(newX, newY)) {
      return {
        success: false,
        turnConsumed: false,
        message: 'Cannot move out of bounds'
      };
    }

    // Check if blocked
    if (map.isBlocked(newX, newY)) {
      // Check if there's a monster to attack
      const monster = map.getEntityAt(newX, newY);
      if (monster && monster instanceof Monster) {
        return this.handlePlayerAttack(player, map, dx, dy);
      }
      
      return {
        success: false,
        turnConsumed: false,
        message: 'Path is blocked'
      };
    }

    // Perform movement
    player.setPosition(newX, newY);

    return {
      success: true,
      turnConsumed: true,
      message: `Moved to (${newX}, ${newY})`,
      needsRender: true
    };
  }

  /**
   * Handle player attack
   */
  private handlePlayerAttack(
    player: Player,
    map: GameMap,
    dx: number,
    dy: number
  ): TurnResult {
    const targetX = player.x + dx;
    const targetY = player.y + dy;

    const target = map.getEntityAt(targetX, targetY);
    
    if (!target || !(target instanceof Monster)) {
      return {
        success: false,
        turnConsumed: false,
        message: 'No target to attack'
      };
    }

    // Calculate damage
    const damage = this.calculateDamage(player.attack, target.defense);
    target.takeDamage(damage);

    // Check if monster died
    if (target.isDead()) {
      map.removeEntity(target);
      const monsterIndex = map.entities.indexOf(target);
      if (monsterIndex > -1) {
        map.entities.splice(monsterIndex, 1);
      }
      
      // Award XP
      player.gainXP(target.xpReward);
      
      return {
        success: true,
        turnConsumed: true,
        message: `You killed ${target.name}! (+${target.xpReward} XP)`,
        needsRender: true
      };
    }

    return {
      success: true,
      turnConsumed: true,
      message: `You hit ${target.name} for ${damage} damage`,
      needsRender: true
    };
  }

  /**
   * Handle player wait action
   */
  private handlePlayerWait(player: Player): TurnResult {
    return {
      success: true,
      turnConsumed: true,
      message: 'You wait...',
      needsRender: false
    };
  }

  /**
   * Handle player item usage
   */
  private handlePlayerUseItem(player: Player, itemId: string): TurnResult {
    const item = player.getItem(itemId);
    
    if (!item) {
      return {
        success: false,
        turnConsumed: false,
        message: 'Item not found'
      };
    }

    // TODO: Implement item effects based on item type
    // For now, just consume the turn
    
    return {
      success: true,
      turnConsumed: true,
      message: `Used ${item.name}`,
      needsRender: true
    };
  }

  /**
   * Handle player item pickup
   */
  private handlePlayerPickup(player: Player, map: GameMap): TurnResult {
    const items = map.getItemsAt(player.x, player.y);
    
    if (items.length === 0) {
      return {
        success: false,
        turnConsumed: false,
        message: 'Nothing to pick up here'
      };
    }

    // TODO: Implement item pickup logic
    // For now, just consume the turn
    
    return {
      success: true,
      turnConsumed: true,
      message: `Picked up ${items[0].name}`,
      needsRender: true
    };
  }

  /**
   * Handle player interaction (doors, chests, NPCs, etc.)
   */
  private handlePlayerInteract(
    player: Player,
    map: GameMap,
    dx: number,
    dy: number
  ): TurnResult {
    const targetX = player.x + dx;
    const targetY = player.y + dy;

    // Check for NPC interaction if dialogue system is available
    if (this.dialogueTriggerSystem && this.scene) {
      const result = this.dialogueTriggerSystem.attemptInteraction(
        player,
        targetX,
        targetY,
        map
      );

      if (result.success && result.npc) {
        // Trigger the dialogue
        this.dialogueTriggerSystem.triggerDialogue(this.scene, result.npc, player);
        
        return {
          success: true,
          turnConsumed: true,
          message: result.message || `Talking to ${result.npc.name}...`,
          needsRender: true
        };
      }
      
      // If interaction attempted but failed, return the message
      if (result.message) {
        return {
          success: false,
          turnConsumed: false,
          message: result.message,
          needsRender: false
        };
      }
    }

    // TODO: Implement interaction logic for doors, chests, etc.
    
    return {
      success: false,
      turnConsumed: false,
      message: 'Nothing to interact with here.',
      needsRender: false
    };
  }

  /**
   * Get interaction prompt for nearby NPCs
   */
  getInteractionPrompt(player: Player): string | null {
    if (!this.dialogueTriggerSystem) {
      return null;
    }
    return this.dialogueTriggerSystem.getInteractionPrompt(player, this.npcs);
  }

  /**
   * Get highlighted NPC (for visual indicator)
   */
  getHighlightedNPC(): NPC | null {
    if (!this.dialogueTriggerSystem) {
      return null;
    }
    return this.dialogueTriggerSystem.getHighlightedNPC();
  }

  // ============================================================================
  // MONSTER TURN PROCESSING
  // ============================================================================

  /**
   * Process all monster turns
   * @param player - The player entity (for AI targeting)
   * @param monsters - Array of monsters to process
   * @param map - The game map
   */
  private monstersPhase(player: Player, monsters: Monster[], map: GameMap): void {
    // Process each monster's turn
    for (const monster of monsters) {
      // Skip dead monsters
      if (monster.isDead()) {
        continue;
      }

      this.monsterTurn(monster, player, map);
    }
  }

  /**
   * Execute a single monster's turn using AI
   * @param monster - The monster to act
   * @param player - The player (target)
   * @param map - The game map
   */
  monsterTurn(monster: Monster, player: Player, map: GameMap): void {
    // Check if monster can see player
    const canSeePlayer = monster.canSee(player.x, player.y) && 
                        this.hasLineOfSight(monster.x, monster.y, player.x, player.y, map);
    
    // Update aggro state
    monster.updateAggro(canSeePlayer);

    // Execute behavior based on AI type
    switch (monster.behavior) {
      case AIBehavior.AGGRESSIVE:
        this.monsterAggressiveBehavior(monster, player, map, canSeePlayer);
        break;
      
      case AIBehavior.WANDERER:
        this.monsterWandererBehavior(monster, map);
        break;
      
      case AIBehavior.COWARDLY:
        this.monsterCowardlyBehavior(monster, player, map, canSeePlayer);
        break;
      
      case AIBehavior.AMBUSHER:
        this.monsterAmbusherBehavior(monster, player, map, canSeePlayer);
        break;
      
      case AIBehavior.STATIONARY:
        // Do nothing
        break;
    }
  }

  /**
   * Aggressive monster behavior: chase and attack player
   */
  private monsterAggressiveBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean
  ): void {
    if (!canSeePlayer) {
      // Wander randomly if can't see player
      this.monsterWandererBehavior(monster, map);
      return;
    }

    // Check if adjacent to player
    const distance = this.getDistance(monster.x, monster.y, player.x, player.y);
    
    if (distance <= 1.5) {
      // Adjacent - attack player
      this.monsterAttack(monster, player);
    } else {
      // Not adjacent - move towards player
      this.moveMonsterTowards(monster, player.x, player.y, map);
    }
  }

  /**
   * Wanderer behavior: move randomly
   */
  private monsterWandererBehavior(monster: Monster, map: GameMap): void {
    // 50% chance to move, 50% chance to wait
    if (Math.random() < 0.5) {
      return;
    }

    // Choose random direction
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];

    const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
    const newX = monster.x + dx;
    const newY = monster.y + dy;

    if (map.isInBounds(newX, newY) && !map.isBlocked(newX, newY)) {
      monster.setPosition(newX, newY);
    }
  }

  /**
   * Cowardly behavior: flee from player
   */
  private monsterCowardlyBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean
  ): void {
    if (!canSeePlayer) {
      this.monsterWandererBehavior(monster, map);
      return;
    }

    // Move away from player
    const [dx, dy] = monster.getAIDirection(player.x, player.y);
    const newX = monster.x - dx; // Opposite direction
    const newY = monster.y - dy;

    if (map.isInBounds(newX, newY) && !map.isBlocked(newX, newY)) {
      monster.setPosition(newX, newY);
    }
  }

  /**
   * Ambusher behavior: wait until player is close, then attack
   */
  private monsterAmbusherBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean
  ): void {
    const distance = this.getDistance(monster.x, monster.y, player.x, player.y);
    
    // Only attack if player is very close
    if (canSeePlayer && distance <= 3) {
      this.monsterAggressiveBehavior(monster, player, map, canSeePlayer);
    }
    // Otherwise, stay still
  }

  /**
   * Move monster towards a target position using pathfinding
   */
  private moveMonsterTowards(
    monster: Monster,
    targetX: number,
    targetY: number,
    map: GameMap
  ): void {
    // Use pathfinding to find path to target
    const path = this.pathfinder.findPath(
      monster.x,
      monster.y,
      targetX,
      targetY,
      map
    );

    // If path found and has at least 2 points (current + next)
    if (path && path.length >= 2) {
      const [nextX, nextY] = path[1]; // path[0] is current position
      
      // Check if next position is walkable
      if (!map.isBlocked(nextX, nextY)) {
        monster.setPosition(nextX, nextY);
        return;
      }
    }

    // Fallback: simple direct movement
    const [dx, dy] = monster.getAIDirection(targetX, targetY);
    const newX = monster.x + dx;
    const newY = monster.y + dy;

    if (map.isInBounds(newX, newY) && !map.isBlocked(newX, newY)) {
      monster.setPosition(newX, newY);
    }
  }

  /**
   * Monster attacks player
   */
  private monsterAttack(monster: Monster, player: Player): void {
    const damage = this.calculateDamage(monster.attack, player.defense);
    player.takeDamage(damage);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Calculate damage from an attack
   * @param attack - Attacker's attack stat
   * @param defense - Defender's defense stat
   * @returns Damage dealt
   */
  private calculateDamage(attack: number, defense: number): number {
    // Simple damage formula: max(1, attack - defense/2) with variance
    const baseDamage = Math.max(1, attack - Math.floor(defense / 2));
    const variance = Math.floor(baseDamage * 0.2); // ±20% variance
    const damage = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
    return Math.max(1, damage);
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Check if there's line of sight between two points
   * Uses simple raycasting to check if any blocking tiles are in the way
   */
  private hasLineOfSight(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    map: GameMap
  ): boolean {
    // Bresenham's line algorithm
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      // Check if current position blocks sight
      const tile = map.getTile(x, y);
      if (tile && tile.blocksSight && (x !== x1 || y !== y1)) {
        return false;
      }

      // Reached target
      if (x === x2 && y === y2) {
        return true;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Reset the turn system (for new game or level change)
   */
  reset(): void {
    this.isWaitingForPlayer = true;
    this.turnCount = 0;
    this.pathfinder.clearCache();
  }
}

export default TurnSystem;
