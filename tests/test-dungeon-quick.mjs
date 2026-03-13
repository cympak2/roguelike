#!/usr/bin/env node

// Quick test to verify dungeon generation works
import { DungeonGenerator } from './src/world/dungeon-gen.js';
import { TileType } from './src/world/map.js';

console.log('Testing dungeon generation...');

const gen = new DungeonGenerator();
const map = gen.generate(1, 80, 40);

console.log(`Map size: ${map.width}x${map.height}`);

// Count tile types
let stairsUp = 0;
let stairsDown = 0;
let floors = 0;
let walls = 0;

for (let y = 0; y < map.height; y++) {
  for (let x = 0; x < map.width; x++) {
    const tile = map.getTile(x, y);
    if (!tile) continue;
    
    switch(tile.type) {
      case TileType.STAIRS_UP:
        stairsUp++;
        console.log(`Stairs up at ${x}, ${y}`);
        break;
      case TileType.STAIRS_DOWN:
        stairsDown++;
        console.log(`Stairs down at ${x}, ${y}`);
        break;
      case TileType.FLOOR:
        floors++;
        break;
      case TileType.WALL:
        walls++;
        break;
    }
  }
}

console.log(`\nTile counts:`);
console.log(`Floors: ${floors}`);
console.log(`Walls: ${walls}`);
console.log(`Stairs up: ${stairsUp}`);
console.log(`Stairs down: ${stairsDown}`);

if (stairsUp === 0) {
  console.error('ERROR: No stairs up found!');
  process.exit(1);
}

if (stairsDown === 0) {
  console.warn('WARNING: No stairs down found (ok for floor 10)');
}

console.log('\n✅ Dungeon generation test passed');
