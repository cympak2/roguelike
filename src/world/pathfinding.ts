/**
 * A* Pathfinding Algorithm for Monster Navigation
 * Implements efficient pathfinding with support for 4/8-directional movement
 */

import { GameMap } from './map';

/**
 * Node in the A* search algorithm
 * Tracks position and cost information
 */
interface AStarNode {
  x: number;
  y: number;
  g: number;        // Cost from start
  h: number;        // Heuristic distance to goal
  f: number;        // g + h
  parent: AStarNode | null;
}

/**
 * Priority queue implementation using binary heap
 * Used to efficiently get the node with lowest f-score
 */
class PriorityQueue {
  private heap: AStarNode[] = [];

  push(node: AStarNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    const last = this.heap.pop()!;
    this.heap[0] = last;
    this.bubbleDown(0);
    return root;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].f < this.heap[parentIndex].f) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && this.heap[leftChild].f < this.heap[smallest].f) {
        smallest = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].f < this.heap[smallest].f) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }
}

/**
 * Main Pathfinder class implementing A* algorithm
 */
export class Pathfinder {
  private maxSearchDepth: number = 1000;        // Prevent infinite loops
  private diagonalMovement: boolean = true;     // Allow 8-directional movement
  private pathCache: Map<string, [number, number][]> = new Map();

  constructor(maxSearchDepth: number = 1000, diagonalMovement: boolean = true) {
    this.maxSearchDepth = maxSearchDepth;
    this.diagonalMovement = diagonalMovement;
  }

  /**
   * Clear the path cache (call when environment changes)
   */
  clearCache(): void {
    this.pathCache.clear();
  }

  /**
   * Find path from start to goal using A* algorithm
   * Returns array of [x, y] positions from start to goal
   * Returns empty array if no path exists
   */
  findPath(
    map: GameMap,
    startX: number,
    startY: number,
    goalX: number,
    goalY: number
  ): [number, number][] {
    // Check bounds
    if (!map.isInBounds(startX, startY) || !map.isInBounds(goalX, goalY)) {
      return [];
    }

    // Check if start or goal is blocked
    if (map.isBlocked(startX, startY) || map.isBlocked(goalX, goalY)) {
      return [];
    }

    // Check cache
    const cacheKey = `${startX},${startY},${goalX},${goalY}`;
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey)!;
    }

    // Initialize A* search
    const openSet = new PriorityQueue();
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const nodeMap = new Map<string, AStarNode>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, goalX, goalY),
      f: this.heuristic(startX, startY, goalX, goalY),
      parent: null,
    };

    openSet.push(startNode);
    gScore.set(`${startX},${startY}`, 0);
    nodeMap.set(`${startX},${startY}`, startNode);

    let iterations = 0;

    while (!openSet.isEmpty()) {
      iterations++;

      // Check max search depth
      if (iterations > this.maxSearchDepth) {
        return [];
      }

      const current = openSet.pop()!;
      const currentKey = `${current.x},${current.y}`;

      // Check if we reached the goal
      if (current.x === goalX && current.y === goalY) {
        const path = this.reconstructPath(current);
        this.pathCache.set(cacheKey, path);
        return path;
      }

      closedSet.add(currentKey);

      // Explore neighbors
      const neighbors = this.getNeighbors(map, current.x, current.y);
      for (const [neighborX, neighborY] of neighbors) {
        const neighborKey = `${neighborX},${neighborY}`;

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate tentative g score
        const moveCost = this.getMovementCost(current.x, current.y, neighborX, neighborY);
        const tentativeG = current.g + moveCost;
        const currentG = gScore.get(neighborKey) ?? Infinity;

        // If this path is not better, skip
        if (tentativeG >= currentG) {
          continue;
        }

        // This path is better, update the neighbor
        const h = this.heuristic(neighborX, neighborY, goalX, goalY);
        const f = tentativeG + h;

        const neighbor: AStarNode = {
          x: neighborX,
          y: neighborY,
          g: tentativeG,
          h: h,
          f: f,
          parent: current,
        };

        gScore.set(neighborKey, tentativeG);
        nodeMap.set(neighborKey, neighbor);
        openSet.push(neighbor);
      }
    }

    // No path found
    return [];
  }

  /**
   * Get valid neighbors for a position
   * Supports both 4-directional (cardinal) and 8-directional (with diagonals)
   */
  getNeighbors(map: GameMap, x: number, y: number): [number, number][] {
    const neighbors: [number, number][] = [];

    // Cardinal directions (4-directional)
    const cardinal = [
      [x + 1, y],      // Right
      [x - 1, y],      // Left
      [x, y + 1],      // Down
      [x, y - 1],      // Up
    ];

    // Diagonal directions (8-directional)
    const diagonal = [
      [x + 1, y + 1],  // Down-Right
      [x - 1, y + 1],  // Down-Left
      [x + 1, y - 1],  // Up-Right
      [x - 1, y - 1],  // Up-Left
    ];

    // Check cardinal neighbors
    for (const [nx, ny] of cardinal) {
      if (map.isInBounds(nx, ny) && !map.isBlocked(nx, ny)) {
        neighbors.push([nx, ny]);
      }
    }

    // Check diagonal neighbors if enabled
    if (this.diagonalMovement) {
      for (const [nx, ny] of diagonal) {
        if (map.isInBounds(nx, ny) && !map.isBlocked(nx, ny)) {
          neighbors.push([nx, ny]);
        }
      }
    }

    return neighbors;
  }

  /**
   * Heuristic function for A* - Manhattan distance
   * Could use Euclidean for diagonal movement
   */
  heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);

    // Uncomment for Euclidean distance (slightly less efficient but more accurate):
    // const dx = x1 - x2;
    // const dy = y1 - y2;
    // return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get movement cost between two adjacent tiles
   * Diagonal movement costs more (1.4) than cardinal (1.0)
   */
  private getMovementCost(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);

    // Diagonal movement
    if (dx === 1 && dy === 1) {
      return 1.4;
    }

    // Cardinal movement
    return 1.0;
  }

  /**
   * Reconstruct path from goal node to start
   * Returns array of [x, y] positions
   */
  private reconstructPath(node: AStarNode): [number, number][] {
    const path: [number, number][] = [];
    let current: AStarNode | null = node;

    while (current !== null) {
      path.unshift([current.x, current.y]);
      current = current.parent;
    }

    return path;
  }

  /**
   * Get just the next step towards the goal
   * Useful for simple AI that only needs one step at a time
   */
  getNextStep(
    map: GameMap,
    startX: number,
    startY: number,
    goalX: number,
    goalY: number
  ): [number, number] | null {
    const path = this.findPath(map, startX, startY, goalX, goalY);

    if (path.length > 1) {
      return path[1];
    }

    return null;
  }

  /**
   * Check line-of-sight between two points
   * Used for ranged AI and visibility checks
   * Returns true if there's a clear line of sight
   */
  isPathClear(map: GameMap, x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;

    let err = dx - dy;
    let x = x1;
    let y = y1;

    while (true) {
      // Check if this tile blocks sight
      if (
        map.isBlocked(x, y) &&
        (x !== x1 || y !== y1) &&
        (x !== x2 || y !== y2)
      ) {
        return false;
      }

      // Reached the goal
      if (x === x2 && y === y2) {
        return true;
      }

      // Bresenham's line algorithm step
      const err2 = 2 * err;
      if (err2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (err2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Calculate distance between two points (Euclidean)
   */
  static getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Manhattan distance
   */
  static getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * Calculate Chebyshev distance (chess king distance)
   */
  static getChebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  }
}

/**
 * Singleton instance for global pathfinding
 */
let pathfinderInstance: Pathfinder | null = null;

/**
 * Get or create the global Pathfinder instance
 */
export function getPathfinder(maxSearchDepth: number = 1000, diagonalMovement: boolean = true): Pathfinder {
  if (!pathfinderInstance) {
    pathfinderInstance = new Pathfinder(maxSearchDepth, diagonalMovement);
  }
  return pathfinderInstance;
}

/**
 * Helper function - Find path between two points
 */
export function findPath(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): [number, number][] {
  return getPathfinder().findPath(map, startX, startY, goalX, goalY);
}

/**
 * Helper function - Get next step towards goal
 */
export function getNextStep(
  map: GameMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): [number, number] | null {
  return getPathfinder().getNextStep(map, startX, startY, goalX, goalY);
}

/**
 * Helper function - Check line of sight
 */
export function isPathClear(
  map: GameMap,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  return getPathfinder().isPathClear(map, x1, y1, x2, y2);
}

/**
 * Helper function - Get distance
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Pathfinder.getDistance(x1, y1, x2, y2);
}
