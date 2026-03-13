// World utilities and managers
export class WorldManager {
  constructor() {
    console.log('WorldManager initialized');
  }
}

// Export map and tile structures
export { Tile, TileType, GameMap, getGlyph, getColor, type Item } from './map';

// Export town generation
export { TownGenerator, generateTown, type NPCSpawnPoint } from './town-gen';

// Export pathfinding system
export { 
  Pathfinder, 
  getPathfinder, 
  findPath, 
  getNextStep, 
  isPathClear, 
  getDistance 
} from './pathfinding';

// Export dungeon generation system
export { DungeonGenerator } from './dungeon-gen';

// Export FOV system
export { FOVSystem, fovSystem } from './fov';
