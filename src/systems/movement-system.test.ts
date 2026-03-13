/**
 * Tests for the Movement System
 * Validates keyboard input handling and movement logic
 */

import { MovementSystem } from './movement-system';
import { Player } from '../entities/player';
import { GameMap, TileType } from '../world/map';
import Phaser from 'phaser';

// Mock Phaser Scene for testing
class MockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TestScene' });
  }

  create(): void {
    // Empty
  }

  update(): void {
    // Empty
  }
}

describe('MovementSystem', () => {
  let scene: Phaser.Scene;
  let player: Player;
  let gameMap: GameMap;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    scene = new MockScene();
    gameMap = new GameMap(80, 40);
    player = new Player(40, 20, 'warrior');
    gameMap.addEntity(player);
    movementSystem = new MovementSystem(scene, player, gameMap);
  });

  afterEach(() => {
    movementSystem.destroy();
  });

  describe('Input Mappings', () => {
    test('should have arrow key mappings', () => {
      const mappings = MovementSystem.getInputMappings();
      expect(mappings).toContain('Arrow Keys');
      expect(mappings).toContain('↑ ↓ ← →');
    });

    test('should have numpad mappings', () => {
      const mappings = MovementSystem.getInputMappings();
      expect(mappings).toContain('Numpad (1-9)');
      expect(mappings).toContain('8-Directional');
    });

    test('should have vi-key mappings', () => {
      const mappings = MovementSystem.getInputMappings();
      expect(mappings).toContain('Vi-Keys');
      expect(mappings).toContain('hjkl');
      expect(mappings).toContain('yubn');
    });
  });

  describe('Movement Validation', () => {
    test('canMoveTo returns true for passable floor tiles', () => {
      const result = movementSystem.canMoveTo(40, 21);
      expect(result).toBe(true);
    });

    test('canMoveTo returns false for blocked tiles', () => {
      gameMap.setTile(40, 21, TileType.WALL, true, true);
      const result = movementSystem.canMoveTo(40, 21);
      expect(result).toBe(false);
    });

    test('canMoveTo returns false for out of bounds', () => {
      const result = movementSystem.canMoveTo(-1, -1);
      expect(result).toBe(false);
    });

    test('canMoveTo returns false when entity occupies tile', () => {
      const otherEntity = new Player(40, 21, 'mage');
      gameMap.addEntity(otherEntity);
      const result = movementSystem.canMoveTo(40, 21);
      expect(result).toBe(false);
    });

    test('getEntityAt returns null when no entity present', () => {
      const entity = movementSystem.getEntityAt(50, 20);
      expect(entity).toBeNull();
    });

    test('getEntityAt returns entity at position', () => {
      const otherEntity = new Player(42, 20, 'rogue');
      gameMap.addEntity(otherEntity);
      const entity = movementSystem.getEntityAt(42, 20);
      expect(entity).toBe(otherEntity);
    });
  });

  describe('Movement Execution', () => {
    test('tryMove updates player position when moving to valid tile', () => {
      const initialX = player.x;
      const initialY = player.y;
      
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(true);
      expect(player.x).toBe(initialX + 1);
      expect(player.y).toBe(initialY);
    });

    test('tryMove returns false when blocked', () => {
      gameMap.setTile(41, 20, TileType.WALL, true, true);
      const initialX = player.x;
      
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(false);
      expect(player.x).toBe(initialX);
    });

    test('tryMove handles movement in all 8 directions', () => {
      const directions = [
        { dx: 0, dy: -1, name: 'up' },
        { dx: 0, dy: 1, name: 'down' },
        { dx: -1, dy: 0, name: 'left' },
        { dx: 1, dy: 0, name: 'right' },
        { dx: -1, dy: -1, name: 'northwest' },
        { dx: 1, dy: -1, name: 'northeast' },
        { dx: -1, dy: 1, name: 'southwest' },
        { dx: 1, dy: 1, name: 'southeast' },
      ];

      for (const direction of directions) {
        // Reset player position
        player.setPosition(40, 20);
        
        const result = movementSystem.tryMove(player, direction.dx, direction.dy);
        
        expect(result).toBe(true);
        expect(player.x).toBe(40 + direction.dx);
        expect(player.y).toBe(20 + direction.dy);
      }
    });
  });

  describe('Special Interactions', () => {
    test('tryMove detects stairs down', () => {
      gameMap.setTile(41, 20, TileType.STAIRS_DOWN, false, false);
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(true);
      expect(player.x).toBe(41);
    });

    test('tryMove detects stairs up', () => {
      gameMap.setTile(41, 20, TileType.STAIRS_UP, false, false);
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(true);
      expect(player.x).toBe(41);
    });

    test('tryMove opens closed doors', () => {
      gameMap.setTile(41, 20, TileType.DOOR_CLOSED, true, true);
      
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(true);
      const tile = gameMap.getTile(41, 20);
      expect(tile?.type).toBe(TileType.DOOR_OPEN);
    });

    test('tryMove can move through open doors', () => {
      gameMap.setTile(41, 20, TileType.DOOR_OPEN, false, false);
      
      const result = movementSystem.tryMove(player, 1, 0);
      
      expect(result).toBe(true);
      expect(player.x).toBe(41);
    });
  });

  describe('Initialization & Cleanup', () => {
    test('initialize should attach keyboard listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      movementSystem.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      
      addEventListenerSpy.mockRestore();
    });

    test('destroy should remove keyboard listener', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      movementSystem.initialize();
      movementSystem.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Boundary Conditions', () => {
    test('tryMove prevents movement out of bounds (negative)', () => {
      player.setPosition(0, 0);
      const result = movementSystem.tryMove(player, -1, -1);
      
      expect(result).toBe(false);
      expect(player.x).toBe(0);
      expect(player.y).toBe(0);
    });

    test('tryMove prevents movement out of bounds (positive)', () => {
      player.setPosition(79, 39);
      const result = movementSystem.tryMove(player, 1, 1);
      
      expect(result).toBe(false);
      expect(player.x).toBe(79);
      expect(player.y).toBe(39);
    });

    test('canMoveTo works correctly at map edges', () => {
      expect(movementSystem.canMoveTo(0, 0)).toBe(true);
      expect(movementSystem.canMoveTo(79, 39)).toBe(true);
      expect(movementSystem.canMoveTo(-1, 0)).toBe(false);
      expect(movementSystem.canMoveTo(80, 39)).toBe(false);
      expect(movementSystem.canMoveTo(0, -1)).toBe(false);
      expect(movementSystem.canMoveTo(0, 40)).toBe(false);
    });
  });
});
