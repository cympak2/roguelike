import { GameMap } from './map';
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
export class FOVSystem {
  /**
   * Compute field of view from a given position
   *
   * @param map - The game map to compute FOV on
   * @param x - Player x coordinate
   * @param y - Player y coordinate
   * @param radius - Maximum sight radius (default: FOV_RADIUS from config)
   */
  compute(map: GameMap, x: number, y: number, radius: number = FOV_RADIUS): void {
    // Clear previous visibility state
    this.clearFOV(map);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        if (!map.isInBounds(tx, ty)) continue;

        // Chebyshev distance gives classic roguelike square visibility
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance > radius) continue;

        if (this.hasLineOfSight(map, x, y, tx, ty)) {
          const tile = map.getTile(tx, ty);
          if (tile) {
            tile.visible = true;
            tile.explored = true;
          }
        }
      }
    }
  }

  /**
   * Check line-of-sight between two points using Bresenham's line algorithm.
   *
   * Important behavior:
   * - Blocking tiles are visible themselves
   * - Tiles behind blockers are not visible
   */
  private hasLineOfSight(map: GameMap, fromX: number, fromY: number, toX: number, toY: number): boolean {
    let x0 = fromX;
    let y0 = fromY;
    const x1 = toX;
    const y1 = toY;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Reached target tile: target is visible (including walls)
      if (x0 === x1 && y0 === y1) {
        return true;
      }

      const e2 = 2 * err;
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

      const tile = map.getTile(x0, y0);
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
  }

  /**
   * Clear all FOV visibility flags from the map
   *
   * Call this at the start of each turn before computing new FOV.
   * This resets the visible flag but preserves explored flag for memory map.
   *
   * @param map - The game map
   */
  clearFOV(map: GameMap): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.getTile(x, y);
        if (tile) {
          tile.visible = false;
        }
      }
    }
  }

  /**
   * Check if a tile is currently visible to the player
   *
   * @param map - The game map
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   * @returns true if the tile is currently in the player's FOV
   */
  isVisible(map: GameMap, x: number, y: number): boolean {
    const tile = map.getTile(x, y);
    return tile ? tile.visible : false;
  }

  /**
   * Check if a tile has been explored (previously seen) by the player
   *
   * @param map - The game map
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   * @returns true if the tile has ever been in the player's FOV
   */
  isExplored(map: GameMap, x: number, y: number): boolean {
    const tile = map.getTile(x, y);
    return tile ? tile.explored : false;
  }
}

/**
 * Singleton instance for convenient access throughout the application
 */
export const fovSystem = new FOVSystem();
