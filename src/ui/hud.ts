/**
 * HUD (Heads-Up Display) Overlay
 * Displays player stats and game information at the top of the screen
 * Shows HP, Mana, Level, Weapon, Location, and Gold
 */

import Phaser from 'phaser';
import { ASCIIRenderer } from './ascii-renderer';
import { COLORS, UI_CONFIG } from '../config/game-config';

// ============================================================================
// HUD CONFIGURATION
// ============================================================================

const HUD_CONFIG = {
  /** Width in tiles */
  WIDTH: 80,
  /** Height in tiles */
  HEIGHT: 6,
  /** Starting position X offset in pixels */
  OFFSET_X: 0,
  /** Starting position Y offset in pixels */
  OFFSET_Y: 0,
  /** Tile width in pixels */
  TILE_WIDTH: 12,
  /** Tile height in pixels */
  TILE_HEIGHT: 16,
  /** Padding between HUD elements */
  PADDING: 1,
  /** Bar width in tiles */
  BAR_WIDTH: 15,
};

// ============================================================================
// HUD CLASS
// ============================================================================

export class HUD {
  private scene: Phaser.Scene;
  private renderer: ASCIIRenderer;

  // Player stats
  private currentHP: number = 0;
  private maxHP: number = 100;
  private currentMana: number = 0;
  private maxMana: number = 100;
  private level: number = 1;
  private weaponName: string = 'Dagger';
  private floorName: string = 'Town';
  private gold: number = 0;

  /**
   * Create a new HUD instance
   * @param scene - The Phaser scene to render to
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create ASCII renderer for HUD display
    this.renderer = new ASCIIRenderer(
      scene,
      HUD_CONFIG.WIDTH,
      HUD_CONFIG.HEIGHT,
      HUD_CONFIG.TILE_WIDTH,
      HUD_CONFIG.TILE_HEIGHT,
      HUD_CONFIG.OFFSET_X,
      HUD_CONFIG.OFFSET_Y
    );

    // Set default colors
    this.renderer.setDefaultColors(COLORS.TEXT, COLORS.UI_BG);

    // Draw initial HUD border
    this.drawBorder();
  }

  /**
   * Draw the border and background for the HUD
   */
  private drawBorder(): void {
    // Top border
    this.renderer.drawTile(0, 0, '┌', COLORS.ACCENT);
    for (let x = 1; x < HUD_CONFIG.WIDTH - 1; x++) {
      this.renderer.drawTile(x, 0, '─', COLORS.ACCENT);
    }
    this.renderer.drawTile(HUD_CONFIG.WIDTH - 1, 0, '┐', COLORS.ACCENT);

    // Side borders
    for (let y = 1; y < HUD_CONFIG.HEIGHT - 1; y++) {
      this.renderer.drawTile(0, y, '│', COLORS.ACCENT);
      this.renderer.drawTile(HUD_CONFIG.WIDTH - 1, y, '│', COLORS.ACCENT);
    }

    // Bottom border
    this.renderer.drawTile(0, HUD_CONFIG.HEIGHT - 1, '└', COLORS.ACCENT);
    for (let x = 1; x < HUD_CONFIG.WIDTH - 1; x++) {
      this.renderer.drawTile(x, HUD_CONFIG.HEIGHT - 1, '─', COLORS.ACCENT);
    }
    this.renderer.drawTile(HUD_CONFIG.WIDTH - 1, HUD_CONFIG.HEIGHT - 1, '┘', COLORS.ACCENT);
  }

  /**
   * Draw text with wrapping capability in the HUD
   * @param x - Starting X position
   * @param y - Starting Y position
   * @param text - Text to draw
   * @param color - Text color
   * @param maxWidth - Maximum width before wrapping
   */
  private drawText(
    x: number,
    y: number,
    text: string,
    color: number = COLORS.TEXT,
    maxWidth: number = HUD_CONFIG.WIDTH - 3
  ): void {
    for (let i = 0; i < text.length && x + i < HUD_CONFIG.WIDTH - 1; i++) {
      this.renderer.drawTile(x + i, y, text[i], color);
    }
  }

  /**
   * Draw a progress bar (HP or Mana)
   * @param x - Starting X position
   * @param y - Starting Y position
   * @param current - Current value
   * @param max - Maximum value
   * @param width - Bar width in tiles
   * @param barColor - Color of filled portion
   */
  private drawBar(
    x: number,
    y: number,
    current: number,
    max: number,
    width: number,
    barColor: number
  ): void {
    const percentage = Math.max(0, Math.min(1, current / max));
    const filledWidth = Math.ceil(width * percentage);

    // Draw filled portion
    for (let i = 0; i < filledWidth; i++) {
      this.renderer.drawTile(x + i, y, '█', barColor);
    }

    // Draw empty portion
    for (let i = filledWidth; i < width; i++) {
      this.renderer.drawTile(x + i, y, '░', COLORS.SHADOW);
    }
  }

  /**
   * Update HP display
   * @param current - Current HP
   * @param max - Maximum HP
   */
  updateHP(current: number, max: number): void {
    this.currentHP = current;
    this.maxHP = max;
  }

  /**
   * Update Mana display (for Mage class)
   * @param current - Current mana
   * @param max - Maximum mana
   */
  updateMana(current: number, max: number): void {
    this.currentMana = current;
    this.maxMana = max;
  }

  /**
   * Update player level
   * @param level - Current level
   */
  updateLevel(level: number): void {
    this.level = level;
  }

  /**
   * Update equipped weapon name
   * @param weaponName - Name of the weapon
   */
  updateWeapon(weaponName: string): void {
    this.weaponName = weaponName;
  }

  /**
   * Update current floor/location
   * @param floorName - Name or description of current location
   */
  updateFloor(floorName: string): void {
    this.floorName = floorName;
  }

  /**
   * Update gold count
   * @param amount - Amount of gold
   */
  updateGold(amount: number): void {
    this.gold = amount;
  }

  /**
   * Render the HUD to the scene
   */
  render(): void {
    // Clear the HUD area
    for (let y = 0; y < HUD_CONFIG.HEIGHT; y++) {
      for (let x = 0; x < HUD_CONFIG.WIDTH; x++) {
        this.renderer.drawTile(x, y, ' ', COLORS.TEXT, COLORS.UI_BG);
      }
    }

    // Redraw border
    this.drawBorder();

    // Row 1: HP and Mana bars
    this.drawText(2, 1, 'HP:', COLORS.HEALTH);
    this.drawBar(6, 1, this.currentHP, this.maxHP, HUD_CONFIG.BAR_WIDTH, COLORS.HEALTH);

    // HP value display
    const hpText = `${this.currentHP}/${this.maxHP}`;
    this.drawText(
      6 + HUD_CONFIG.BAR_WIDTH + 1,
      1,
      hpText,
      COLORS.TEXT
    );

    // Mana bar (if max mana > 0)
    if (this.maxMana > 0) {
      this.drawText(
        6 + HUD_CONFIG.BAR_WIDTH + 1 + 10,
        1,
        'MP:',
        COLORS.MANA
      );
      this.drawBar(
        6 + HUD_CONFIG.BAR_WIDTH + 1 + 4,
        1,
        this.currentMana,
        this.maxMana,
        12,
        COLORS.MANA
      );
    }

    // Row 2: Level and Weapon
    this.drawText(2, 2, `Lvl:${this.level}`, COLORS.ACCENT);
    this.drawText(10, 2, `Wpn:${this.weaponName}`, COLORS.ITEM);

    // Row 3: Location and Gold
    this.drawText(2, 3, `Loc:${this.floorName}`, COLORS.TEXT);
    this.drawText(25, 3, `Gold:${this.gold}`, COLORS.GOLD);
  }

  /**
   * Show the HUD (if it was hidden)
   */
  show(): void {
    this.render();
  }

  /**
   * Hide the HUD by clearing its area
   */
  hide(): void {
    for (let y = 0; y < HUD_CONFIG.HEIGHT; y++) {
      for (let x = 0; x < HUD_CONFIG.WIDTH; x++) {
        this.renderer.drawTile(x, y, ' ', COLORS.TEXT, COLORS.UI_BG);
      }
    }
  }
}
