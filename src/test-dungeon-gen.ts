/**
 * Test script for BSP dungeon generator
 * Generates sample dungeons for all 10 floors
 */

import { DungeonGenerator } from './world/dungeon-gen';
import { TileType } from './world/map';
import { GLYPHS } from './config/game-config';

// Map tile type to ASCII glyph
function getGlyph(tileType: TileType): string {
  switch (tileType) {
    case TileType.WALL: return GLYPHS.WALL;
    case TileType.FLOOR: return GLYPHS.FLOOR;
    case TileType.STAIRS_UP: return GLYPHS.STAIRS_UP;
    case TileType.STAIRS_DOWN: return GLYPHS.STAIRS_DOWN;
    case TileType.DOOR_CLOSED: return GLYPHS.DOOR_CLOSED;
    case TileType.DOOR_OPEN: return GLYPHS.DOOR_OPEN;
    case TileType.ALTAR: return GLYPHS.ALTAR;
    default: return '.';
  }
}

// Render the dungeon to string
function renderDungeon(map: any, startX = 0, startY = 0, width = 80, height = 40): string {
  let output = '';
  for (let y = startY; y < Math.min(startY + height, map.height); y++) {
    for (let x = startX; x < Math.min(startX + width, map.width); x++) {
      const tile = map.getTile(x, y);
      output += getGlyph(tile.type);
    }
    output += '\n';
  }
  return output;
}

// Count room statistics
function analyzeMap(map: any) {
  let floorCount = 0;
  let wallCount = 0;
  let stairsCount = 0;
  let doorCount = 0;
  let altarCount = 0;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      switch (tile.type) {
        case TileType.FLOOR: floorCount++; break;
        case TileType.WALL: wallCount++; break;
        case TileType.STAIRS_UP:
        case TileType.STAIRS_DOWN: stairsCount++; break;
        case TileType.DOOR_CLOSED:
        case TileType.DOOR_OPEN: doorCount++; break;
        case TileType.ALTAR: altarCount++; break;
      }
    }
  }

  return { floorCount, wallCount, stairsCount, doorCount, altarCount };
}

export function runDungeonTests() {
  console.log('='.repeat(80));
  console.log('BSP DUNGEON GENERATOR TEST');
  console.log('='.repeat(80));
  console.log();

  const generator = new DungeonGenerator(12345); // Fixed seed for reproducibility

  // Test all 10 floors
  for (let floor = 1; floor <= 10; floor++) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FLOOR ${floor} / 10`);
    console.log('='.repeat(80));
    
    const map = generator.generate(floor, 80, 40);
    const stats = analyzeMap(map);
    
    console.log(`\nStatistics:`);
    console.log(`  Floor tiles:  ${stats.floorCount}`);
    console.log(`  Wall tiles:   ${stats.wallCount}`);
    console.log(`  Stairs:       ${stats.stairsCount}`);
    console.log(`  Doors:        ${stats.doorCount}`);
    console.log(`  Altars:       ${stats.altarCount}`);
    console.log(`  Floor density: ${(stats.floorCount / (map.width * map.height) * 100).toFixed(1)}%`);
    
    // Only render small sample for floors 1, 5, and 10
    if (floor === 1 || floor === 5 || floor === 10) {
      console.log(`\nSample render (40x20 section):\n`);
      console.log(renderDungeon(map, 20, 10, 40, 20));
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST COMPLETE - All 10 floors generated successfully!');
  console.log('='.repeat(80));
}

// Export for use in main
export { DungeonGenerator };
