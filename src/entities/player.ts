/**
 * Player Character class
 * Extends Entity with player-specific properties like leveling, inventory, and equipment
 */

import { Entity } from './Entity';
import { CHARACTER_CLASSES } from '../config/class-data';
import { EquipmentSystem } from '../systems/equipment-system';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PlayerClass = 'warrior' | 'mage' | 'rogue';

/**
 * Represents a player inventory item
 */
export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'misc';
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * Represents equipped items
 */
export interface Equipment {
  weapon?: InventoryItem;
  armor?: InventoryItem;
  shield?: InventoryItem;
  accessory?: InventoryItem;
}

// ============================================================================
// PLAYER CLASS
// ============================================================================

export class Player extends Entity {
  // ============================================================================
  // CHARACTER CLASS & PROGRESSION
  // ============================================================================
  /** Player class type */
  playerClass: PlayerClass;
  /** Current level */
  level: number;
  /** Current experience points */
  xp: number;
  /** Experience required for next level */
  xpForNextLevel: number;

  // ============================================================================
  // ADVANCED STATS
  // ============================================================================
  /** Current mana/magic resource */
  currentMana: number;
  /** Maximum mana */
  maxMana: number;
  /** Magic power/spell damage */
  magicPower: number;

  // ============================================================================
  // INVENTORY & EQUIPMENT
  // ============================================================================
  /** Inventory items */
  inventory: InventoryItem[];
  /** Max number of non-gold inventory slots */
  readonly inventoryCapacity: number;
  /** Gold wallet (unlimited precision) */
  gold: bigint;
  /** Currently equipped items */
  equipment: Equipment;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /**
   * Creates a new Player character
   * @param x - Starting X position
   * @param y - Starting Y position
   * @param playerClass - Character class ('warrior', 'mage', 'rogue')
   */
  constructor(x: number, y: number, playerClass: PlayerClass) {
    // Get class data
    const classData = CHARACTER_CLASSES[playerClass];
    if (!classData) {
      throw new Error(`Invalid player class: ${playerClass}`);
    }

    // Initialize base entity with class stats
    super(
      x,
      y,
      classData.name,
      classData.glyph,
      classData.classColor,
      classData.baseStats.maxHp,
      classData.baseStats.attack,
      classData.baseStats.defense,
      classData.baseStats.speed
    );

    // Set player-specific properties
    this.playerClass = playerClass;
    this.level = classData.baseStats.level;
    this.xp = classData.baseStats.experience;
    this.xpForNextLevel = this.calculateXpForLevel(this.level + 1);

    // Set mana stats
    this.maxMana = classData.baseStats.maxMana;
    this.currentMana = classData.baseStats.maxMana;
    this.magicPower = classData.baseStats.magicPower;

    // Initialize inventory and equipment
    this.inventory = [];
    this.inventoryCapacity = 20;
    this.gold = 0n;
    this.equipment = {
      weapon: undefined,
      armor: undefined,
      shield: undefined,
      accessory: undefined,
    };
  }

  // ============================================================================
  // XP & LEVELING METHODS
  // ============================================================================

  /**
   * Calculate total XP needed to reach a specific level
   * Uses exponential curve: baseXP * level^1.5
   * @param level - Target level
   * @returns Total XP needed
   */
  private calculateXpForLevel(level: number): number {
    const baseXP = 100;
    return Math.floor(baseXP * Math.pow(level, 1.5));
  }

  /**
   * Gain experience points
   * NOTE: This method only adds XP and does NOT trigger level-ups.
   * Use XPSystem.awardXP() instead for full leveling functionality with stat choices.
   * @param amount - XP amount to gain
   */
  gainXP(amount: number): void {
    this.xp += amount;
  }

  // ============================================================================
  // MANA METHODS
  // ============================================================================

  /**
   * Use mana for ability/spell
   * @param amount - Mana cost
   * @returns true if enough mana was available
   */
  useMana(amount: number): boolean {
    if (this.currentMana >= amount) {
      this.currentMana -= amount;
      return true;
    }
    return false;
  }

  /**
   * Restore mana
   * @param amount - Mana to restore
   * @returns Actual mana restored
   */
  restoreMana(amount: number): number {
    const previousMana = this.currentMana;
    this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
    return this.currentMana - previousMana;
  }

  // ============================================================================
  // INVENTORY METHODS
  // ============================================================================

  /**
   * Add item to inventory
   * @param item - Item to add
   */
  addItem(item: InventoryItem): boolean {
    if (!this.canAddItem(item)) {
      return false;
    }

    // Check if item already in inventory (stackable items)
    const existingItem = this.inventory.find((i) => i.id === item.id);
    if (existingItem && this.isStackable(item)) {
      existingItem.quantity += item.quantity;
    } else {
      this.inventory.push(item);
    }
    return true;
  }

  canAddItem(item: InventoryItem): boolean {
    const existingItem = this.inventory.find((i) => i.id === item.id);
    if (existingItem && this.isStackable(item)) {
      return true;
    }
    return this.inventory.length < this.inventoryCapacity;
  }

  hasInventorySpace(): boolean {
    return this.inventory.length < this.inventoryCapacity;
  }

  private isStackable(item: InventoryItem): boolean {
    return item.type === 'potion' || item.type === 'misc';
  }

  /**
   * Remove item from inventory
   * @param itemId - Item ID to remove
   * @returns true if item was removed
   */
  removeItem(itemId: string): boolean {
    const index = this.inventory.findIndex((i) => i.id === itemId);
    if (index > -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get item from inventory by ID
   * @param itemId - Item ID
   * @returns Item or undefined
   */
  getItem(itemId: string): InventoryItem | undefined {
    return this.inventory.find((i) => i.id === itemId);
  }

  addGold(amount: bigint | number): void {
    const normalizedAmount = typeof amount === 'bigint' ? amount : BigInt(Math.max(0, Math.floor(amount)));
    this.gold += normalizedAmount;
  }

  spendGold(amount: bigint | number): boolean {
    const normalizedAmount = typeof amount === 'bigint' ? amount : BigInt(Math.max(0, Math.floor(amount)));
    if (this.gold < normalizedAmount) {
      return false;
    }
    this.gold -= normalizedAmount;
    return true;
  }

  getGoldString(): string {
    return this.gold.toString();
  }

  // ============================================================================
  // EQUIPMENT METHODS
  // ============================================================================

  /**
   * Equip an item using the equipment system
   * @param item - Item to equip
   * @returns true if item was successfully equipped
   */
  equipItem(item: InventoryItem): boolean {
    return EquipmentSystem.equipItem(this, item);
  }

  /**
   * Unequip an item using the equipment system
   * @param slot - Equipment slot to unequip ('weapon', 'armor', 'shield', 'accessory')
   * @returns Unequipped item or null
   */
  unequipItem(
    slot: 'weapon' | 'armor' | 'shield' | 'accessory'
  ): InventoryItem | null {
    return EquipmentSystem.unequipItem(this, slot);
  }

  /**
   * Get total stat bonuses from equipment
   * @returns Object with all equipment stat bonuses
   */
  getEquipmentStats() {
    return EquipmentSystem.getEquippedStats(this);
  }

  /**
   * Get total attack including equipment bonuses
   * @returns Total attack value
   */
  getTotalAttack(): number {
    return this.attack + EquipmentSystem.getAttackBonus(this);
  }

  /**
   * Get total defense including equipment bonuses
   * @returns Total defense value
   */
  getTotalDefense(): number {
    return this.defense + EquipmentSystem.getDefenseBonus(this);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get XP progress to next level as percentage
   * @returns Progress 0-100
   */
  getXpProgress(): number {
    if (this.xpForNextLevel === 0) return 100;
    return Math.floor((this.xp / this.xpForNextLevel) * 100);
  }

  /**
   * Update player state (empty for now, can be extended)
   */
  update(): void {
    // Player state updates would go here (e.g., regeneration, status effects)
  }

  /**
   * Get player status summary
   * @returns Status string
   */
  getStatus(): string {
    return (
      `[${this.playerClass.toUpperCase()}] ${this.name} Lvl.${this.level} ` +
      `HP: ${this.currentHP}/${this.maxHP} | XP: ${this.xp}/${this.xpForNextLevel}`
    );
  }
}

export default Player;
