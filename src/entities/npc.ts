/**
 * NPC (Non-Player Character) class
 * Extends Entity with dialogue and interaction capabilities
 */

import { Entity } from './Entity';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum NPCType {
  /** Sells items */
  MERCHANT = 'merchant',
  /** Provides quests */
  QUESTGIVER = 'questgiver',
  /** Provides healing or services */
  HEALER = 'healer',
  /** Provides information/lore */
  SAGE = 'sage',
  /** Guards/patrol NPCs */
  GUARD = 'guard',
  /** Generic NPC */
  GENERIC = 'generic',
}

/**
 * Dialogue option for player choice
 */
export interface DialogueOption {
  id: string;
  text: string;
  nextDialogueId?: string;
  actionId?: string;
  action?: () => void;
}

/**
 * Single dialogue node
 */
export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
  onComplete?: () => void;
}

// ============================================================================
// NPC CLASS
// ============================================================================

export class NPC extends Entity {
  // ============================================================================
  // NPC PROPERTIES
  // ============================================================================
  /** NPC type/role */
  npcType: NPCType;
  /** Dialogue tree starting ID */
  dialogueStartId: string;
  /** All available dialogues */
  dialogues: Map<string, DialogueNode>;
  /** Current dialogue ID */
  currentDialogueId: string | null;
  /** Whether NPC is interactable */
  isInteractable: boolean;
  /** Interaction range (in grid units) */
  interactionRange: number;
  /** Source NPC definition identifier */
  definitionId?: string;
  /** Quest IDs this NPC can offer */
  questIds: string[];
  /** Item IDs sold by this NPC */
  shopInventoryIds: string[];

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /**
   * Creates a new NPC
   * @param x - Starting X position
   * @param y - Starting Y position
   * @param name - NPC name
   * @param glyph - ASCII character for display
   * @param color - Color value (0xRRGGBB)
   * @param npcType - NPC type/role
   * @param dialogueStartId - Starting dialogue ID
   */
  constructor(
    x: number,
    y: number,
    name: string,
    glyph: string,
    color: number,
    npcType: NPCType = NPCType.GENERIC,
    dialogueStartId: string = 'start'
  ) {
    // NPCs have no combat stats typically
    super(
      x,
      y,
      name,
      glyph,
      color,
      100, // maxHP (not used in combat for NPCs)
      0, // attack
      0, // defense
      0 // speed
    );

    this.npcType = npcType;
    this.dialogueStartId = dialogueStartId;
    this.currentDialogueId = null;
    this.isInteractable = true;
    this.interactionRange = 2;
    this.dialogues = new Map();
    this.questIds = [];
    this.shopInventoryIds = [];
  }

  // ============================================================================
  // DIALOGUE METHODS
  // ============================================================================

  /**
   * Register a dialogue node
   * @param node - Dialogue node to register
   */
  addDialogue(node: DialogueNode): void {
    this.dialogues.set(node.id, node);
  }

  /**
   * Register multiple dialogue nodes
   * @param nodes - Array of dialogue nodes
   */
  addDialogues(nodes: DialogueNode[]): void {
    for (const node of nodes) {
      this.addDialogue(node);
    }
  }

  /**
   * Start dialogue with this NPC
   */
  startDialogue(): void {
    this.currentDialogueId = this.dialogueStartId;
  }

  /**
   * Get current dialogue node
   * @returns Current dialogue node or undefined
   */
  getCurrentDialogue(): DialogueNode | undefined {
    if (!this.currentDialogueId) return undefined;
    return this.dialogues.get(this.currentDialogueId);
  }

  /**
   * Progress dialogue to next node
   * @param optionId - Option ID selected by player
   */
  selectDialogueOption(optionId: string): void {
    const current = this.getCurrentDialogue();
    if (!current) return;

    const option = current.options.find((opt) => opt.id === optionId);
    if (!option) return;

    // Execute option action if any
    if (option.action) {
      option.action();
    }

    // Move to next dialogue
    if (option.nextDialogueId) {
      this.currentDialogueId = option.nextDialogueId;
    } else {
      // End dialogue
      if (current.onComplete) {
        current.onComplete();
      }
      this.endDialogue();
    }
  }

  /**
   * End current dialogue
   */
  endDialogue(): void {
    this.currentDialogueId = null;
  }

  // ============================================================================
  // INTERACTION METHODS
  // ============================================================================

  /**
   * Check if player is in interaction range
   * @param playerX - Player X position
   * @param playerY - Player Y position
   * @returns true if within interaction range
   */
  isPlayerInRange(playerX: number, playerY: number): boolean {
    const distance = Math.sqrt(
      Math.pow(playerX - this.x, 2) + Math.pow(playerY - this.y, 2)
    );
    return distance <= this.interactionRange;
  }

  /**
   * Handle interaction with player
   */
  onInteract(): void {
    if (this.isInteractable) {
      this.startDialogue();
    }
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Update NPC state
   */
  update(): void {
    // NPC state updates would go here
    // Such as patrol paths, animation updates, etc.
  }

  /**
   * Get NPC status string
   * @returns Status string
   */
  getStatus(): string {
    const typeStr = this.npcType.toUpperCase();
    const dialogueStr = this.currentDialogueId
      ? ` [TALKING: ${this.currentDialogueId}]`
      : '';
    return `${typeStr} - ${this.name}${dialogueStr}`;
  }
}

export default NPC;
