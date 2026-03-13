/**
 * Equipment System
 * Manages equipment slots, equip/unequip operations, and stat calculations
 * Integrates with Player class and Item definitions
 */

import { Player, InventoryItem, Equipment } from '../entities/player';
import { ItemType, EquipmentSlot, Weapon, Armor, ITEMS } from '../config/item-data';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum EquipSlot {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  RING = 'ring',
  AMULET = 'amulet',
}

export interface EquipmentStats {
  attack: number;
  defense: number;
  maxHP: number;
  maxMana: number;
  magicPower: number;
  speed: number;
}

export interface EquipmentSlotInfo {
  slot: EquipSlot;
  item: InventoryItem | undefined;
  allowedTypes: ItemType[];
  allowedSlots?: EquipmentSlot[];
}

// ============================================================================
// EQUIPMENT SYSTEM CLASS
// ============================================================================

export class EquipmentSystem {
  /**
   * Get all equipment slots with their configuration
   */
  public static getEquipmentSlots(): EquipmentSlotInfo[] {
    return [
      {
        slot: EquipSlot.WEAPON,
        item: undefined,
        allowedTypes: [ItemType.WEAPON],
        allowedSlots: [EquipmentSlot.MAIN_HAND],
      },
      {
        slot: EquipSlot.ARMOR,
        item: undefined,
        allowedTypes: [ItemType.ARMOR],
        allowedSlots: [
          EquipmentSlot.CHEST,
          EquipmentSlot.HEAD,
          EquipmentSlot.LEGS,
          EquipmentSlot.FEET,
          EquipmentSlot.HANDS,
          EquipmentSlot.BACK,
        ],
      },
      {
        slot: EquipSlot.RING,
        item: undefined,
        allowedTypes: [ItemType.MISCELLANEOUS],
      },
      {
        slot: EquipSlot.AMULET,
        item: undefined,
        allowedTypes: [ItemType.MISCELLANEOUS],
      },
    ];
  }

  /**
   * Check if an item can be equipped by the player
   * @param player - The player attempting to equip the item
   * @param item - The item to check
   * @returns true if the item can be equipped
   */
  public static canEquip(player: Player, item: InventoryItem): boolean {
    // Check if item exists
    if (!item) return false;

    // Get the full item definition
    const itemDef = ITEMS.find((i) => i.id === item.id);
    if (!itemDef) return false;

    // Check item type
    switch (item.type) {
      case 'weapon':
        return true;
      case 'armor':
        return true;
      case 'misc':
        // For misc items, check if they're equippable accessories
        // (rings, amulets, shields, etc.)
        return item.id.includes('ring') || item.id.includes('amulet') || item.id.includes('shield');
      default:
        return false;
    }
  }

  /**
   * Determine which slot an item should be equipped to
   * @param item - The item to check
   * @returns The equipment slot or null if not equippable
   */
  public static getItemSlot(item: InventoryItem): keyof Equipment | null {
    const itemDef = ITEMS.find((i) => i.id === item.id);
    if (!itemDef) return null;

    switch (item.type) {
      case 'weapon':
        return 'weapon';
      case 'armor':
        // Check if it's a shield
        if (itemDef.type === ItemType.ARMOR) {
          const armorDef = itemDef as Armor;
          if (armorDef.slot === EquipmentSlot.OFF_HAND) {
            return 'shield';
          }
        }
        return 'armor';
      case 'misc':
        // Determine accessory type
        if (item.id.includes('shield')) return 'shield';
        if (item.id.includes('ring') || item.id.includes('amulet')) return 'accessory';
        return 'accessory';
      default:
        return null;
    }
  }

  /**
   * Equip an item to the appropriate slot
   * Handles unequipping previous item if slot is occupied
   * @param player - The player equipping the item
   * @param item - The item to equip
   * @returns true if item was successfully equipped
   */
  public static equipItem(player: Player, item: InventoryItem): boolean {
    // Validate item can be equipped
    if (!this.canEquip(player, item)) {
      return false;
    }

    // Find item in inventory
    const invItem = player.getItem(item.id);
    if (!invItem) {
      return false;
    }

    // Determine which slot to equip to
    const slot = this.getItemSlot(item);
    if (!slot) {
      return false;
    }

    // Unequip current item in that slot if one exists
    const previousItem = player.equipment[slot];
    // Remove selected item from inventory first to free one slot.
    if (!player.removeItem(item.id)) {
      return false;
    }

    if (previousItem && !player.addItem(previousItem)) {
      // Roll back if we cannot store the previously equipped item.
      player.addItem(item);
      return false;
    }

    // Equip the new item
    player.equipment[slot] = item;

    return true;
  }

  /**
   * Unequip an item from a specific slot
   * @param player - The player unequipping the item
   * @param slot - The equipment slot to unequip from
   * @returns The unequipped item or null if slot was empty
   */
  public static unequipItem(
    player: Player,
    slot: keyof Equipment
  ): InventoryItem | null {
    const item = player.equipment[slot];
    if (!item) {
      return null;
    }

    if (!player.canAddItem(item)) {
      return null;
    }

    // Remove from equipment
    player.equipment[slot] = undefined;

    // Add back to inventory
    if (!player.addItem(item)) {
      player.equipment[slot] = item;
      return null;
    }

    return item;
  }

  /**
   * Calculate total stat bonuses from all equipped items
   * @param player - The player whose equipment to calculate
   * @returns Object containing all stat bonuses
   */
  public static getEquippedStats(player: Player): EquipmentStats {
    const stats: EquipmentStats = {
      attack: 0,
      defense: 0,
      maxHP: 0,
      maxMana: 0,
      magicPower: 0,
      speed: 0,
    };

    // Iterate through all equipment slots
    const equipmentSlots: (keyof Equipment)[] = ['weapon', 'armor', 'shield', 'accessory'];
    
    for (const slot of equipmentSlots) {
      const item = player.equipment[slot];
      if (!item) continue;

      // Get full item definition
      const itemDef = ITEMS.find((i) => i.id === item.id);
      if (!itemDef) continue;

      // Add stats based on item type
      if (itemDef.type === ItemType.WEAPON) {
        const weaponDef = itemDef as Weapon;
        stats.attack += weaponDef.damage;
        stats.attack += weaponDef.attackBonus;
      } else if (itemDef.type === ItemType.ARMOR) {
        const armorDef = itemDef as Armor;
        stats.defense += armorDef.defense;
        stats.defense += armorDef.armorClass;
      }
    }

    return stats;
  }

  /**
   * Get the total attack bonus from equipped items
   * @param player - The player
   * @returns Total attack bonus
   */
  public static getAttackBonus(player: Player): number {
    const weapon = player.equipment.weapon;
    if (!weapon) return 0;

    const weaponDef = ITEMS.find((i) => i.id === weapon.id) as Weapon;
    if (!weaponDef || weaponDef.type !== ItemType.WEAPON) return 0;

    return weaponDef.damage + weaponDef.attackBonus;
  }

  /**
   * Get the total defense bonus from equipped items
   * @param player - The player
   * @returns Total defense bonus
   */
  public static getDefenseBonus(player: Player): number {
    let defense = 0;

    // Check armor
    const armor = player.equipment.armor;
    if (armor) {
      const armorDef = ITEMS.find((i) => i.id === armor.id) as Armor;
      if (armorDef && armorDef.type === ItemType.ARMOR) {
        defense += armorDef.defense + armorDef.armorClass;
      }
    }

    // Check shield
    const shield = player.equipment.shield;
    if (shield) {
      const shieldDef = ITEMS.find((i) => i.id === shield.id) as Armor;
      if (shieldDef && shieldDef.type === ItemType.ARMOR) {
        defense += shieldDef.defense + shieldDef.armorClass;
      }
    }

    return defense;
  }

  /**
   * Get equipped weapon range (for attack distance calculation)
   * @param player - The player
   * @returns Weapon range (1 for melee, higher for ranged)
   */
  public static getWeaponRange(player: Player): number {
    const weapon = player.equipment.weapon;
    if (!weapon) return 1; // Unarmed has range 1

    const weaponDef = ITEMS.find((i) => i.id === weapon.id) as Weapon;
    if (!weaponDef || weaponDef.type !== ItemType.WEAPON) return 1;

    return weaponDef.range;
  }

  /**
   * Get a summary of equipped items
   * @param player - The player
   * @returns String summary of equipment
   */
  public static getEquipmentSummary(player: Player): string {
    const parts: string[] = [];

    if (player.equipment.weapon) {
      parts.push(`Weapon: ${player.equipment.weapon.name}`);
    }
    if (player.equipment.armor) {
      parts.push(`Armor: ${player.equipment.armor.name}`);
    }
    if (player.equipment.shield) {
      parts.push(`Shield: ${player.equipment.shield.name}`);
    }
    if (player.equipment.accessory) {
      parts.push(`Accessory: ${player.equipment.accessory.name}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No equipment';
  }

  /**
   * Check if a specific slot is empty
   * @param player - The player
   * @param slot - The slot to check
   * @returns true if the slot is empty
   */
  public static isSlotEmpty(player: Player, slot: keyof Equipment): boolean {
    return player.equipment[slot] === undefined;
  }

  /**
   * Get all equipped items as an array
   * @param player - The player
   * @returns Array of equipped items
   */
  public static getAllEquippedItems(player: Player): InventoryItem[] {
    const items: InventoryItem[] = [];
    
    const slots: (keyof Equipment)[] = ['weapon', 'armor', 'shield', 'accessory'];
    for (const slot of slots) {
      const item = player.equipment[slot];
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Unequip all items
   * @param player - The player
   * @returns Array of unequipped items
   */
  public static unequipAll(player: Player): InventoryItem[] {
    const unequipped: InventoryItem[] = [];
    
    const slots: (keyof Equipment)[] = ['weapon', 'armor', 'shield', 'accessory'];
    for (const slot of slots) {
      const item = this.unequipItem(player, slot);
      if (item) {
        unequipped.push(item);
      }
    }

    return unequipped;
  }
}

export default EquipmentSystem;
