/**
 * Test suite for A* Pathfinding Algorithm
 */

import { GameMap, TileType } from './map';
import { Pathfinder, findPath, getNextStep, isPathClear, getDistance } from './pathfinding';

function createTestMap(width: number, height: number): GameMap {
  return new GameMap(width, height);
}

function testBasicPathfinding() {
  console.log('\n=== Test 1: Basic Pathfinding ===');
  const map = createTestMap(10, 10);
  const pathfinder = new Pathfinder();

  // Find path from (1, 1) to (8, 8)
  const path = pathfinder.findPath(map, 1, 1, 8, 8);
  console.log(`Path from (1,1) to (8,8):`);
  console.log(`Path length: ${path.length}`);
  console.log(`Path: ${path.map(([x, y]) => `(${x},${y})`).join(' -> ')}`);

  // Should have found a path
  if (path.length > 0) {
    console.log('✓ Path found');
  } else {
    console.log('✗ No path found');
  }

  return path.length > 0;
}

function testPathfindingWithObstacles() {
  console.log('\n=== Test 2: Pathfinding with Obstacles ===');
  const map = createTestMap(10, 10);

  // Create a wall (vertical line) from (5, 1) to (5, 8)
  for (let y = 1; y < 9; y++) {
    map.setTile(5, y, TileType.WALL, true, true);
  }

  // Add gap in wall
  map.setTile(5, 5, TileType.FLOOR, false, false);

  const pathfinder = new Pathfinder();
  const path = pathfinder.findPath(map, 1, 5, 8, 5);

  console.log(`Path from (1,5) to (8,5) with wall and gap:`);
  console.log(`Path length: ${path.length}`);
  console.log(`Path: ${path.map(([x, y]: [number, number]) => `(${x},${y})`).join(' -> ')}`);

  // Should navigate through the gap
  const goesThoughGap = path.some(([x, y]: [number, number]) => x === 5 && y === 5);
  if (goesThoughGap) {
    console.log('✓ Path correctly navigates through wall gap');
  } else {
    console.log('✗ Path does not go through gap');
  }

  return goesThoughGap;
}

function testNoPathAvailable() {
  console.log('\n=== Test 3: No Path Available ===');
  const map = createTestMap(10, 10);

  // Create a complete wall from (5, 0) to (5, 9)
  for (let y = 0; y < 10; y++) {
    map.setTile(5, y, TileType.WALL, true, true);
  }

  const pathfinder = new Pathfinder();
  const path = pathfinder.findPath(map, 1, 5, 8, 5);

  console.log(`Path from (1,5) to (8,5) with complete wall:`);
  console.log(`Path length: ${path.length}`);

  if (path.length === 0) {
    console.log('✓ Correctly returned empty path');
  } else {
    console.log('✗ Unexpectedly found a path');
  }

  return path.length === 0;
}

function testGetNextStep() {
  console.log('\n=== Test 4: Get Next Step ===');
  const map = createTestMap(10, 10);
  const pathfinder = new Pathfinder();

  const nextStep = pathfinder.getNextStep(map, 1, 1, 5, 5);
  console.log(`Next step from (1,1) towards (5,5): ${nextStep ? `(${nextStep[0]},${nextStep[1]})` : 'null'}`);

  if (nextStep) {
    console.log('✓ Next step found');
  } else {
    console.log('✗ No next step');
  }

  return nextStep !== null;
}

function testLineOfSight() {
  console.log('\n=== Test 5: Line of Sight ===');
  const map = createTestMap(10, 10);

  // Test clear line of sight
  const pathfinder = new Pathfinder();
  const losClear = pathfinder.isPathClear(map, 0, 0, 9, 9);
  console.log(`Line of sight from (0,0) to (9,9): ${losClear ? 'clear' : 'blocked'}`);

  if (losClear) {
    console.log('✓ Line of sight correctly identified');
  } else {
    console.log('✗ Line of sight check failed');
  }

  // Test blocked line of sight
  map.setTile(5, 5, TileType.WALL, true, true);
  const losBlocked = pathfinder.isPathClear(map, 0, 0, 9, 9);
  console.log(`Line of sight from (0,0) to (9,9) with wall at (5,5): ${losBlocked ? 'clear' : 'blocked'}`);

  if (!losBlocked) {
    console.log('✓ Correctly detected blocked line of sight');
  } else {
    console.log('✗ Failed to detect wall blocking sight');
  }

  return losClear && !losBlocked;
}

function testDistanceCalculations() {
  console.log('\n=== Test 6: Distance Calculations ===');

  const euclidean = Pathfinder.getDistance(0, 0, 3, 4);
  console.log(`Euclidean distance from (0,0) to (3,4): ${euclidean.toFixed(2)}`);

  const manhattan = Pathfinder.getManhattanDistance(0, 0, 3, 4);
  console.log(`Manhattan distance from (0,0) to (3,4): ${manhattan}`);

  const chebyshev = Pathfinder.getChebyshevDistance(0, 0, 3, 4);
  console.log(`Chebyshev distance from (0,0) to (3,4): ${chebyshev}`);

  // Euclidean should be 5 (3-4-5 triangle)
  const euclideanCorrect = Math.abs(euclidean - 5) < 0.01;
  const manhattanCorrect = manhattan === 7;
  const chebyshevCorrect = chebyshev === 4;

  if (euclideanCorrect && manhattanCorrect && chebyshevCorrect) {
    console.log('✓ All distance calculations correct');
  } else {
    console.log('✗ Some distance calculations incorrect');
  }

  return euclideanCorrect && manhattanCorrect && chebyshevCorrect;
}

function testDiagonalMovement() {
  console.log('\n=== Test 7: Diagonal vs Cardinal Movement ===');
  const map = createTestMap(10, 10);

  // Test with diagonal movement enabled
  const pathfinderDiag = new Pathfinder(1000, true);
  const pathDiag = pathfinderDiag.findPath(map, 0, 0, 4, 4);
  console.log(`Path with diagonal movement enabled: ${pathDiag.length} steps`);

  // Test with diagonal movement disabled
  const pathfinderCardinal = new Pathfinder(1000, false);
  const pathCardinal = pathfinderCardinal.findPath(map, 0, 0, 4, 4);
  console.log(`Path with diagonal movement disabled: ${pathCardinal.length} steps`);

  // Diagonal path should be shorter
  if (pathDiag.length < pathCardinal.length) {
    console.log('✓ Diagonal pathfinding is more efficient');
  } else {
    console.log('✗ Diagonal pathfinding not more efficient');
  }

  return pathDiag.length < pathCardinal.length;
}

function testPathCaching() {
  console.log('\n=== Test 8: Path Caching ===');
  const map = createTestMap(10, 10);
  const pathfinder = new Pathfinder();

  // First call - should compute path
  console.time('First path call');
  const path1 = pathfinder.findPath(map, 1, 1, 8, 8);
  console.timeEnd('First path call');

  // Second call - should use cache
  console.time('Second path call (cached)');
  const path2 = pathfinder.findPath(map, 1, 1, 8, 8);
  console.timeEnd('Second path call (cached)');

  // Paths should be identical
  const pathsIdentical = JSON.stringify(path1) === JSON.stringify(path2);
  if (pathsIdentical) {
    console.log('✓ Path caching working correctly');
  } else {
    console.log('✗ Cached path differs from original');
  }

  // Clear cache and verify
  pathfinder.clearCache();
  const path3 = pathfinder.findPath(map, 1, 1, 8, 8);
  const stillIdentical = JSON.stringify(path1) === JSON.stringify(path3);
  if (stillIdentical) {
    console.log('✓ Cache clearing works');
  }

  return pathsIdentical && stillIdentical;
}

function testHelperFunctions() {
  console.log('\n=== Test 9: Helper Functions ===');
  const map = createTestMap(10, 10);

  // Test findPath helper
  const path = findPath(map, 1, 1, 5, 5);
  console.log(`Helper findPath result: ${path.length > 0 ? 'success' : 'failed'}`);

  // Test getNextStep helper
  const next = getNextStep(map, 1, 1, 5, 5);
  console.log(`Helper getNextStep result: ${next ? `(${next[0]},${next[1]})` : 'null'}`);

  // Test isPathClear helper
  const clear = isPathClear(map, 0, 0, 9, 9);
  console.log(`Helper isPathClear result: ${clear}`);

  // Test getDistance helper
  const dist = getDistance(0, 0, 3, 4);
  console.log(`Helper getDistance result: ${dist.toFixed(2)}`);

  const allWorking = path.length > 0 && next !== null && clear && dist > 0;
  if (allWorking) {
    console.log('✓ All helper functions working');
  }

  return allWorking;
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   A* Pathfinding Algorithm Test Suite    ║');
  console.log('╚════════════════════════════════════════════╝');

  const results = [
    { name: 'Basic Pathfinding', passed: testBasicPathfinding() },
    { name: 'Pathfinding with Obstacles', passed: testPathfindingWithObstacles() },
    { name: 'No Path Available', passed: testNoPathAvailable() },
    { name: 'Get Next Step', passed: testGetNextStep() },
    { name: 'Line of Sight', passed: testLineOfSight() },
    { name: 'Distance Calculations', passed: testDistanceCalculations() },
    { name: 'Diagonal Movement', passed: testDiagonalMovement() },
    { name: 'Path Caching', passed: testPathCaching() },
    { name: 'Helper Functions', passed: testHelperFunctions() },
  ];

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              Test Summary                  ║');
  console.log('╚════════════════════════════════════════════╝');

  let passedCount = 0;
  results.forEach(({ name, passed }) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${name}`);
    if (passed) passedCount++;
  });

  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
  console.log('');

  return passedCount === results.length;
}

// Export for use in other modules
export { testBasicPathfinding, runAllTests };

// Run tests if this file is executed directly
if (require.main === module) {
  const allPassed = runAllTests();
  process.exit(allPassed ? 0 : 1);
}
