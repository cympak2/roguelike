import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { COLORS } from '../config/game-config';

/**
 * Game Over Scene
 * Displayed when the player dies
 * Shows final stats and allows restart
 */

export interface GameOverStats {
  level: number;
  kills: number;
  floorsReached: number;
  depthReached: number;
  damageDealt: number;
  gold: number;
  playerClass: string;
  cause?: string;
  buildUsed?: string;
}

export class GameOverScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private stats?: GameOverStats;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  /**
   * Initialize scene with player stats
   */
  init(data: { stats?: GameOverStats }): void {
    this.stats = data.stats || {
      level: 1,
      kills: 0,
      floorsReached: 0,
      depthReached: 0,
      damageDealt: 0,
      gold: 0,
      playerClass: 'Warrior',
      cause: 'Unknown',
      buildUsed: 'rogue@0.0.0 (unknown)',
    };
    console.log('GameOverScene initialized with stats:', this.stats);
  }

  create(): void {
    // Create black background
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x0a0e27
    )
      .setOrigin(0.5)
      .setDepth(0);

    // Initialize ASCII renderer
    this.asciiRenderer = new ASCIIRenderer(
      this,
      80, // gridWidth
      40, // gridHeight
      12, // tileWidth
      12, // tileHeight
      0,  // offsetX
      0   // offsetY
    );

    // Draw the game over screen
    this.drawGameOverScreen();

    // Setup input handling
    this.setupInput();

    // Add fade-in effect
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private drawGameOverScreen(): void {
    // Draw main border with dramatic double-line effect
    this.asciiRenderer.drawBox(3, 2, 74, 36, COLORS.HEALTH);
    this.asciiRenderer.drawBox(4, 3, 72, 34, COLORS.SHADOW);

    // Draw "GAME OVER" title with dramatic styling
    const gameOverText = '╔═══════════════════════════════════════╗';
    const gameOverX = Math.floor((80 - gameOverText.length) / 2);
    this.asciiRenderer.drawText(gameOverX, 5, gameOverText, COLORS.HEALTH);
    
    const titleText = '║       G A M E   O V E R               ║';
    this.asciiRenderer.drawText(gameOverX, 6, titleText, COLORS.HEALTH);
    
    const youDiedText = '║      Y O U   D I E D                  ║';
    this.asciiRenderer.drawText(gameOverX, 7, youDiedText, COLORS.HEALTH);
    
    const borderBottom = '╚═══════════════════════════════════════╝';
    this.asciiRenderer.drawText(gameOverX, 8, borderBottom, COLORS.HEALTH);

    // Draw skull ASCII art for dramatic effect
    const skullY = 10;
    const skullX = Math.floor(80 / 2) - 6;
    this.asciiRenderer.drawText(skullX, skullY + 0, '    _____ ', 0x666666);
    this.asciiRenderer.drawText(skullX, skullY + 1, '   /     \\', 0x888888);
    this.asciiRenderer.drawText(skullX, skullY + 2, '  | () () |', 0xaaaaaa);
    this.asciiRenderer.drawText(skullX, skullY + 3, '   \\  ^  /', 0x888888);
    this.asciiRenderer.drawText(skullX, skullY + 4, '    |||||', 0x666666);

    // Draw stats section
    this.drawStatsSection();

    // Draw death cause if available
    if (this.stats?.cause) {
      const causeY = 29;
      const causeLabel = 'Cause of Death:';
      const causeLabelX = Math.floor((80 - causeLabel.length) / 2);
      this.asciiRenderer.drawText(causeLabelX, causeY, causeLabel, COLORS.TEXT);
      
      const causeText = this.stats.cause;
      const causeX = Math.floor((80 - causeText.length) / 2);
      this.asciiRenderer.drawText(causeX, causeY + 1, causeText, COLORS.HEALTH);
    }

    if (this.stats?.buildUsed) {
      const buildText = `Build: ${this.stats.buildUsed}`;
      const buildX = Math.floor((80 - buildText.length) / 2);
      this.asciiRenderer.drawText(buildX, 32, buildText.substring(0, 78), COLORS.SHADOW);
    }

    // Draw controls at bottom
    this.drawControls();
  }

  private drawStatsSection(): void {
    const stats = this.stats!;
    const statsY = 17;
    const statsX = 20;

    // Draw stats box
    this.asciiRenderer.drawBox(15, 16, 50, 13, COLORS.ACCENT);

    // Title
    const titleText = 'FINAL STATISTICS';
    const titleX = Math.floor((80 - titleText.length) / 2);
    this.asciiRenderer.drawText(titleX, statsY, titleText, COLORS.ACCENT);

    // Stats display with proper alignment
    const leftCol = statsX;
    let currentY = statsY + 2;

    // Class
    this.asciiRenderer.drawText(leftCol, currentY, 'Class:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, stats.playerClass, COLORS.ACCENT);
    currentY++;

    // Level
    this.asciiRenderer.drawText(leftCol, currentY, 'Level:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.level), COLORS.GOLD);
    currentY++;

    // Kills
    this.asciiRenderer.drawText(leftCol, currentY, 'Monsters Slain:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.kills), COLORS.HEALTH);
    currentY++;

    // Floors
    this.asciiRenderer.drawText(leftCol, currentY, 'Floors Explored:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.floorsReached), COLORS.MANA);
    currentY++;

    // Max depth
    this.asciiRenderer.drawText(leftCol, currentY, 'Max Depth:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.depthReached), COLORS.MANA);
    currentY++;

    // Damage dealt
    this.asciiRenderer.drawText(leftCol, currentY, 'Damage Dealt:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.damageDealt), COLORS.HEALTH);
    currentY++;

    // Gold
    this.asciiRenderer.drawText(leftCol, currentY, 'Gold Collected:', COLORS.TEXT);
    this.asciiRenderer.drawText(leftCol + 15, currentY, String(stats.gold), COLORS.GOLD);

    // Draw a separator line
    currentY += 2;
    const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    this.asciiRenderer.drawText(17, currentY - 1, separator.substring(0, 46), COLORS.SHADOW);
  }

  private drawControls(): void {
    const controlsY = 33;
    
    // Main control instruction
    const mainText = 'Press ENTER to return to Main Menu';
    const mainX = Math.floor((80 - mainText.length) / 2);
    this.asciiRenderer.drawText(mainX, controlsY, mainText, COLORS.ACCENT);

    // Secondary control
    const secondaryText = 'Press ESC to quit';
    const secondaryX = Math.floor((80 - secondaryText.length) / 2);
    this.asciiRenderer.drawText(secondaryX, controlsY + 1, secondaryText, COLORS.TEXT);
  }

  private setupInput(): void {
    // Handle ENTER key - return to main menu
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.handleRestart();
    });

    // Handle ESC key - quit (just go to main menu for now)
    this.input.keyboard?.on('keydown-ESC', () => {
      this.handleQuit();
    });

    // Also handle SPACE as alternative to ENTER
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.handleRestart();
    });
  }

  private handleRestart(): void {
    // Fade out before transitioning
    this.cameras.main.fadeOut(300, 0, 0, 0);

    // Wait for fade to complete, then start main menu
    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }

  private handleQuit(): void {
    // For web games, we can't really "quit", so just go to main menu
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }

  shutdown(): void {
    // Clean up keyboard listeners
    this.input.keyboard?.removeAllListeners();
  }
}
