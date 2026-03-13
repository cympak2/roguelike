/**
 * Game World Map and Tile Data Structures
 * Defines the tile system and map management for the roguelike dungeon
 */
import { COLORS, GLYPHS } from '../config/game-config';
/**
 * Enum for all possible tile types in the game
 */
export var TileType;
(function (TileType) {
    TileType["WALL"] = "WALL";
    TileType["FLOOR"] = "FLOOR";
    TileType["DOOR_CLOSED"] = "DOOR_CLOSED";
    TileType["DOOR_OPEN"] = "DOOR_OPEN";
    TileType["STAIRS_UP"] = "STAIRS_UP";
    TileType["STAIRS_DOWN"] = "STAIRS_DOWN";
    TileType["WATER"] = "WATER";
    TileType["LAVA"] = "LAVA";
    TileType["GRASS"] = "GRASS";
    TileType["TREE"] = "TREE";
    TileType["STONE"] = "STONE";
    TileType["CHEST_CLOSED"] = "CHEST_CLOSED";
    TileType["CHEST_OPEN"] = "CHEST_OPEN";
    TileType["FOUNTAIN"] = "FOUNTAIN";
    TileType["ALTAR"] = "ALTAR";
})(TileType || (TileType = {}));
/**
 * Represents a single tile in the game world
 * Stores visual, physical, and visibility properties
 */
var Tile = /** @class */ (function () {
    function Tile(type, blocked, blocksSight) {
        if (blocked === void 0) { blocked = false; }
        if (blocksSight === void 0) { blocksSight = false; }
        this.type = type;
        this.blocked = blocked;
        this.blocksSight = blocksSight;
        this.explored = false;
        this.visible = false;
    }
    /**
     * Check if this tile is passable (allows movement)
     */
    Tile.prototype.isPassable = function () {
        return !this.blocked;
    };
    /**
     * Check if this tile is transparent (doesn't block line of sight)
     */
    Tile.prototype.isTransparent = function () {
        return !this.blocksSight;
    };
    /**
     * Reset visibility state (called each turn before FOV calculation)
     */
    Tile.prototype.resetVisibility = function () {
        this.visible = false;
    };
    /**
     * Mark this tile as explored
     */
    Tile.prototype.explore = function () {
        this.explored = true;
    };
    return Tile;
}());
export { Tile };
/**
 * Main game map class
 * Manages the dungeon layout, entities, items, and tile state
 */
var GameMap = /** @class */ (function () {
    function GameMap(width, height) {
        this.entities = [];
        this.items = [];
        this.width = width;
        this.height = height;
        this.tiles = [];
        // Initialize 2D tile array with default floor tiles
        for (var y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (var x = 0; x < width; x++) {
                this.tiles[y][x] = new Tile(TileType.FLOOR);
            }
        }
    }
    /**
     * Get the tile at the specified coordinates
     * Returns null if out of bounds
     */
    GameMap.prototype.getTile = function (x, y) {
        if (!this.isInBounds(x, y)) {
            return null;
        }
        return this.tiles[y][x];
    };
    /**
     * Set the tile type at the specified coordinates
     */
    GameMap.prototype.setTile = function (x, y, type, blocked, blocksSight) {
        if (!this.isInBounds(x, y)) {
            return;
        }
        var tile = new Tile(type, blocked !== undefined ? blocked : this.getDefaultBlocked(type), blocksSight !== undefined ? blocksSight : this.getDefaultBlocksSight(type));
        this.tiles[y][x] = tile;
    };
    /**
     * Check if coordinates are within map bounds
     */
    GameMap.prototype.isInBounds = function (x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    };
    /**
     * Check if a tile blocks movement
     */
    GameMap.prototype.isBlocked = function (x, y) {
        var tile = this.getTile(x, y);
        if (!tile)
            return true; // Out of bounds is blocked
        // Check if tile itself is blocked
        if (tile.blocked)
            return true;
        // Check if there's an entity blocking the tile
        if (this.getEntityAt(x, y))
            return true;
        return false;
    };
    /**
     * Check if a tile is transparent (doesn't block sight)
     */
    GameMap.prototype.isTransparent = function (x, y) {
        var tile = this.getTile(x, y);
        if (!tile)
            return false; // Out of bounds blocks sight
        return tile.isTransparent();
    };
    /**
     * Add an entity to the map
     */
    GameMap.prototype.addEntity = function (entity) {
        if (!this.entities.includes(entity)) {
            this.entities.push(entity);
        }
    };
    /**
     * Remove an entity from the map
     */
    GameMap.prototype.removeEntity = function (entity) {
        var index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    };
    /**
     * Get the entity at the specified coordinates (if any)
     */
    GameMap.prototype.getEntityAt = function (x, y) {
        var entity = this.entities.find(function (e) { return e.x === x && e.y === y; });
        return entity || null;
    };
    /**
     * Add an item to the map at the specified coordinates
     */
    GameMap.prototype.addItem = function (item, x, y) {
        if (this.isInBounds(x, y)) {
            item.x = x;
            item.y = y;
            this.items.push(item);
        }
    };
    /**
     * Remove an item from the map
     */
    GameMap.prototype.removeItem = function (item) {
        var index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    };
    /**
     * Get all items at the specified coordinates
     */
    GameMap.prototype.getItemsAt = function (x, y) {
        return this.items.filter(function (item) { return item.x === x && item.y === y; });
    };
    /**
     * Reset visibility for all tiles (called before FOV calculation)
     */
    GameMap.prototype.resetVisibility = function () {
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                this.tiles[y][x].resetVisibility();
            }
        }
    };
    /**
     * Get the default "blocked" value for a tile type
     */
    GameMap.prototype.getDefaultBlocked = function (type) {
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
    };
    /**
     * Get the default "blocksSight" value for a tile type
     */
    GameMap.prototype.getDefaultBlocksSight = function (type) {
        switch (type) {
            case TileType.WALL:
            case TileType.TREE:
            case TileType.CHEST_CLOSED:
            case TileType.STONE:
                return true;
            default:
                return false;
        }
    };
    return GameMap;
}());
export { GameMap };
/**
 * Get the ASCII glyph for rendering a tile
 */
export function getGlyph(tile) {
    var _a;
    var typeMap = (_a = {},
        _a[TileType.WALL] = GLYPHS.WALL,
        _a[TileType.FLOOR] = GLYPHS.FLOOR,
        _a[TileType.DOOR_CLOSED] = GLYPHS.DOOR_CLOSED,
        _a[TileType.DOOR_OPEN] = GLYPHS.DOOR_OPEN,
        _a[TileType.STAIRS_UP] = GLYPHS.STAIRS_UP,
        _a[TileType.STAIRS_DOWN] = GLYPHS.STAIRS_DOWN,
        _a[TileType.WATER] = GLYPHS.WATER,
        _a[TileType.LAVA] = GLYPHS.LAVA,
        _a[TileType.GRASS] = GLYPHS.GRASS,
        _a[TileType.TREE] = GLYPHS.TREE,
        _a[TileType.STONE] = GLYPHS.STONE,
        _a[TileType.CHEST_CLOSED] = GLYPHS.CHEST_CLOSED,
        _a[TileType.CHEST_OPEN] = GLYPHS.CHEST_OPEN,
        _a[TileType.FOUNTAIN] = GLYPHS.FOUNTAIN,
        _a[TileType.ALTAR] = GLYPHS.ALTAR,
        _a);
    return typeMap[tile.type] || GLYPHS.FLOOR;
}
/**
 * Get the color for rendering a tile
 * Color varies based on visibility and exploration state
 */
export function getColor(tile) {
    // If currently visible, use full brightness
    if (tile.visible) {
        return getTileBaseColor(tile.type);
    }
    // If explored but not visible, use darkened color
    if (tile.explored) {
        var baseColor = getTileBaseColor(tile.type);
        return darkenColor(baseColor, 0.5);
    }
    // Never explored - don't render
    return 0x000000;
}
/**
 * Get the base color for a tile type
 */
function getTileBaseColor(type) {
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
function darkenColor(color, factor) {
    var r = Math.round(((color >> 16) & 0xff) * factor);
    var g = Math.round(((color >> 8) & 0xff) * factor);
    var b = Math.round((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
}
