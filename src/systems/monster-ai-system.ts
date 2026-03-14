/**
 * Monster AI System for Turn-Based Combat
 * Handles AI behaviors: chase, flee, ranged attacks, and special abilities
 */

import { Monster, AIBehavior } from '../entities/monster';
import { Player } from '../entities/player';
import { Entity } from '../entities/Entity';
import { GameMap } from '../world/map';
import { getPathfinder, isPathClear, getDistance } from '../world/pathfinding';
import type { CombatIntent, MonsterAICondition } from '../types/monster-ai-rules';
import type { StatusEffect } from '../types/status-effects';
import type { NoiseEvent } from './noise-system';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Action types that monsters can take
 */
export enum ActionType {
  MOVE = 'move',
  MELEE_ATTACK = 'melee_attack',
  RANGED_ATTACK = 'ranged_attack',
  SPECIAL_ABILITY = 'special_ability',
  FLEE = 'flee',
  WAIT = 'wait',
}

/**
 * Represents an action a monster will perform
 */
export interface MonsterAction {
  type: ActionType;
  targetX?: number;
  targetY?: number;
  abilityId?: string;
  damage?: number;
  intent?: 'investigate';
}

/**
 * Special ability types
 */
export enum AbilityType {
  REGENERATE = 'regenerate',
  POISON = 'poison',
  STEAL = 'steal',
  PHASE = 'phase',
  SUMMON = 'summon',
}

/**
 * Special ability definition
 */
export interface SpecialAbility {
  id: string;
  type: AbilityType;
  name: string;
  cooldown: number;        // Turns before can use again
  currentCooldown: number; // Current cooldown counter
  range?: number;          // Required for ranged abilities
  power?: number;          // Ability strength
  duration?: number;       // For status effects
}

// ============================================================================
// MONSTER AI SYSTEM
// ============================================================================

export class MonsterAISystem {
  private pathfinder = getPathfinder();
  private statusEffects = new Map<Entity, StatusEffect[]>();
  private abilityRegistry = new Map<Monster, SpecialAbility[]>();

  // AI Configuration
  private readonly FLEE_HP_THRESHOLD = 0.25;     // Flee when HP < 25%
  private readonly RANGED_ATTACK_MIN_RANGE = 3;  // Minimum range for ranged attack
  private readonly RANGED_ATTACK_MAX_RANGE = 8;  // Maximum range for ranged attack
  private readonly ADJACENT_DISTANCE = 1.5;      // Consider adjacent for melee

  // ============================================================================
  // MAIN AI UPDATE
  // ============================================================================

  /**
   * Determine and return the action a monster should take
   * @param monster - The monster to update
   * @param player - The player entity
   * @param map - The game map
   * @param allMonsters - All active monsters (for summon ability)
   * @returns Action the monster will take
   */
  updateMonsterAI(
    monster: Monster,
    player: Player,
    map: GameMap,
    allMonsters: Monster[],
    noiseEvents: readonly NoiseEvent[] = []
  ): MonsterAction {
    // Process cooldowns for abilities
    this.updateCooldowns(monster);

    // Process status effects
    this.processStatusEffects(monster);

    // Check if monster can see player
    const distance = getDistance(monster.x, monster.y, player.x, player.y);
    const canSeePlayer = monster.canSee(player.x, player.y) &&
                         isPathClear(map, monster.x, monster.y, player.x, player.y);

    // Update aggro state
    monster.updateAggro(canSeePlayer);
    if (canSeePlayer) {
      monster.lastHeardNoisePos = null;
      monster.noiseInvestigationTurnsRemaining = 0;
    }

    if (!canSeePlayer) {
      const investigateAction = this.getNoiseInvestigationAction(monster, map, noiseEvents);
      if (investigateAction) {
        return investigateAction;
      }
    }

    const conditionalAction = this.evaluateConditionalRules(
      monster,
      player,
      map,
      canSeePlayer,
      distance
    );
    if (conditionalAction) {
      return conditionalAction;
    }

    // Try to use special ability if available
    const abilityAction = this.tryUseAbility(monster, player, map, allMonsters);
    if (abilityAction) {
      return abilityAction;
    }

    // Execute behavior based on AI type
    switch (monster.behavior) {
      case AIBehavior.AGGRESSIVE:
        return this.aggressiveBehavior(monster, player, map, canSeePlayer, distance);

      case AIBehavior.WANDERER:
        return this.wandererBehavior(monster, map);

      case AIBehavior.COWARDLY:
        return this.cowardlyBehavior(monster, player, map, canSeePlayer);

      case AIBehavior.AMBUSHER:
        return this.ambusherBehavior(monster, player, map, canSeePlayer, distance);

      case AIBehavior.STATIONARY:
        return this.stationaryBehavior(monster, player, distance);

      default:
        return { type: ActionType.WAIT };
    }
  }

  private getNoiseInvestigationAction(
    monster: Monster,
    map: GameMap,
    noiseEvents: readonly NoiseEvent[]
  ): MonsterAction | null {
    const heardNoise = this.selectAudibleNoise(monster, noiseEvents);
    if (heardNoise) {
      monster.lastHeardNoisePos = { x: heardNoise.x, y: heardNoise.y };
      monster.noiseInvestigationTurnsRemaining = 3;
    }

    if (!monster.lastHeardNoisePos || monster.noiseInvestigationTurnsRemaining <= 0) {
      monster.lastHeardNoisePos = null;
      monster.noiseInvestigationTurnsRemaining = 0;
      return null;
    }

    const action = this.investigateNoiseBehavior(monster, monster.lastHeardNoisePos, map);
    monster.noiseInvestigationTurnsRemaining = Math.max(0, monster.noiseInvestigationTurnsRemaining - 1);

    if (action.type === ActionType.WAIT && monster.noiseInvestigationTurnsRemaining <= 0) {
      monster.lastHeardNoisePos = null;
    }

    return action;
  }

  private selectAudibleNoise(
    monster: Monster,
    noiseEvents: readonly NoiseEvent[]
  ): NoiseEvent | null {
    let bestNoise: NoiseEvent | null = null;
    let bestPerceivedLoudness = monster.hearingThreshold;

    for (const event of noiseEvents) {
      if (event.sourceKind === 'monster' && event.x === monster.x && event.y === monster.y) {
        continue;
      }

      const distance = getDistance(monster.x, monster.y, event.x, event.y);
      if (distance > event.radius) {
        continue;
      }

      const perceivedLoudness = event.loudness - distance * 0.5;
      if (perceivedLoudness < bestPerceivedLoudness) {
        continue;
      }

      bestPerceivedLoudness = perceivedLoudness;
      bestNoise = event;
    }

    return bestNoise;
  }

  private investigateNoiseBehavior(
    monster: Monster,
    target: { x: number; y: number },
    map: GameMap
  ): MonsterAction {
    if (monster.x === target.x && monster.y === target.y) {
      return { type: ActionType.WAIT };
    }

    const nextStep = this.pathfinder.getNextStep(map, monster.x, monster.y, target.x, target.y);
    if (nextStep) {
      const [targetX, targetY] = nextStep;
      return {
        type: ActionType.MOVE,
        targetX,
        targetY,
        intent: 'investigate',
      };
    }

    const [dx, dy] = monster.getAIDirection(target.x, target.y);
    const nextX = monster.x + dx;
    const nextY = monster.y + dy;
    if (map.isInBounds(nextX, nextY) && !map.isBlocked(nextX, nextY)) {
      return {
        type: ActionType.MOVE,
        targetX: nextX,
        targetY: nextY,
        intent: 'investigate',
      };
    }

    return { type: ActionType.WAIT };
  }

  private evaluateConditionalRules(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean,
    distance: number
  ): MonsterAction | null {
    const ruleSet = monster.aiRules;
    if (!ruleSet || ruleSet.rules.length === 0) {
      return null;
    }

    for (const rule of ruleSet.rules) {
      if (this.matchesRuleCondition(rule.when, monster, player, canSeePlayer, distance)) {
        return this.intentToAction(rule.intent, monster, player, map, canSeePlayer, distance);
      }
    }

    if (ruleSet.defaultIntent) {
      return this.intentToAction(ruleSet.defaultIntent, monster, player, map, canSeePlayer, distance);
    }

    return null;
  }

  private matchesRuleCondition(
    condition: MonsterAICondition,
    monster: Monster,
    player: Player,
    canSeePlayer: boolean,
    distance: number
  ): boolean {
    const selfHpRatio = monster.currentHP / monster.maxHP;
    const playerHpRatio = player.currentHP / player.maxHP;

    if (condition.requiresLineOfSight === true && !canSeePlayer) {
      return false;
    }
    if (condition.selfHpAtMost !== undefined && selfHpRatio > condition.selfHpAtMost) {
      return false;
    }
    if (condition.selfHpAbove !== undefined && selfHpRatio <= condition.selfHpAbove) {
      return false;
    }
    if (condition.playerHpAtMost !== undefined && playerHpRatio > condition.playerHpAtMost) {
      return false;
    }
    if (condition.playerHpAbove !== undefined && playerHpRatio <= condition.playerHpAbove) {
      return false;
    }
    if (condition.distanceAtMost !== undefined && distance > condition.distanceAtMost) {
      return false;
    }
    if (condition.distanceAtLeast !== undefined && distance < condition.distanceAtLeast) {
      return false;
    }

    return true;
  }

  private intentToAction(
    intent: CombatIntent,
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean,
    distance: number
  ): MonsterAction {
    if (intent === 'flee' && monster.aiRules?.neverFlee) {
      return this.intentToAction('attack', monster, player, map, canSeePlayer, distance);
    }

    switch (intent) {
      case 'attack':
        if (distance <= this.ADJACENT_DISTANCE) {
          return {
            type: ActionType.MELEE_ATTACK,
            targetX: player.x,
            targetY: player.y,
            damage: monster.attack,
          };
        }

        if (canSeePlayer && this.hasRangedCapability(monster) &&
            distance >= this.RANGED_ATTACK_MIN_RANGE &&
            distance <= this.RANGED_ATTACK_MAX_RANGE) {
          return {
            type: ActionType.RANGED_ATTACK,
            targetX: player.x,
            targetY: player.y,
            damage: monster.attack,
          };
        }

        return this.chaseBehavior(monster, player, map);

      case 'chase':
        if (!canSeePlayer) {
          return this.wandererBehavior(monster, map);
        }
        return this.chaseBehavior(monster, player, map);

      case 'flee':
        if (!canSeePlayer) {
          return this.wandererBehavior(monster, map);
        }
        return this.fleeBehavior(monster, player, map);

      case 'wait':
      default:
        return { type: ActionType.WAIT };
    }
  }

  // ============================================================================
  // BEHAVIOR IMPLEMENTATIONS
  // ============================================================================

  /**
   * Aggressive behavior: Chase and attack player
   */
  private aggressiveBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean,
    distance: number
  ): MonsterAction {
    if (!canSeePlayer) {
      // Wander if can't see player
      return this.wandererBehavior(monster, map);
    }

    // Check for ranged attack opportunity
    if (this.hasRangedCapability(monster) &&
        distance >= this.RANGED_ATTACK_MIN_RANGE &&
        distance <= this.RANGED_ATTACK_MAX_RANGE) {
      return {
        type: ActionType.RANGED_ATTACK,
        targetX: player.x,
        targetY: player.y,
        damage: monster.attack,
      };
    }

    // Check if adjacent to player for melee attack
    if (distance <= this.ADJACENT_DISTANCE) {
      return {
        type: ActionType.MELEE_ATTACK,
        targetX: player.x,
        targetY: player.y,
        damage: monster.attack,
      };
    }

    // Move towards player
    return this.chaseBehavior(monster, player, map);
  }

  /**
   * Chase behavior: Move toward player using pathfinding
   */
  private chaseBehavior(monster: Monster, player: Player, map: GameMap): MonsterAction {
    const nextStep = this.pathfinder.getNextStep(
      map,
      monster.x,
      monster.y,
      player.x,
      player.y
    );

    if (nextStep) {
      const [targetX, targetY] = nextStep;
      return {
        type: ActionType.MOVE,
        targetX,
        targetY,
      };
    }

    // Fallback: simple movement towards player
    const [dx, dy] = monster.getAIDirection(player.x, player.y);
    return {
      type: ActionType.MOVE,
      targetX: monster.x + dx,
      targetY: monster.y + dy,
    };
  }

  /**
   * Flee behavior: Move away from player when low HP
   */
  private fleeBehavior(monster: Monster, player: Player, map: GameMap): MonsterAction {
    // Calculate opposite direction from player
    const [dx, dy] = monster.getAIDirection(player.x, player.y);
    const fleeX = monster.x - dx;
    const fleeY = monster.y - dy;

    // Check if flee position is valid
    if (map.isInBounds(fleeX, fleeY) && !map.isBlocked(fleeX, fleeY)) {
      return {
        type: ActionType.FLEE,
        targetX: fleeX,
        targetY: fleeY,
      };
    }

    // Try alternative escape routes
    const escapeDirections = [
      [-dx, -dy], [-dx, 0], [0, -dy],
      [dx, -dy], [-dx, dy], [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    for (const [dirX, dirY] of escapeDirections) {
      const escapeX = monster.x + dirX;
      const escapeY = monster.y + dirY;
      if (map.isInBounds(escapeX, escapeY) && !map.isBlocked(escapeX, escapeY)) {
        return {
          type: ActionType.FLEE,
          targetX: escapeX,
          targetY: escapeY,
        };
      }
    }

    // Can't escape, wait
    return { type: ActionType.WAIT };
  }

  /**
   * Wanderer behavior: Move randomly
   */
  private wandererBehavior(monster: Monster, map: GameMap): MonsterAction {
    // 50% chance to move, 50% chance to wait
    if (Math.random() < 0.5) {
      return { type: ActionType.WAIT };
    }

    // Choose random direction
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];

    const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
    const newX = monster.x + dx;
    const newY = monster.y + dy;

    if (map.isInBounds(newX, newY) && !map.isBlocked(newX, newY)) {
      return {
        type: ActionType.MOVE,
        targetX: newX,
        targetY: newY,
      };
    }

    return { type: ActionType.WAIT };
  }

  /**
   * Cowardly behavior: Always flee from player
   */
  private cowardlyBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean
  ): MonsterAction {
    if (!canSeePlayer) {
      return this.wandererBehavior(monster, map);
    }

    return this.fleeBehavior(monster, player, map);
  }

  /**
   * Ambusher behavior: Wait until player is close, then attack
   */
  private ambusherBehavior(
    monster: Monster,
    player: Player,
    map: GameMap,
    canSeePlayer: boolean,
    distance: number
  ): MonsterAction {
    // Only act if player is within ambush range
    const AMBUSH_RANGE = 3;

    if (canSeePlayer && distance <= AMBUSH_RANGE) {
      // Act like aggressive monster
      return this.aggressiveBehavior(monster, player, map, true, distance);
    }

    // Otherwise, stay still
    return { type: ActionType.WAIT };
  }

  /**
   * Stationary behavior: Only attack if adjacent
   */
  private stationaryBehavior(
    monster: Monster,
    player: Player,
    distance: number
  ): MonsterAction {
    // Only attack if player is adjacent
    if (distance <= this.ADJACENT_DISTANCE) {
      return {
        type: ActionType.MELEE_ATTACK,
        targetX: player.x,
        targetY: player.y,
        damage: monster.attack,
      };
    }

    return { type: ActionType.WAIT };
  }

  // ============================================================================
  // SPECIAL ABILITIES
  // ============================================================================

  /**
   * Add a special ability to a monster
   */
  addAbility(monster: Monster, ability: SpecialAbility): void {
    const abilities = this.abilityRegistry.get(monster) || [];
    abilities.push({ ...ability, currentCooldown: 0 });
    this.abilityRegistry.set(monster, abilities);
  }

  /**
   * Try to use a special ability if available
   */
  private tryUseAbility(
    monster: Monster,
    player: Player,
    map: GameMap,
    allMonsters: Monster[]
  ): MonsterAction | null {
    const abilities = this.abilityRegistry.get(monster);
    if (!abilities || abilities.length === 0) {
      return null;
    }

    // Find available abilities (off cooldown)
    const availableAbilities = abilities.filter(a => a.currentCooldown <= 0);
    if (availableAbilities.length === 0) {
      return null;
    }

    // Try each ability
    for (const ability of availableAbilities) {
      const action = this.tryExecuteAbility(monster, player, map, ability, allMonsters);
      if (action) {
        // Set cooldown
        ability.currentCooldown = ability.cooldown;
        return action;
      }
    }

    return null;
  }

  /**
   * Try to execute a specific ability
   */
  private tryExecuteAbility(
    monster: Monster,
    player: Player,
    map: GameMap,
    ability: SpecialAbility,
    allMonsters: Monster[]
  ): MonsterAction | null {
    const distance = getDistance(monster.x, monster.y, player.x, player.y);

    switch (ability.type) {
      case AbilityType.REGENERATE:
        // Use when injured
        if (monster.currentHP < monster.maxHP * 0.75) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            abilityId: ability.id,
          };
        }
        break;

      case AbilityType.POISON:
        // Use when close to player
        if (distance <= (ability.range || 3)) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            abilityId: ability.id,
            targetX: player.x,
            targetY: player.y,
          };
        }
        break;

      case AbilityType.STEAL:
        // Use when adjacent to player
        if (distance <= 1.5) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            abilityId: ability.id,
            targetX: player.x,
            targetY: player.y,
          };
        }
        break;

      case AbilityType.PHASE:
        // Use when blocked or trying to escape
        if (this.shouldFlee(monster) || this.isTrapped(monster, map)) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            abilityId: ability.id,
          };
        }
        break;

      case AbilityType.SUMMON:
        // Use when at medium HP and not too many monsters
        if (monster.currentHP < monster.maxHP * 0.6 && allMonsters.length < 20) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            abilityId: ability.id,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Execute a special ability
   * @param monster - The monster using the ability
   * @param player - The player (potential target)
   * @param ability - The ability to execute
   * @param map - The game map
   * @param allMonsters - All active monsters
   */
  executeAbility(
    monster: Monster,
    player: Player,
    ability: SpecialAbility,
    map: GameMap,
    allMonsters: Monster[]
  ): void {
    switch (ability.type) {
      case AbilityType.REGENERATE:
        this.executeRegenerate(monster, ability);
        break;

      case AbilityType.POISON:
        this.executePoison(player, ability);
        break;

      case AbilityType.STEAL:
        this.executeSteal(monster, player, ability);
        break;

      case AbilityType.PHASE:
        this.executePhase(monster, ability);
        break;

      case AbilityType.SUMMON:
        this.executeSummon(monster, map, ability, allMonsters);
        break;
    }
  }

  /**
   * Regenerate ability: Heal HP over time
   */
  private executeRegenerate(monster: Monster, ability: SpecialAbility): void {
    const healAmount = ability.power || 5;
    monster.heal(healAmount);

    // Apply regeneration status effect
    this.addStatusEffect(monster, {
      type: 'regenerate',
      duration: ability.duration || 5,
      power: healAmount,
    });
  }

  /**
   * Poison ability: Apply damage-over-time to player
   */
  private executePoison(player: Player, ability: SpecialAbility): void {
    player.addStatusEffect({
      type: 'poison',
      duration: ability.duration || 5,
      power: ability.power || 2,
    });
  }

  /**
   * Steal ability: Take item from player inventory
   */
  private executeSteal(monster: Monster, player: Player, _ability: SpecialAbility): void {
    // Check if player has inventory
    if (typeof (player as any).inventory !== 'undefined') {
      const inventory = (player as any).inventory as any[];
      if (inventory && inventory.length > 0) {
        // Steal random item
        const randomIndex = Math.floor(Math.random() * inventory.length);
        const stolenItem = inventory[randomIndex];
        inventory.splice(randomIndex, 1);
        
        // TODO: Could add stolen item to monster's loot drops
        console.log(`${monster.name} stole ${stolenItem.name || 'an item'}!`);
      }
    }
  }

  /**
   * Phase ability: Temporarily ignore walls
   */
  private executePhase(monster: Monster, ability: SpecialAbility): void {
    this.addStatusEffect(monster, {
      type: 'phase',
      duration: ability.duration || 3,
      power: 1,
    });
  }

  /**
   * Summon ability: Spawn additional monsters
   */
  private executeSummon(
    monster: Monster,
    map: GameMap,
    ability: SpecialAbility,
    allMonsters: Monster[]
  ): void {
    const summonCount = Math.min(ability.power || 2, 3);
    const adjacentPositions = this.getAdjacentPositions(monster.x, monster.y, map);

    for (let i = 0; i < Math.min(summonCount, adjacentPositions.length); i++) {
      const [x, y] = adjacentPositions[i];
      
      // Create a weaker version of the summoner
      const summon = new Monster(
        x, y,
        `Summoned ${monster.name}`,
        monster.glyph,
        monster.color,
        Math.floor(monster.maxHP * 0.5),
        Math.floor(monster.attack * 0.7),
        Math.floor(monster.defense * 0.7),
        monster.speed,
        AIBehavior.AGGRESSIVE,
        Math.floor(monster.xpReward * 0.3)
      );

      // Add to map and monsters list
      map.addEntity(summon);
      allMonsters.push(summon);
    }
  }

  // ============================================================================
  // STATUS EFFECTS
  // ============================================================================

  /**
   * Add a status effect to an entity
   */
  private addStatusEffect(entity: Entity, effect: StatusEffect): void {
    const effects = this.statusEffects.get(entity) || [];
    effects.push(effect);
    this.statusEffects.set(entity, effects);
  }

  /**
   * Process status effects for a monster
   */
  private processStatusEffects(monster: Monster): void {
    const effects = this.statusEffects.get(monster);
    if (!effects || effects.length === 0) {
      return;
    }

    const remainingEffects: StatusEffect[] = [];

    for (const effect of effects) {
      // Apply effect
      switch (effect.type) {
        case 'poison':
          monster.takeDamage(effect.power);
          break;

        case 'regenerate':
          monster.heal(effect.power);
          break;

        case 'phase':
          // Phase effect is checked when needed
          break;
      }

      // Decrease duration
      effect.duration--;

      // Keep effect if still active
      if (effect.duration > 0) {
        remainingEffects.push(effect);
      }
    }

    // Update effects list
    if (remainingEffects.length > 0) {
      this.statusEffects.set(monster, remainingEffects);
    } else {
      this.statusEffects.delete(monster);
    }
  }

  /**
   * Check if entity has a specific status effect
   */
  hasStatusEffect(entity: Entity, effectType: string): boolean {
    const effects = this.statusEffects.get(entity);
    if (!effects) return false;
    return effects.some(e => e.type === effectType);
  }

  /**
   * Clear all status effects from an entity
   */
  clearStatusEffects(entity: Entity): void {
    this.statusEffects.delete(entity);
  }

  // ============================================================================
  // COOLDOWN MANAGEMENT
  // ============================================================================

  /**
   * Update cooldowns for all monster abilities
   */
  private updateCooldowns(monster: Monster): void {
    const abilities = this.abilityRegistry.get(monster);
    if (!abilities) return;

    for (const ability of abilities) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown--;
      }
    }
  }

  /**
   * Reset all cooldowns for a monster
   */
  resetCooldowns(monster: Monster): void {
    const abilities = this.abilityRegistry.get(monster);
    if (!abilities) return;

    for (const ability of abilities) {
      ability.currentCooldown = 0;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if monster should flee based on HP
   */
  shouldFlee(monster: Monster): boolean {
    const hpRatio = monster.currentHP / monster.maxHP;
    return hpRatio < this.FLEE_HP_THRESHOLD;
  }

  /**
   * Check if monster has ranged attack capability
   */
  private hasRangedCapability(monster: Monster): boolean {
    // Check if monster has ranged ability or specific type
    // This could be extended to check monster properties
    const abilities = this.abilityRegistry.get(monster);
    if (!abilities) return false;
    
    // For now, consider if monster is an archer type or has high sight range
    return monster.sightRange >= 8;
  }

  /**
   * Check if monster is trapped (surrounded by walls/obstacles)
   */
  private isTrapped(monster: Monster, map: GameMap): boolean {
    const adjacentPositions = [
      [monster.x + 1, monster.y],
      [monster.x - 1, monster.y],
      [monster.x, monster.y + 1],
      [monster.x, monster.y - 1],
    ];

    let blockedCount = 0;
    for (const [x, y] of adjacentPositions) {
      if (!map.isInBounds(x, y) || map.isBlocked(x, y)) {
        blockedCount++;
      }
    }

    return blockedCount >= 3;
  }

  /**
   * Get valid adjacent positions for spawning
   */
  private getAdjacentPositions(x: number, y: number, map: GameMap): [number, number][] {
    const positions: [number, number][] = [];
    const directions = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
      [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]
    ];

    for (const [px, py] of directions) {
      if (map.isInBounds(px, py) && !map.isBlocked(px, py)) {
        positions.push([px, py]);
      }
    }

    return positions;
  }

  /**
   * Get all monsters with active abilities
   */
  getMonsterAbilities(monster: Monster): SpecialAbility[] {
    return this.abilityRegistry.get(monster) || [];
  }

  /**
   * Clean up dead monster data
   */
  cleanupMonster(monster: Monster): void {
    this.abilityRegistry.delete(monster);
    this.statusEffects.delete(monster);
    monster.lastHeardNoisePos = null;
    monster.noiseInvestigationTurnsRemaining = 0;
  }
}

export default MonsterAISystem;
