/**
 * Game World Map and Tile Data Structures
 * Defines the tile system and map management for the roguelike dungeon
 */

import { COLORS, GLYPHS } from '../config/game-config';
import { Entity } from '../entities/Entity';

/**
 * Enum for all possible tile types in the game
 */
export enum TileType {
  WALL = 'WALL',
  FLOOR = 'FLOOR',
  DOOR_CLOSED = 'DOOR_CLOSED',
  DOOR_OPEN = 'DOOR_OPEN',
  STAIRS_UP = 'STAIRS_UP',
  STAIRS_DOWN = 'STAIRS_DOWN',
  WATER = 'WATER',
  LAVA = 'LAVA',
  GRASS = 'GRASS',
  TREE = 'TREE',
  STONE = 'STONE',
  CHEST_CLOSED = 'CHEST_CLOSED',
  CHEST_OPEN = 'CHEST_OPEN',
  FOUNTAIN = 'FOUNTAIN',
  ALTAR = 'ALTAR',
}

/**
 * Represents a single tile in the game world
 * Stores visual, physical, and visibility properties
 */
export class Tile {
  type: TileType;
  blocked: boolean;        // Blocks entity movement
  blocksSight: boolean;    // Blocks line of sight
  explored: boolean;       // Has been seen by the player
  visible: boolean;        // Currently in player's FOV

  constructor(type: TileType, blocked: boolean = false, blocksSight: boolean = false) {
    this.type = type;
    this.blocked = blocked;
    this.blocksSight = blocksSight;
    this.explored = false;
    this.visible = false;
  }

  /**
   * Check if this tile is passable (allows movement)
   */
  isPassable(): boolean {
    return !this.blocked;
  }

  /**
   * Check if this tile is transparent (doesn't block line of sight)
   */
  isTransparent(): boolean {
    return !this.blocksSight;
  }

  /**
   * Reset visibility state (called each turn before FOV calculation)
   */
  resetVisibility(): void {
    this.visible = false;
  }

  /**
   * Mark this tile as explored
   */
  explore(): void {
    this.explored = true;
  }
}

/**
 * Represents an item on the ground
 * Simple interface for items that can be placed on tiles
 */
export interface Item {
  id: string;
  name: string;
  x: number;
  y: number;
  glyph: string;
  color: number;
  quantity?: number;
  inventoryType?: 'weapon' | 'armor' | 'potion' | 'misc';
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  identified?: boolean;
  enchantmentBonus?: number;
  currentDurability?: number;
  maxDurability?: number;
  isGold?: boolean;
  goldAmount?: number;
}

export type TrapType = 'spike';

export interface Trap {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  damage: number;
  revealed: boolean;
  disarmed: boolean;
 }

/**
 * Main game map class
 * Manages the dungeon layout, entities, items, and tile state
 */
export class GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
  entities: Entity[] = [];
  items: Item[] = [];
  traps: Trap[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];

    // Initialize 2D tile array with default floor tiles
    for (let y = 0; y < height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < width; x++) {
        this.tiles[y][x] = new Tile(TileType.FLOOR);
      }
    }
  }

  /**
   * Get the tile at the specified coordinates
   * Returns null if out of bounds
   */
  getTile(x: number, y: number): Tile | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    return this.tiles[y][x];
  }

  /**
   * Set the tile type at the specified coordinates
   */
  setTile(x: number, y: number, type: TileType, blocked?: boolean, blocksSight?: boolean): void {
    if (!this.isInBounds(x, y)) {
      return;
    }

    const tile = new Tile(
      type,
      blocked !== undefined ? blocked : this.getDefaultBlocked(type),
      blocksSight !== undefined ? blocksSight : this.getDefaultBlocksSight(type)
    );

    this.tiles[y][x] = tile;
  }

  /**
   * Check if coordinates are within map bounds
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Check if a tile blocks movement
   */
  isBlocked(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return true; // Out of bounds is blocked

    // Check if tile itself is blocked
    if (tile.blocked) return true;

    // Check if there's an entity blocking the tile
    if (this.getEntityAt(x, y)) return true;

    return false;
  }

  /**
   * Check if a tile is transparent (doesn't block sight)
   */
  isTransparent(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false; // Out of bounds blocks sight

    return tile.isTransparent();
  }

  /**
   * Add an entity to the map
   */
  addEntity(entity: Entity): void {
    if (!this.entities.includes(entity)) {
      this.entities.push(entity);
    }
  }

  /**
   * Remove an entity from the map
   */
  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  /**
   * Get the entity at the specified coordinates (if any)
   */
  getEntityAt(x: number, y: number): Entity | null {
    const entity = this.entities.find(e => e.x === x && e.y === y);
    return entity || null;
  }

  /**
   * Add an item to the map at the specified coordinates
   */
  addItem(item: Item, x: number, y: number): void {
    if (this.isInBounds(x, y)) {
      item.x = x;
      item.y = y;
      this.items.push(item);
    }
  }

  /**
   * Remove an item from the map
   */
  removeItem(item: Item): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  /**
   * Get all items at the specified coordinates
   */
  getItemsAt(x: number, y: number): Item[] {
    return this.items.filter(item => item.x === x && item.y === y);
  }

  /**
   * Get all items on the map
   * Returns array of all items currently placed on the map
   */
  getAllItems(): Item[] {
    return this.items;
  }

  addTrap(trap: Trap): void {
    if (!this.isInBounds(trap.x, trap.y)) {
      return;
    }
    const existing = this.getTrapAt(trap.x, trap.y);
    if (existing) {
      return;
    }
    this.traps.push(trap);
  }

  getTrapAt(x: number, y: number): Trap | null {
    const trap = this.traps.find((entry) => entry.x === x && entry.y === y && !entry.disarmed);
    return trap || null;
  }

  revealTrapAt(x: number, y: number): boolean {
    const trap = this.getTrapAt(x, y);
    if (!trap || trap.revealed) {
      return false;
    }
    trap.revealed = true;
    return true;
  }

  disarmTrapAt(x: number, y: number): boolean {
    const trap = this.getTrapAt(x, y);
    if (!trap) {
      return false;
    }
    trap.disarmed = true;
    trap.revealed = true;
    return true;
  }

  getAdjacentTraps(x: number, y: number): Trap[] {
    return this.traps.filter((trap) => {
      if (trap.disarmed) return false;
      const dx = Math.abs(trap.x - x);
      const dy = Math.abs(trap.y - y);
      return Math.max(dx, dy) <= 1;
    });
  }

  /**
   * Reset visibility for all tiles (called before FOV calculation)
   */
  resetVisibility(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x].resetVisibility();
      }
    }
  }

  /**
   * Get the default "blocked" value for a tile type
   */
  private getDefaultBlocked(type: TileType): boolean {
    switch (type) {
      case TileType.WALL:
      case TileType.WATER:
      case TileType.LAVA:
      case TileType.STONE:
      case TileType.TREE:
      case TileType.CHEST_CLOSED:
        return true;
      default:
        return false;
    }
  }

  /**
   * Get the default "blocksSight" value for a tile type
   */
  private getDefaultBlocksSight(type: TileType): boolean {
    switch (type) {
      case TileType.WALL:
      case TileType.TREE:
      case TileType.CHEST_CLOSED:
      case TileType.STONE:
        return true;
      default:
        return false;
    }
  }
}

/**
 * Get the ASCII glyph for rendering a tile
 */
export function getGlyph(tile: Tile): string {
  const typeMap: Record<TileType, string> = {
    [TileType.WALL]: GLYPHS.WALL,
    [TileType.FLOOR]: GLYPHS.FLOOR,
    [TileType.DOOR_CLOSED]: GLYPHS.DOOR_CLOSED,
    [TileType.DOOR_OPEN]: GLYPHS.DOOR_OPEN,
    [TileType.STAIRS_UP]: GLYPHS.STAIRS_UP,
    [TileType.STAIRS_DOWN]: GLYPHS.STAIRS_DOWN,
    [TileType.WATER]: GLYPHS.WATER,
    [TileType.LAVA]: GLYPHS.LAVA,
    [TileType.GRASS]: GLYPHS.GRASS,
    [TileType.TREE]: GLYPHS.TREE,
    [TileType.STONE]: GLYPHS.STONE,
    [TileType.CHEST_CLOSED]: GLYPHS.CHEST_CLOSED,
    [TileType.CHEST_OPEN]: GLYPHS.CHEST_OPEN,
    [TileType.FOUNTAIN]: GLYPHS.FOUNTAIN,
    [TileType.ALTAR]: GLYPHS.ALTAR,
  };

  return typeMap[tile.type] || GLYPHS.FLOOR;
}

/**
 * Get the color for rendering a tile
 * Color varies based on visibility and exploration state
 */
export function getColor(tile: Tile): number {
  // If currently visible, use full brightness
  if (tile.visible) {
    return getTileBaseColor(tile.type);
  }

  // If explored but not visible, use darkened color
  if (tile.explored) {
    const baseColor = getTileBaseColor(tile.type);
    return darkenColor(baseColor, 0.5);
  }

  // Never explored - don't render
  return 0x000000;
}

/**
 * Get the base color for a tile type
 */
function getTileBaseColor(type: TileType): number {
  switch (type) {
    case TileType.WALL:
      return COLORS.WALL;
    case TileType.FLOOR:
      return COLORS.FLOOR;
    case TileType.DOOR_CLOSED:
    case TileType.DOOR_OPEN:
      return COLORS.ACCENT;
    case TileType.STAIRS_UP:
    case TileType.STAIRS_DOWN:
      return COLORS.ACCENT;
    case TileType.WATER:
      return 0x0066ff;
    case TileType.LAVA:
      return 0xff6600;
    case TileType.GRASS:
      return 0x00aa00;
    case TileType.TREE:
      return 0x006600;
    case TileType.STONE:
      return COLORS.SHADOW;
    case TileType.CHEST_CLOSED:
    case TileType.CHEST_OPEN:
      return 0xcc8800;
    case TileType.FOUNTAIN:
      return 0x00ccff;
    case TileType.ALTAR:
      return 0xff00ff;
    default:
      return COLORS.FLOOR;
  }
}

/**
 * Darken a color by multiplying each RGB component
 */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
