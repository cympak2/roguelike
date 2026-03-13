/**
 * Monster class for enemy entities
 * Extends Entity with AI behavior and loot information
 */

import { Entity } from './Entity';
import type { MonsterAIRules } from '../types/monster-ai-rules';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum AIBehavior {
  /** Wanders randomly */
  WANDERER = 'wanderer',
  /** Chases player when in sight */
  AGGRESSIVE = 'aggressive',
  /** Flees from player */
  COWARDLY = 'cowardly',
  /** Waits for player to come near */
  AMBUSHER = 'ambusher',
  /** Stands still */
  STATIONARY = 'stationary',
}

/**
 * Loot drop information
 */
export interface LootDrop {
  itemId: string;
  dropChance: number; // 0-1 probability
  minQuantity?: number;
  maxQuantity?: number;
}

// ============================================================================
// MONSTER CLASS
// ============================================================================

export class Monster extends Entity {
  // ============================================================================
  // AI PROPERTIES
  // ============================================================================
  /** AI behavior type */
  behavior: AIBehavior;
  /** Sight range for detecting player */
  sightRange: number;
  /** Current aggro state */
  isAggro: boolean;
  /** Source monster template id */
  templateId: string;
  /** Optional conditional AI rules */
  aiRules?: MonsterAIRules;

  // ============================================================================
  // LOOT PROPERTIES
  // ============================================================================
  /** Experience reward on defeat */
  xpReward: number;
  /** Potential loot drops */
  lootDrops: LootDrop[];

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /**
   * Creates a new Monster
   * @param x - Starting X position
   * @param y - Starting Y position
   * @param name - Monster name
   * @param glyph - ASCII character for display
   * @param color - Color value (0xRRGGBB)
   * @param maxHP - Maximum health
   * @param attack - Attack stat
   * @param defense - Defense stat
   * @param speed - Speed stat
   * @param behavior - AI behavior type
   * @param xpReward - XP given when defeated
   */
  constructor(
    x: number,
    y: number,
    name: string,
    glyph: string,
    color: number,
    maxHP: number,
    attack: number,
    defense: number,
    speed: number,
    behavior: AIBehavior = AIBehavior.WANDERER,
    xpReward: number = 25
  ) {
    super(x, y, name, glyph, color, maxHP, attack, defense, speed);

    this.behavior = behavior;
    this.sightRange = 10;
    this.isAggro = false;
    this.templateId = '';
    this.xpReward = xpReward;
    this.lootDrops = [];
  }

  // ============================================================================
  // AI METHODS
  // ============================================================================

  /**
   * Determine if monster can see the target
   * @param targetX - Target X position
   * @param targetY - Target Y position
   * @returns true if target is within sight range
   */
  canSee(targetX: number, targetY: number): boolean {
    const distance = Math.sqrt(
      Math.pow(targetX - this.x, 2) + Math.pow(targetY - this.y, 2)
    );
    return distance <= this.sightRange;
  }

  /**
   * Set aggro state based on threat detection
   * @param canSeeTarget - Whether target is visible
   */
  updateAggro(canSeeTarget: boolean): void {
    switch (this.behavior) {
      case AIBehavior.AGGRESSIVE:
        this.isAggro = canSeeTarget;
        break;
      case AIBehavior.COWARDLY:
        this.isAggro = false;
        break;
      case AIBehavior.AMBUSHER:
        this.isAggro = canSeeTarget;
        break;
      case AIBehavior.WANDERER:
      case AIBehavior.STATIONARY:
      default:
        this.isAggro = false;
    }
  }

  /**
   * Get desired AI action direction
   * @param targetX - Target X position
   * @param targetY - Target Y position
   * @returns [dx, dy] direction towards target
   */
  getAIDirection(targetX: number, targetY: number): [number, number] {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // Normalize to -1, 0, or 1
    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);

    return [dirX, dirY];
  }

  // ============================================================================
  // LOOT METHODS
  // ============================================================================

  /**
   * Add possible loot drop
   * @param itemId - Item ID
   * @param dropChance - Drop chance (0-1)
   * @param minQuantity - Minimum quantity if dropped
   * @param maxQuantity - Maximum quantity if dropped
   */
  addLootDrop(
    itemId: string,
    dropChance: number,
    minQuantity?: number,
    maxQuantity?: number
  ): void {
    this.lootDrops.push({
      itemId,
      dropChance: Math.max(0, Math.min(1, dropChance)),
      minQuantity,
      maxQuantity,
    });
  }

  /**
   * Generate loot table based on drops
   * @returns Array of dropped item IDs
   */
  generateLoot(): string[] {
    const drops: string[] = [];

    for (const loot of this.lootDrops) {
      if (Math.random() <= loot.dropChance) {
        drops.push(loot.itemId);
      }
    }

    return drops;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Update monster state
   */
  update(): void {
    // Monster behavior updates would go here
    // Such as health regeneration, ability cooldowns, etc.
  }
}

export default Monster;
