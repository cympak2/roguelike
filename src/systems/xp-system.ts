/**
 * XP and Level-Up System
 * Manages experience gain, leveling, and stat choice UI
 */

import { Player, PlayerClass } from '../entities/player';
import { MessageLog, MessageType } from '../ui/message-log';
import { ASCIIRenderer } from '../ui/ascii-renderer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Available stat choices when leveling up
 */
export enum StatChoice {
  MAX_HP = 'MAX_HP',
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  MAX_MANA = 'MAX_MANA',
  MAGIC_POWER = 'MAGIC_POWER',
  SPEED = 'SPEED',
}

/**
 * Information about a stat choice option
 */
export interface StatChoiceOption {
  stat: StatChoice;
  label: string;
  description: string;
  bonus: number;
  classRestriction?: PlayerClass;
}

/**
 * Callback function called when level-up completes
 */
export type LevelUpCallback = (player: Player, stat: StatChoice) => void;

// ============================================================================
// XP SYSTEM CLASS
// ============================================================================

export class XPSystem {
  private messageLog: MessageLog;
  private renderer: ASCIIRenderer;
  private scene: Phaser.Scene;
  
  // Level-up UI state
  private isShowingLevelUpChoice: boolean = false;
  private selectedChoiceIndex: number = 0;
  private availableChoices: StatChoiceOption[] = [];
  private pendingPlayer: Player | null = null;
  private onLevelUpComplete: LevelUpCallback | null = null;
  
  // UI rendering objects
  private uiContainer: Phaser.GameObjects.Container | null = null;
  private inputListener: ((event: KeyboardEvent) => void) | null = null;

  // ============================================================================
  // STAT CHOICE DEFINITIONS
  // ============================================================================

  /**
   * All available stat choices with their bonuses
   */
  private static readonly STAT_CHOICES: StatChoiceOption[] = [
    {
      stat: StatChoice.MAX_HP,
      label: 'Increase Max HP',
      description: '+10 Maximum Health',
      bonus: 10,
    },
    {
      stat: StatChoice.ATTACK,
      label: 'Increase Attack',
      description: '+2 Attack Power',
      bonus: 2,
    },
    {
      stat: StatChoice.DEFENSE,
      label: 'Increase Defense',
      description: '+2 Defense',
      bonus: 2,
    },
    {
      stat: StatChoice.MAX_MANA,
      label: 'Increase Max Mana',
      description: '+10 Maximum Mana',
      bonus: 10,
      classRestriction: 'mage',
    },
    {
      stat: StatChoice.MAGIC_POWER,
      label: 'Increase Magic Power',
      description: '+2 Magic Power',
      bonus: 2,
      classRestriction: 'mage',
    },
    {
      stat: StatChoice.SPEED,
      label: 'Increase Speed',
      description: '+1 Speed',
      bonus: 1,
    },
  ];

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(scene: Phaser.Scene, messageLog: MessageLog, renderer: ASCIIRenderer) {
    this.scene = scene;
    this.messageLog = messageLog;
    this.renderer = renderer;
  }

  // ============================================================================
  // XP MANAGEMENT
  // ============================================================================

  /**
   * Award XP to player and check for level-up
   * @param player - Player to award XP to
   * @param amount - Amount of XP to award
   * @returns true if player leveled up
   */
  awardXP(player: Player, amount: number): boolean {
    const previousLevel = player.level;
    const previousXP = player.xp;
    
    // Add XP
    player.xp += amount;
    
    // Log XP gain
    this.messageLog.addMessage(
      `+${amount} XP (${player.xp}/${player.xpForNextLevel})`,
      MessageType.INFO,
      0xffdd00
    );
    
    // Check for level-up
    if (player.xp >= player.xpForNextLevel) {
      this.handleLevelUp(player);
      return true;
    }
    
    return false;
  }

  /**
   * Handle player leveling up
   * @param player - Player who leveled up
   */
  private handleLevelUp(player: Player): void {
    // Calculate overflow XP
    const overflowXP = player.xp - player.xpForNextLevel;
    
    // Increase level
    player.level++;
    
    // Reset XP with overflow
    player.xp = overflowXP;
    
    // Update XP requirement for next level
    player.xpForNextLevel = this.getXPForLevel(player.level + 1);
    
    // Full heal on level-up
    player.currentHP = player.maxHP;
    player.currentMana = player.maxMana;
    
    // Show level-up message
    this.messageLog.addMessage(
      `*** LEVEL UP! You are now level ${player.level}! ***`,
      MessageType.SYSTEM,
      0xff00ff
    );
    
    this.messageLog.addMessage(
      'Choose a stat to increase:',
      MessageType.SYSTEM,
      0xffff00
    );
    
    // Show stat choice UI
    this.showLevelUpChoice(player);
  }

  /**
   * Calculate XP required for a specific level
   * Uses exponential curve: level^1.5 * 50
   * @param level - Target level
   * @returns XP required
   */
  getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    
    // Exponential curve with specific values
    const baseXP = 50;
    const xp = Math.floor(Math.pow(level, 1.5) * baseXP);
    
    // Ensure specific level requirements
    if (level === 2) return 100;
    if (level === 3) return 250;
    if (level === 4) return 500;
    
    return xp;
  }

  // ============================================================================
  // LEVEL-UP STAT CHOICE
  // ============================================================================

  /**
   * Display level-up stat choice UI
   * @param player - Player choosing stats
   * @param callback - Optional callback when choice is made
   */
  showLevelUpChoice(player: Player, callback?: LevelUpCallback): void {
    if (this.isShowingLevelUpChoice) {
      return; // Already showing choices
    }
    
    // Store player and callback
    this.pendingPlayer = player;
    this.onLevelUpComplete = callback || null;
    
    // Get available choices for player's class
    this.availableChoices = this.getAvailableChoices(player);
    this.selectedChoiceIndex = 0;
    
    // Pause game and show UI
    this.isShowingLevelUpChoice = true;
    this.scene.scene.pause();
    
    // Setup input handling
    this.setupInputHandling();
    
    // Render the UI
    this.renderLevelUpUI();
  }

  /**
   * Get stat choices available for the player's class
   * @param player - Player to get choices for
   * @returns Array of available stat choices
   */
  private getAvailableChoices(player: Player): StatChoiceOption[] {
    return XPSystem.STAT_CHOICES.filter((choice) => {
      // If no class restriction, available to all
      if (!choice.classRestriction) return true;
      
      // Check if player's class matches restriction
      return choice.classRestriction === player.playerClass;
    });
  }

  /**
   * Apply the chosen stat bonus to the player
   * @param player - Player to apply bonus to
   * @param statChoice - Chosen stat to increase
   */
  levelUp(player: Player, statChoice: StatChoice): void {
    // Find the choice option
    const option = XPSystem.STAT_CHOICES.find((c) => c.stat === statChoice);
    if (!option) {
      console.error(`Invalid stat choice: ${statChoice}`);
      return;
    }
    
    // Apply stat increase
    switch (statChoice) {
      case StatChoice.MAX_HP:
        player.maxHP += option.bonus;
        player.currentHP += option.bonus; // Also increase current HP
        this.messageLog.addMessage(
          `Max HP increased by ${option.bonus}! (Now ${player.maxHP})`,
          MessageType.HEAL,
          0x00ff00
        );
        break;
        
      case StatChoice.ATTACK:
        player.attack += option.bonus;
        this.messageLog.addMessage(
          `Attack increased by ${option.bonus}! (Now ${player.attack})`,
          MessageType.COMBAT,
          0xff4444
        );
        break;
        
      case StatChoice.DEFENSE:
        player.defense += option.bonus;
        this.messageLog.addMessage(
          `Defense increased by ${option.bonus}! (Now ${player.defense})`,
          MessageType.INFO,
          0x4444ff
        );
        break;
        
      case StatChoice.MAX_MANA:
        player.maxMana += option.bonus;
        player.currentMana += option.bonus; // Also increase current mana
        this.messageLog.addMessage(
          `Max Mana increased by ${option.bonus}! (Now ${player.maxMana})`,
          MessageType.INFO,
          0x00ffff
        );
        break;
        
      case StatChoice.MAGIC_POWER:
        player.magicPower += option.bonus;
        this.messageLog.addMessage(
          `Magic Power increased by ${option.bonus}! (Now ${player.magicPower})`,
          MessageType.INFO,
          0xff00ff
        );
        break;
        
      case StatChoice.SPEED:
        player.speed += option.bonus;
        this.messageLog.addMessage(
          `Speed increased by ${option.bonus}! (Now ${player.speed})`,
          MessageType.INFO,
          0xffff00
        );
        break;
    }
  }

  // ============================================================================
  // UI RENDERING
  // ============================================================================

  /**
   * Render the level-up choice UI
   */
  private renderLevelUpUI(): void {
    if (!this.pendingPlayer) return;
    
    // Clear previous UI if exists
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }
    
    // Create container for UI
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setDepth(1000); // Ensure it's on top
    
    const width = 60;
    const height = 15 + this.availableChoices.length * 2;
    const x = Math.floor((this.renderer['gridWidth'] - width) / 2);
    const y = Math.floor((this.renderer['gridHeight'] - height) / 2);
    
    // Draw background box
    this.renderer.drawBox(x, y, width, height, 0x444444);
    
    // Draw title
    const title = `╔═══ LEVEL ${this.pendingPlayer.level} ═══╗`;
    this.renderer.drawText(x + Math.floor((width - title.length) / 2), y + 1, title, 0xff00ff);
    
    const subtitle = 'Choose a stat to increase:';
    this.renderer.drawText(x + Math.floor((width - subtitle.length) / 2), y + 3, subtitle, 0xffff00);
    
    // Draw stat choices
    let currentY = y + 5;
    this.availableChoices.forEach((choice, index) => {
      const isSelected = index === this.selectedChoiceIndex;
      const color = isSelected ? 0xffffff : 0xaaaaaa;
      const prefix = isSelected ? '► ' : '  ';
      const numberKey = `[${index + 1}] `;
      
      // Draw selection indicator and number key
      this.renderer.drawText(x + 2, currentY, prefix + numberKey, color);
      
      // Draw label
      this.renderer.drawText(x + 2 + prefix.length + numberKey.length, currentY, choice.label, color);
      
      // Draw description
      this.renderer.drawText(x + 4 + prefix.length + numberKey.length, currentY + 1, choice.description, isSelected ? 0xffdd00 : 0x888888);
      
      currentY += 2;
    });
    
    // Draw controls
    currentY += 1;
    const controls = '↑↓ or Number Keys to select | ENTER to confirm';
    this.renderer.drawText(x + Math.floor((width - controls.length) / 2), currentY, controls, 0x888888);
  }

  /**
   * Setup keyboard input handling for stat choice
   */
  private setupInputHandling(): void {
    // Remove previous listener if exists
    if (this.inputListener) {
      this.scene.input.keyboard?.off('keydown', this.inputListener);
    }
    
    // Create new input listener
    this.inputListener = (event: KeyboardEvent) => {
      if (!this.isShowingLevelUpChoice || !this.pendingPlayer) return;
      
      switch (event.key) {
        case 'ArrowUp':
          this.selectedChoiceIndex = (this.selectedChoiceIndex - 1 + this.availableChoices.length) % this.availableChoices.length;
          this.renderLevelUpUI();
          break;
          
        case 'ArrowDown':
          this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.availableChoices.length;
          this.renderLevelUpUI();
          break;
          
        case 'Enter':
          this.confirmChoice();
          break;
          
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          const index = parseInt(event.key) - 1;
          if (index >= 0 && index < this.availableChoices.length) {
            this.selectedChoiceIndex = index;
            this.renderLevelUpUI();
          }
          break;
      }
    };
    
    // Attach listener
    this.scene.input.keyboard?.on('keydown', this.inputListener);
  }

  /**
   * Confirm the selected stat choice
   */
  private confirmChoice(): void {
    if (!this.pendingPlayer || this.selectedChoiceIndex >= this.availableChoices.length) {
      return;
    }
    
    const choice = this.availableChoices[this.selectedChoiceIndex];
    
    // Apply stat bonus
    this.levelUp(this.pendingPlayer, choice.stat);
    
    // Call callback if provided
    if (this.onLevelUpComplete) {
      this.onLevelUpComplete(this.pendingPlayer, choice.stat);
    }
    
    // Close UI
    this.closeLevelUpUI();
  }

  /**
   * Close the level-up UI and resume game
   */
  private closeLevelUpUI(): void {
    // Clear UI
    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
    
    // Remove input listener
    if (this.inputListener) {
      this.scene.input.keyboard?.off('keydown', this.inputListener);
      this.inputListener = null;
    }
    
    // Clear state
    this.isShowingLevelUpChoice = false;
    this.pendingPlayer = null;
    this.onLevelUpComplete = null;
    this.availableChoices = [];
    this.selectedChoiceIndex = 0;
    
    // Resume game
    this.scene.scene.resume();
    
    // Clear and redraw the renderer
    this.renderer.clear();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if level-up UI is currently showing
   * @returns true if showing level-up choice
   */
  isLevelUpUIActive(): boolean {
    return this.isShowingLevelUpChoice;
  }

  /**
   * Get XP progress as percentage (0-100)
   * @param player - Player to check
   * @returns XP progress percentage
   */
  getXPProgress(player: Player): number {
    if (player.xpForNextLevel === 0) return 100;
    return Math.floor((player.xp / player.xpForNextLevel) * 100);
  }

  /**
   * Destroy the XP system and cleanup
   */
  destroy(): void {
    this.closeLevelUpUI();
  }
}
