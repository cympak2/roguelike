/**
 * Movement System
 * Handles keyboard input processing and player movement with collision detection
 * Supports multiple input schemes: Arrow keys, Numpad, and Vi-keys
 */

import Phaser from 'phaser';
import { Player } from '../entities/player';
import { Entity } from '../entities/Entity';
import { GameMap, TileType } from '../world/map';

// ============================================================================
// DIRECTION VECTORS
// ============================================================================

/**
 * Direction vectors for 8 directions of movement
 * X increases to the right, Y increases downward
 */
const DIRECTION_MAP = {
  // 4-directional (arrow keys)
  'up': { dx: 0, dy: -1 },
  'down': { dx: 0, dy: 1 },
  'left': { dx: -1, dy: 0 },
  'right': { dx: 1, dy: 0 },

  // 8-directional (numpad)
  'numpad-7': { dx: -1, dy: -1 }, // NW
  'numpad-8': { dx: 0, dy: -1 },  // N
  'numpad-9': { dx: 1, dy: -1 },  // NE
  'numpad-4': { dx: -1, dy: 0 },  // W
  'numpad-5': { dx: 0, dy: 0 },   // Center (wait)
  'numpad-6': { dx: 1, dy: 0 },   // E
  'numpad-1': { dx: -1, dy: 1 },  // SW
  'numpad-2': { dx: 0, dy: 1 },   // S
  'numpad-3': { dx: 1, dy: 1 },   // SE

  // Vi-keys (hjkl, yubn)
  'y': { dx: -1, dy: -1 }, // NW
  'k': { dx: 0, dy: -1 },  // N
  'u': { dx: 1, dy: -1 },  // NE
  'h': { dx: -1, dy: 0 },  // W
  '.': { dx: 0, dy: 0 },   // Center (wait)
  'l': { dx: 1, dy: 0 },   // E
  'b': { dx: -1, dy: 1 },  // SW
  'j': { dx: 0, dy: 1 },   // S
  'n': { dx: 1, dy: 1 },   // SE

  // Wait/skip turn
  ' ': { dx: 0, dy: 0 },   // Space
};

// ============================================================================
// MOVEMENT SYSTEM CLASS
// ============================================================================

export class MovementSystem {
  private player: Player;
  private map: GameMap;
  private keyPressHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, player: Player, map: GameMap) {
    this.player = player;
    this.map = map;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Set up keyboard event listeners
   * Attaches keyboard input handler to the window
   */
  initialize(): void {
    this.keyPressHandler = this.handleKeyPress.bind(this);
    window.addEventListener('keydown', this.keyPressHandler);
  }

  /**
   * Clean up keyboard event listeners
   */
  destroy(): void {
    if (this.keyPressHandler) {
      window.removeEventListener('keydown', this.keyPressHandler);
      this.keyPressHandler = null;
    }
  }

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  /**
   * Handle keyboard input from player
   * @param event - Keyboard event
   * @returns true if a turn-consuming action was taken
   */
  private handleKeyPress(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    
    // Handle arrow keys
    if (key === 'arrowup') {
      event.preventDefault();
      return this.handleMovementInput('up');
    }
    if (key === 'arrowdown') {
      event.preventDefault();
      return this.handleMovementInput('down');
    }
    if (key === 'arrowleft') {
      event.preventDefault();
      return this.handleMovementInput('left');
    }
    if (key === 'arrowright') {
      event.preventDefault();
      return this.handleMovementInput('right');
    }

    // Handle numpad keys (0-9)
    if (event.location === 3) { // KeyboardEvent.DOM_KEY_LOCATION_NUMPAD
      const numpadMap: { [key: string]: string } = {
        '7': 'numpad-7', '8': 'numpad-8', '9': 'numpad-9',
        '4': 'numpad-4', '5': 'numpad-5', '6': 'numpad-6',
        '1': 'numpad-1', '2': 'numpad-2', '3': 'numpad-3',
      };
      if (numpadMap[key]) {
        event.preventDefault();
        return this.handleMovementInput(numpadMap[key]);
      }
    }

    // Handle Vi-keys (hjkl, yubn, ., space)
    if (['h', 'j', 'k', 'l', 'y', 'u', 'b', 'n', '.'].includes(key)) {
      event.preventDefault();
      return this.handleMovementInput(key);
    }

    // Handle space (wait)
    if (key === ' ') {
      event.preventDefault();
      return this.handleMovementInput(' ');
    }

    return false;
  }

  // ============================================================================
  // MOVEMENT LOGIC
  // ============================================================================

  /**
   * Process movement input and execute the movement
   * @param direction - Direction key from input
   * @returns true if a turn was taken (movement or wait)
   */
  private handleMovementInput(direction: string): boolean {
    const directionData = DIRECTION_MAP[direction as keyof typeof DIRECTION_MAP];
    
    if (!directionData) {
      return false;
    }

    // Check if this is a wait action (no movement)
    if (directionData.dx === 0 && directionData.dy === 0) {
      return this.handleWait();
    }

    // Attempt movement
    return this.tryMove(this.player, directionData.dx, directionData.dy);
  }

  /**
   * Attempt to move the player in a direction
   * Handles collision detection and special tiles
   * @param player - The player entity
   * @param dx - Change in X (-1, 0, 1)
   * @param dy - Change in Y (-1, 0, 1)
   * @returns true if movement was successful (turn consumed)
   */
  tryMove(player: Player, dx: number, dy: number): boolean {
    const newX = player.x + dx;
    const newY = player.y + dy;

    // Check bounds
    if (!this.map.isInBounds(newX, newY)) {
      this.logMessage('You hit a wall!');
      return false;
    }

    // Check if tile is passable
    if (!this.canMoveTo(newX, newY)) {
      const tile = this.map.getTile(newX, newY);
      if (tile?.type === TileType.DOOR_CLOSED) {
        return this.handleDoorInteraction(newX, newY);
      }
      this.logMessage('You cannot move there!');
      return false;
    }

    // Check for entity at target position (combat)
    const entity = this.map.getEntityAt(newX, newY);
    if (entity && entity !== player) {
      return this.handleEntityInteraction(entity);
    }

    // Check for items at target position
    const items = this.getItemsAt(newX, newY);
    if (items.length > 0) {
      this.handleItemPickup(items);
    }

    // Check for special tiles (stairs, etc)
    const tile = this.map.getTile(newX, newY);
    if (tile) {
      if (tile.type === TileType.STAIRS_DOWN) {
        this.logMessage('You see stairs going down. (Press > to descend)');
      } else if (tile.type === TileType.STAIRS_UP) {
        this.logMessage('You see stairs going up. (Press < to ascend)');
      }
    }

    // Perform movement
    player.setPosition(newX, newY);
    this.logMessage(`You move to (${newX}, ${newY})`);
    
    return true; // Turn consumed
  }

  /**
   * Check if a tile is passable (not blocked)
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   * @returns true if the tile can be walked on
   */
  canMoveTo(x: number, y: number): boolean {
    const tile = this.map.getTile(x, y);
    
    if (!tile) {
      return false; // Out of bounds
    }

    // Impassable tiles
    if (tile.blocked) {
      return false;
    }

    // Check for entities blocking the path
    if (this.map.getEntityAt(x, y)) {
      return false;
    }

    return true;
  }

  /**
   * Get entity at position
   * @param x - Entity X coordinate
   * @param y - Entity Y coordinate
   * @returns Entity at position or null
   */
  getEntityAt(x: number, y: number): Entity | null {
    return this.map.getEntityAt(x, y);
  }

  /**
   * Get items at position
   * @param x - Item X coordinate
   * @param y - Item Y coordinate
   * @returns Array of items at position
   */
  private getItemsAt(x: number, y: number): typeof this.map.items {
    return this.map.items.filter(item => item.x === x && item.y === y);
  }

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  /**
   * Handle wait/skip turn action
   * @returns true (turn consumed)
   */
  private handleWait(): boolean {
    this.logMessage('You wait...');
    return true; // Turn consumed
  }

  /**
   * Handle interaction with entity (combat)
   * @param entity - Entity being interacted with
   * @returns true if action was performed
   */
  private handleEntityInteraction(entity: Entity): boolean {
    this.logMessage(`You encounter a ${entity.name}!`);
    // TODO: Implement combat system
    // For now, just report the encounter
    return false; // Don't consume turn until combat is implemented
  }

  /**
   * Handle door interaction (open/close)
   * @param x - Door X coordinate
   * @param y - Door Y coordinate
   * @returns true if door was opened
   */
  private handleDoorInteraction(x: number, y: number): boolean {
    const tile = this.map.getTile(x, y);
    
    if (tile?.type === TileType.DOOR_CLOSED) {
      this.map.setTile(x, y, TileType.DOOR_OPEN, false, false);
      this.logMessage('You open the door.');
      return true; // Turn consumed
    }
    
    return false;
  }

  /**
   * Handle item pickup prompt
   * @param items - Items to pick up
   */
  private handleItemPickup(items: typeof this.map.items): void {
    // TODO: Implement item pickup system
    // For now, just log the presence of items
    if (items.length === 1) {
      this.logMessage(`You see a ${items[0].name}.`);
    } else {
      this.logMessage(`You see ${items.length} items here.`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Log a message to the message system
   * @param message - Message to log
   */
  private logMessage(message: string): void {
    // TODO: Connect to message system
    console.log(message);
  }

  /**
   * Get input key mappings reference
   */
  static getInputMappings(): string {
    return `
Input Mappings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arrow Keys:           4-Directional Movement
  ↑ ↓ ← →              Up, Down, Left, Right

Numpad (1-9):         8-Directional + Center
  7 8 9                Northwest, North, Northeast
  4 5 6                West, Wait, East
  1 2 3                Southwest, South, Southeast

Vi-Keys:              8-Directional + Center
  y k u                Northwest, North, Northeast
  h . l                West, Wait, East
  b j n                Southwest, South, Southeast

Wait/Skip Turn:
  Space, . (period)   Skip your turn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

export default MovementSystem;
