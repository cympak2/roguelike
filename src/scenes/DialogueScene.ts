import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { NPC, DialogueNode } from '../entities/npc';
import { ModalBackground } from '../ui/modal-background';

interface DialogueActionPayload {
  action: string;
  npcId: string | null;
  npcName: string | null;
  questIds: string[];
  shopInventoryIds: string[];
}

/**
 * DialogueScene - Overlay scene for NPC conversations
 * Displays dialogue text, options, and handles player choice navigation
 */
export class DialogueScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private currentNPC: NPC | null = null;
  private isVisible: boolean = false;
  private selectedOptionIndex: number = 0;
  private currentDialogue: DialogueNode | undefined;
  private pendingNPC: NPC | null = null; // Store NPC until create() is called
  private modalBackground!: ModalBackground;
  private dialogueScrollOffset: number = 0;
  private wrappedDialogueLines: string[] = [];

  // Layout constants
  private panelWidth = 60;
  private panelHeight = 20;
  private panelX!: number;
  private panelY!: number;
  private readonly dialogueTextHeight = 3;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  init(data: { npc?: NPC }): void {
    // Store NPC to show dialogue after create() completes
    if (data.npc) {
      this.pendingNPC = data.npc;
    }
  }

  create(): void {
    // Initialize ASCII renderer (80x30 grid to match typical screen)
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);

    // Calculate centered panel position
    this.panelX = Math.floor((80 - this.panelWidth) / 2);
    this.panelY = Math.floor((30 - this.panelHeight) / 2);

    this.modalBackground = new ModalBackground(
      this,
      this.panelX,
      this.panelY,
      this.panelWidth,
      this.panelHeight
    );

    // Input handling
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      this.handleInput(event);
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (!this.isVisible || !this.currentDialogue) return;

      if (deltaY > 0) {
        this.scrollDialogue(1);
      } else if (deltaY < 0) {
        this.scrollDialogue(-1);
      }
    });
    
    // Show pending dialogue if NPC was set in init()
    if (this.pendingNPC) {
      this.showDialogue(this.pendingNPC);
      this.pendingNPC = null;
    }
  }

  /**
   * Show dialogue overlay for an NPC
   * @param npc - The NPC to start dialogue with
   */
  public showDialogue(npc: NPC): void {
    this.currentNPC = npc;
    this.isVisible = true;
    this.selectedOptionIndex = 0;

    // Start dialogue with the NPC
    npc.startDialogue();
    this.currentDialogue = npc.getCurrentDialogue();

    if (!this.currentDialogue) {
      console.warn('No dialogue found for NPC:', npc.name);
      this.hideDialogue();
      return;
    }

    // Show the background rectangle
    this.modalBackground.show();
    this.resetDialogueScroll();

    this.draw();
  }

  /**
   * Hide dialogue overlay and return to game
   */
  public hideDialogue(): void {
    this.isVisible = false;
    this.asciiRenderer.clear();
    
    // Hide the background rectangle
    this.modalBackground.hide();
    
    if (this.currentNPC) {
      this.currentNPC.endDialogue();
      this.currentNPC = null;
    }
    
    this.currentDialogue = undefined;
    this.selectedOptionIndex = 0;
    this.dialogueScrollOffset = 0;
    this.wrappedDialogueLines = [];
    
    // Resume the GameScene and stop this scene
    this.scene.resume('GameScene');
    this.scene.stop('DialogueScene');
  }

  /**
   * Handle keyboard input
   * @param event - Keyboard event
   */
  private handleInput(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // ESC to close
    if (key === 'escape') {
      event.preventDefault();
      this.hideDialogue();
      return;
    }

    if (!this.currentDialogue) return;

    // Number keys 1-9 to select options
    if (key >= '1' && key <= '9') {
      const index = parseInt(key, 10) - 1;
      if (index >= 0 && index < this.currentDialogue.options.length) {
        event.preventDefault();
        this.selectedOptionIndex = index;
        this.draw();
      }
      return;
    }

    // Arrow keys to navigate options
    if (key === 'arrowup') {
      event.preventDefault();
      this.selectedOptionIndex = Math.max(0, this.selectedOptionIndex - 1);
      this.draw();
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      this.selectedOptionIndex = Math.min(
        this.currentDialogue.options.length - 1,
        this.selectedOptionIndex + 1
      );
      this.draw();
      return;
    }

    if (key === 'pageup') {
      event.preventDefault();
      this.scrollDialogue(-1);
      return;
    }

    if (key === 'pagedown') {
      event.preventDefault();
      this.scrollDialogue(1);
      return;
    }

    if (key === '<' || key === ',') {
      event.preventDefault();
      this.scrollDialogue(-1);
      return;
    }

    if (key === '>' || key === '.') {
      event.preventDefault();
      this.scrollDialogue(1);
      return;
    }

    // Enter to confirm selection
    if (key === 'enter') {
      event.preventDefault();
      this.selectOption(this.selectedOptionIndex);
      return;
    }
  }

  /**
   * Select a dialogue option
   * @param index - Index of the option to select
   */
  private selectOption(index: number): void {
    if (!this.currentNPC || !this.currentDialogue) return;

    const options = this.currentDialogue.options;
    if (index < 0 || index >= options.length) return;

    const selectedOption = options[index];
    const actionId = selectedOption.actionId;

    // Execute option action string if defined (for npc-data.ts format)
    if (actionId) {
      this.executeAction(actionId);
      if (actionId.startsWith('open_shop')) {
        this.hideDialogue();
        return;
      }
    }

    // Execute option action callback if defined (for entity format)
    if (typeof selectedOption.action === 'function') {
      selectedOption.action();
    }

    // Progress to next dialogue or end
    if (selectedOption.nextDialogueId) {
      // Manually navigate to next dialogue since we may not have proper IDs
      if (this.currentNPC.dialogues.has(selectedOption.nextDialogueId)) {
        this.currentNPC.currentDialogueId = selectedOption.nextDialogueId;
        this.currentDialogue = this.currentNPC.getCurrentDialogue();

        if (!this.currentDialogue) {
          // Dialogue ended
          this.hideDialogue();
        } else {
          // Reset selection for new dialogue
          this.selectedOptionIndex = 0;
          this.resetDialogueScroll();
          this.draw();
        }
      } else {
        // Dialogue node not found, end dialogue
        this.hideDialogue();
      }
    } else {
      // No next dialogue, end conversation
      if (this.currentDialogue.onComplete) {
        this.currentDialogue.onComplete();
      }
      this.hideDialogue();
    }
  }

  /**
   * Execute dialogue action
   * @param action - Action string to execute
   * @param option - The dialogue option
   */
  private executeAction(action: string): void {
    if (!action) return;

    const gameScene = this.scene.get('GameScene');
    const payload: DialogueActionPayload = {
      action,
      npcId: this.currentNPC?.definitionId ?? null,
      npcName: this.currentNPC?.name ?? null,
      questIds: this.currentNPC?.questIds ?? [],
      shopInventoryIds: this.currentNPC?.shopInventoryIds ?? [],
    };
    gameScene.events.emit('dialogue-action', payload);

    // Handle different action types
    switch (action) {
      case 'accept_quest':
        console.log('Quest accepted!');
        break;

      case 'open_shop':
        console.log('Opening shop...');
        // TODO: Open shop interface
        // Could emit event: this.events.emit('open-shop', this.currentNPC);
        break;

      case 'heal_player':
        console.log('Player healed!');
        break;

      case 'give_item':
        console.log('Giving item to player...');
        // TODO: Add item to player inventory
        // Could emit event: this.events.emit('give-item', itemId);
        break;

      default:
        // Log unhandled actions for debugging
        console.log('Dialogue action:', action);
        break;
    }
  }

  /**
   * Draw the entire dialogue UI
   */
  private draw(): void {
    this.asciiRenderer.clear();

    if (!this.currentDialogue || !this.currentNPC) return;

    // Draw semi-transparent background overlay
    this.drawBackground();

    // Draw main dialogue panel border
    this.asciiRenderer.drawBox(
      this.panelX,
      this.panelY,
      this.panelWidth,
      this.panelHeight,
      0x00ff00
    );

    // Draw NPC name at top
    this.drawNPCName();

    // Draw separator line
    this.drawSeparator(this.panelY + 2);

    // Draw dialogue text with word wrapping
    this.drawDialogueText();

    // Draw another separator before options
    this.drawSeparator(this.panelY + 8);

    // Draw dialogue options
    this.drawOptions();

    // Draw controls hint at bottom
    this.drawControlsHint();
  }

  /**
   * Draw background overlay
   */
  private drawBackground(): void {
    // Background is now handled by the Phaser Rectangle (backgroundRect)
    // which provides a solid opaque black background
    // No need to fill with ASCII characters anymore
  }

  /**
   * Draw NPC name at the top of the panel
   */
  private drawNPCName(): void {
    if (!this.currentNPC) return;

    const nameText = this.currentNPC.name.toUpperCase();
    const nameX = this.panelX + Math.floor((this.panelWidth - nameText.length) / 2);

    this.asciiRenderer.drawText(nameX, this.panelY + 1, nameText, 0xffff00);
  }

  /**
   * Draw a separator line
   * @param y - Y position for the separator
   */
  private drawSeparator(y: number): void {
    for (let i = 0; i < this.panelWidth - 2; i++) {
      this.asciiRenderer.drawTile(this.panelX + 1 + i, y, '-', 0x00ff00);
    }
  }

  /**
   * Draw dialogue text with word wrapping
   */
  private drawDialogueText(): void {
    if (!this.currentDialogue) return;

    const text = this.currentDialogue.text;
    const maxWidth = this.panelWidth - 4; // Account for padding
    const startX = this.panelX + 2;
    const startY = this.panelY + 4;

    if (this.wrappedDialogueLines.length === 0) {
      this.wrappedDialogueLines = this.wrapText(text, maxWidth);
    }

    const maxScrollOffset = this.getMaxDialogueScrollOffset();
    const visibleLines = this.wrappedDialogueLines.slice(
      this.dialogueScrollOffset,
      this.dialogueScrollOffset + this.dialogueTextHeight
    );

    for (let i = 0; i < visibleLines.length; i++) {
      this.asciiRenderer.drawText(startX, startY + i, visibleLines[i], 0xffffff);
    }

    if (maxScrollOffset > 0) {
      const indicatorX = this.panelX + this.panelWidth - 3;
      if (this.dialogueScrollOffset > 0) {
        this.asciiRenderer.drawText(indicatorX, startY, '^', 0xaaaaaa);
      }
      if (this.dialogueScrollOffset < maxScrollOffset) {
        this.asciiRenderer.drawText(indicatorX, startY + this.dialogueTextHeight - 1, 'v', 0xaaaaaa);
      }
    }
  }

  /**
   * Draw dialogue options
   */
  private drawOptions(): void {
    if (!this.currentDialogue) return;

    const options = this.currentDialogue.options;
    const startX = this.panelX + 2;
    let startY = this.panelY + 10;

    // Draw "Options:" header
    this.asciiRenderer.drawText(startX, startY - 1, 'Options:', 0xaaaaaa);

    // Draw each option (limit to 8 options for display)
    for (let i = 0; i < Math.min(options.length, 8); i++) {
      const option = options[i];
      const isSelected = i === this.selectedOptionIndex;
      const color = isSelected ? 0x00ff00 : 0xcccccc;
      const prefix = isSelected ? '> ' : '  ';
      const numberPrefix = `${i + 1}. `;

      // Truncate option text to fit
      const maxOptionWidth = this.panelWidth - 8;
      const optionText = option.text.substring(0, maxOptionWidth);

      this.asciiRenderer.drawText(
        startX,
        startY + i,
        prefix + numberPrefix + optionText,
        color
      );
    }

    // Show ellipsis if there are more options
    if (options.length > 8) {
      this.asciiRenderer.drawText(
        startX,
        startY + 8,
        '  ... (more options available)',
        0x888888
      );
    }
  }

  /**
   * Draw controls hint at the bottom
   */
  private drawControlsHint(): void {
    const hintY = this.panelY + this.panelHeight - 1;
    const hint = '[↑↓] Options [</>] Text [Enter] Select [ESC] Close';
    const hintX = this.panelX + Math.floor((this.panelWidth - hint.length) / 2);

    this.asciiRenderer.drawText(hintX, hintY, hint, 0x00ff88);
  }

  private resetDialogueScroll(): void {
    this.dialogueScrollOffset = 0;
    this.wrappedDialogueLines = [];
    if (!this.currentDialogue) return;
    const maxWidth = this.panelWidth - 4;
    this.wrappedDialogueLines = this.wrapText(this.currentDialogue.text, maxWidth);
  }

  private getMaxDialogueScrollOffset(): number {
    return Math.max(0, this.wrappedDialogueLines.length - this.dialogueTextHeight);
  }

  private scrollDialogue(delta: number): void {
    if (!this.currentDialogue) return;
    const maxScrollOffset = this.getMaxDialogueScrollOffset();
    if (maxScrollOffset <= 0) return;

    const nextOffset = Phaser.Math.Clamp(this.dialogueScrollOffset + delta, 0, maxScrollOffset);
    if (nextOffset === this.dialogueScrollOffset) return;

    this.dialogueScrollOffset = nextOffset;
    this.draw();
  }

  /**
   * Word wrap text to fit within a maximum width
   * @param text - Text to wrap
   * @param maxWidth - Maximum width in characters
   * @returns Array of wrapped lines
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;

      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Check if dialogue is currently visible
   */
  public isDialogueVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current NPC in dialogue
   */
  public getCurrentNPC(): NPC | null {
    return this.currentNPC;
  }
}

export default DialogueScene;
