/**
 * Binary Space Partitioning (BSP) Dungeon Generator
 * Generates multi-level dungeons with varied room sizes, corridors, and special features
 */

import { GameMap, TileType } from './map';

/**
 * Rectangular region used for BSP splitting
 */
interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  center?: { x: number; y: number };
}

/**
 * Represents a node in the BSP tree
 */
interface BSPNode {
  room: Room;
  left?: BSPNode;
  right?: BSPNode;
  depth: number;
}

/**
 * Configuration for dungeon generation
 */
interface DungeonConfig {
  minRoomSize: number;
  maxRoomSize: number;
  minRoomWidth: number;
  minRoomHeight: number;
  horizontalSplitChance: number;
  treasureChance: number;
  hiddenRoomChance: number;
  trapChance: number;
}

/**
 * Binary Space Partitioning Dungeon Generator
 * Uses recursive splitting to create interconnected dungeon layouts
 */
export class DungeonGenerator {
  private random: seededRandom;

  constructor(seed?: number) {
    this.random = new seededRandom(seed);
  }

  /**
   * Generate a complete dungeon floor
   * @param floorNumber Floor number (1-10), affects difficulty
   * @param width Map width in tiles
   * @param height Map height in tiles
   * @returns Generated GameMap
   */
  generate(floorNumber: number, width: number = 80, height: number = 40): GameMap {
    const map = new GameMap(width, height);

    // Initialize with all walls
    this.fillWithWalls(map);

    // Get configuration based on floor difficulty
    const config = this.getConfigForFloor(floorNumber);
    const maxDepth = this.getMaxDepthForFloor(floorNumber);

    // Create root room
    const rootRoom: Room = {
      x: 1,
      y: 1,
      width: width - 2,
      height: height - 2,
    };

    // Generate BSP tree
    const bspTree = this.generateBSPTree(rootRoom, 0, maxDepth);

    // Extract leaf rooms and carve them out
    const leafRooms = this.extractLeafRooms(bspTree);
    leafRooms.forEach(room => this.createRoom(map, room));

    // Connect rooms with corridors
    this.connectRooms(map, bspTree, leafRooms);

    // Place stairs
    this.placeStairs(map, floorNumber);
    this.placeEnvironmentalFeatures(map, leafRooms, floorNumber);
    this.placeCampfires(map, leafRooms, floorNumber);

    // Place special features based on floor
    if (floorNumber >= 3) {
      this.placeTraps(map, floorNumber);
    }

    if (floorNumber >= 5) {
      this.placeTreasureRooms(map, leafRooms);
    }

    if (floorNumber === 10) {
      this.createBossRoom(map, leafRooms);
    }

    // Add hidden rooms
    if (this.random.chance(config.hiddenRoomChance)) {
      this.createHiddenRoom(map, leafRooms);
    }

    return map;
  }

  /**
   * Get dungeon configuration based on floor number
   */
  private getConfigForFloor(floorNumber: number): DungeonConfig {
    if (floorNumber <= 2) {
      return {
        minRoomSize: 4,
        maxRoomSize: 8,
        minRoomWidth: 4,
        minRoomHeight: 4,
        horizontalSplitChance: 0.5,
        treasureChance: 0.1,
        hiddenRoomChance: 0.1,
        trapChance: 0.05,
      };
    } else if (floorNumber <= 5) {
      return {
        minRoomSize: 6,
        maxRoomSize: 12,
        minRoomWidth: 5,
        minRoomHeight: 5,
        horizontalSplitChance: 0.5,
        treasureChance: 0.15,
        hiddenRoomChance: 0.2,
        trapChance: 0.1,
      };
    } else if (floorNumber <= 8) {
      return {
        minRoomSize: 8,
        maxRoomSize: 16,
        minRoomWidth: 6,
        minRoomHeight: 6,
        horizontalSplitChance: 0.5,
        treasureChance: 0.2,
        hiddenRoomChance: 0.25,
        trapChance: 0.2,
      };
    } else {
      // Floors 9-10
      return {
        minRoomSize: 10,
        maxRoomSize: 20,
        minRoomWidth: 8,
        minRoomHeight: 8,
        horizontalSplitChance: 0.5,
        treasureChance: 0.25,
        hiddenRoomChance: 0.3,
        trapChance: 0.3,
      };
    }
  }

  /**
   * Get maximum BSP recursion depth for floor
   */
  private getMaxDepthForFloor(floorNumber: number): number {
    if (floorNumber <= 2) return 4; // 3-5 rooms
    if (floorNumber <= 5) return 5; // 5-8 rooms
    if (floorNumber <= 8) return 6; // 6-10 rooms
    return 6; // 8-12 rooms
  }

  /**
   * Recursively generate BSP tree by splitting regions
   */
  private generateBSPTree(
    room: Room,
    depth: number,
    maxDepth: number
  ): BSPNode {
    const node: BSPNode = {
      room,
      depth,
    };

    // Stop recursion at max depth
    if (depth >= maxDepth) {
      return node;
    }

    const config = this.getConfigForFloor(11); // Use high floor config for max room size
    const canSplitHorizontally =
      room.height > config.minRoomHeight + config.minRoomHeight + 2;
    const canSplitVertically =
      room.width > config.minRoomWidth + config.minRoomWidth + 2;

    // Decide split direction
    let splitHorizontal: boolean;
    if (canSplitHorizontally && canSplitVertically) {
      splitHorizontal = this.random.chance(0.5);
    } else if (canSplitHorizontally) {
      splitHorizontal = true;
    } else if (canSplitVertically) {
      splitHorizontal = false;
    } else {
      // Can't split further
      return node;
    }

    if (splitHorizontal) {
      const splitY = this.random.randomInt(
        room.y + config.minRoomHeight,
        room.y + room.height - config.minRoomHeight
      );

      const topRoom: Room = {
        x: room.x,
        y: room.y,
        width: room.width,
        height: splitY - room.y,
      };

      const bottomRoom: Room = {
        x: room.x,
        y: splitY,
        width: room.width,
        height: room.y + room.height - splitY,
      };

      node.left = this.generateBSPTree(topRoom, depth + 1, maxDepth);
      node.right = this.generateBSPTree(bottomRoom, depth + 1, maxDepth);
    } else {
      const splitX = this.random.randomInt(
        room.x + config.minRoomWidth,
        room.x + room.width - config.minRoomWidth
      );

      const leftRoom: Room = {
        x: room.x,
        y: room.y,
        width: splitX - room.x,
        height: room.height,
      };

      const rightRoom: Room = {
        x: splitX,
        y: room.y,
        width: room.x + room.width - splitX,
        height: room.height,
      };

      node.left = this.generateBSPTree(leftRoom, depth + 1, maxDepth);
      node.right = this.generateBSPTree(rightRoom, depth + 1, maxDepth);
    }

    return node;
  }

  /**
   * Extract all leaf rooms (rooms without children) from BSP tree
   */
  private extractLeafRooms(node: BSPNode | undefined): Room[] {
    if (!node) return [];

    if (!node.left && !node.right) {
      // Leaf node - this is a room to be carved
      return [node.room];
    }

    const rooms: Room[] = [];
    if (node.left) rooms.push(...this.extractLeafRooms(node.left));
    if (node.right) rooms.push(...this.extractLeafRooms(node.right));

    return rooms;
  }

  /**
   * Carve a rectangular room into the map
   */
  private createRoom(map: GameMap, room: Room): void {
    // Calculate actual room size (slightly smaller than partition)
    const minWidth = 4;
    const maxWidth = Math.min(12, room.width - 2);
    const minHeight = 4;
    const maxHeight = Math.min(10, room.height - 2);

    const width = this.random.randomInt(minWidth, maxWidth);
    const height = this.random.randomInt(minHeight, maxHeight);

    // Center room in partition
    const x = room.x + Math.floor((room.width - width) / 2);
    const y = room.y + Math.floor((room.height - height) / 2);

    // Carve room
    for (let roomY = y; roomY < y + height; roomY++) {
      for (let roomX = x; roomX < x + width; roomX++) {
        if (map.isInBounds(roomX, roomY)) {
          map.setTile(roomX, roomY, TileType.FLOOR);
        }
      }
    }

    // Store room center for corridor generation
    room.center = {
      x: x + Math.floor(width / 2),
      y: y + Math.floor(height / 2),
    };
  }

  /**
   * Connect rooms using L-shaped corridors
   */
  private connectRooms(map: GameMap, node: BSPNode | undefined, rooms: Room[]): void {
    if (!node || !node.left || !node.right) return;

    // Get the rightmost room of left subtree and leftmost of right subtree
    const leftRooms = this.extractLeafRooms(node.left);
    const rightRooms = this.extractLeafRooms(node.right);

    if (leftRooms.length > 0 && rightRooms.length > 0) {
      const room1 = leftRooms[leftRooms.length - 1];
      const room2 = rightRooms[0];

      if (room1.center && room2.center) {
        this.createLShapedCorridor(map, room1.center, room2.center);
      }
    }

    // Recursively connect subtrees
    this.connectRooms(map, node.left, rooms);
    this.connectRooms(map, node.right, rooms);
  }

  /**
   * Create an L-shaped corridor between two points
   */
  private createLShapedCorridor(
    map: GameMap,
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): void {
    let x = from.x;
    let y = from.y;

    // Horizontal corridor first
    if (this.random.chance(0.5)) {
      while (x !== to.x) {
        if (map.isInBounds(x, y)) {
          map.setTile(x, y, TileType.FLOOR);
        }
        x += x < to.x ? 1 : -1;
      }

      // Then vertical
      while (y !== to.y) {
        if (map.isInBounds(x, y)) {
          map.setTile(x, y, TileType.FLOOR);
        }
        y += y < to.y ? 1 : -1;
      }
    } else {
      // Vertical corridor first
      while (y !== to.y) {
        if (map.isInBounds(x, y)) {
          map.setTile(x, y, TileType.FLOOR);
        }
        y += y < to.y ? 1 : -1;
      }

      // Then horizontal
      while (x !== to.x) {
        if (map.isInBounds(x, y)) {
          map.setTile(x, y, TileType.FLOOR);
        }
        x += x < to.x ? 1 : -1;
      }
    }
  }

  /**
   * Place stairs up/down for floor transitions
   */
  private placeStairs(map: GameMap, floorNumber: number): void {
    const floorTiles = this.getFloorTiles(map);
    if (floorTiles.length === 0) return;

    const preferredTiles = floorTiles.filter((tile) =>
      this.isSuitableStairTile(map, tile.x, tile.y)
    );
    const candidates = preferredTiles.length > 0 ? preferredTiles : floorTiles;

    let upPos: { x: number; y: number } | null = null;

    // Place stairs up on ALL dungeon floors (including floor 1 for return to town)
    if (floorNumber >= 1) {
      const upIndex = this.random.randomInt(0, candidates.length - 1);
      upPos = candidates[upIndex];
      map.setTile(upPos.x, upPos.y, TileType.STAIRS_UP);
    }

    // Place stairs down (except on floor 10), far from stairs up if possible
    if (floorNumber < 10) {
      const minStairDistance = 10;
      const downCandidates = candidates.filter((tile) => {
        if (!upPos) return true;
        const distance = Math.abs(tile.x - upPos.x) + Math.abs(tile.y - upPos.y);
        return distance >= minStairDistance;
      });

      const usableDownCandidates = downCandidates.length > 0 ? downCandidates : floorTiles;
      const downPos = this.pickFarthestTileFrom(usableDownCandidates, upPos);
      map.setTile(downPos.x, downPos.y, TileType.STAIRS_DOWN);
    }
  }

  private placeCampfires(
    map: GameMap,
    rooms: Room[],
    floorNumber: number
  ): void {
    if (rooms.length === 0) {
      return;
    }

    const maxCampfires = floorNumber >= 7 ? 3 : floorNumber >= 4 ? 2 : 1;
    const campfireCount = this.random.randomInt(1, maxCampfires);
    const eligibleRooms = rooms.filter((room) => room.width >= 5 && room.height >= 5 && room.center);
    if (eligibleRooms.length === 0) {
      return;
    }

    for (let i = 0; i < campfireCount; i++) {
      const room = eligibleRooms[this.random.randomInt(0, eligibleRooms.length - 1)];
      if (!room?.center) {
        continue;
      }

      const offsets = [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const offset of offsets) {
        const x = room.center.x + offset.dx;
        const y = room.center.y + offset.dy;
        const tile = map.getTile(x, y);
        if (!tile || tile.type !== TileType.FLOOR) {
          continue;
        }
        map.setTile(x, y, TileType.CAMPFIRE, false, false);
        break;
      }
    }
  }

  private placeEnvironmentalFeatures(map: GameMap, rooms: Room[], floorNumber: number): void {
    if (rooms.length === 0 || floorNumber <= 0) {
      return;
    }

    const waterPoolCount = floorNumber >= 2 ? this.random.randomInt(1, floorNumber >= 6 ? 3 : 2) : 0;
    const lavaPoolCount = floorNumber >= 5 ? this.random.randomInt(1, floorNumber >= 8 ? 3 : 2) : 0;

    for (let i = 0; i < waterPoolCount; i++) {
      this.placeEnvironmentalPool(map, rooms, TileType.WATER, 6, 14);
    }
    for (let i = 0; i < lavaPoolCount; i++) {
      this.placeEnvironmentalPool(map, rooms, TileType.LAVA, 4, 10);
    }
  }

  private placeEnvironmentalPool(
    map: GameMap,
    rooms: Room[],
    type: TileType.WATER | TileType.LAVA,
    minSize: number,
    maxSize: number
  ): void {
    const eligibleRooms = rooms.filter((room) => room.width >= 6 && room.height >= 6 && room.center);
    if (eligibleRooms.length === 0) {
      return;
    }

    const seedRoom = eligibleRooms[this.random.randomInt(0, eligibleRooms.length - 1)];
    if (!seedRoom?.center) {
      return;
    }

    let x = seedRoom.center.x + this.random.randomInt(-2, 2);
    let y = seedRoom.center.y + this.random.randomInt(-2, 2);
    if (!this.isEnvironmentalTileCandidate(map, x, y)) {
      return;
    }

    const targetSize = this.random.randomInt(minSize, maxSize);
    let placed = 0;

    for (let attempts = 0; attempts < targetSize * 8 && placed < targetSize; attempts++) {
      if (this.isEnvironmentalTileCandidate(map, x, y)) {
        map.setTile(x, y, type, false, false);
        placed++;
      }

      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      const next = directions[this.random.randomInt(0, directions.length - 1)];
      x += next.dx;
      y += next.dy;
    }
  }

  private isEnvironmentalTileCandidate(map: GameMap, x: number, y: number): boolean {
    const tile = map.getTile(x, y);
    if (!tile || tile.type !== TileType.FLOOR) {
      return false;
    }

    const guardedTypes = new Set<TileType>([
      TileType.STAIRS_UP,
      TileType.STAIRS_DOWN,
      TileType.DOOR_OPEN,
      TileType.DOOR_CLOSED,
      TileType.CHEST_CLOSED,
      TileType.CHEST_OPEN,
      TileType.ALTAR,
      TileType.CAMPFIRE,
      TileType.FOUNTAIN,
    ]);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nearby = map.getTile(x + dx, y + dy);
        if (!nearby) {
          continue;
        }
        if (guardedTypes.has(nearby.type)) {
          return false;
        }
      }
    }

    return true;
  }

  private getFloorTiles(map: GameMap): Array<{ x: number; y: number }> {
    const floorTiles: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const tile = map.getTile(x, y);
        if (tile && tile.type === TileType.FLOOR) {
          floorTiles.push({ x, y });
        }
      }
    }
    return floorTiles;
  }

  private isSuitableStairTile(map: GameMap, x: number, y: number): boolean {
    // Prefer open room-like tiles, not corridor chokepoints.
    let adjacentFloors = 0;
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const neighbor of neighbors) {
      const tile = map.getTile(neighbor.x, neighbor.y);
      if (tile && tile.type === TileType.FLOOR) {
        adjacentFloors++;
      }
    }

    return adjacentFloors >= 3;
  }

  private pickFarthestTileFrom(
    tiles: Array<{ x: number; y: number }>,
    from: { x: number; y: number } | null
  ): { x: number; y: number } {
    if (tiles.length === 0) {
      return { x: 1, y: 1 };
    }
    if (!from) {
      return tiles[this.random.randomInt(0, tiles.length - 1)];
    }

    let bestTile = tiles[0];
    let bestDistance = -1;
    for (const tile of tiles) {
      const distance = Math.abs(tile.x - from.x) + Math.abs(tile.y - from.y);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestTile = tile;
      }
    }
    return bestTile;
  }

  /**
   * Place traps scattered across the floor
   */
  private placeTraps(map: GameMap, floorNumber: number): void {
    const trapDensity = Math.min(0.05 + (floorNumber - 3) * 0.01, 0.15);

    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const tile = map.getTile(x, y);
        if (!tile || tile.type !== TileType.FLOOR || !this.random.chance(trapDensity)) {
          continue;
        }

        // Avoid placing traps adjacent to high-traffic special tiles.
        const nearbySpecialTile = [
          { x, y },
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ].some((pos) => {
          const nearby = map.getTile(pos.x, pos.y);
          if (!nearby) return false;
          return (
            nearby.type === TileType.STAIRS_UP ||
            nearby.type === TileType.STAIRS_DOWN ||
            nearby.type === TileType.DOOR_OPEN ||
            nearby.type === TileType.DOOR_CLOSED ||
            nearby.type === TileType.ALTAR
          );
        });
        if (nearbySpecialTile) {
          continue;
        }

        const existingTrap = typeof (map as GameMap & { getTrapAt?: (tx: number, ty: number) => unknown }).getTrapAt === 'function'
          ? map.getTrapAt(x, y)
          : map.traps.find((trap) => trap.x === x && trap.y === y && !trap.disarmed);
        if (existingTrap) {
          continue;
        }

        const damage = this.random.randomInt(6 + floorNumber, 10 + floorNumber * 2);
        map.addTrap({
          id: `trap_spike_${floorNumber}_${x}_${y}`,
          type: 'spike',
          x,
          y,
          damage,
          revealed: false,
          disarmed: false,
        });
      }
    }
  }

  /**
   * Create treasure rooms with locked doors
   */
  private placeTreasureRooms(
    map: GameMap,
    rooms: Room[]
  ): void {
    // Pick a random room to be a treasure room
    if (rooms.length < 2) return;

    const treasureIndex = this.random.randomInt(1, Math.floor(rooms.length * 0.7));
    const treasureRoom = rooms[treasureIndex];

    if (!treasureRoom.center) return;

    // Place a closed door at the entrance
    const x = treasureRoom.center.x - 1;
    const y = treasureRoom.center.y;

    if (map.isInBounds(x, y)) {
      map.setTile(x, y, TileType.DOOR_CLOSED, true, true);
    }

    // Place a locked chest inside the treasure room.
    const chestX = treasureRoom.center.x;
    const chestY = treasureRoom.center.y;
    if (map.isInBounds(chestX, chestY)) {
      map.setTile(chestX, chestY, TileType.CHEST_CLOSED, true, false);
    }
  }

  /**
   * Create a special boss room on floor 10
   */
  private createBossRoom(map: GameMap, rooms: Room[]): void {
    if (rooms.length === 0) return;

    // Use the largest room as the boss room
    let largestRoom = rooms[0];
    let maxArea = rooms[0].width * rooms[0].height;

    for (const room of rooms) {
      const area = room.width * room.height;
      if (area > maxArea) {
        maxArea = area;
        largestRoom = room;
      }
    }

    // Make the boss room larger and more distinctive
    const width = Math.min(20, largestRoom.width - 2);
    const height = Math.min(15, largestRoom.height - 2);
    const x = largestRoom.x + Math.floor((largestRoom.width - width) / 2);
    const y = largestRoom.y + Math.floor((largestRoom.height - height) / 2);

    // Clear and recreate the room
    for (let roomY = y; roomY < y + height; roomY++) {
      for (let roomX = x; roomX < x + width; roomX++) {
        if (map.isInBounds(roomX, roomY)) {
          map.setTile(roomX, roomY, TileType.FLOOR);
        }
      }
    }

    // Add altar at center
    const centerX = x + Math.floor(width / 2);
    const centerY = y + Math.floor(height / 2);
    if (map.isInBounds(centerX, centerY)) {
      map.setTile(centerX, centerY, TileType.ALTAR);
    }
  }

  /**
   * Create a hidden room accessible only via secret doors
   */
  private createHiddenRoom(map: GameMap, rooms: Room[]): void {
    if (rooms.length === 0) return;

    // Pick a random room to hide a secret room near
    const parentRoom = rooms[this.random.randomInt(0, rooms.length - 1)];

    if (!parentRoom.center) return;

    // Create a small hidden room adjacent to the parent room
    const width = 5 + this.random.randomInt(0, 3);
    const height = 5 + this.random.randomInt(0, 3);

    // Try placing to the right
    let x = parentRoom.x + parentRoom.width;
    let y = parentRoom.y + Math.floor((parentRoom.height - height) / 2);

    // Or try left, top, bottom
    const attempts = [
      { x: parentRoom.x - width - 1, y },
      { x, y: parentRoom.y - height - 1 },
      { x, y: parentRoom.y + parentRoom.height + 1 },
    ];

    for (const attempt of attempts) {
      if (this.canPlaceRoom(map, attempt.x, attempt.y, width, height)) {
        x = attempt.x;
        y = attempt.y;
        break;
      }
    }

    // Carve the hidden room
    for (let roomY = y; roomY < y + height; roomY++) {
      for (let roomX = x; roomX < x + width; roomX++) {
        if (map.isInBounds(roomX, roomY)) {
          map.setTile(roomX, roomY, TileType.FLOOR);
        }
      }
    }

    // Place a secret door (closed door) at the entrance
    const doorX = x + Math.floor(width / 2);
    const doorY = y - 1;
    if (map.isInBounds(doorX, doorY)) {
      map.setTile(doorX, doorY, TileType.DOOR_CLOSED, true, true);
    }
  }

  /**
   * Check if a room can be placed at given coordinates
   */
  private canPlaceRoom(
    map: GameMap,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    for (let roomY = y - 1; roomY < y + height + 1; roomY++) {
      for (let roomX = x - 1; roomX < x + width + 1; roomX++) {
        if (!map.isInBounds(roomX, roomY)) return false;
        const tile = map.getTile(roomX, roomY);
        if (tile && tile.type !== TileType.WALL) return false;
      }
    }
    return true;
  }

  /**
   * Fill entire map with walls
   */
  private fillWithWalls(map: GameMap): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        map.setTile(x, y, TileType.WALL);
      }
    }
  }
}

/**
 * Seeded random number generator for reproducible dungeons
 */
class seededRandom {
  private seed: number;
  private state: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.state = this.seed;
  }

  /**
   * Generate next random number (0-1)
   */
  next(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Random chance (probability 0-1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}
