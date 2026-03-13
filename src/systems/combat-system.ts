/**
 * Combat Damage Resolution System
 * Handles melee, ranged, and magic combat with damage formulas, death handling, and loot drops
 */

import { Entity } from '../entities/Entity';
import { Player } from '../entities/player';
import { Monster } from '../entities/monster';
import { GameMap, Item } from '../world/map';
import { ItemSpawnSystem } from './item-spawn-system';
import { MessageLog, MessageType } from '../ui/message-log';

/**
 * Result of a combat action
 */
export interface CombatResult {
  hit: boolean;
  damage: number;
  killed: boolean;
  message: string;
  loot?: Item[];
}

/**
 * Spell definition for magic attacks
 */
export interface Spell {
  name: string;
  manaCost: number;
  spellPower: number;
  damageType: 'fire' | 'ice' | 'lightning' | 'arcane';
}

/**
 * Combat System
 * Handles all damage calculation and combat resolution
 */
export class CombatSystem {
  private itemSpawnSystem: ItemSpawnSystem;
  private messageLog: MessageLog;

  constructor(messageLog: MessageLog, seed?: number) {
    this.messageLog = messageLog;
    this.itemSpawnSystem = new ItemSpawnSystem(seed);
  }

  /**
   * Execute a melee attack between two entities
   * Formula: damage = ATK + weapon_bonus - DEF - armor_bonus + rand(-2, 2)
   * 
   * @param attacker - The attacking entity
   * @param defender - The defending entity
   * @returns Combat result with damage dealt and status
   */
  meleeAttack(attacker: Entity, defender: Entity): CombatResult {
    // Calculate total attack and defense values
    const attackValue = this.getTotalAttack(attacker);
    const defenseValue = this.getTotalDefense(defender);

    // Base damage calculation with variance
    const baseDamage = Math.max(0, attackValue - defenseValue);
    const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
    const finalDamage = Math.max(1, baseDamage + variance);

    // Apply damage
    const actualDamage = defender.takeDamage(finalDamage);
    const killed = defender.isDead();

    // Generate message with HP display
    const attackerName = attacker instanceof Player ? 'You' : attacker.name;
    const defenderName = defender instanceof Player ? 'you' : defender.name;
    
    let message: string;
    if (attacker instanceof Player) {
      // Player attacking enemy - show enemy HP
      message = `You hit ${defenderName} for ${actualDamage} damage! [HP: ${defender.currentHP}/${defender.maxHP}]`;
    } else {
      // Enemy attacking player - show player HP
      message = `${attackerName} hits you for ${actualDamage} damage! [HP: ${defender.currentHP}/${defender.maxHP}]`;
    }

    if (killed) {
      message = `You killed ${defenderName}!`;
    }

    // Log combat message
    this.logCombatMessage(message, killed);

    return {
      hit: true,
      damage: actualDamage,
      killed,
      message,
    };
  }

  /**
   * Execute a ranged attack
   * Formula: damage = ATK + weapon_bonus - DEF + rand(-1, 1)
   * Damage reduced by distance (0.9^distance factor)
   * 
   * @param attacker - The attacking entity
   * @param defender - The defending entity
   * @param distance - Distance to target
   * @returns Combat result with damage dealt and status
   */
  rangedAttack(attacker: Entity, defender: Entity, distance: number): CombatResult {
    // Calculate total attack and defense values
    const attackValue = this.getTotalAttack(attacker);
    const defenseValue = this.getTotalDefense(defender);

    // Base damage calculation
    const baseDamage = Math.max(0, attackValue - defenseValue);
    const variance = Math.floor(Math.random() * 3) - 1; // -1 to +1
    
    // Apply distance penalty (damage falls off with range)
    const distanceFactor = Math.pow(0.9, Math.max(0, distance - 3));
    const finalDamage = Math.max(1, Math.floor((baseDamage + variance) * distanceFactor));

    // Apply damage
    const actualDamage = defender.takeDamage(finalDamage);
    const killed = defender.isDead();

    // Generate message
    const attackerName = attacker instanceof Player ? 'You' : attacker.name;
    const defenderName = defender instanceof Player ? 'you' : defender.name;
    
    let message: string;
    if (attacker instanceof Player) {
      message = `You shoot ${defenderName} for ${actualDamage} damage`;
    } else {
      message = `${attackerName} shoots you for ${actualDamage} damage`;
    }

    if (killed) {
      message += ` and killed it!`;
    }

    // Log combat message
    this.logCombatMessage(message, killed);

    return {
      hit: true,
      damage: actualDamage,
      killed,
      message,
    };
  }

  /**
   * Execute a magic attack with spell
   * Formula: damage = magicPower * spellPower * (1 - magicResist)
   * 
   * @param attacker - The attacking entity (must be Player)
   * @param defender - The defending entity
   * @param spell - Spell definition
   * @returns Combat result with damage dealt and status
   */
  magicAttack(attacker: Player, defender: Entity, spell: Spell): CombatResult {
    // Check if attacker has enough mana
    if (!attacker.useMana(spell.manaCost)) {
      return {
        hit: false,
        damage: 0,
        killed: false,
        message: 'Not enough mana!',
      };
    }

    // Get magic power from attacker
    const magicPower = attacker.magicPower;
    
    // Calculate magic resistance (default 0 for entities without it)
    const magicResist = this.getMagicResistance(defender);

    // Calculate damage: magicPower * spellPower * (1 - resist)
    const baseDamage = magicPower * spell.spellPower;
    const finalDamage = Math.max(1, Math.floor(baseDamage * (1 - magicResist)));

    // Apply damage
    const actualDamage = defender.takeDamage(finalDamage);
    const killed = defender.isDead();

    // Generate message
    const defenderName = defender instanceof Player ? 'you' : defender.name;
    
    let message = `You cast ${spell.name} on ${defenderName} for ${actualDamage} damage`;
    
    if (killed) {
      message += ` and killed it!`;
    }

    // Log combat message
    this.logCombatMessage(message, killed);

    return {
      hit: true,
      damage: actualDamage,
      killed,
      message,
    };
  }

  /**
   * Handle entity death and generate loot
   * Places corpse items on the map and returns loot array
   * 
   * @param entity - The entity that died
   * @param map - The game map to place loot on
   * @returns Array of items dropped as loot
   */
  handleDeath(entity: Entity, map: GameMap): Item[] {
    const loot: Item[] = [];

    // Handle player death
    if (entity instanceof Player) {
      this.messageLog.addMessage('You have died!', MessageType.DEATH);
      return loot;
    }

    // Handle monster death
    if (entity instanceof Monster) {
      const monsterName = entity.name;
      const xpReward = entity.xpReward;

      // Generate loot from monster's loot table
      const lootIds = entity.generateLoot();
      
      // Create item instances at monster position
      for (const lootId of lootIds) {
        const item = this.createLootItem(lootId, entity.x, entity.y);
        if (item) {
          loot.push(item);
          map.addItem(item, entity.x, entity.y);
        }
      }

      // Always drop a small corpse marker (can be used for corpse-based mechanics)
      const corpse = this.createCorpse(entity);
      loot.push(corpse);
      map.addItem(corpse, entity.x, entity.y);

      // Log death message
      this.messageLog.addMessage(
        `${monsterName} dies! (+${xpReward} XP)`,
        MessageType.DEATH
      );

      // Log loot if any
      if (loot.length > 1) { // More than just corpse
        this.messageLog.addMessage(
          `${monsterName} dropped ${loot.length - 1} item(s)`,
          MessageType.ITEM_DROP
        );
      }
    }

    return loot;
  }

  /**
   * Get total attack value including equipment bonuses
   */
  private getTotalAttack(entity: Entity): number {
    if (entity instanceof Player) {
      return entity.getTotalAttack();
    }
    return entity.attack;
  }

  /**
   * Get total defense value including equipment bonuses
   */
  private getTotalDefense(entity: Entity): number {
    if (entity instanceof Player) {
      return entity.getTotalDefense();
    }
    return entity.defense;
  }

  /**
   * Get magic resistance for entity (0-1 scale)
   */
  private getMagicResistance(entity: Entity): number {
    // Default magic resistance is 0 (no resistance)
    // Can be extended to check for equipment or monster-specific resistance
    return 0;
  }

  /**
   * Create a loot item instance from item ID
   */
  private createLootItem(itemId: string, x: number, y: number): Item | null {
    // This would integrate with your item data system
    // For now, create a basic item structure
    const isGold = itemId.includes('gold');
    return {
      id: itemId,
      name: this.getItemName(itemId),
      x,
      y,
      glyph: this.getItemGlyph(itemId),
      color: this.getItemColor(itemId),
      quantity: isGold ? 1 : 1,
      inventoryType: this.getInventoryType(itemId),
      rarity: 'common',
      isGold,
      goldAmount: isGold ? 1 : undefined,
    };
  }

  /**
   * Create a corpse item from dead entity
   */
  private createCorpse(entity: Entity): Item {
    return {
      id: `corpse_${entity.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${entity.name} corpse`,
      x: entity.x,
      y: entity.y,
      glyph: '%',
      color: 0x8b4513, // Brown color for corpses
      quantity: 1,
      inventoryType: 'misc',
      rarity: 'common',
    };
  }

  private getInventoryType(itemId: string): 'weapon' | 'armor' | 'potion' | 'misc' {
    if (itemId.includes('potion')) return 'potion';
    if (itemId.includes('weapon') || itemId.includes('sword') || itemId.includes('bow') || itemId.includes('staff')) {
      return 'weapon';
    }
    if (itemId.includes('armor') || itemId.includes('shield') || itemId.includes('robe') || itemId.includes('cloak')) {
      return 'armor';
    }
    return 'misc';
  }

  /**
   * Get item name from item ID
   * TODO: Integrate with item-data.ts when available
   */
  private getItemName(itemId: string): string {
    // Simple name extraction from ID
    return itemId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get item glyph from item ID
   * TODO: Integrate with item-data.ts when available
   */
  private getItemGlyph(itemId: string): string {
    // Basic glyph mapping
    if (itemId.includes('potion')) return '!';
    if (itemId.includes('weapon') || itemId.includes('sword')) return '/';
    if (itemId.includes('armor')) return '[';
    if (itemId.includes('gold')) return '$';
    if (itemId.includes('scroll')) return '?';
    return '*'; // Default item glyph
  }

  /**
   * Get item color from item ID
   * TODO: Integrate with item-data.ts when available
   */
  private getItemColor(itemId: string): number {
    // Basic color mapping
    if (itemId.includes('potion')) return 0x00ffff; // Cyan
    if (itemId.includes('weapon')) return 0xcccccc; // Silver
    if (itemId.includes('armor')) return 0x888888; // Gray
    if (itemId.includes('gold')) return 0xffd700; // Gold
    if (itemId.includes('scroll')) return 0xffffcc; // Light yellow
    return 0xffffff; // White default
  }

  /**
   * Log combat message to message log
   */
  private logCombatMessage(message: string, isKill: boolean): void {
    if (isKill) {
      this.messageLog.addMessage(message, MessageType.DEATH);
    } else {
      this.messageLog.addMessage(message, MessageType.DAMAGE);
    }
  }

  /**
   * Calculate damage with defense mitigation
   * Used as helper for other systems
   */
  calculateDamage(attack: number, defense: number): number {
    const baseDamage = Math.max(1, attack - Math.floor(defense / 2));
    const variance = Math.floor(baseDamage * 0.2);
    const damage = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
    return Math.max(1, damage);
  }
}

export default CombatSystem;
