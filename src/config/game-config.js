/**
 * Core Game Configuration
 * Defines constants, dimensions, colors, and glyphs for the roguelike game
 */
// ============================================================================
// CANVAS & GRID DIMENSIONS
// ============================================================================
/** Pixel width/height of each grid tile */
export var TILE_SIZE = 12;
/** Width of the game grid in tiles */
export var GRID_WIDTH = 80;
/** Height of the game grid in tiles */
export var GRID_HEIGHT = 40;
/** Canvas width in pixels */
export var GAME_WIDTH = GRID_WIDTH * TILE_SIZE;
/** Canvas height in pixels */
export var GAME_HEIGHT = GRID_HEIGHT * TILE_SIZE;
// ============================================================================
// GAMEPLAY CONSTANTS
// ============================================================================
/** Field of view radius in tiles */
export var FOV_RADIUS = 8;
/** Maximum dungeons level depth */
export var MAX_DUNGEON_LEVEL = 10;
/** Base turn delay in milliseconds (for turn-based timing) */
export var TURN_DELAY = 100;
export var COLORS = {
    FLOOR: 0x666666, // Dark gray
    WALL: 0x333333, // Very dark gray
    PLAYER: 0xffffff, // White
    MONSTER: 0xff6666, // Light red
    NPC: 0x66ff66, // Light green
    ITEM: 0xffff66, // Yellow
    GOLD: 0xffd700, // Gold
    HEALTH: 0xff0000, // Red
    MANA: 0x0066ff, // Blue
    TEXT: 0xcccccc, // Light gray
    UI_BG: 0x1a1a1a, // Almost black
    DARK: 0x0d0d0d, // Darker background
    SHADOW: 0x444444, // Medium gray
    ACCENT: 0x00ffff, // Cyan
};
export var GLYPHS = {
    PLAYER: '@', // Player character
    FLOOR: '.', // Floor/ground
    WALL: '#', // Wall
    DOOR_CLOSED: '+', // Closed door
    DOOR_OPEN: '/', // Open door
    STAIRS_DOWN: '>', // Down stairs
    STAIRS_UP: '<', // Up stairs
    WATER: '~', // Water
    LAVA: '§', // Lava
    TREE: 'T', // Tree
    GRASS: '"', // Grass
    STONE: '*', // Stone/boulder
    CHEST_CLOSED: 'Ç', // Closed chest
    CHEST_OPEN: 'ç', // Open chest
    FOUNTAIN: 'Ì', // Fountain
    ALTAR: '⬟', // Altar
    SKELETON: 's', // Skeleton
    ZOMBIE: 'z', // Zombie
    ORC: 'o', // Orc
    GOBLIN: 'g', // Goblin
    DRAGON: 'D', // Dragon
    POTION: '!', // Potion
    SCROLL: '?', // Scroll
    WEAPON: '/', // Weapon
    ARMOR: '[', // Armor
    RING: '=', // Ring
    AMULET: '"', // Amulet
    FOOD: '%', // Food
};
// ============================================================================
// UI CONFIGURATION
// ============================================================================
export var UI_CONFIG = {
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
export var MESSAGE_LOG_CONFIG = {
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
export var GAME_CONFIG = {
    TILE_SIZE: TILE_SIZE,
    GRID_WIDTH: GRID_WIDTH,
    GRID_HEIGHT: GRID_HEIGHT,
    GAME_WIDTH: GAME_WIDTH,
    GAME_HEIGHT: GAME_HEIGHT,
    FOV_RADIUS: FOV_RADIUS,
    MAX_DUNGEON_LEVEL: MAX_DUNGEON_LEVEL,
    TURN_DELAY: TURN_DELAY,
    COLORS: COLORS,
    GLYPHS: GLYPHS,
    UI_CONFIG: UI_CONFIG,
    MESSAGE_LOG_CONFIG: MESSAGE_LOG_CONFIG,
};
export default GAME_CONFIG;
