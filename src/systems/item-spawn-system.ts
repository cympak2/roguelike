/**
 * Item Spawning and Placement System
 * Handles placement of items in dungeons, loot generation, and floor-appropriate item selection
 */

import { GameMap, Item } from '../world/map';
import { ITEMS, ItemDefinition, ItemType, ItemRarity } from '../config/item-data';
import { MonsterDefinition } from '../config/monster-data';

/**
 * Configuration for item spawn rates based on floor depth
 */
interface FloorSpawnConfig {
  itemsPerRoom: { min: number; max: number };
  goldPilesPerFloor: number;
  goldAmountRange: { min: number; max: number };
  rarityWeights: {
    [ItemRarity.COMMON]: number;
    [ItemRarity.UNCOMMON]: number;
    [ItemRarity.RARE]: number;
    [ItemRarity.EPIC]: number;
    [ItemRarity.LEGENDARY]: number;
  };
}

/**
 * Item Spawn System
 * Manages item placement in dungeons and loot generation
 */
export class ItemSpawnSystem {
  private random: SeededRandom;

  constructor(seed?: number) {
    this.random = new SeededRandom(seed);
  }

  /**
   * Place items randomly throughout the dungeon
   * @param map - The game map to spawn items on
   * @param floorNumber - Current floor number (affects item quality and quantity)
   */
  spawnItemsInDungeon(map: GameMap, floorNumber: number): void {
    const config = this.getSpawnConfigForFloor(floorNumber);
    const rooms = this.findRooms(map);

    // Spawn items in each room
    for (const room of rooms) {
      const itemCount = this.random.randomInt(
        config.itemsPerRoom.min,
        config.itemsPerRoom.max + 1
      );

      for (let i = 0; i < itemCount; i++) {
        const item = this.getItemForFloor(floorNumber);
        const position = this.findRandomEmptyTileInRoom(map, room);

        if (position && item) {
          const spawnedItem = this.createItemInstance(item, position.x, position.y);
          map.addItem(spawnedItem, position.x, position.y);
        }
      }
    }

    // Scatter gold throughout the dungeon
    this.scatterGold(map, config);

    // Place special items in treasure rooms (if any)
    this.placeSpecialItems(map, rooms, floorNumber);
  }

  /**
   * Generate loot drops from a defeated monster
   * @param monster - Monster definition
   * @returns Array of items dropped by the monster
   */
  generateLoot(monster: MonsterDefinition): Item[] {
    const loot: Item[] = [];

    // Roll for each item in the monster's loot table
    for (const lootEntry of monster.lootTable) {
      if (this.random.chance(lootEntry.dropChance)) {
        const itemDef = this.getItemById(lootEntry.itemId);
        
        if (itemDef) {
          // For gold, use a special instance with stacking
          if (lootEntry.itemId === 'misc_gold') {
            const goldAmount = this.getMonsterGoldDrop(monster);
            const goldItem = this.createGoldInstance(goldAmount, 0, 0);
            loot.push(goldItem);
          } else {
            const item = this.createItemInstance(itemDef, 0, 0);
            loot.push(item);
          }
        }
      }
    }

    // Guaranteed gold drop (scaled by monster level)
    if (!loot.some(item => item.id.includes('gold'))) {
      const goldAmount = this.getMonsterGoldDrop(monster);
      if (goldAmount > 0) {
        const goldItem = this.createGoldInstance(goldAmount, 0, 0);
        loot.push(goldItem);
      }
    }

    return loot;
  }

  /**
   * Generate weighted loot for a treasure chest on a floor.
   */
  generateChestLoot(floorNumber: number, x: number, y: number): Item[] {
    const loot: Item[] = [];
    const itemCount = this.random.randomInt(1, 4); // 1-3 items

    for (let i = 0; i < itemCount; i++) {
      const itemDef = this.getItemForFloor(Math.max(floorNumber + 1, floorNumber));
      if (!itemDef) {
        continue;
      }
      const item = this.createItemInstance(itemDef, x, y);
      loot.push(item);
    }

    const bonusGold = this.createGoldInstance(this.random.randomInt(8 + floorNumber * 2, 20 + floorNumber * 4), x, y);
    loot.push(bonusGold);
    return loot;
  }

  /**
   * Get a random item appropriate for the current floor
   * @param floorNumber - Current floor number
   * @returns Random item definition appropriate for this floor
   */
  getItemForFloor(floorNumber: number): ItemDefinition | null {
    const config = this.getSpawnConfigForFloor(floorNumber);
    const rarity = this.selectRarityByWeight(config.rarityWeights);
    
    // Filter items by rarity and type appropriateness
    const availableItems = ITEMS.filter(item => {
      // Match rarity
      if (item.rarity !== rarity) return false;
      
      // Don't spawn gold directly (it's handled separately)
      if (item.id === 'misc_gold') return false;
      
      // Scale item quality based on floor
      return this.isItemAppropriateForFloor(item, floorNumber);
    });

    if (availableItems.length === 0) {
      // Fallback to any common item if no appropriate items found
      return ITEMS.find(item => item.rarity === ItemRarity.COMMON) || null;
    }

    return this.random.choice(availableItems);
  }

  /**
   * Get spawn configuration based on floor depth
   */
  private getSpawnConfigForFloor(floorNumber: number): FloorSpawnConfig {
    // Early floors (1-3): Few items, mostly common
    if (floorNumber <= 3) {
      return {
        itemsPerRoom: { min: 0, max: 1 },
        goldPilesPerFloor: 3,
        goldAmountRange: { min: 5, max: 15 },
        rarityWeights: {
          [ItemRarity.COMMON]: 70,
          [ItemRarity.UNCOMMON]: 25,
          [ItemRarity.RARE]: 5,
          [ItemRarity.EPIC]: 0,
          [ItemRarity.LEGENDARY]: 0,
        },
      };
    }
    
    // Mid floors (4-6): More items, uncommon becomes common
    if (floorNumber <= 6) {
      return {
        itemsPerRoom: { min: 0, max: 2 },
        goldPilesPerFloor: 5,
        goldAmountRange: { min: 10, max: 30 },
        rarityWeights: {
          [ItemRarity.COMMON]: 50,
          [ItemRarity.UNCOMMON]: 35,
          [ItemRarity.RARE]: 13,
          [ItemRarity.EPIC]: 2,
          [ItemRarity.LEGENDARY]: 0,
        },
      };
    }
    
    // Deep floors (7-9): Many items, rare items more common
    if (floorNumber <= 9) {
      return {
        itemsPerRoom: { min: 1, max: 2 },
        goldPilesPerFloor: 7,
        goldAmountRange: { min: 20, max: 50 },
        rarityWeights: {
          [ItemRarity.COMMON]: 30,
          [ItemRarity.UNCOMMON]: 40,
          [ItemRarity.RARE]: 20,
          [ItemRarity.EPIC]: 8,
          [ItemRarity.LEGENDARY]: 2,
        },
      };
    }
    
    // Boss floor (10): Best loot
    return {
      itemsPerRoom: { min: 1, max: 3 },
      goldPilesPerFloor: 10,
      goldAmountRange: { min: 50, max: 100 },
      rarityWeights: {
        [ItemRarity.COMMON]: 10,
        [ItemRarity.UNCOMMON]: 30,
        [ItemRarity.RARE]: 35,
        [ItemRarity.EPIC]: 20,
        [ItemRarity.LEGENDARY]: 5,
      },
    };
  }

  /**
   * Calculate gold drop amount from a defeated monster
   */
  private getMonsterGoldDrop(monster: MonsterDefinition): number {
    const baseGold = monster.level * 5;
    const variance = Math.floor(baseGold * 0.5);
    return this.random.randomInt(
      Math.max(1, baseGold - variance),
      baseGold + variance + 1
    );
  }

  /**
   * Scatter gold piles throughout the dungeon
   */
  private scatterGold(map: GameMap, config: FloorSpawnConfig): void {
    const rooms = this.findRooms(map);
    
    for (let i = 0; i < config.goldPilesPerFloor; i++) {
      const room = this.random.choice(rooms);
      if (!room) continue;
      
      const position = this.findRandomEmptyTileInRoom(map, room);
      if (!position) continue;
      
      const goldAmount = this.random.randomInt(
        config.goldAmountRange.min,
        config.goldAmountRange.max + 1
      );
      
      const goldItem = this.createGoldInstance(goldAmount, position.x, position.y);
      map.addItem(goldItem, position.x, position.y);
    }
  }

  /**
   * Place special high-value items in specific rooms
   */
  private placeSpecialItems(
    map: GameMap,
    rooms: Array<{ x: number; y: number; width: number; height: number }>,
    floorNumber: number
  ): void {
    // Only place special items on deeper floors
    if (floorNumber < 5) return;
    
    // Find largest room (likely a treasure room or boss room)
    const largestRoom = rooms.reduce((largest, room) => {
      const area = room.width * room.height;
      const largestArea = largest.width * largest.height;
      return area > largestArea ? room : largest;
    }, rooms[0]);
    
    if (!largestRoom) return;
    
    // Place a guaranteed rare+ item in the largest room
    const specialRarity = floorNumber >= 8 ? ItemRarity.EPIC : ItemRarity.RARE;
    const specialItems = ITEMS.filter(
      item => (item.rarity === specialRarity || item.rarity === ItemRarity.LEGENDARY) 
        && item.id !== 'misc_gold'
    );
    
    if (specialItems.length > 0) {
      const specialItem = this.random.choice(specialItems);
      if (specialItem) {
        const position = this.findRandomEmptyTileInRoom(map, largestRoom);
        if (position) {
          const item = this.createItemInstance(specialItem, position.x, position.y);
          map.addItem(item, position.x, position.y);
        }
      }
    }
  }

  /**
   * Find all rooms in the map by detecting floor tile clusters
   */
  private findRooms(map: GameMap): Array<{ x: number; y: number; width: number; height: number }> {
    const rooms: Array<{ x: number; y: number; width: number; height: number }> = [];
    const visited = new Set<string>();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const tile = map.getTile(x, y);
        if (!tile || tile.blocked) continue;

        // Found a floor tile, try to find the room bounds
        const room = this.findRoomBounds(map, x, y, visited);
        if (room && room.width >= 3 && room.height >= 3) {
          rooms.push(room);
        }
      }
    }

    return rooms;
  }

  /**
   * Find the bounds of a room starting from a floor tile
   */
  private findRoomBounds(
    map: GameMap,
    startX: number,
    startY: number,
    visited: Set<string>
  ): { x: number; y: number; width: number; height: number } | null {
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const roomTiles = new Set<string>();

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const key = `${pos.x},${pos.y}`;

      if (roomTiles.has(key) || visited.has(key)) continue;
      
      const tile = map.getTile(pos.x, pos.y);
      if (!tile || tile.blocked) continue;

      roomTiles.add(key);
      visited.add(key);

      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);

      // Add adjacent tiles
      stack.push({ x: pos.x + 1, y: pos.y });
      stack.push({ x: pos.x - 1, y: pos.y });
      stack.push({ x: pos.x, y: pos.y + 1 });
      stack.push({ x: pos.x, y: pos.y - 1 });
    }

    if (roomTiles.size < 9) return null; // Too small to be a room

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Find a random empty tile within a room
   */
  private findRandomEmptyTileInRoom(
    map: GameMap,
    room: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number } | null {
    const attempts = 20;

    for (let i = 0; i < attempts; i++) {
      const x = this.random.randomInt(room.x + 1, room.x + room.width - 1);
      const y = this.random.randomInt(room.y + 1, room.y + room.height - 1);

      const tile = map.getTile(x, y);
      if (!tile || tile.blocked) continue;

      // Check if position is already occupied by an item or entity
      if (map.getItemsAt(x, y).length > 0) continue;
      if (map.getEntityAt(x, y)) continue;

      return { x, y };
    }

    return null;
  }

  /**
   * Select a rarity based on weighted probabilities
   */
  private selectRarityByWeight(weights: Record<ItemRarity, number>): ItemRarity {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = this.random.randomFloat() * totalWeight;

    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return rarity as ItemRarity;
      }
    }

    return ItemRarity.COMMON;
  }

  /**
   * Check if an item is appropriate for the current floor
   */
  private isItemAppropriateForFloor(item: ItemDefinition, floorNumber: number): boolean {
    // Basic items always available
    if (item.rarity === ItemRarity.COMMON) return true;
    
    // Uncommon items from floor 2+
    if (item.rarity === ItemRarity.UNCOMMON && floorNumber >= 2) return true;
    
    // Rare items from floor 4+
    if (item.rarity === ItemRarity.RARE && floorNumber >= 4) return true;
    
    // Epic items from floor 7+
    if (item.rarity === ItemRarity.EPIC && floorNumber >= 7) return true;
    
    // Legendary items from floor 9+
    if (item.rarity === ItemRarity.LEGENDARY && floorNumber >= 9) return true;
    
    return false;
  }

  /**
   * Get an item definition by ID
   */
  private getItemById(id: string): ItemDefinition | null {
    // Handle special item IDs from monster loot tables
    // Map them to actual item IDs from item-data.ts
    const itemIdMap: Record<string, string> = {
      'gold_coin': 'misc_gold',
      'rat_tail': 'misc_ration', // Placeholder
      'bone_fragment': 'misc_ration', // Placeholder
      'worn_dagger': 'weapon_dagger',
      'small_potion': 'potion_health',
      'stolen_ring': 'misc_ration', // Placeholder
      'iron_sword': 'weapon_short_sword',
      'leather_armor': 'armor_leather',
      'spell_scroll': 'scroll_identify',
      'enchanted_robe': 'armor_robe',
      'mana_crystal': 'potion_mana',
      'spider_silk': 'misc_ration', // Placeholder
      'poison_fang': 'misc_ration', // Placeholder
      'antidote': 'potion_cure_poison',
      'troll_hide': 'misc_ration', // Placeholder
      'great_club': 'weapon_battle_axe',
      'regeneration_potion': 'potion_health',
      'soul_fragment': 'misc_ration', // Placeholder
      'ghostly_amulet': 'armor_cloak',
      'xp_crystal': 'misc_ration', // Placeholder
      'dragon_scale': 'armor_plate',
      'dragon_fang': 'weapon_spear',
      'dragonscale_armor': 'armor_plate',
      'legendary_sword': 'weapon_long_sword',
      'lich_crown': 'armor_robe',
      'phylactery_shard': 'scroll_enchant_weapon',
      'spellbook_of_power': 'scroll_enchant_armor',
      'robe_of_the_lich': 'armor_robe',
      'staff_of_undeath': 'weapon_staff',
    };

    const mappedId = itemIdMap[id] || id;
    return ITEMS.find(item => item.id === mappedId) || null;
  }

  /**
   * Create an item instance from a definition
   */
  private createItemInstance(itemDef: ItemDefinition, x: number, y: number): Item {
    // Convert hex color string to number
    const colorNum = parseInt(itemDef.color.replace('#', ''), 16);

    const inventoryTypeMap: Record<ItemType, 'weapon' | 'armor' | 'potion' | 'misc'> = {
      [ItemType.WEAPON]: 'weapon',
      [ItemType.ARMOR]: 'armor',
      [ItemType.POTION]: 'potion',
      [ItemType.SCROLL]: 'misc',
      [ItemType.MISCELLANEOUS]: 'misc',
    };
    
    return {
      id: itemDef.id,
      name: itemDef.name,
      x,
      y,
      glyph: itemDef.glyph,
      color: colorNum,
      quantity: 1,
      inventoryType: inventoryTypeMap[itemDef.type],
      rarity: itemDef.rarity,
      isGold: itemDef.id === 'misc_gold',
      goldAmount: itemDef.id === 'misc_gold' ? 1 : undefined,
    };
  }

  /**
   * Create a gold item instance with a specific amount
   */
  private createGoldInstance(amount: number, x: number, y: number): Item {
    const goldDef = ITEMS.find(item => item.id === 'misc_gold');
    if (!goldDef) {
      // Fallback gold item
      return {
        id: 'misc_gold',
        name: `${amount} Gold`,
        x,
        y,
        glyph: '$',
        color: 0xffd700,
        quantity: amount,
        inventoryType: 'misc',
        rarity: 'common',
        isGold: true,
        goldAmount: amount,
      };
    }

    const colorNum = parseInt(goldDef.color.replace('#', ''), 16);
    return {
      id: goldDef.id,
      name: `${amount} Gold`,
      x,
      y,
      glyph: goldDef.glyph,
      color: colorNum,
      quantity: amount,
      inventoryType: 'misc',
      rarity: 'common',
      isGold: true,
      goldAmount: amount,
    };
  }
}

/**
 * Simple seeded random number generator
 * Uses a Linear Congruential Generator (LCG) algorithm
 */
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
  }

  /**
   * Get next random float between 0 and 1
   */
  randomFloat(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Get random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.randomFloat() * (max - min)) + min;
  }

  /**
   * Get random chance (0-1 probability)
   */
  chance(probability: number): boolean {
    return this.randomFloat() < probability;
  }

  /**
   * Choose a random element from an array
   */
  choice<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[this.randomInt(0, array.length)];
  }
}

/**
 * Default export
 */
export default ItemSpawnSystem;
