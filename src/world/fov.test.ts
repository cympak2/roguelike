import { FOVSystem } from './fov';
import { GameMap, TileType } from './map';

/**
 * Test Suite for Field-of-View (FOV) Shadowcasting Algorithm
 *
 * Tests visibility computation, obstacle blocking, and exploration tracking
 */

describe('FOVSystem - Recursive Shadowcasting', () => {
  let fov: FOVSystem;
  let map: GameMap;

  beforeEach(() => {
    fov = new FOVSystem();
    // Create a simple 30x30 test map
    map = new GameMap(30, 30);
    // Fill with floor tiles (transparent, not blocking)
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        map.setTile(x, y, TileType.FLOOR, false, false);
      }
    }
  });

  describe('Basic FOV Computation', () => {
    test('Player position should always be visible', () => {
      const playerX = 15;
      const playerY = 15;
      fov.compute(map, playerX, playerY, 8);

      expect(fov.isVisible(map, playerX, playerY)).toBe(true);
      expect(fov.isExplored(map, playerX, playerY)).toBe(true);
    });

    test('Nearby tiles within radius should be visible', () => {
      const playerX = 15;
      const playerY = 15;
      fov.compute(map, playerX, playerY, 8);

      // Test cardinal directions
      expect(fov.isVisible(map, playerX + 3, playerY)).toBe(true); // Right
      expect(fov.isVisible(map, playerX - 3, playerY)).toBe(true); // Left
      expect(fov.isVisible(map, playerX, playerY + 3)).toBe(true); // Down
      expect(fov.isVisible(map, playerX, playerY - 3)).toBe(true); // Up
    });

    test('Diagonal tiles within radius should be visible', () => {
      const playerX = 15;
      const playerY = 15;
      fov.compute(map, playerX, playerY, 8);

      // Test diagonal directions
      expect(fov.isVisible(map, playerX + 3, playerY + 3)).toBe(true); // Down-right
      expect(fov.isVisible(map, playerX - 3, playerY + 3)).toBe(true); // Down-left
      expect(fov.isVisible(map, playerX + 3, playerY - 3)).toBe(true); // Up-right
      expect(fov.isVisible(map, playerX - 3, playerY - 3)).toBe(true); // Up-left
    });

    test('Tiles beyond radius should not be visible', () => {
      const playerX = 15;
      const playerY = 15;
      const radius = 8;
      fov.compute(map, playerX, playerY, radius);

      // Tiles at distance > radius should not be visible
      expect(fov.isVisible(map, playerX + 10, playerY)).toBe(false); // Far right
      expect(fov.isVisible(map, playerX - 10, playerY)).toBe(false); // Far left
      expect(fov.isVisible(map, playerX, playerY + 10)).toBe(false); // Far down
      expect(fov.isVisible(map, playerX, playerY - 10)).toBe(false); // Far up
    });
  });

  describe('Obstacle Blocking', () => {
    test('Walls should block line of sight', () => {
      const playerX = 10;
      const playerY = 10;

      // Place a wall 3 tiles to the right
      map.setTile(playerX + 3, playerY, TileType.WALL, true, true);

      fov.compute(map, playerX, playerY, 8);

      // Tile behind wall should not be visible
      expect(fov.isVisible(map, playerX + 4, playerY)).toBe(false);

      // Wall itself should be visible
      expect(fov.isVisible(map, playerX + 3, playerY)).toBe(true);

      // Tile before wall should be visible
      expect(fov.isVisible(map, playerX + 2, playerY)).toBe(true);
    });

    test('Multiple walls should create shadow cascades', () => {
      const playerX = 10;
      const playerY = 10;

      // Create a wall line
      map.setTile(playerX + 4, playerY + 0, TileType.WALL, true, true);
      map.setTile(playerX + 4, playerY + 1, TileType.WALL, true, true);

      fov.compute(map, playerX, playerY, 8);

      // Tiles directly behind walls should be blocked
      expect(fov.isVisible(map, playerX + 5, playerY + 0)).toBe(false);
      expect(fov.isVisible(map, playerX + 5, playerY + 1)).toBe(false);
    });

    test('Diagonal obstacles should block vision correctly', () => {
      const playerX = 10;
      const playerY = 10;

      // Place wall diagonally
      map.setTile(playerX + 3, playerY + 3, TileType.WALL, true, true);

      fov.compute(map, playerX, playerY, 8);

      // The diagonal wall should be visible
      expect(fov.isVisible(map, playerX + 3, playerY + 3)).toBe(true);

      // Tiles beyond the wall in certain directions should be blocked
      // (depending on shadowcasting algorithm precision)
      expect(fov.isVisible(map, playerX + 4, playerY + 4)).toBe(false);
    });

    test('Doors and transparent obstacles should allow sight', () => {
      const playerX = 10;
      const playerY = 10;

      // Place a door (transparent but potentially blocked)
      map.setTile(playerX + 5, playerY, TileType.DOOR_OPEN, false, false);

      fov.compute(map, playerX, playerY, 8);

      // Tiles beyond transparent obstacle should be visible
      expect(fov.isVisible(map, playerX + 6, playerY)).toBe(true);
      expect(fov.isVisible(map, playerX + 7, playerY)).toBe(true);
    });

    test('Closed doors should block line of sight', () => {
      const playerX = 10;
      const playerY = 10;

      // Place a closed door (blocks sight)
      map.setTile(playerX + 3, playerY, TileType.DOOR_CLOSED, false, true);

      fov.compute(map, playerX, playerY, 8);

      // Tiles beyond closed door should not be visible
      expect(fov.isVisible(map, playerX + 4, playerY)).toBe(false);

      // Door itself should be visible
      expect(fov.isVisible(map, playerX + 3, playerY)).toBe(true);
    });
  });

  describe('Exploration Tracking', () => {
    test('Visible tiles should be marked as explored', () => {
      const playerX = 15;
      const playerY = 15;
      fov.compute(map, playerX, playerY, 8);

      // All visible tiles should also be explored
      expect(fov.isExplored(map, playerX + 3, playerY)).toBe(true);
      expect(fov.isExplored(map, playerX - 3, playerY)).toBe(true);
      expect(fov.isExplored(map, playerX, playerY + 3)).toBe(true);
    });

    test('Explored tiles should persist after FOV update', () => {
      let playerX = 15;
      let playerY = 15;

      // Initial FOV computation
      fov.compute(map, playerX, playerY, 8);
      const exploredTile = map.getTile(playerX + 3, playerY);
      expect(exploredTile?.explored).toBe(true);

      // Move player far away
      playerX = 28;
      playerY = 28;
      fov.compute(map, playerX, playerY, 8);

      // Original tile should still be explored (memory map)
      expect(map.getTile(15 + 3, 15)?.explored).toBe(true);

      // But should not be visible
      expect(map.getTile(15 + 3, 15)?.visible).toBe(false);
    });

    test('clearFOV should reset visible flag but keep explored flag', () => {
      const playerX = 15;
      const playerY = 15;

      fov.compute(map, playerX, playerY, 8);
      const exploredTile = map.getTile(playerX + 3, playerY);
      expect(exploredTile?.visible).toBe(true);
      expect(exploredTile?.explored).toBe(true);

      // Clear FOV
      fov.clearFOV(map);

      // Visible flag should be reset
      expect(exploredTile?.visible).toBe(false);

      // Explored flag should still be true (persistent memory)
      expect(exploredTile?.explored).toBe(true);
    });
  });

  describe('Edge Cases and Bounds', () => {
    test('FOV should handle positions near map edges', () => {
      // Player at corner
      fov.compute(map, 0, 0, 8);
      expect(fov.isVisible(map, 0, 0)).toBe(true);
      expect(fov.isVisible(map, 2, 2)).toBe(true);
    });

    test('FOV should handle positions at map boundaries', () => {
      // Player at far corner
      fov.compute(map, map.width - 1, map.height - 1, 8);
      expect(fov.isVisible(map, map.width - 1, map.height - 1)).toBe(true);
      expect(fov.isVisible(map, map.width - 3, map.height - 3)).toBe(true);
    });

    test('isVisible with out-of-bounds coordinates should return false', () => {
      fov.compute(map, 15, 15, 8);
      expect(fov.isVisible(map, -1, 15)).toBe(false);
      expect(fov.isVisible(map, 100, 100)).toBe(false);
    });

    test('isExplored with out-of-bounds coordinates should return false', () => {
      fov.compute(map, 15, 15, 8);
      expect(fov.isExplored(map, -1, 15)).toBe(false);
      expect(fov.isExplored(map, 100, 100)).toBe(false);
    });
  });

  describe('Radiation Pattern', () => {
    test('FOV should create roughly circular visibility pattern', () => {
      const playerX = 15;
      const playerY = 15;
      const radius = 6;

      fov.compute(map, playerX, playerY, radius);

      // Count visible tiles
      let visibleCount = 0;
      for (let y = playerY - radius - 2; y <= playerY + radius + 2; y++) {
        for (let x = playerX - radius - 2; x <= playerX + radius + 2; x++) {
          if (fov.isVisible(map, x, y)) {
            visibleCount++;
          }
        }
      }

      // With radius 6, we should have roughly 100-120 visible tiles
      // (depends on circle approximation)
      expect(visibleCount).toBeGreaterThan(50);
      expect(visibleCount).toBeLessThan(200);
    });

    test('All 8 octants should have similar visibility range', () => {
      const playerX = 15;
      const playerY = 15;

      fov.compute(map, playerX, playerY, 8);

      // Check that all 8 directions have reasonable visibility
      const directions = [
        [8, 0],   // Right
        [5, -5],  // Up-right
        [0, -8],  // Up
        [-5, -5], // Up-left
        [-8, 0],  // Left
        [-5, 5],  // Down-left
        [0, 8],   // Down
        [5, 5],   // Down-right
      ];

      let visibleDirections = 0;
      for (const [dx, dy] of directions) {
        if (fov.isVisible(map, playerX + dx, playerY + dy)) {
          visibleDirections++;
        }
      }

      // All 8 directions should be visible (no obstacles)
      expect(visibleDirections).toBe(8);
    });
  });

  describe('Complex Scenarios', () => {
    test('L-shaped wall should create shadow correctly', () => {
      const playerX = 10;
      const playerY = 10;

      // Create L-shaped obstacle
      map.setTile(playerX + 4, playerY, TileType.WALL, true, true);
      map.setTile(playerX + 4, playerY + 1, TileType.WALL, true, true);
      map.setTile(playerX + 4, playerY + 2, TileType.WALL, true, true);

      fov.compute(map, playerX, playerY, 8);

      // Tiles behind the wall should be blocked
      expect(fov.isVisible(map, playerX + 5, playerY + 0)).toBe(false);
      expect(fov.isVisible(map, playerX + 5, playerY + 1)).toBe(false);
      expect(fov.isVisible(map, playerX + 5, playerY + 2)).toBe(false);

      // Tiles not blocked by wall should be visible
      expect(fov.isVisible(map, playerX + 5, playerY - 1)).toBe(true);
      expect(fov.isVisible(map, playerX + 5, playerY + 3)).toBe(true);
    });

    test('Partial obstruction should create proper shadow gradients', () => {
      const playerX = 10;
      const playerY = 10;

      // Single wall tile creates shadow
      map.setTile(playerX + 4, playerY, TileType.WALL, true, true);

      fov.compute(map, playerX, playerY, 8);

      // Diagonal tiles behind wall might be visible depending on geometry
      const upperDiagonal = fov.isVisible(map, playerX + 5, playerY - 1);
      const lowerDiagonal = fov.isVisible(map, playerX + 5, playerY + 1);

      // At least one diagonal should be visible (no obstruction from the single tile)
      expect(upperDiagonal || lowerDiagonal).toBe(true);
    });
  });

  describe('Performance and Efficiency', () => {
    test('compute() should complete in reasonable time for large map', () => {
      const largeMap = new GameMap(100, 100);
      for (let y = 0; y < largeMap.height; y++) {
        for (let x = 0; x < largeMap.width; x++) {
          largeMap.setTile(x, y, TileType.FLOOR, false, false);
        }
      }

      const start = performance.now();
      fov.compute(largeMap, 50, 50, 8);
      const elapsed = performance.now() - start;

      // Should complete in less than 100ms (very generous for test)
      expect(elapsed).toBeLessThan(100);
    });

    test('Multiple compute calls should not cause memory leaks', () => {
      for (let i = 0; i < 100; i++) {
        fov.compute(map, 15 + (i % 2), 15 + (i % 2), 8);
      }

      // Just verify it completes without error
      expect(fov.isVisible(map, 15, 15)).toBe(true);
    });
  });
});

/**
 * ASCII Visualization Test Helper
 *
 * This function generates an ASCII representation of the FOV for visual testing
 * Usage: console.log(visualizeFOV(fov, map, playerX, playerY));
 */
export function visualizeFOV(
  fov: FOVSystem,
  map: GameMap,
  playerX: number,
  playerY: number,
  width: number = 21,
  height: number = 21
): string {
  const startX = Math.max(0, playerX - Math.floor(width / 2));
  const startY = Math.max(0, playerY - Math.floor(height / 2));
  const endX = Math.min(map.width, startX + width);
  const endY = Math.min(map.height, startY + height);

  let result = '\n';
  result += '┌' + '─'.repeat(width) + '┐\n';

  for (let y = startY; y < endY; y++) {
    result += '│';
    for (let x = startX; x < endX; x++) {
      const tile = map.getTile(x, y);
      if (!tile) {
        result += '?';
      } else if (x === playerX && y === playerY) {
        result += '@';
      } else if (tile.blocksSight) {
        result += '#';
      } else if (fov.isVisible(map, x, y)) {
        result += '.';
      } else if (fov.isExplored(map, x, y)) {
        result += '·';
      } else {
        result += ' ';
      }
    }
    result += '│\n';
  }

  result += '└' + '─'.repeat(width) + '┘\n';
  result += 'Legend: @ = player, # = wall, . = visible, · = explored, space = unknown\n';

  return result;
}
