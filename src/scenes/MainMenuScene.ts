import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { CLASS_LIST, CharacterClass } from '../config/class-data';
import { COLORS } from '../config/game-config';
import { createGameSaveManager } from '../utils/save-manager';

const SAVE_ACTIONS = ['Continue', 'New Game'] as const;
type SaveAction = (typeof SAVE_ACTIONS)[number];

/**
 * MainMenuScene: Character class selection screen
 * Displays title and three character class options with stats preview
 */
export class MainMenuScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private selectedClassIndex: number = 0;
  private classes: CharacterClass[] = CLASS_LIST;
  private readonly gameSaveManager = createGameSaveManager();
  private hasExistingSave: boolean = false;
  private selectedSaveActionIndex: number = 0;

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

    const hasStoredSave = this.gameSaveManager.hasSave();
    if (hasStoredSave) {
      const savedState = this.gameSaveManager.load();
      if (savedState) {
        this.hasExistingSave = true;
      } else {
        console.warn('Detected invalid save in storage. Clearing it and showing new game flow.');
        this.gameSaveManager.clear();
        this.hasExistingSave = false;
      }
    } else {
      this.hasExistingSave = false;
    }
    this.selectedSaveActionIndex = 0;

    // Initialize ASCII renderer
    this.asciiRenderer = new ASCIIRenderer(
      this,
      80, // gridWidth
      40, // gridHeight
      12, // tileWidth
      12, // tileHeight
      0, // offsetX
      0 // offsetY
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
    const subtitleText = this.hasExistingSave ? 'Save Detected' : 'Character Class Selection';
    const subtitleX = Math.floor((80 - subtitleText.length) / 2);
    this.asciiRenderer.drawText(subtitleX, 4, subtitleText, COLORS.TEXT);

    if (this.hasExistingSave) {
      this.drawSaveActions();
      this.drawClassSelection(13, 15, 16);
      this.drawSelectedClassAbilities(33);
    } else {
      // Keep original no-save layout unchanged
      this.drawClassSelection(8, 10, 20);
      this.drawSelectedClassAbilities(34);
    }

    // Draw instructions
    this.drawInstructions();
  }

  private drawSaveActions(): void {
    this.asciiRenderer.drawBox(5, 8, 70, 4, COLORS.SHADOW);
    this.asciiRenderer.drawText(6, 8, 'Save Action', COLORS.ACCENT);

    for (let i = 0; i < SAVE_ACTIONS.length; i++) {
      const actionLabel = SAVE_ACTIONS[i];
      const isSelected = i === this.selectedSaveActionIndex;
      const lineY = 9 + i;
      const prefix = isSelected ? '> ' : '  ';
      const color = isSelected ? COLORS.ACCENT : COLORS.TEXT;
      this.asciiRenderer.drawText(7, lineY, `${prefix}${actionLabel}`, color);
    }
  }

  private drawClassSelection(sectionY: number, classStartY: number, classBoxHeight: number): void {
    // Draw class selection section
    const sectionHeight = this.hasExistingSave ? 19 : 25;
    this.asciiRenderer.drawBox(5, sectionY, 70, sectionHeight, COLORS.SHADOW);

    // Draw class option boxes
    const classBoxWidth = 18;
    const startX = 7;
    const spacing = 24;

    for (let i = 0; i < this.classes.length; i++) {
      const x = startX + i * spacing;
      const classData = this.classes[i];
      const isSelected = i === this.selectedClassIndex;

      // Draw box around selected class
      if (isSelected) {
        this.asciiRenderer.drawBox(x - 1, classStartY - 1, classBoxWidth + 2, classBoxHeight + 2, COLORS.ACCENT);
      } else {
        this.asciiRenderer.drawBox(x - 1, classStartY - 1, classBoxWidth + 2, classBoxHeight + 2, COLORS.SHADOW);
      }

      // Draw class content
      const contentColor = isSelected ? COLORS.ACCENT : 0xffff00; // Yellow for unselected, Cyan for selected
      let currentY = classStartY + 1;

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
  }

  private drawSelectedClassAbilities(boxY: number): void {
    const selectedClass = this.classes[this.selectedClassIndex];

    // Draw abilities box
    this.asciiRenderer.drawBox(5, boxY, 70, 4, COLORS.SHADOW);
    this.asciiRenderer.drawText(6, boxY, 'Special Ability: ' + selectedClass.abilities[0].name, COLORS.ACCENT);
    this.asciiRenderer.drawText(6, boxY + 1, selectedClass.abilities[0].description, COLORS.TEXT);
  }

  private drawInstructions(): void {
    const instructions = this.hasExistingSave
      ? ['[↑] [↓] action • [1] [2] [3] or [Arrows] class • [Enter] confirm • [Q] quit']
      : ['[1] [2] [3] or [Arrows] to select • [Enter] to start • [Q] to quit'];

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

    if (this.hasExistingSave) {
      this.input.keyboard.on('keydown-UP', () => {
        this.selectSaveAction((this.selectedSaveActionIndex - 1 + SAVE_ACTIONS.length) % SAVE_ACTIONS.length);
      });

      this.input.keyboard.on('keydown-DOWN', () => {
        this.selectSaveAction((this.selectedSaveActionIndex + 1) % SAVE_ACTIONS.length);
      });
    }

    // Arrow keys for class navigation
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

    // Enter to start game / confirm action
    this.input.keyboard.on('keydown-ENTER', () => {
      this.confirmMenuSelection();
    });

    // Q to quit (for debugging)
    this.input.keyboard.on('keydown-Q', () => {
      console.log('Quit requested');
    });
  }

  private selectClass(index: number): void {
    this.selectedClassIndex = index;
    this.redrawMenu();
  }

  private selectSaveAction(index: number): void {
    this.selectedSaveActionIndex = index;
    this.redrawMenu();
  }

  private confirmMenuSelection(): void {
    if (!this.hasExistingSave) {
      this.startNewGame();
      return;
    }

    const selectedAction: SaveAction = SAVE_ACTIONS[this.selectedSaveActionIndex];

    if (selectedAction === 'Continue') {
      this.continueGame();
      return;
    }

    this.startNewGame();
  }

  private startNewGame(): void {
    // Starting a fresh run should always discard any previous save.
    this.gameSaveManager.clear();
    this.hasExistingSave = false;
    const selectedClass = this.classes[this.selectedClassIndex];
    console.log(`Starting game with class: ${selectedClass.name}`);

    this.scene.start('GameScene', {
      selectedClass,
      continueFromSave: false,
    });
  }

  private continueGame(): void {
    const selectedClass = this.classes[this.selectedClassIndex];
    console.log(`Continuing game (restore pending) with class fallback: ${selectedClass.name}`);

    this.scene.start('GameScene', {
      selectedClass,
      continueFromSave: true,
    });
  }

  private redrawMenu(): void {
    this.asciiRenderer.clear();
    this.drawMenu();
  }

  update(): void {
    // Game update logic here
  }
}
