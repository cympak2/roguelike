/**
 * Standalone FOV System Test Runner
 * 
 * Tests the recursive shadowcasting algorithm implementation
 */

import { FOVSystem } from './fov';
import { GameMap, TileType } from './map';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];

  test(name: string, fn: () => void | Promise<void>): void {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.then(
          () => {
            this.results.push({ name, passed: true });
          },
          (error) => {
            this.results.push({
              name,
              passed: false,
              error: error.message || String(error),
            });
          }
        );
      } else {
        this.results.push({ name, passed: true });
      }
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: ${message || ''}\n  Expected: ${expected}\n  Actual: ${actual}`
      );
    }
  }

  assertTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Expected true but got false: ${message}`);
    }
  }

  assertFalse(condition: boolean, message: string): void {
    if (condition) {
      throw new Error(`Expected false but got true: ${message}`);
    }
  }

  report(): void {
    console.log('\n' + '='.repeat(70));
    console.log('FOV SYSTEM TEST RESULTS');
    console.log('='.repeat(70) + '\n');

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const total = this.results.length;

    this.results.forEach((result) => {
      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      console.log(
        `${color}${status}${reset} ${result.name}${
          result.error ? `\n  ${result.error}` : ''
        }`
      );
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Results: ${passed} passed, ${failed} failed, ${total} total`);
    console.log('='.repeat(70) + '\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Create test runner
const runner = new TestRunner();

// Initialize test fixtures
function createTestMap(): GameMap {
  const map = new GameMap(30, 30);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      map.setTile(x, y, TileType.FLOOR, false, false);
    }
  }
  return map;
}

// ============================================================================
// BASIC FOV COMPUTATION TESTS
// ============================================================================

runner.test('Basic FOV: Player position is visible', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;

  fov.compute(map, playerX, playerY, 8);

  runner.assertTrue(
    fov.isVisible(map, playerX, playerY),
    'Player position should be visible'
  );
});

runner.test('Basic FOV: Nearby tiles within radius are visible', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;

  fov.compute(map, playerX, playerY, 8);

  // Test cardinal directions
  runner.assertTrue(
    fov.isVisible(map, playerX + 3, playerY),
    'Right tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX - 3, playerY),
    'Left tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX, playerY + 3),
    'Down tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX, playerY - 3),
    'Up tile should be visible'
  );
});

runner.test('Basic FOV: Diagonal tiles within radius are visible', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;

  fov.compute(map, playerX, playerY, 8);

  runner.assertTrue(
    fov.isVisible(map, playerX + 3, playerY + 3),
    'Down-right tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX - 3, playerY + 3),
    'Down-left tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX + 3, playerY - 3),
    'Up-right tile should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX - 3, playerY - 3),
    'Up-left tile should be visible'
  );
});

runner.test('Basic FOV: Tiles beyond radius are not visible', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;
  const radius = 8;

  fov.compute(map, playerX, playerY, radius);

  runner.assertFalse(
    fov.isVisible(map, playerX + 10, playerY),
    'Far right tile should not be visible'
  );
  runner.assertFalse(
    fov.isVisible(map, playerX - 10, playerY),
    'Far left tile should not be visible'
  );
  runner.assertFalse(
    fov.isVisible(map, playerX, playerY + 10),
    'Far down tile should not be visible'
  );
});

// ============================================================================
// OBSTACLE BLOCKING TESTS
// ============================================================================

runner.test('Obstacle: Walls block line of sight', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 10;
  const playerY = 10;

  // Place a wall 3 tiles to the right
  map.setTile(playerX + 3, playerY, TileType.WALL, true, true);

  fov.compute(map, playerX, playerY, 8);

  // Wall itself should be visible
  runner.assertTrue(
    fov.isVisible(map, playerX + 3, playerY),
    'Wall should be visible'
  );

  // Tile before wall should be visible
  runner.assertTrue(
    fov.isVisible(map, playerX + 2, playerY),
    'Tile before wall should be visible'
  );

  // Tile behind wall should not be visible
  runner.assertFalse(
    fov.isVisible(map, playerX + 4, playerY),
    'Tile behind wall should not be visible'
  );
});

runner.test('Obstacle: Multiple walls create shadow cascades', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 10;
  const playerY = 10;

  // Create a vertical wall line
  map.setTile(playerX + 4, playerY + 0, TileType.WALL, true, true);
  map.setTile(playerX + 4, playerY + 1, TileType.WALL, true, true);

  fov.compute(map, playerX, playerY, 8);

  // Tiles directly behind walls should be blocked
  runner.assertFalse(
    fov.isVisible(map, playerX + 5, playerY + 0),
    'Tile behind wall 1 should not be visible'
  );
  runner.assertFalse(
    fov.isVisible(map, playerX + 5, playerY + 1),
    'Tile behind wall 2 should not be visible'
  );
});

runner.test('Obstacle: Closed doors block vision', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 10;
  const playerY = 10;

  // Place a closed door
  map.setTile(playerX + 3, playerY, TileType.DOOR_CLOSED, false, true);

  fov.compute(map, playerX, playerY, 8);

  // Door itself should be visible
  runner.assertTrue(
    fov.isVisible(map, playerX + 3, playerY),
    'Closed door should be visible'
  );

  // Tiles beyond closed door should not be visible
  runner.assertFalse(
    fov.isVisible(map, playerX + 4, playerY),
    'Tile behind closed door should not be visible'
  );
});

runner.test('Obstacle: Open doors allow sight', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 10;
  const playerY = 10;

  // Place an open door
  map.setTile(playerX + 3, playerY, TileType.DOOR_OPEN, false, false);

  fov.compute(map, playerX, playerY, 8);

  // Tiles beyond open door should be visible
  runner.assertTrue(
    fov.isVisible(map, playerX + 4, playerY),
    'Tile beyond open door should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, playerX + 5, playerY),
    'Tile further beyond open door should be visible'
  );
});

// ============================================================================
// EXPLORATION TRACKING TESTS
// ============================================================================

runner.test('Exploration: Visible tiles are marked as explored', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;

  fov.compute(map, playerX, playerY, 8);

  runner.assertTrue(
    fov.isExplored(map, playerX + 3, playerY),
    'Visible tile should be explored'
  );
  runner.assertTrue(
    fov.isExplored(map, playerX - 3, playerY),
    'Visible tile should be explored'
  );
});

runner.test('Exploration: Explored tiles persist after FOV update', () => {
  const fov = new FOVSystem();
  const map = createTestMap();

  // Initial FOV computation
  fov.compute(map, 15, 15, 8);
  runner.assertTrue(
    fov.isExplored(map, 18, 15),
    'Tile should be explored after first computation'
  );

  // Move player far away
  fov.compute(map, 28, 28, 8);

  // Original tile should still be explored
  runner.assertTrue(
    fov.isExplored(map, 18, 15),
    'Previously explored tile should remain explored'
  );

  // But should not be visible
  runner.assertFalse(
    fov.isVisible(map, 18, 15),
    'Far away tile should not be visible'
  );
});

runner.test(
  'Exploration: clearFOV resets visible but keeps explored',
  () => {
    const fov = new FOVSystem();
    const map = createTestMap();

    fov.compute(map, 15, 15, 8);
    const tile = map.getTile(18, 15);
    runner.assertTrue(tile?.visible === true, 'Tile should be visible');
    runner.assertTrue(tile?.explored === true, 'Tile should be explored');

    // Clear FOV
    fov.clearFOV(map);

    runner.assertFalse(tile?.visible === true, 'Visible flag should be reset');
    runner.assertTrue(
      tile?.explored === true,
      'Explored flag should persist'
    );
  }
);

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

runner.test('Edge cases: FOV handles positions near edges', () => {
  const fov = new FOVSystem();
  const map = createTestMap();

  // Player at corner
  fov.compute(map, 0, 0, 8);
  runner.assertTrue(
    fov.isVisible(map, 0, 0),
    'Player at corner should be visible'
  );
  runner.assertTrue(
    fov.isVisible(map, 2, 2),
    'Tile in corner radius should be visible'
  );
});

runner.test(
  'Edge cases: Out-of-bounds coordinates return false',
  () => {
    const fov = new FOVSystem();
    const map = createTestMap();

    fov.compute(map, 15, 15, 8);

    runner.assertFalse(
      fov.isVisible(map, -1, 15),
      'Negative coordinate should return false'
    );
    runner.assertFalse(
      fov.isVisible(map, 100, 100),
      'Out-of-bounds coordinate should return false'
    );
    runner.assertFalse(
      fov.isExplored(map, -1, 15),
      'Negative coordinate should return false for explored'
    );
  }
);

// ============================================================================
// VISUAL TEST HELPER
// ============================================================================

runner.test('Visual: Generate ASCII visualization', () => {
  const fov = new FOVSystem();
  const map = createTestMap();
  const playerX = 15;
  const playerY = 15;

  // Create some walls
  map.setTile(playerX + 5, playerY - 3, TileType.WALL, true, true);
  map.setTile(playerX + 5, playerY - 2, TileType.WALL, true, true);
  map.setTile(playerX + 5, playerY - 1, TileType.WALL, true, true);
  map.setTile(playerX + 5, playerY, TileType.WALL, true, true);

  fov.compute(map, playerX, playerY, 8);

  const viz = visualizeFOV(fov, map, playerX, playerY, 21, 21);
  console.log('\nFOV Visualization with Wall Obstacle:');
  console.log(viz);

  runner.assertTrue(
    fov.isVisible(map, playerX, playerY),
    'Player should be visible in visualization'
  );
});

// ============================================================================
// HELPER FUNCTION
// ============================================================================

function visualizeFOV(
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

// ============================================================================
// RUN ALL TESTS
// ============================================================================

setTimeout(() => {
  runner.report();
}, 100);
