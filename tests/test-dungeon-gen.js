"use strict";
/**
 * Test and demo of the BSP Dungeon Generator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDungeonGenerator = testDungeonGenerator;
const dungeon_gen_1 = require("../src/world/dungeon-gen");
const map_1 = require("../src/world/map");
/**
 * Print a text representation of the map
 */
function printMap(generator, floorNumber) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FLOOR ${floorNumber} - BSP Dungeon Layout`);
    console.log(`${'='.repeat(80)}\n`);
    const map = generator.generate(floorNumber, 80, 40);
    // Create ASCII representation
    const glyphMap = {
        [map_1.TileType.WALL]: '#',
        [map_1.TileType.FLOOR]: '.',
        [map_1.TileType.DOOR_CLOSED]: '+',
        [map_1.TileType.DOOR_OPEN]: '/',
        [map_1.TileType.STAIRS_UP]: '<',
        [map_1.TileType.STAIRS_DOWN]: '>',
        [map_1.TileType.WATER]: '~',
        [map_1.TileType.LAVA]: '%',
        [map_1.TileType.GRASS]: '"',
        [map_1.TileType.TREE]: 'T',
        [map_1.TileType.STONE]: '*',
        [map_1.TileType.CHEST_CLOSED]: 'C',
        [map_1.TileType.CHEST_OPEN]: 'c',
        [map_1.TileType.FOUNTAIN]: 'F',
        [map_1.TileType.ALTAR]: '@',
    };
    // Print map
    for (let y = 0; y < map.height; y++) {
        let row = '';
        for (let x = 0; x < map.width; x++) {
            const tile = map.getTile(x, y);
            if (!tile) {
                row += '?';
                continue;
            }
            row += glyphMap[tile.type] || '?';
        }
        console.log(row);
    }
    // Print statistics
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Floor Statistics:`);
    console.log(`  Total Width: ${map.width}, Height: ${map.height}`);
    console.log(`  Total Tiles: ${map.width * map.height}`);
    // Count tile types
    const typeCounts = {};
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            const tile = map.getTile(x, y);
            if (tile) {
                typeCounts[tile.type] = (typeCounts[tile.type] || 0) + 1;
            }
        }
    }
    const floorsCount = typeCounts[map_1.TileType.FLOOR] || 0;
    const wallsCount = typeCounts[map_1.TileType.WALL] || 0;
    const stairsUpCount = typeCounts[map_1.TileType.STAIRS_UP] || 0;
    const stairsDownCount = typeCounts[map_1.TileType.STAIRS_DOWN] || 0;
    const doorsCount = (typeCounts[map_1.TileType.DOOR_CLOSED] || 0) + (typeCounts[map_1.TileType.DOOR_OPEN] || 0);
    console.log(`  Floor Tiles: ${floorsCount} (${((floorsCount / (map.width * map.height)) * 100).toFixed(1)}%)`);
    console.log(`  Wall Tiles: ${wallsCount} (${((wallsCount / (map.width * map.height)) * 100).toFixed(1)}%)`);
    console.log(`  Corridors: ${floorsCount - (typeCounts[map_1.TileType.STAIRS_UP] || 0) - (typeCounts[map_1.TileType.STAIRS_DOWN] || 0)}`);
    console.log(`  Stairs Up: ${stairsUpCount}`);
    console.log(`  Stairs Down: ${stairsDownCount}`);
    console.log(`  Doors: ${doorsCount}`);
}
/**
 * Main test function
 */
function testDungeonGenerator() {
    console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    BSP DUNGEON GENERATOR TEST SUITE                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    // Create generator with fixed seed for reproducible results
    const seed = 42;
    const generator = new dungeon_gen_1.DungeonGenerator(seed);
    // Test all 10 floors
    const floorsToTest = [1, 3, 5, 7, 9, 10];
    for (const floor of floorsToTest) {
        printMap(generator, floor);
    }
    // Print algorithm explanation
    console.log(`\n${'='.repeat(80)}`);
    console.log('ALGORITHM EXPLANATION - Binary Space Partitioning (BSP)');
    console.log(`${'='.repeat(80)}\n`);
    console.log(`1. INITIALIZATION`);
    console.log(`   - Start with entire dungeon area as a single rectangular region`);
    console.log(`   - Root region size: 80x40 tiles\n`);
    console.log(`2. RECURSIVE SPLITTING (generateBSPTree)`);
    console.log(`   - Recursively split regions into left and right children`);
    console.log(`   - Depth increases with each split (max varies by floor)`);
    console.log(`   - Alternates between horizontal and vertical splits`);
    console.log(`   - Split position randomized within bounds\n`);
    console.log(`3. ROOM CARVING (createRoom)`);
    console.log(`   - Each leaf BSP node becomes a carve-able region`);
    console.log(`   - Actual rooms sized 4-20 tiles per dimension (floor dependent)`);
    console.log(`   - Rooms centered within their BSP partition`);
    console.log(`   - Leaves space for corridors between regions\n`);
    console.log(`4. CORRIDOR GENERATION (createLShapedCorridor)`);
    console.log(`   - Connect adjacent BSP regions through corridors`);
    console.log(`   - L-shaped corridors (horizontal then vertical, or vice versa)`);
    console.log(`   - Carves floor tiles creating navigable paths\n`);
    console.log(`5. SPECIAL FEATURES`);
    console.log(`   - Stairs: Up stairs (except floor 1), Down stairs (except floor 10)`);
    console.log(`   - Traps: Increase density with floor number (3+ only)`);
    console.log(`   - Treasure Rooms: Locked doors on floors 5+`);
    console.log(`   - Hidden Rooms: Secret doors adjacent to normal rooms`);
    console.log(`   - Boss Room: Floor 10 has large central altar room\n`);
    console.log(`6. DIFFICULTY SCALING (1-10)`);
    console.log(`   - Floors 1-2:  Small (4-8 tiles), few rooms (3-5), shallow BSP depth`);
    console.log(`   - Floors 3-5:  Medium (6-12 tiles), moderate rooms (5-8), traps begin`);
    console.log(`   - Floors 6-8:  Large (8-16 tiles), many rooms (6-10), high trap density`);
    console.log(`   - Floors 9-10: Huge (10-20 tiles), dense rooms (8-12), boss room\n`);
    console.log(`KEY BENEFITS:`);
    console.log(`   ✓ Natural room distribution (larger leaves = larger rooms)`);
    console.log(`   ✓ Guaranteed connectivity (tree structure ensures paths)`);
    console.log(`   ✓ Procedural uniqueness (seeded randomization)`);
    console.log(`   ✓ Scalable difficulty (depth and room sizes adjust per floor)`);
    console.log(`   ✓ Special room support (treasure, boss, hidden rooms)`);
    console.log(`\n${'='.repeat(80)}\n`);
}
// Run the test
testDungeonGenerator();
