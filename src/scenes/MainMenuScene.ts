import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { CLASS_LIST, CharacterClass } from '../config/class-data';
import { COLORS } from '../config/game-config';

/**
 * MainMenuScene: Character class selection screen
 * Displays title and three character class options with stats preview
 */
export class MainMenuScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private selectedClassIndex: number = 0;
  private classes: CharacterClass[] = CLASS_LIST;

  constructor() {
    super({ key: 'MainMenuScene' });
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

    // Draw the menu
    this.drawMenu();

    // Setup input handling
    this.setupInput();
  }

  private drawMenu(): void {
    // Draw title border
    this.asciiRenderer.drawBox(5, 1, 70, 6, COLORS.ACCENT);

    // Draw title
    const titleText = 'ROGUELIKE';
    const titleX = Math.floor((80 - titleText.length) / 2);
    this.asciiRenderer.drawText(titleX, 3, titleText, COLORS.ACCENT);

    // Draw subtitle
    const subtitleText = 'Character Class Selection';
    const subtitleX = Math.floor((80 - subtitleText.length) / 2);
    this.asciiRenderer.drawText(subtitleX, 4, subtitleText, COLORS.TEXT);

    // Draw class selection section
    this.asciiRenderer.drawBox(5, 8, 70, 25, COLORS.SHADOW);

    // Draw class option boxes
    const classBoxWidth = 18;
    const classBoxHeight = 20;
    const startX = 7;
    const startY = 10;
    const spacing = 24;

    for (let i = 0; i < this.classes.length; i++) {
      const x = startX + i * spacing;
      const classData = this.classes[i];
      const isSelected = i === this.selectedClassIndex;

      // Draw box around selected class
      if (isSelected) {
        this.asciiRenderer.drawBox(x - 1, startY - 1, classBoxWidth + 2, classBoxHeight + 2, COLORS.ACCENT);
      } else {
        this.asciiRenderer.drawBox(x - 1, startY - 1, classBoxWidth + 2, classBoxHeight + 2, COLORS.SHADOW);
      }

      // Draw class content
      const contentColor = isSelected ? COLORS.ACCENT : 0xffff00; // Yellow for unselected, Cyan for selected
      let currentY = startY + 1;

      // Class name
      const nameX = x + Math.floor((classBoxWidth - classData.name.length) / 2);
      this.asciiRenderer.drawText(nameX, currentY, classData.name, contentColor);
      currentY += 2;

      // Class glyph
      const glyphX = x + Math.floor(classBoxWidth / 2);
      this.asciiRenderer.drawTile(glyphX, currentY, classData.glyph, classData.classColor);
      currentY += 2;

      // Stats display
      const statsColor = isSelected ? COLORS.TEXT : 0xaaaaaa; // Lighter text if selected
      const stats = [
        `HP: ${classData.baseStats.maxHp}`,
        `ATK: ${classData.baseStats.attack}`,
        `DEF: ${classData.baseStats.defense}`,
        `SPD: ${classData.baseStats.speed}`,
        `MAG: ${classData.baseStats.magicPower}`,
      ];

      for (const stat of stats) {
        const statX = x + 1;
        this.asciiRenderer.drawText(statX, currentY, stat, statsColor);
        currentY += 1;
      }
    }

    // Draw selected class abilities
    this.drawSelectedClassAbilities();

    // Draw instructions
    this.drawInstructions();
  }

  private drawSelectedClassAbilities(): void {
    const selectedClass = this.classes[this.selectedClassIndex];

    // Draw abilities box
    this.asciiRenderer.drawBox(5, 34, 70, 4, COLORS.SHADOW);
    this.asciiRenderer.drawText(6, 34, 'Special Ability: ' + selectedClass.abilities[0].name, COLORS.ACCENT);
    this.asciiRenderer.drawText(6, 35, selectedClass.abilities[0].description, COLORS.TEXT);
  }

  private drawInstructions(): void {
    const instructions = [
      '[1] [2] [3] or [Arrows] to select • [Enter] to start • [Q] to quit',
    ];

    const startX = 5;
    const startY = 39;

    for (let i = 0; i < instructions.length; i++) {
      this.asciiRenderer.drawText(startX, startY - i, instructions[i], COLORS.TEXT);
    }
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      return;
    }

    // Arrow keys for navigation
    this.input.keyboard.on('keydown-LEFT', () => {
      this.selectClass((this.selectedClassIndex - 1 + this.classes.length) % this.classes.length);
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      this.selectClass((this.selectedClassIndex + 1) % this.classes.length);
    });

    // Number keys for direct selection
    this.input.keyboard.on('keydown-ONE', () => {
      this.selectClass(0);
    });

    this.input.keyboard.on('keydown-TWO', () => {
      this.selectClass(1);
    });

    this.input.keyboard.on('keydown-THREE', () => {
      this.selectClass(2);
    });

    // Enter to start game
    this.input.keyboard.on('keydown-ENTER', () => {
      this.startGame();
    });

    // Q to quit (for debugging)
    this.input.keyboard.on('keydown-Q', () => {
      console.log('Quit requested');
    });
  }

  private selectClass(index: number): void {
    this.selectedClassIndex = index;
    // Redraw menu to show selection
    this.asciiRenderer.clear();
    this.drawMenu();
  }

  private startGame(): void {
    const selectedClass = this.classes[this.selectedClassIndex];
    console.log(`Starting game with class: ${selectedClass.name}`);

    // Pass the selected class to GameScene via data
    this.scene.start('GameScene', { selectedClass: selectedClass });
  }

  update(): void {
    // Game update logic here
  }
}
