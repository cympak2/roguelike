import { FOV_RADIUS } from '../config/game-config';
/**
 * Field-of-View (FOV) System using Recursive Shadowcasting Algorithm
 *
 * This implementation uses the recursive shadowcasting algorithm to compute
 * player visibility in 8 octants around the player position. It's efficient,
 * accurate, and provides natural-looking line-of-sight.
 *
 * Algorithm Overview:
 * - Divides the player's surroundings into 8 octants
 * - For each octant, recursively traces visibility using a shadow system
 * - Tiles block sight if they have blocksSight=true (walls, trees, closed doors)
 * - Updates tile.visible for current FOV and tile.explored for memory
 *
 * Reference: https://www.roguebasin.com/index.php/Recursive_Shadowcasting
 */
var FOVSystem = /** @class */ (function () {
    function FOVSystem() {
    }
    /**
     * Compute field of view from a given position
     *
     * @param map - The game map to compute FOV on
     * @param x - Player x coordinate
     * @param y - Player y coordinate
     * @param radius - Maximum sight radius (default: FOV_RADIUS from config)
     */
    FOVSystem.prototype.compute = function (map, x, y, radius) {
        if (radius === void 0) { radius = FOV_RADIUS; }
        // Clear previous visibility state
        this.clearFOV(map);
        for (var dy = -radius; dy <= radius; dy++) {
            for (var dx = -radius; dx <= radius; dx++) {
                var tx = x + dx;
                var ty = y + dy;
                if (!map.isInBounds(tx, ty))
                    continue;
                // Chebyshev distance gives classic roguelike square visibility
                var distance = Math.max(Math.abs(dx), Math.abs(dy));
                if (distance > radius)
                    continue;
                if (this.hasLineOfSight(map, x, y, tx, ty)) {
                    var tile = map.getTile(tx, ty);
                    if (tile) {
                        tile.visible = true;
                        tile.explored = true;
                    }
                }
            }
        }
    };
    /**
     * Recursive shadowcasting function
     *
     * Traces visibility through an octant using a shadow system to determine
     * which tiles are blocked from light by opaque tiles.
     *
     * @param map - The game map
     * @param playerX - Player x coordinate
     * @param playerY - Player y coordinate
     * @param radius - Maximum sight radius
     * @param row - Current distance from player (starts at 1)
     * @param start - Left shadow boundary (0.0 to 1.0)
     * @param end - Right shadow boundary (0.0 to 1.0)
     * @param xx - X direction for primary axis (1, 0, or -1)
     * @param xy - Y direction for primary axis (1, 0, or -1)
     * @param yx - X direction for secondary axis (1, 0, or -1)
     * @param yy - Y direction for secondary axis (1, 0, or -1)
     */
    FOVSystem.prototype.hasLineOfSight = function (map, fromX, fromY, toX, toY) {
        var x0 = fromX;
        var y0 = fromY;
        var x1 = toX;
        var y1 = toY;
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1;
        var sy = y0 < y1 ? 1 : -1;
        var err = dx - dy;
        while (true) {
            // Reached target tile: target is visible (including walls)
            if (x0 === x1 && y0 === y1) {
                return true;
            }
            var e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
            // Ignore origin, but blockers on the path stop visibility to tiles behind
            if (x0 === fromX && y0 === fromY) {
                continue;
            }
            var tile = map.getTile(x0, y0);
            if (!tile) {
                return false;
            }
            // Allow target tile even if it's opaque, but stop past intermediate blockers
            if (x0 === x1 && y0 === y1) {
                return true;
            }
            if (tile.blocksSight) {
                return false;
            }
        }
    };
    /**
     * Clear all FOV visibility flags from the map
     *
     * Call this at the start of each turn before computing new FOV.
     * This resets the visible flag but preserves explored flag for memory map.
     *
     * @param map - The game map
     */
    FOVSystem.prototype.clearFOV = function (map) {
        for (var y = 0; y < map.height; y++) {
            for (var x = 0; x < map.width; x++) {
                var tile = map.getTile(x, y);
                if (tile) {
                    tile.visible = false;
                }
            }
        }
    };
    /**
     * Check if a tile is currently visible to the player
     *
     * @param map - The game map
     * @param x - Tile x coordinate
     * @param y - Tile y coordinate
     * @returns true if the tile is currently in the player's FOV
     */
    FOVSystem.prototype.isVisible = function (map, x, y) {
        var tile = map.getTile(x, y);
        return tile ? tile.visible : false;
    };
    /**
     * Check if a tile has been explored (previously seen) by the player
     *
     * @param map - The game map
     * @param x - Tile x coordinate
     * @param y - Tile y coordinate
     * @returns true if the tile has ever been in the player's FOV
     */
    FOVSystem.prototype.isExplored = function (map, x, y) {
        var tile = map.getTile(x, y);
        return tile ? tile.explored : false;
    };
    return FOVSystem;
}());
export { FOVSystem };
/**
 * Singleton instance for convenient access throughout the application
 */
export var fovSystem = new FOVSystem();
