/**
 * Floor Transition System
 * Handles floor transitions via stairs, including dungeon generation and town returns
 */

import { Entity } from '../entities/Entity';
import { Monster } from '../entities/monster';
import { GameMap, TileType, Item } from '../world/map';
import { DungeonGenerator } from '../world/dungeon-gen';
import { TownGenerator, NPCSpawnPoint } from '../world/town-gen';
import { MonsterSpawnSystem } from './monster-spawn-system';
import { ItemSpawnSystem } from './item-spawn-system';

/**
 * Represents a complete floor with all its contents
 */
export interface FloorData {
  floorNumber: number;
  map: GameMap;
  monsters: Monster[];
  items: Item[];
  npcs?: NPCSpawnPoint[];
  playerSpawnX: number;
  playerSpawnY: number;
}

/**
 * Floor type enumeration
 */
export enum FloorType {
  TOWN = 'TOWN',
  DUNGEON = 'DUNGEON',
}

/**
 * Floor Transition System
 * Manages transitions between floors via stairs
 */
export class FloorTransitionSystem {
  private dungeonGenerator: DungeonGenerator;
  private townGenerator: TownGenerator;
  private monsterSpawnSystem: MonsterSpawnSystem;
  private itemSpawnSystem: ItemSpawnSystem;
  
  // Cache for floor data (allows return to previous floors)
  private floorCache: Map<number, FloorData> = new Map();
  
  // Random seed for consistent generation
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.dungeonGenerator = new DungeonGenerator(this.seed);
    this.townGenerator = new TownGenerator();
    this.monsterSpawnSystem = new MonsterSpawnSystem(this.seed);
    this.itemSpawnSystem = new ItemSpawnSystem(this.seed);
  }

  /**
   * Handle stair interactions
   * @param player - Player entity
   * @param currentFloor - Current floor number (0 = town, 1-10 = dungeon)
   * @param map - Current game map
   * @returns New floor data if transition occurred, null otherwise
   */
  handleStairs(
    player: Entity,
    currentFloor: number,
    map: GameMap
  ): FloorData | null {
    const tile = map.getTile(player.x, player.y);
    if (!tile) return null;

    // Check if player is on stairs
    if (tile.type === TileType.STAIRS_UP) {
      return this.goUpStairs(currentFloor);
    } else if (tile.type === TileType.STAIRS_DOWN) {
      return this.goDownStairs(currentFloor);
    }

    return null;
  }

  /**
   * Ascend to the previous floor
   * @param currentFloor - Current floor number
   * @returns Floor data for the previous floor
   */
  goUpStairs(currentFloor: number): FloorData {
    if (currentFloor === 0) {
      throw new Error('Cannot go up from town (floor 0)');
    }

    if (currentFloor === 1) {
      // Return to town from dungeon floor 1
      return this.generateFloor(0);
    } else {
      // Go to previous dungeon floor
      return this.generateFloor(currentFloor - 1);
    }
  }

  /**
   * Descend to the next floor
   * @param currentFloor - Current floor number
   * @returns Floor data for the next floor
   */
  goDownStairs(currentFloor: number): FloorData {
    if (currentFloor === 10) {
      throw new Error('Cannot go down from final floor (floor 10)');
    }

    if (currentFloor === 0) {
      // Enter dungeon from town
      return this.generateFloor(1);
    } else {
      // Go to next dungeon floor
      return this.generateFloor(currentFloor + 1);
    }
  }

  /**
   * Generate a complete floor with map, monsters, items, and spawn point
   * @param floorNumber - Floor number (0 = town, 1-10 = dungeon)
   * @returns Complete floor data
   */
  generateFloor(floorNumber: number): FloorData {
    // Check cache first
    if (this.floorCache.has(floorNumber)) {
      return this.floorCache.get(floorNumber)!;
    }

    let floorData: FloorData;

    if (floorNumber === 0) {
      // Generate town
      floorData = this.generateTown();
    } else {
      // Generate dungeon floor
      floorData = this.generateDungeonFloor(floorNumber);
    }

    // Cache the floor for later return
    this.floorCache.set(floorNumber, floorData);

    return floorData;
  }

  /**
   * Generate the town (floor 0)
   * @returns Town floor data
   */
  private generateTown(): FloorData {
    const { map, npcs } = this.townGenerator.generate();

    // Find stairs down for player spawn point
    const stairsDown = this.findStairsPosition(map, TileType.STAIRS_DOWN);
    
    // Player spawns near the stairs down (or at center if not found)
    const playerSpawnX = stairsDown?.x ?? 19;
    const playerSpawnY = stairsDown ? stairsDown.y - 1 : 18;

    return {
      floorNumber: 0,
      map,
      monsters: [],
      items: [],
      npcs,
      playerSpawnX,
      playerSpawnY,
    };
  }

  /**
   * Generate a dungeon floor (1-10)
   * @param floorNumber - Floor number (1-10)
   * @returns Dungeon floor data
   */
  private generateDungeonFloor(floorNumber: number): FloorData {
    if (floorNumber < 1 || floorNumber > 10) {
      throw new Error(`Invalid dungeon floor number: ${floorNumber}. Must be 1-10.`);
    }

    // Generate map
    const map = this.dungeonGenerator.generate(floorNumber);

    // Spawn monsters
    const monsters = this.monsterSpawnSystem.spawnMonstersInDungeon(map, floorNumber);

    // Spawn items
    this.itemSpawnSystem.spawnItemsInDungeon(map, floorNumber);
    
    // Get items from map
    const items = map.items;

    // Find spawn point based on which stairs player came from
    let playerSpawnX: number;
    let playerSpawnY: number;

    // If descending (from previous floor), spawn at stairs up
    // If ascending (from next floor), spawn at stairs down
    const stairsUp = this.findStairsPosition(map, TileType.STAIRS_UP);
    const stairsDown = this.findStairsPosition(map, TileType.STAIRS_DOWN);

    // Default spawn at stairs up if available, otherwise stairs down
    if (stairsUp) {
      playerSpawnX = stairsUp.x;
      playerSpawnY = stairsUp.y;
    } else if (stairsDown) {
      playerSpawnX = stairsDown.x;
      playerSpawnY = stairsDown.y;
    } else {
      // Fallback: find any floor tile
      const floorTile = this.findFloorTile(map);
      playerSpawnX = floorTile?.x ?? Math.floor(map.width / 2);
      playerSpawnY = floorTile?.y ?? Math.floor(map.height / 2);
    }

    return {
      floorNumber,
      map,
      monsters,
      items,
      playerSpawnX,
      playerSpawnY,
    };
  }

  /**
   * Find the position of stairs on the map
   * @param map - Game map
   * @param stairType - Type of stairs to find
   * @returns Position of stairs or null if not found
   */
  private findStairsPosition(
    map: GameMap,
    stairType: TileType.STAIRS_UP | TileType.STAIRS_DOWN
  ): { x: number; y: number } | null {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (tile && tile.type === stairType) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Find any floor tile on the map (fallback spawn point)
   * @param map - Game map
   * @returns Position of a floor tile or null
   */
  private findFloorTile(map: GameMap): { x: number; y: number } | null {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (tile && tile.type === TileType.FLOOR && !tile.blocked) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Clear floor cache (useful for starting a new game)
   */
  clearCache(): void {
    this.floorCache.clear();
  }

  /**
   * Get floor type
   * @param floorNumber - Floor number
   * @returns Floor type
   */
  getFloorType(floorNumber: number): FloorType {
    return floorNumber === 0 ? FloorType.TOWN : FloorType.DUNGEON;
  }

  /**
   * Get floor name for display
   * @param floorNumber - Floor number
   * @returns Human-readable floor name
   */
  getFloorName(floorNumber: number): string {
    if (floorNumber === 0) {
      return 'Town';
    } else {
      return `Dungeon Floor ${floorNumber}`;
    }
  }

  /**
   * Check if player can use stairs at current position
   * @param player - Player entity
   * @param map - Current game map
   * @returns true if player is on stairs
   */
  canUseStairs(player: Entity, map: GameMap): boolean {
    const tile = map.getTile(player.x, player.y);
    if (!tile) return false;
    return tile.type === TileType.STAIRS_UP || tile.type === TileType.STAIRS_DOWN;
  }

  /**
   * Get stairs direction at player position
   * @param player - Player entity
   * @param map - Current game map
   * @returns 'up', 'down', or null
   */
  getStairsDirection(player: Entity, map: GameMap): 'up' | 'down' | null {
    const tile = map.getTile(player.x, player.y);
    if (!tile) return null;
    
    if (tile.type === TileType.STAIRS_UP) return 'up';
    if (tile.type === TileType.STAIRS_DOWN) return 'down';
    return null;
  }
}

/**
 * Default export
 */
export default FloorTransitionSystem;
