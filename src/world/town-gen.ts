/**
 * Town Generator for Safe Zone Hub
 * Creates a semi-fixed procedural town layout with buildings, NPCs, and safe pathways
 */

import { GameMap, TileType } from './map';
import { NPCType } from '../config/npc-data';

/**
 * Represents an NPC spawn point in the town
 */
export interface NPCSpawnPoint {
  npcId: string;
  name: string;
  type: NPCType;
  x: number;
  y: number;
  buildingName: string;
}

/**
 * Building definition for town layout
 */
interface BuildingDef {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doorPos: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * TownGenerator creates a semi-fixed safe zone town layout
 * Layout is consistent but allows for minor randomization of decorative elements
 */
export class TownGenerator {
  private readonly TOWN_WIDTH = 40;
  private readonly TOWN_HEIGHT = 40;

  // Building definitions (positioned semi-fixed)
  private buildings: BuildingDef[] = [
    // Town Square (center) - special handling
    // Elder's House (north) - Quest giver Aldric
    { name: 'Elder\'s House', x: 14, y: 2, width: 12, height: 8, doorPos: 'bottom' },
    // Blacksmith (west) - Weapon/armor shop Hilda
    { name: 'Blacksmith', x: 2, y: 14, width: 10, height: 8, doorPos: 'right' },
    // Healer's Cottage (east) - Potions & healing Maren
    { name: 'Healer\'s Cottage', x: 28, y: 14, width: 10, height: 8, doorPos: 'left' },
    // Thief's Den (southwest) - Lockpicks & hints Vex
    { name: 'Thief\'s Den', x: 2, y: 28, width: 8, height: 8, doorPos: 'top' },
    // Hermit's Hut (southeast) - Lore & side quests Zane
    { name: 'Hermit\'s Hut', x: 30, y: 28, width: 8, height: 8, doorPos: 'top' },
  ];

  // NPC data (mapped to buildings)
  private npcData: Record<string, { npcId: string; name: string; type: NPCType }> = {
    'Elder\'s House': {
      npcId: 'aldric',
      name: 'Aldric the Elder',
      type: NPCType.QUESTGIVER,
    },
    'Blacksmith': {
      npcId: 'hilda',
      name: 'Hilda the Blacksmith',
      type: NPCType.MERCHANT,
    },
    'Healer\'s Cottage': {
      npcId: 'maren',
      name: 'Maren the Healer',
      type: NPCType.HEALER,
    },
    'Thief\'s Den': {
      npcId: 'vex',
      name: 'Vex the Thief',
      type: NPCType.MERCHANT,
    },
    'Hermit\'s Hut': {
      npcId: 'zane',
      name: 'Zane the Hermit',
      type: NPCType.SAGE,
    },
  };

  /**
   * Generate the town map and return NPC spawn points
   */
  generate(): { map: GameMap; npcs: NPCSpawnPoint[] } {
    const map = new GameMap(this.TOWN_WIDTH, this.TOWN_HEIGHT);

    // Fill with grass base
    this.fillWithGrass(map);

    // Create town square (center open area)
    this.createTownSquare(map);

    // Create all buildings
    for (const building of this.buildings) {
      this.createBuilding(map, building.x, building.y, building.width, building.height, building.doorPos);
    }

    // Create dungeon entrance (south area)
    this.createDungeonEntrance(map);

    // Create connecting paths
    this.createPaths(map);

    // Add decorative elements
    this.addDecorations(map);

    // Collect NPC spawn points
    const npcs = this.createNPCSpawns();

    return { map, npcs };
  }

  /**
   * Fill the entire town with grass tiles
   */
  private fillWithGrass(map: GameMap): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        map.setTile(x, y, TileType.GRASS, false, false);
      }
    }
  }

  /**
   * Create the town square at the center
   * Open area with a fountain and decorative stone paths
   */
  private createTownSquare(map: GameMap): void {
    const cx = 19; // Center x
    const cy = 18; // Center y
    const squareSize = 6;

    // Create open floor area (stone paths)
    for (let y = cy - squareSize; y <= cy + squareSize; y++) {
      for (let x = cx - squareSize; x <= cx + squareSize; x++) {
        if (map.isInBounds(x, y)) {
          map.setTile(x, y, TileType.STONE, false, false);
        }
      }
    }

    // Place fountain at center
    map.setTile(cx, cy, TileType.FOUNTAIN, false, false);

    // Decorative stone circles around fountain
    this.createCircle(map, cx, cy, 2, TileType.STONE);
  }

  /**
   * Create a building with walls, floor, and a door
   */
  private createBuilding(
    map: GameMap,
    x: number,
    y: number,
    width: number,
    height: number,
    doorPos: 'top' | 'bottom' | 'left' | 'right'
  ): void {
    // Create walls
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = x + dx;
        const py = y + dy;

        if (!map.isInBounds(px, py)) continue;

        // Corners and edges are walls
        if (dx === 0 || dx === width - 1 || dy === 0 || dy === height - 1) {
          map.setTile(px, py, TileType.WALL, true, true);
        } else {
          // Interior is floor
          map.setTile(px, py, TileType.FLOOR, false, false);
        }
      }
    }

    // Create door opening
    this.createDoor(map, x, y, width, height, doorPos);
  }

  /**
   * Create a door opening in a building
   */
  private createDoor(
    map: GameMap,
    bx: number,
    by: number,
    width: number,
    height: number,
    doorPos: 'top' | 'bottom' | 'left' | 'right'
  ): void {
    const centerOffset = Math.floor((doorPos === 'left' || doorPos === 'right' ? height : width) / 2);

    let dx = bx;
    let dy = by;

    switch (doorPos) {
      case 'top':
        dx = bx + centerOffset;
        dy = by;
        break;
      case 'bottom':
        dx = bx + centerOffset;
        dy = by + height - 1;
        break;
      case 'left':
        dx = bx;
        dy = by + centerOffset;
        break;
      case 'right':
        dx = bx + width - 1;
        dy = by + centerOffset;
        break;
    }

    if (map.isInBounds(dx, dy)) {
      map.setTile(dx, dy, TileType.DOOR_CLOSED, false, false);
    }
  }

  /**
   * Create the dungeon entrance (stairs down)
   */
  private createDungeonEntrance(map: GameMap): void {
    const x = 19; // Center horizontally
    const y = 36; // Near bottom

    // Create a small chamber for the entrance
    const size = 3;
    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (map.isInBounds(px, py)) {
          if (dx === -size || dx === size || dy === -size || dy === size) {
            // Walls
            map.setTile(px, py, TileType.WALL, true, true);
          } else {
            // Floor
            map.setTile(px, py, TileType.FLOOR, false, false);
          }
        }
      }
    }

    // Place the stairs down at center
    map.setTile(x, y, TileType.STAIRS_DOWN, false, false);
    
    // Add a door on the north side of the chamber
    map.setTile(x, y - size, TileType.DOOR_CLOSED, false, false);
  }

  /**
   * Create stone paths connecting buildings
   */
  private createPaths(map: GameMap): void {
    // Paths to town square from each building
    const squareCenter = { x: 19, y: 18 };

    // Path from Elder's House to square
    this.createPath(map, 20, 10, 20, 12);
    this.createPath(map, 20, 12, 19, 12);

    // Path from Blacksmith to square
    this.createPath(map, 12, 18, 13, 18);

    // Path from Healer to square
    this.createPath(map, 28, 18, 26, 18);

    // Path from Thief's Den to square
    this.createPath(map, 6, 28, 6, 25);
    this.createPath(map, 6, 25, 13, 25);
    this.createPath(map, 13, 25, 13, 21);

    // Path from Hermit's Hut to square
    this.createPath(map, 34, 28, 34, 25);
    this.createPath(map, 34, 25, 26, 25);
    this.createPath(map, 26, 25, 26, 21);

    // Path to dungeon entrance
    this.createPath(map, 19, 24, 19, 33);
  }

  /**
   * Create a connecting path of stone tiles between two points
   */
  private createPath(map: GameMap, x1: number, y1: number, x2: number, y2: number): void {
    // Horizontal then vertical (L-shaped path)
    // Move horizontally first
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    // Horizontal segment
    for (let x = startX; x <= endX; x++) {
      if (map.isInBounds(x, y1)) {
        const tile = map.getTile(x, y1);
        if (tile && tile.type === TileType.GRASS) {
          map.setTile(x, y1, TileType.STONE, false, false);
        }
      }
    }

    // Vertical segment
    for (let y = startY; y <= endY; y++) {
      if (map.isInBounds(x2, y)) {
        const tile = map.getTile(x2, y);
        if (tile && tile.type === TileType.GRASS) {
          map.setTile(x2, y, TileType.STONE, false, false);
        }
      }
    }
  }

  /**
   * Create a circle of tiles (for decorative elements)
   */
  private createCircle(map: GameMap, cx: number, cy: number, radius: number, tileType: TileType): void {
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let y = cy - radius; y <= cy + radius; y++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius && map.isInBounds(x, y)) {
          const tile = map.getTile(x, y);
          // Only place if currently grass or stone
          if (tile && (tile.type === TileType.GRASS || tile.type === TileType.STONE)) {
            map.setTile(x, y, tileType, false, false);
          }
        }
      }
    }
  }

  /**
   * Add decorative elements (trees, additional details)
   */
  private addDecorations(map: GameMap): void {
    // Add some trees around the town perimeter and edges
    const treePositions = [
      { x: 1, y: 5 },
      { x: 38, y: 5 },
      { x: 1, y: 35 },
      { x: 38, y: 35 },
      { x: 10, y: 1 },
      { x: 30, y: 1 },
      { x: 5, y: 4 },
      { x: 34, y: 4 },
      { x: 3, y: 12 },
      { x: 36, y: 12 },
      { x: 3, y: 24 },
      { x: 36, y: 24 },
      { x: 6, y: 33 },
      { x: 33, y: 33 },
      { x: 12, y: 37 },
      { x: 26, y: 37 },
    ];

    for (const pos of treePositions) {
      if (map.isInBounds(pos.x, pos.y)) {
        const tile = map.getTile(pos.x, pos.y);
        if (tile && tile.type === TileType.GRASS) {
          map.setTile(pos.x, pos.y, TileType.TREE, true, true);
        }
      }
    }

    // Add decorative stones near buildings
    const stonePositions = [
      { x: 17, y: 5 }, // Near Elder's House
      { x: 22, y: 5 },
      { x: 5, y: 12 }, // Near Blacksmith
      { x: 5, y: 20 },
      { x: 35, y: 12 }, // Near Healer
      { x: 35, y: 20 },
    ];

    for (const pos of stonePositions) {
      if (map.isInBounds(pos.x, pos.y)) {
        const tile = map.getTile(pos.x, pos.y);
        if (tile && tile.type === TileType.GRASS) {
          map.setTile(pos.x, pos.y, TileType.STONE, false, false);
        }
      }
    }
  }

  /**
   * Create NPC spawn points for all buildings
   */
  private createNPCSpawns(): NPCSpawnPoint[] {
    const npcs: NPCSpawnPoint[] = [];

    for (const building of this.buildings) {
      const npcInfo = this.npcData[building.name];
      if (!npcInfo) continue;

      // Calculate interior center position
      const centerX = building.x + Math.floor(building.width / 2);
      const centerY = building.y + Math.floor(building.height / 2);

      npcs.push({
        npcId: npcInfo.npcId,
        name: npcInfo.name,
        type: npcInfo.type,
        x: centerX,
        y: centerY,
        buildingName: building.name,
      });
    }

    return npcs;
  }
}

/**
 * Helper function to generate a town
 */
export function generateTown(): { map: GameMap; npcs: NPCSpawnPoint[] } {
  const generator = new TownGenerator();
  return generator.generate();
}
