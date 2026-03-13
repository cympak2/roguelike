import Phaser from 'phaser';
import { Player } from '../entities/player';
import { GameMap } from '../world/map';
import { ASCIIRenderer } from '../ui/ascii-renderer';

/**
 * CameraSystem manages viewport positioning and camera movement
 * Follows the player and ensures the camera stays within map bounds
 */
export class CameraSystem {
  private scene: Phaser.Scene;
  private viewportWidth: number;
  private viewportHeight: number;
  private cameraX: number;
  private cameraY: number;
  private smoothingEnabled: boolean;
  private smoothingSpeed: number;

  /**
   * Create a new camera system
   * @param scene - The Phaser scene
   * @param viewportWidth - Width of the viewport in tiles
   * @param viewportHeight - Height of the viewport in tiles
   */
  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    this.scene = scene;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.cameraX = 0;
    this.cameraY = 0;
    this.smoothingEnabled = false;
    this.smoothingSpeed = 0.1;
  }

  /**
   * Set the viewport size
   * @param width - New viewport width in tiles
   * @param height - New viewport height in tiles
   */
  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Get the current camera position
   * @returns Object with x and y camera coordinates
   */
  getPosition(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  /**
   * Get the current viewport size
   * @returns Object with width and height
   */
  getViewport(): { width: number; height: number } {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  /**
   * Enable or disable smooth camera movement
   * @param enabled - Whether to enable smooth scrolling
   * @param speed - Smoothing speed (0-1, higher = faster)
   */
  setSmoothScrolling(enabled: boolean, speed: number = 0.1): void {
    this.smoothingEnabled = enabled;
    this.smoothingSpeed = Phaser.Math.Clamp(speed, 0.01, 1.0);
  }

  /**
   * Center the camera on the player's position
   * Automatically clamps to map boundaries
   * @param player - The player entity to follow
   * @param map - The game map
   */
  followPlayer(player: Player, map: GameMap): void {
    // Calculate target camera position (centered on player)
    const targetX = player.x - Math.floor(this.viewportWidth / 2);
    const targetY = player.y - Math.floor(this.viewportHeight / 2);

    // Apply smoothing if enabled
    if (this.smoothingEnabled) {
      this.smoothScroll(targetX, targetY, this.smoothingSpeed);
    } else {
      this.cameraX = targetX;
      this.cameraY = targetY;
    }

    // Clamp to map boundaries
    this.clampToBounds(map);
  }

  /**
   * Smoothly scroll camera to target position
   * @param targetX - Target X position
   * @param targetY - Target Y position
   * @param speed - Movement speed (0-1, higher = faster)
   */
  smoothScroll(targetX: number, targetY: number, speed: number = 0.1): void {
    const clampedSpeed = Phaser.Math.Clamp(speed, 0.01, 1.0);
    
    // Lerp (linear interpolation) towards target
    this.cameraX += (targetX - this.cameraX) * clampedSpeed;
    this.cameraY += (targetY - this.cameraY) * clampedSpeed;

    // Round to avoid sub-pixel positioning issues
    this.cameraX = Math.round(this.cameraX);
    this.cameraY = Math.round(this.cameraY);
  }

  /**
   * Clamp camera position to stay within map bounds
   * Prevents showing area outside the map
   * @param map - The game map
   */
  clampToBounds(map: GameMap): void {
    // If map is smaller than viewport, center the map
    if (map.width <= this.viewportWidth) {
      this.cameraX = Math.floor((this.viewportWidth - map.width) / 2) * -1;
    } else {
      // Clamp to map boundaries
      this.cameraX = Phaser.Math.Clamp(this.cameraX, 0, map.width - this.viewportWidth);
    }

    if (map.height <= this.viewportHeight) {
      this.cameraY = Math.floor((this.viewportHeight - map.height) / 2) * -1;
    } else {
      // Clamp to map boundaries
      this.cameraY = Phaser.Math.Clamp(this.cameraY, 0, map.height - this.viewportHeight);
    }
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns Screen coordinates or null if off-screen
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } | null {
    const screenX = worldX - this.cameraX;
    const screenY = worldY - this.cameraY;

    // Check if position is within viewport
    if (
      screenX < 0 ||
      screenX >= this.viewportWidth ||
      screenY < 0 ||
      screenY >= this.viewportHeight
    ) {
      return null;
    }

    return { x: screenX, y: screenY };
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @returns World coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.cameraX,
      y: screenY + this.cameraY,
    };
  }

  /**
   * Check if a world position is visible on screen
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @returns True if position is visible
   */
  isVisible(worldX: number, worldY: number): boolean {
    return this.worldToScreen(worldX, worldY) !== null;
  }

  /**
   * Get the visible region of the map
   * @returns Object with min/max X and Y coordinates
   */
  getVisibleRegion(): { minX: number; minY: number; maxX: number; maxY: number } {
    return {
      minX: this.cameraX,
      minY: this.cameraY,
      maxX: this.cameraX + this.viewportWidth,
      maxY: this.cameraY + this.viewportHeight,
    };
  }

  /**
   * Center camera on a specific position
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @param map - The game map (for boundary clamping)
   */
  centerOn(x: number, y: number, map: GameMap): void {
    this.cameraX = x - Math.floor(this.viewportWidth / 2);
    this.cameraY = y - Math.floor(this.viewportHeight / 2);
    this.clampToBounds(map);
  }

  /**
   * Update camera (called every frame)
   * Can be used for shake effects or other dynamic camera behavior
   */
  update(): void {
    // Placeholder for future camera effects (shake, zoom, etc.)
  }
}
