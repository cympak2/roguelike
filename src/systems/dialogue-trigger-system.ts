import type { Player } from '../entities/player';
import type { NPC } from '../entities/npc';
import type { GameMap } from '../world/map';
import type { Scene } from 'phaser';

export interface DialogueCondition {
  type: 'class' | 'item' | 'quest' | 'level' | 'health';
  value: string | number | boolean;
  operator?: 'equals' | 'greaterThan' | 'lessThan' | 'has';
}

export interface InteractionResult {
  success: boolean;
  npc?: NPC;
  message?: string;
}

export class DialogueTriggerSystem {
  private scene: Scene;
  private highlightedNPC: NPC | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Check if there's an NPC near the player that can be interacted with
   * @param player The player entity
   * @param npcs Array of all NPCs in the game
   * @param map The game map
   * @returns The interactable NPC or null
   */
  checkNPCInteraction(player: Player, npcs: NPC[], map: GameMap): NPC | null {
    for (const npc of npcs) {
      if (npc.isPlayerInRange(player.x, player.y) && this.canInteract(player, npc)) {
        return npc;
      }
    }
    return null;
  }

  /**
   * Check if player can interact with a specific NPC
   * @param player The player entity
   * @param npc The NPC to interact with
   * @returns True if interaction is allowed
   */
  canInteract(player: Player, npc: NPC): boolean {
    // Check if NPC is interactable
    if (!npc.isInteractable) {
      return false;
    }

    // Check if NPC is within range
    if (!npc.isPlayerInRange(player.x, player.y)) {
      return false;
    }

    // Check if player is alive
    if (player.currentHP <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Trigger dialogue with an NPC
   * @param scene The game scene
   * @param npc The NPC to interact with
   * @param player The player entity
   */
  triggerDialogue(scene: Scene, npc: NPC, player: Player): void {
    // Start dialogue on the NPC
    npc.onInteract();

    // Launch DialogueScene as an overlay
    scene.scene.launch('DialogueScene');
    
    // Get reference to DialogueScene and show the dialogue
    const dialogueScene = scene.scene.get('DialogueScene') as any;
    if (dialogueScene && dialogueScene.showDialogue) {
      dialogueScene.showDialogue(npc);
    }
  }

  /**
   * Evaluate an array of conditions against player state
   * @param player The player entity
   * @param conditions Array of conditions to check
   * @returns True if all conditions are met
   */
  evaluateConditions(player: Player, conditions: DialogueCondition[]): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => this.evaluateCondition(player, condition));
  }

  /**
   * Evaluate a single condition
   * @param player The player entity
   * @param condition The condition to check
   * @returns True if condition is met
   */
  private evaluateCondition(player: Player, condition: DialogueCondition): boolean {
    switch (condition.type) {
      case 'class':
        return this.checkClassCondition(player, condition);
      
      case 'item':
        return this.checkItemCondition(player, condition);
      
      case 'quest':
        return this.checkQuestCondition(player, condition);
      
      case 'level':
        return this.checkLevelCondition(player, condition);
      
      case 'health':
        return this.checkHealthCondition(player, condition);
      
      default:
        return true;
    }
  }

  /**
   * Check if player's class matches the condition
   */
  private checkClassCondition(player: Player, condition: DialogueCondition): boolean {
    return player.playerClass === condition.value;
  }

  /**
   * Check if player has a specific item
   */
  private checkItemCondition(player: Player, condition: DialogueCondition): boolean {
    const itemId = condition.value as string;
    const item = player.getItem(itemId);
    
    if (condition.operator === 'has') {
      return item !== null && item.quantity > 0;
    }
    
    return item !== null;
  }

  /**
   * Check quest progress flag
   * Note: Quest system needs to be added to Player entity
   */
  private checkQuestCondition(player: Player, condition: DialogueCondition): boolean {
    // Check if player has quest flags property
    const questFlags = (player as any).questFlags as Map<string, boolean> | undefined;
    
    if (!questFlags) {
      return false;
    }
    
    const questId = condition.value as string;
    return questFlags.get(questId) === true;
  }

  /**
   * Check if player level meets the condition
   */
  private checkLevelCondition(player: Player, condition: DialogueCondition): boolean {
    const requiredLevel = condition.value as number;
    const operator = condition.operator || 'greaterThan';
    
    switch (operator) {
      case 'equals':
        return player.level === requiredLevel;
      case 'greaterThan':
        return player.level >= requiredLevel;
      case 'lessThan':
        return player.level < requiredLevel;
      default:
        return true;
    }
  }

  /**
   * Check if player health meets the condition
   */
  private checkHealthCondition(player: Player, condition: DialogueCondition): boolean {
    const requiredHealth = condition.value as number;
    const operator = condition.operator || 'greaterThan';
    
    const healthPercent = (player.currentHP / player.maxHP) * 100;
    
    switch (operator) {
      case 'greaterThan':
        return healthPercent >= requiredHealth;
      case 'lessThan':
        return healthPercent < requiredHealth;
      default:
        return true;
    }
  }

  /**
   * Find the nearest interactable NPC to the player
   * @param player The player entity
   * @param npcs Array of all NPCs
   * @returns The nearest NPC or null
   */
  findNearestNPC(player: Player, npcs: NPC[]): NPC | null {
    let nearestNPC: NPC | null = null;
    let nearestDistance = Infinity;

    for (const npc of npcs) {
      if (!this.canInteract(player, npc)) {
        continue;
      }

      const distance = this.calculateDistance(player.x, player.y, npc.x, npc.y);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNPC = npc;
      }
    }

    return nearestNPC;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get a visual indicator message for nearby NPCs
   * @param player The player entity
   * @param npcs Array of all NPCs
   * @returns Message string or null
   */
  getInteractionPrompt(player: Player, npcs: NPC[]): string | null {
    const nearbyNPC = this.checkNPCInteraction(player, npcs, {} as GameMap);
    
    if (nearbyNPC) {
      this.highlightedNPC = nearbyNPC;
      return `Press [E] or [Space] to talk to ${nearbyNPC.name}`;
    }
    
    this.highlightedNPC = null;
    return null;
  }

  /**
   * Get the currently highlighted NPC
   */
  getHighlightedNPC(): NPC | null {
    return this.highlightedNPC;
  }

  /**
   * Clear the highlighted NPC
   */
  clearHighlight(): void {
    this.highlightedNPC = null;
  }

  /**
   * Check if player is attempting to interact at a specific position
   * @param player The player entity
   * @param targetX Target X coordinate
   * @param targetY Target Y coordinate
   * @param map The game map
   * @returns Interaction result
   */
  attemptInteraction(
    player: Player,
    targetX: number,
    targetY: number,
    map: GameMap
  ): InteractionResult {
    // Get entity at target position
    const entity = map.getEntityAt(targetX, targetY);
    
    if (!entity) {
      return {
        success: false,
        message: 'Nothing to interact with here.'
      };
    }

    // Check if entity is an NPC
    if (entity.constructor.name === 'NPC') {
      const npc = entity as unknown as NPC;
      
      if (!this.canInteract(player, npc)) {
        return {
          success: false,
          message: `Cannot interact with ${npc.name}.`
        };
      }

      return {
        success: true,
        npc: npc,
        message: `Talking to ${npc.name}...`
      };
    }

    return {
      success: false,
      message: 'Cannot interact with this.'
    };
  }

  /**
   * Get all NPCs within interaction range of the player
   * @param player The player entity
   * @param npcs Array of all NPCs
   * @returns Array of nearby NPCs
   */
  getNearbyNPCs(player: Player, npcs: NPC[]): NPC[] {
    return npcs.filter(npc => 
      npc.isPlayerInRange(player.x, player.y) && this.canInteract(player, npc)
    );
  }
}
