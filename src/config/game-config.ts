/**
 * Core Game Configuration
 * Defines constants, dimensions, colors, and glyphs for the roguelike game
 */

// ============================================================================
// CANVAS & GRID DIMENSIONS
// ============================================================================

/** Pixel width/height of each grid tile */
export const TILE_SIZE = 12;

/** Width of the game grid in tiles */
export const GRID_WIDTH = 80;

/** Height of the game grid in tiles */
export const GRID_HEIGHT = 40;

/** Canvas width in pixels */
export const GAME_WIDTH = GRID_WIDTH * TILE_SIZE;

/** Canvas height in pixels */
export const GAME_HEIGHT = GRID_HEIGHT * TILE_SIZE;

// ============================================================================
// GAMEPLAY CONSTANTS
// ============================================================================

/** Field of view radius in tiles for dungeons */
export const FOV_RADIUS = 8;

/** Field of view radius for town (larger for better visibility) */
export const FOV_RADIUS_TOWN = 20;

/** Field of view radius for dungeons */
export const FOV_RADIUS_DUNGEON = 8;

/** Maximum dungeons level depth */
export const MAX_DUNGEON_LEVEL = 10;

/** Base turn delay in milliseconds (for turn-based timing) */
export const TURN_DELAY = 100;

// ============================================================================
// COLOR PALETTE
// ============================================================================

export interface ColorPalette {
  FLOOR: number;
  WALL: number;
  PLAYER: number;
  MONSTER: number;
  NPC: number;
  ITEM: number;
  GOLD: number;
  HEALTH: number;
  MANA: number;
  TEXT: number;
  UI_BG: number;
  DARK: number;
  SHADOW: number;
  ACCENT: number;
}

export const COLORS: ColorPalette = {
  FLOOR: 0x666666,      // Dark gray
  WALL: 0x333333,       // Very dark gray
  PLAYER: 0xffffff,     // White
  MONSTER: 0xff6666,    // Light red
  NPC: 0x66ff66,        // Light green
  ITEM: 0xffff66,       // Yellow
  GOLD: 0xffd700,       // Gold
  HEALTH: 0xff0000,     // Red
  MANA: 0x0066ff,       // Blue
  TEXT: 0xcccccc,       // Light gray
  UI_BG: 0x1a1a1a,      // Almost black
  DARK: 0x0d0d0d,       // Darker background
  SHADOW: 0x444444,     // Medium gray
  ACCENT: 0x00ffff,     // Cyan
};

// ============================================================================
// GLYPH MAPPING (ASCII CHARACTERS FOR TEXT-BASED RENDERING)
// ============================================================================

export interface GlyphMap {
  PLAYER: string;
  FLOOR: string;
  WALL: string;
  DOOR_CLOSED: string;
  DOOR_OPEN: string;
  STAIRS_DOWN: string;
  STAIRS_UP: string;
  WATER: string;
  LAVA: string;
  TREE: string;
  GRASS: string;
  STONE: string;
  CHEST_CLOSED: string;
  CHEST_OPEN: string;
  FOUNTAIN: string;
  ALTAR: string;
  SKELETON: string;
  ZOMBIE: string;
  ORC: string;
  GOBLIN: string;
  DRAGON: string;
  POTION: string;
  SCROLL: string;
  WEAPON: string;
  ARMOR: string;
  RING: string;
  AMULET: string;
  FOOD: string;
}

export const GLYPHS: GlyphMap = {
  PLAYER: '@',           // Player character
  FLOOR: '.',            // Floor/ground
  WALL: '#',             // Wall
  DOOR_CLOSED: '+',      // Closed door
  DOOR_OPEN: '/',        // Open door
  STAIRS_DOWN: '>',      // Down stairs
  STAIRS_UP: '<',        // Up stairs
  WATER: '~',            // Water
  LAVA: '§',             // Lava
  TREE: 'T',             // Tree
  GRASS: '"',            // Grass
  STONE: '*',            // Stone/boulder
  CHEST_CLOSED: 'Ç',     // Closed chest
  CHEST_OPEN: 'ç',       // Open chest
  FOUNTAIN: 'Ì',         // Fountain
  ALTAR: '⬟',            // Altar
  SKELETON: 's',         // Skeleton
  ZOMBIE: 'z',           // Zombie
  ORC: 'o',              // Orc
  GOBLIN: 'g',           // Goblin
  DRAGON: 'D',           // Dragon
  POTION: '!',           // Potion
  SCROLL: '?',           // Scroll
  WEAPON: '/',           // Weapon
  ARMOR: '[',            // Armor
  RING: '=',             // Ring
  AMULET: '"',           // Amulet
  FOOD: '%',             // Food
};

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  /** Width of the sidebar UI panel in pixels */
  SIDEBAR_WIDTH: 200,

  /** Height of the bottom status bar in pixels */
  STATUS_BAR_HEIGHT: 40,

  /** Padding around UI elements in pixels */
  UI_PADDING: 8,

  /** Font family for UI text */
  FONT_FAMILY: 'Courier New, monospace',

  /** Font size for main text */
  FONT_SIZE: 12,

  /** Font size for large headers */
  FONT_SIZE_LARGE: 16,

  /** Font size for small text */
  FONT_SIZE_SMALL: 10,
};

// ============================================================================
// MESSAGE LOG CONFIGURATION
// ============================================================================

export const MESSAGE_LOG_CONFIG = {
  /** Maximum number of messages to keep in the log */
  MAX_MESSAGES: 100,

  /** Maximum number of lines to display in the UI */
  DISPLAY_LINES: 5,

  /** Message display duration in milliseconds (0 = permanent) */
  MESSAGE_LIFETIME: 0,
};

// ============================================================================
// EXPORT ALL CONFIGURATIONS AS A SINGLE OBJECT
// ============================================================================

export const GAME_CONFIG = {
  TILE_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  FOV_RADIUS,
  MAX_DUNGEON_LEVEL,
  TURN_DELAY,
  COLORS,
  GLYPHS,
  UI_CONFIG,
  MESSAGE_LOG_CONFIG,
};

export default GAME_CONFIG;
