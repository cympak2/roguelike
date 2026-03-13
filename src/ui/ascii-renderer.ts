import Phaser from 'phaser';

/**
 * Cell data structure to store glyph and color information
 */
interface GridCell {
  glyph: string;
  fgColor: number;
  bgColor?: number;
}

/**
 * ASCIIRenderer manages a grid of ASCII characters with individual colors
 * Uses Phaser's Text objects for efficient rendering
 */
export class ASCIIRenderer {
  private scene: Phaser.Scene;
  private gridWidth: number;
  private gridHeight: number;
  private tileWidth: number;
  private tileHeight: number;
  private grid: GridCell[][];
  private textObjects: Map<string, Phaser.GameObjects.Text>;
  private offsetX: number;
  private offsetY: number;
  private defaultFgColor: number;
  private defaultBgColor?: number;

  /**
   * Initialize the ASCII renderer
   * @param scene - The Phaser scene
   * @param gridWidth - Width of the grid in tiles (default 80)
   * @param gridHeight - Height of the grid in tiles (default 40)
   * @param tileWidth - Width of each tile in pixels (default 12)
   * @param tileHeight - Height of each tile in pixels (default 16)
   * @param offsetX - X offset for rendering (default 0)
   * @param offsetY - Y offset for rendering (default 0)
   */
  constructor(
    scene: Phaser.Scene,
    gridWidth: number = 80,
    gridHeight: number = 40,
    tileWidth: number = 12,
    tileHeight: number = 16,
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    this.scene = scene;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.defaultFgColor = 0xffffff;
    this.defaultBgColor = 0x000000;
    this.textObjects = new Map();

    // Initialize the grid
    this.grid = [];
    for (let y = 0; y < gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        this.grid[y][x] = {
          glyph: ' ',
          fgColor: this.defaultFgColor,
          bgColor: this.defaultBgColor,
        };
      }
    }
  }

  /**
   * Get the key for a cell in the text objects map
   */
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Calculate the pixel position for a grid cell
   */
  private getPixelPosition(x: number, y: number): { px: number; py: number } {
    return {
      px: this.offsetX + x * this.tileWidth + this.tileWidth / 2,
      py: this.offsetY + y * this.tileHeight + this.tileHeight / 2,
    };
  }

  /**
   * Convert a color number to hex string for Phaser
   */
  private colorToHex(color: number): string {
    return '#' + ('000000' + color.toString(16)).slice(-6);
  }

  /**
   * Draw a single tile (glyph) at the given position
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @param glyph - The character to draw
   * @param fgColor - Foreground color (as number, default 0xffffff)
   * @param bgColor - Optional background color (not rendered directly, for reference)
   */
  public drawTile(
    x: number,
    y: number,
    glyph: string,
    fgColor: number = this.defaultFgColor,
    bgColor?: number
  ): void {
    // Bounds check
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return;
    }

    // Update grid data
    this.grid[y][x] = {
      glyph: glyph || ' ',
      fgColor: fgColor,
      bgColor: bgColor ?? this.defaultBgColor,
    };

    // Update or create text object
    const key = this.getCellKey(x, y);
    const { px, py } = this.getPixelPosition(x, y);
    const colorHex = this.colorToHex(fgColor);

    let textObject = this.textObjects.get(key);

    if (!textObject) {
      // Create new text object
      textObject = this.scene.add.text(px, py, glyph, {
        fontSize: `${this.tileHeight}px`,
        fontFamily: 'Courier New, monospace',
        color: colorHex,
      });
      textObject.setOrigin(0.5, 0.5);
      this.textObjects.set(key, textObject);
    } else {
      // Update existing text object
      textObject.setText(glyph);
      textObject.setColor(colorHex);
      textObject.setPosition(px, py);
    }
  }

  /**
   * Draw a text string starting at the given position
   * @param x - Grid X coordinate (starting position)
   * @param y - Grid Y coordinate
   * @param text - The text string to draw
   * @param fgColor - Foreground color for all characters
   * @param bgColor - Optional background color
   */
  public drawText(
    x: number,
    y: number,
    text: string,
    fgColor: number = this.defaultFgColor,
    bgColor?: number
  ): void {
    for (let i = 0; i < text.length; i++) {
      const charX = x + i;
      if (charX >= this.gridWidth) {
        break; // Don't render beyond grid width
      }
      this.drawTile(charX, y, text[i], fgColor, bgColor);
    }
  }

  /**
   * Clear a specific cell
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   */
  public clearCell(x: number, y: number): void {
    this.drawTile(x, y, ' ', this.defaultFgColor, this.defaultBgColor);
  }

  /**
   * Clear the entire grid
   */
  public clear(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.clearCell(x, y);
      }
    }
  }

  /**
   * Get the current grid width
   */
  public getGridWidth(): number {
    return this.gridWidth;
  }

  /**
   * Get the current grid height
   */
  public getGridHeight(): number {
    return this.gridHeight;
  }

  /**
   * Get a specific cell from the grid
   */
  public getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return null;
    }
    return this.grid[y][x];
  }

  /**
   * Set default colors for new cells
   */
  public setDefaultColors(fgColor: number, bgColor?: number): void {
    this.defaultFgColor = fgColor;
    this.defaultBgColor = bgColor;
  }

  /**
   * Destroy all text objects and clear the renderer
   */
  public destroy(): void {
    this.textObjects.forEach((textObj) => {
      textObj.destroy();
    });
    this.textObjects.clear();
    this.grid = [];
  }

  /**
   * Draw a box (rectangle border) using ASCII characters
   * @param x - Top-left X coordinate
   * @param y - Top-left Y coordinate
   * @param width - Width of the box in tiles
   * @param height - Height of the box in tiles
   * @param color - Color for the box
   */
  public drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number = this.defaultFgColor
  ): void {
    // Top border
    this.drawTile(x, y, '+', color);
    for (let i = 1; i < width - 1; i++) {
      this.drawTile(x + i, y, '-', color);
    }
    this.drawTile(x + width - 1, y, '+', color);

    // Bottom border
    this.drawTile(x, y + height - 1, '+', color);
    for (let i = 1; i < width - 1; i++) {
      this.drawTile(x + i, y + height - 1, '-', color);
    }
    this.drawTile(x + width - 1, y + height - 1, '+', color);

    // Side borders
    for (let i = 1; i < height - 1; i++) {
      this.drawTile(x, y + i, '|', color);
      this.drawTile(x + width - 1, y + i, '|', color);
    }
  }

  /**
   * Fill a rectangular area with a character
   * @param x - Top-left X coordinate
   * @param y - Top-left Y coordinate
   * @param width - Width of the area in tiles
   * @param height - Height of the area in tiles
   * @param glyph - Character to fill with
   * @param color - Color for the fill
   */
  public fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    glyph: string = ' ',
    color: number = this.defaultFgColor
  ): void {
    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        this.drawTile(x + xx, y + yy, glyph, color);
      }
    }
  }
}
