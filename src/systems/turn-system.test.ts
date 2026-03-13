/**
 * Turn System Test
 * Demonstrates and tests the turn-based scheduler
 */

import { TurnSystem, PlayerAction } from './turn-system';
import { Player } from '../entities/player';
import { Monster, AIBehavior } from '../entities/monster';
import { GameMap, TileType } from '../world/map';
import { FOVSystem } from '../world/fov';

describe('TurnSystem', () => {
  let turnSystem: TurnSystem;
  let player: Player;
  let map: GameMap;
  let fovSystem: FOVSystem;

  beforeEach(() => {
    // Create test environment
    map = new GameMap(20, 20);
    fovSystem = new FOVSystem();
    turnSystem = new TurnSystem(fovSystem);
    
    // Create player at center
    player = new Player(10, 10, 'warrior');
    map.addEntity(player);
  });

  describe('Turn State', () => {
    test('should start waiting for player turn', () => {
      expect(turnSystem.isPlayerTurn()).toBe(true);
      expect(turnSystem.getTurnCount()).toBe(0);
    });

    test('should increment turn count after successful turn', () => {
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [], map, action);
      expect(turnSystem.getTurnCount()).toBe(1);
    });
  });

  describe('Player Movement', () => {
    test('should move player successfully', () => {
      const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
      const result = turnSystem.processTurn(player, [], map, action);
      
      expect(result).toBe(true);
      expect(player.x).toBe(11);
      expect(player.y).toBe(10);
    });

    test('should not move out of bounds', () => {
      player.setPosition(0, 0);
      const action: PlayerAction = { type: 'move', dx: -1, dy: 0 };
      const result = turnSystem.processTurn(player, [], map, action);
      
      expect(result).toBe(false);
      expect(player.x).toBe(0);
      expect(player.y).toBe(0);
    });

    test('should not move into walls', () => {
      map.setTile(11, 10, TileType.WALL, true, true);
      const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
      const result = turnSystem.processTurn(player, [], map, action);
      
      expect(result).toBe(false);
      expect(player.x).toBe(10);
      expect(player.y).toBe(10);
    });
  });

  describe('Player Combat', () => {
    test('should attack adjacent monster', () => {
      const monster = new Monster(
        11, 10,
        'Goblin',
        'g',
        0xff0000,
        10, 5, 2, 5,
        AIBehavior.AGGRESSIVE,
        25
      );
      map.addEntity(monster);

      const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
      const result = turnSystem.processTurn(player, [monster], map, action);
      
      expect(result).toBe(true);
      expect(monster.currentHP).toBeLessThan(monster.maxHP);
    });

    test('should kill monster and gain XP', () => {
      const weakMonster = new Monster(
        11, 10,
        'Rat',
        'r',
        0x888888,
        1, 1, 0, 5,
        AIBehavior.WANDERER,
        10
      );
      map.addEntity(weakMonster);

      const initialXP = player.xp;
      const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
      turnSystem.processTurn(player, [weakMonster], map, action);
      
      expect(weakMonster.isDead()).toBe(true);
      expect(player.xp).toBe(initialXP + 10);
    });
  });

  describe('Player Actions', () => {
    test('should handle wait action', () => {
      const action: PlayerAction = { type: 'wait' };
      const result = turnSystem.processTurn(player, [], map, action);
      
      expect(result).toBe(true);
      expect(player.x).toBe(10);
      expect(player.y).toBe(10);
    });
  });

  describe('Monster AI', () => {
    test('aggressive monster should move towards player', () => {
      const monster = new Monster(
        15, 10,
        'Orc',
        'o',
        0x00ff00,
        20, 8, 3, 5,
        AIBehavior.AGGRESSIVE,
        50
      );
      map.addEntity(monster);

      const initialX = monster.x;
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [monster], map, action);
      
      // Monster should have moved closer to player
      expect(monster.x).toBeLessThan(initialX);
    });

    test('aggressive monster should attack adjacent player', () => {
      const monster = new Monster(
        11, 10,
        'Orc',
        'o',
        0x00ff00,
        20, 8, 3, 5,
        AIBehavior.AGGRESSIVE,
        50
      );
      map.addEntity(monster);

      const initialHP = player.currentHP;
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [monster], map, action);
      
      // Player should have taken damage
      expect(player.currentHP).toBeLessThan(initialHP);
    });

    test('wanderer should move randomly or stay', () => {
      const monster = new Monster(
        15, 15,
        'Slime',
        's',
        0x00ff00,
        10, 3, 1, 5,
        AIBehavior.WANDERER,
        15
      );
      map.addEntity(monster);

      const initialX = monster.x;
      const initialY = monster.y;
      
      // Run multiple turns to account for randomness
      let moved = false;
      for (let i = 0; i < 10; i++) {
        const action: PlayerAction = { type: 'wait' };
        turnSystem.processTurn(player, [monster], map, action);
        if (monster.x !== initialX || monster.y !== initialY) {
          moved = true;
          break;
        }
      }
      
      // Should have moved at some point
      expect(moved).toBe(true);
    });

    test('cowardly monster should flee from player', () => {
      const monster = new Monster(
        12, 10,
        'Rabbit',
        'r',
        0xcccccc,
        5, 2, 1, 8,
        AIBehavior.COWARDLY,
        5
      );
      map.addEntity(monster);

      const initialDistance = Math.abs(monster.x - player.x);
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [monster], map, action);
      
      const newDistance = Math.abs(monster.x - player.x);
      // Monster should have moved away (or stayed if blocked)
      expect(newDistance).toBeGreaterThanOrEqual(initialDistance);
    });

    test('stationary monster should not move', () => {
      const monster = new Monster(
        15, 15,
        'Statue',
        'S',
        0x888888,
        50, 0, 10, 0,
        AIBehavior.STATIONARY,
        0
      );
      map.addEntity(monster);

      const initialX = monster.x;
      const initialY = monster.y;
      
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [monster], map, action);
      
      expect(monster.x).toBe(initialX);
      expect(monster.y).toBe(initialY);
    });
  });

  describe('FOV Integration', () => {
    test('should recalculate FOV after player movement', () => {
      // Place a wall to block sight
      map.setTile(12, 10, TileType.WALL, true, true);
      
      const action: PlayerAction = { type: 'move', dx: 1, dy: 0 };
      turnSystem.processTurn(player, [], map, action);
      
      // Player should be able to see their new position
      const tile = map.getTile(11, 10);
      expect(tile?.visible).toBe(true);
    });
  });

  describe('Multiple Monsters', () => {
    test('should process all monster turns', () => {
      const monsters = [
        new Monster(15, 10, 'Orc1', 'o', 0xff0000, 20, 8, 3, 5, AIBehavior.AGGRESSIVE, 50),
        new Monster(10, 15, 'Orc2', 'o', 0xff0000, 20, 8, 3, 5, AIBehavior.AGGRESSIVE, 50),
        new Monster(5, 5, 'Slime', 's', 0x00ff00, 10, 3, 1, 5, AIBehavior.WANDERER, 15),
      ];

      monsters.forEach(m => map.addEntity(m));

      const action: PlayerAction = { type: 'wait' };
      const result = turnSystem.processTurn(player, monsters, map, action);
      
      expect(result).toBe(true);
      expect(turnSystem.getTurnCount()).toBe(1);
    });
  });

  describe('Reset', () => {
    test('should reset turn system state', () => {
      const action: PlayerAction = { type: 'wait' };
      turnSystem.processTurn(player, [], map, action);
      
      turnSystem.reset();
      
      expect(turnSystem.isPlayerTurn()).toBe(true);
      expect(turnSystem.getTurnCount()).toBe(0);
    });
  });
});
