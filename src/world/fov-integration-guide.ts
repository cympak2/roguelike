/**
 * FOV System Integration Guide
 * 
 * This file demonstrates how to integrate and use the FOVSystem
 * in your game scenes and systems.
 */

import { GameMap, Tile } from './map';
import { FOVSystem, fovSystem } from './fov';

/**
 * BASIC USAGE
 * ===========
 * 
 * The FOVSystem can be used in two ways:
 * 1. Create your own instance: new FOVSystem()
 * 2. Use the singleton: fovSystem
 */

// Method 1: Create instance for specific use
const myFOV = new FOVSystem();

// Method 2: Use singleton (recommended)
// import { fovSystem } from './world'
// fovSystem.compute(map, playerX, playerY);

/**
 * INTEGRATION IN GAME SCENE
 * =========================
 */

export class GameSceneIntegration {
  private map: GameMap;
  private playerX: number = 15;
  private playerY: number = 15;
  private fov: FOVSystem;

  constructor(map: GameMap) {
    this.map = map;
    this.fov = fovSystem; // Use singleton
  }

  /**
   * STEP 1: Call FOV computation after player moves
   * 
   * This should be called:
   * - After every player movement
   * - In the game update loop
   * - Before rendering
   */
  updatePlayerFOV(): void {
    // Compute FOV with default radius from config (8 tiles)
    this.fov.compute(this.map, this.playerX, this.playerY);

    // Or with custom radius:
    // this.fov.compute(this.map, this.playerX, this.playerY, 12);
  }

  /**
   * STEP 2: Use visibility for rendering
   * 
   * During render, check visibility and exploration state
   */
  renderTile(x: number, y: number): string {
    const tile = this.map.getTile(x, y);
    if (!tile) return ' ';

    // Determine how to render based on visibility state
    if (this.fov.isVisible(this.map, x, y)) {
      // Tile is visible now - show bright
      return this.getBrightGlyph(tile);
    } else if (this.fov.isExplored(this.map, x, y)) {
      // Tile was seen before - show darkened
      return this.getDarkGlyph(tile);
    } else {
      // Never seen - show nothing
      return ' ';
    }
  }

  /**
   * STEP 3: Handle entity visibility
   * 
   * Entities should only be rendered if their tile is visible
   */
  shouldRenderEntity(entityX: number, entityY: number): boolean {
    return this.fov.isVisible(this.map, entityX, entityY);
  }

  /**
   * STEP 4: AI vision (can enemies see the player?)
   * 
   * Use isVisible to determine if enemies can detect player
   */
  canEnemySePlayer(enemyX: number, enemyY: number, radius: number = 8): boolean {
    // Create a temporary FOV for this enemy
    const enemyFOV = new FOVSystem();
    enemyFOV.compute(this.map, enemyX, enemyY, radius);
    return enemyFOV.isVisible(this.map, this.playerX, this.playerY);
  }

  private getBrightGlyph(tile: Tile): string {
    // Return bright version of tile glyph
    return '#';
  }

  private getDarkGlyph(tile: Tile): string {
    // Return darkened version of tile glyph
    return '#';
  }
}

/**
 * PERFORMANCE CONSIDERATIONS
 * ==========================
 */

export class PerformanceNotes {
  /**
   * The FOVSystem is highly optimized:
   * 
   * - Time complexity: O(radius² / octant count) ≈ O(16 * radius²) worst case
   * - Space complexity: O(1) - no additional allocations per call
   * - Per-turn cost: ~1-2ms for typical dungeon with radius=8
   * - Suitable for 60fps gameplay
   * 
   * OPTIMIZATION TIPS:
   * 
   * 1. Call compute() only when player moves, not every frame
   *    - Store visible/explored state between frames
   *    - Only recompute when position changes
   * 
   * 2. Use appropriate radius
   *    - Smaller radius = faster (8 is good default)
   *    - Can vary by difficulty/player level
   * 
   * 3. Cache FOV results
   *    - Don't recompute same position multiple times per turn
   *    - Cache in player entity or scene
   * 
   * 4. Batch visibility checks
   *    - If checking 100 tiles, compute once then query 100 times
   *    - Don't recompute for each check
   * 
   * 5. Consider multi-threaded FOV for complex scenes
   *    - Large dungeons (100x100+) might benefit
   *    - Not needed for typical rogue-like sizes
   */
}

/**
 * TESTING THE FOV SYSTEM
 * ======================
 */

export function runFOVDemo(): void {
  // Create a test map
  const testMap = new GameMap(30, 30);

  // Fill with floor
  for (let y = 0; y < testMap.height; y++) {
    for (let x = 0; x < testMap.width; x++) {
      testMap.setTile(x, y, 'FLOOR' as any, false, false);
    }
  }

  // Add some walls
  for (let x = 10; x <= 15; x++) {
    testMap.setTile(x, 10, 'WALL' as any, true, true);
  }

  // Create FOV and compute
  const fov = new FOVSystem();
  const playerX = 8;
  const playerY = 12;

  fov.compute(testMap, playerX, playerY, 8);

  // Visualize
  console.log('\nFOV Visualization:');
  visualizeFOV(fov, testMap, playerX, playerY);

  // Print statistics
  let visibleCount = 0;
  let exploredCount = 0;

  for (let y = 0; y < testMap.height; y++) {
    for (let x = 0; x < testMap.width; x++) {
      if (fov.isVisible(testMap, x, y)) visibleCount++;
      if (fov.isExplored(testMap, x, y)) exploredCount++;
    }
  }

  console.log(`Visible tiles: ${visibleCount}`);
  console.log(`Explored tiles: ${exploredCount}`);
}

/**
 * VISUALIZATION HELPER
 * ====================
 */

function visualizeFOV(
  fov: FOVSystem,
  map: GameMap,
  playerX: number,
  playerY: number,
  width: number = 30,
  height: number = 30
): void {
  console.log('┌' + '─'.repeat(width) + '┐');

  for (let y = 0; y < Math.min(height, map.height); y++) {
    process.stdout.write('│');
    for (let x = 0; x < Math.min(width, map.width); x++) {
      const tile = map.getTile(x, y);

      if (x === playerX && y === playerY) {
        process.stdout.write('@');
      } else if (!tile) {
        process.stdout.write('?');
      } else if (tile.blocksSight) {
        process.stdout.write('#');
      } else if (fov.isVisible(map, x, y)) {
        process.stdout.write('.');
      } else if (fov.isExplored(map, x, y)) {
        process.stdout.write('·');
      } else {
        process.stdout.write(' ');
      }
    }
    console.log('│');
  }

  console.log('└' + '─'.repeat(width) + '┘');
  console.log('@ = Player, # = Wall, . = Visible, · = Explored, space = Unexplored\n');
}

/**
 * ADVANCED: CUSTOM FOV FOR DIFFERENT ENTITY TYPES
 * ===============================================
 */

export function advancedFOVExamples(): void {
  const map = new GameMap(50, 50);
  const fov = fovSystem;

  // Example 1: Limited FOV (creature with poor vision)
  function creatureVision(creatureX: number, creatureY: number): Set<string> {
    fov.compute(map, creatureX, creatureY, 3); // Very short range
    const visible = new Set<string>();

    for (let y = Math.max(0, creatureY - 3); y <= Math.min(map.height - 1, creatureY + 3); y++) {
      for (let x = Math.max(0, creatureX - 3); x <= Math.min(map.width - 1, creatureX + 3); x++) {
        if (fov.isVisible(map, x, y)) {
          visible.add(`${x},${y}`);
        }
      }
    }
    return visible;
  }

  // Example 2: Extended FOV (creature with exceptional vision)
  function eagleEyeVision(creatureX: number, creatureY: number): Set<string> {
    fov.compute(map, creatureX, creatureY, 20); // Very long range
    const visible = new Set<string>();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (fov.isVisible(map, x, y)) {
          visible.add(`${x},${y}`);
        }
      }
    }
    return visible;
  }

  // Example 3: Sector FOV (creature with directional vision)
  function coneVision(
    creatureX: number,
    creatureY: number,
    directionX: number,
    directionY: number
  ): Set<string> {
    fov.compute(map, creatureX, creatureY, 12);
    const visible = new Set<string>();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (fov.isVisible(map, x, y)) {
          // Only tiles in the direction creature is facing
          const dx = x - creatureX;
          const dy = y - creatureY;

          const dotProduct = dx * directionX + dy * directionY;
          if (dotProduct > 0) {
            visible.add(`${x},${y}`);
          }
        }
      }
    }
    return visible;
  }
}

/**
 * EXPORT FOR USE IN SCENES
 * ========================
 */

export const FOVIntegrationExamples = {
  runDemo: runFOVDemo,
  advancedExamples: advancedFOVExamples,
};
