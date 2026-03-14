/**
 * Monster Spawn System
 * Handles depth-scaled monster spawning for dungeons
 * Spawns monsters based on floor difficulty with weighted random selection
 */

import { Monster, AIBehavior } from '../entities/monster';
import { GameMap, TileType } from '../world/map';
import {
  MonsterDefinition,
  getMonstersForFloor,
  getMonsterTemplate,
} from '../config/monster-data';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SpawnConfig {
  minMonsters: number;
  maxMonsters: number;
  validMonsterLevels: number[];
}

// ============================================================================
// MONSTER SPAWN SYSTEM
// ============================================================================

export class MonsterSpawnSystem {
  private random: SeededRandom;

  constructor(seed?: number) {
    this.random = new SeededRandom(seed);
  }

  /**
   * Main entry point: Spawn all monsters for a dungeon floor
   * @param map - The game map to spawn monsters on
   * @param floorNumber - Current floor number (1-10)
   * @returns Array of spawned Monster instances
   */
  spawnMonstersInDungeon(map: GameMap, floorNumber: number): Monster[] {
    const monsters: Monster[] = [];
    const spawnConfig = this.getSpawnConfigForFloor(floorNumber);

    // Get all valid spawn locations (floor tiles)
    const spawnLocations = this.getValidSpawnLocations(map);
    if (spawnLocations.length === 0) {
      console.warn('No valid spawn locations found');
      return monsters;
    }

    // Determine monster count for this floor
    const monsterCount = this.random.randomInt(
      spawnConfig.minMonsters,
      spawnConfig.maxMonsters
    );

    // Spawn regular monsters
    for (let i = 0; i < monsterCount && spawnLocations.length > 0; i++) {
      const template = this.selectMonsterForFloor(floorNumber);
      if (!template) continue;

      const preferredLocations = spawnLocations.filter((location) =>
        this.isNearCampfire(map, location.x, location.y, 4)
      );
      const pickNearCampfire = preferredLocations.length > 0 && this.random.chance(0.55);
      const locationPool = pickNearCampfire ? preferredLocations : spawnLocations;

      // Pick random spawn location and remove it from available locations
      const selectedLocation = locationPool[this.random.randomInt(0, locationPool.length - 1)];
      const locationIndex = spawnLocations.findIndex(
        (location) => location.x === selectedLocation.x && location.y === selectedLocation.y
      );
      const location = spawnLocations[locationIndex];
      spawnLocations.splice(locationIndex, 1);

      // Create monster from template
      const monster = this.createMonsterFromTemplate(
        template,
        location.x,
        location.y
      );
      monsters.push(monster);
      map.addEntity(monster);
    }

    // Spawn boss on floor 10
    if (floorNumber === 10) {
      const boss = this.spawnBoss(map, spawnLocations);
      if (boss) {
        monsters.push(boss);
        map.addEntity(boss);
      }
    }

    return monsters;
  }

  /**
   * Respawn non-boss monsters on an existing floor until minimum population is met.
   * Bosses are never respawned by this method.
   */
  respawnNonBossMonstersToMinimum(
    map: GameMap,
    floorNumber: number,
    existingMonsters: Monster[],
    avoidPosition?: { x: number; y: number; radius: number }
  ): Monster[] {
    const minMonsters = this.getSpawnConfigForFloor(floorNumber).minMonsters;
    const livingNonBoss = existingMonsters.filter(
      (monster) => !monster.isDead() && monster.templateId !== 'lich_king'
    );
    const needed = Math.max(0, minMonsters - livingNonBoss.length);
    if (needed === 0) {
      return [];
    }

    let spawnLocations = this.getValidSpawnLocations(map);
    if (avoidPosition) {
      const { x, y, radius } = avoidPosition;
      spawnLocations = spawnLocations.filter((location) => {
        const distance = Math.abs(location.x - x) + Math.abs(location.y - y);
        return distance > radius;
      });
    }

    const respawned: Monster[] = [];
    for (let i = 0; i < needed && spawnLocations.length > 0; i++) {
      const template = this.selectMonsterForFloor(floorNumber);
      if (!template) {
        break;
      }

      const locationIndex = this.random.randomInt(0, spawnLocations.length - 1);
      const location = spawnLocations[locationIndex];
      spawnLocations.splice(locationIndex, 1);

      const monster = this.createMonsterFromTemplate(template, location.x, location.y);
      map.addEntity(monster);
      respawned.push(monster);
    }

    return respawned;
  }

  /**
   * Select an appropriate monster for the given floor using weighted random
   * @param floorNumber - Current floor number
   * @returns Monster template or null if none available
   */
  selectMonsterForFloor(floorNumber: number): MonsterDefinition | null {
    // Get all valid monsters for this floor
    const validMonsters = getMonstersForFloor(floorNumber);
    
    // Filter out boss monsters (Lich King) from regular spawns
    const regularMonsters = validMonsters.filter(m => m.id !== 'lich_king');
    
    if (regularMonsters.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = regularMonsters.reduce(
      (sum, monster) => sum + monster.spawnWeight,
      0
    );

    // Weighted random selection
    let roll = this.random.next() * totalWeight;
    for (const monster of regularMonsters) {
      roll -= monster.spawnWeight;
      if (roll <= 0) {
        return monster;
      }
    }

    // Fallback to first monster
    return regularMonsters[0];
  }

  /**
   * Spawn the boss monster in a special location
   * @param map - The game map
   * @param availableLocations - Available spawn locations
   * @returns Spawned boss Monster or null
   */
  spawnBoss(
    map: GameMap,
    availableLocations: Array<{ x: number; y: number }>
  ): Monster | null {
    const bossTemplate = getMonsterTemplate('lich_king');
    if (!bossTemplate) {
      console.warn('Boss template (lich_king) not found');
      return null;
    }

    // Find altar tile or use a special location for boss
    let bossLocation = this.findBossSpawnLocation(map);

    // If no altar found, use a random location from available ones
    if (!bossLocation && availableLocations.length > 0) {
      const index = this.random.randomInt(0, availableLocations.length - 1);
      bossLocation = availableLocations[index];
      availableLocations.splice(index, 1);
    }

    if (!bossLocation) {
      console.warn('No valid boss spawn location found');
      return null;
    }

    return this.createMonsterFromTemplate(
      bossTemplate,
      bossLocation.x,
      bossLocation.y
    );
  }

  private isNearCampfire(map: GameMap, x: number, y: number, radius: number): boolean {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tile = map.getTile(x + dx, y + dy);
        if (tile?.type === TileType.CAMPFIRE) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Create a Monster instance from a template definition
   * @param template - Monster definition template
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Monster instance
   */
  private createMonsterFromTemplate(
    template: MonsterDefinition,
    x: number,
    y: number
  ): Monster {
    // Map AI type string to AIBehavior enum
    const behaviorMap: Record<string, AIBehavior> = {
      aggressive: AIBehavior.AGGRESSIVE,
      wanderer: AIBehavior.WANDERER,
      ambusher: AIBehavior.AMBUSHER,
      cowardly: AIBehavior.COWARDLY,
      stationary: AIBehavior.STATIONARY,
    };

    const behavior = behaviorMap[template.aiType] || AIBehavior.WANDERER;

    const monster = new Monster(
      x,
      y,
      template.name,
      template.glyph,
      template.color,
      template.baseStats.maxHp,
      template.baseStats.attack,
      template.baseStats.defense,
      template.baseStats.speed,
      behavior,
      template.baseStats.experience
    );

    // Set sight range from template
    monster.sightRange = template.sightRange;
    monster.templateId = template.id;
    monster.aiRules = template.aiRules;

    // Add loot drops from template
    for (const loot of template.lootTable) {
      monster.addLootDrop(loot.itemId, loot.dropChance);
    }

    return monster;
  }

  /**
   * Get spawn configuration based on floor depth
   * @param floorNumber - Floor number (1-10)
   * @returns Spawn configuration
   */
  private getSpawnConfigForFloor(floorNumber: number): SpawnConfig {
    if (floorNumber <= 2) {
      // Floors 1-2: Weak monsters (Rat, Skeleton)
      return {
        minMonsters: 3,
        maxMonsters: 5,
        validMonsterLevels: [1, 2],
      };
    } else if (floorNumber <= 5) {
      // Floors 3-5: Medium monsters
      return {
        minMonsters: 5,
        maxMonsters: 8,
        validMonsterLevels: [2, 3, 4],
      };
    } else if (floorNumber <= 8) {
      // Floors 6-8: Strong monsters
      return {
        minMonsters: 8,
        maxMonsters: 12,
        validMonsterLevels: [4, 5, 6, 7],
      };
    } else {
      // Floors 9-10: Elite monsters + boss
      return {
        minMonsters: 10,
        maxMonsters: 15,
        validMonsterLevels: [6, 7, 8, 9],
      };
    }
  }

  /**
   * Find all valid spawn locations (floor tiles not blocked)
   * @param map - The game map
   * @returns Array of {x, y} coordinates
   */
  private getValidSpawnLocations(
    map: GameMap
  ): Array<{ x: number; y: number }> {
    const locations: Array<{ x: number; y: number }> = [];

    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const tile = map.getTile(x, y);
        
        // Valid spawn: floor tile, not stairs, not blocked by entity
        if (
          tile &&
          tile.type === TileType.FLOOR &&
          !map.isBlocked(x, y)
        ) {
          locations.push({ x, y });
        }
      }
    }

    return locations;
  }

  /**
   * Find the boss spawn location (prefer altar tiles)
   * @param map - The game map
   * @returns Boss spawn location or null
   */
  private findBossSpawnLocation(
    map: GameMap
  ): { x: number; y: number } | null {
    // First, try to find an altar
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (tile && tile.type === TileType.ALTAR) {
          // Check if there's an adjacent floor tile to spawn on
          const adjacentFloor = this.findAdjacentFloorTile(map, x, y);
          if (adjacentFloor) {
            return adjacentFloor;
          }
        }
      }
    }

    // No altar found, return null (caller will use random location)
    return null;
  }

  /**
   * Find a floor tile adjacent to the given coordinates
   * @param map - The game map
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @returns Adjacent floor tile or null
   */
  private findAdjacentFloorTile(
    map: GameMap,
    x: number,
    y: number
  ): { x: number; y: number } | null {
    const offsets = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 },  // East
      { dx: 0, dy: 1 },  // South
      { dx: -1, dy: 0 }, // West
    ];

    for (const offset of offsets) {
      const nx = x + offset.dx;
      const ny = y + offset.dy;
      const tile = map.getTile(nx, ny);

      if (
        tile &&
        tile.type === TileType.FLOOR &&
        !map.isBlocked(nx, ny)
      ) {
        return { x: nx, y: ny };
      }
    }

    return null;
  }
}

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Seeded random number generator for reproducible monster spawns
 */
class SeededRandom {
  private seed: number;
  private state: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.state = this.seed;
  }

  /**
   * Generate next random number (0-1)
   */
  next(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Random chance (probability 0-1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MonsterSpawnSystem;
