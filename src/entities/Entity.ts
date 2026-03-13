/**
 * Base Entity class for all game entities
 * Provides core properties and methods for positioning, health, and combat stats
 */
export abstract class Entity {
  // ============================================================================
  // POSITION PROPERTIES
  // ============================================================================
  /** Grid X coordinate */
  x: number = 0;
  /** Grid Y coordinate */
  y: number = 0;

  // ============================================================================
  // DISPLAY PROPERTIES
  // ============================================================================
  /** ASCII character to display */
  glyph: string;
  /** Color value (0xRRGGBB) */
  color: number;
  /** Entity name */
  name: string;

  // ============================================================================
  // HEALTH PROPERTIES
  // ============================================================================
  /** Maximum health points */
  maxHP: number;
  /** Current health points */
  currentHP: number;

  // ============================================================================
  // COMBAT STATS
  // ============================================================================
  /** Attack power/damage */
  attack: number;
  /** Defense/armor value */
  defense: number;
  /** Speed/initiative */
  speed: number;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  /**
   * Creates a new Entity
   * @param x - Grid X position
   * @param y - Grid Y position
   * @param name - Entity name
   * @param glyph - ASCII character for display
   * @param color - Color value (0xRRGGBB)
   * @param maxHP - Maximum health points
   * @param attack - Attack stat
   * @param defense - Defense stat
   * @param speed - Speed stat
   */
  constructor(
    x: number,
    y: number,
    name: string,
    glyph: string,
    color: number,
    maxHP: number,
    attack: number,
    defense: number,
    speed: number
  ) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.glyph = glyph;
    this.color = color;
    this.maxHP = maxHP;
    this.currentHP = maxHP;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;
  }

  // ============================================================================
  // HEALTH & DAMAGE METHODS
  // ============================================================================

  /**
   * Reduces health by amount, cannot go below 0
   * @param amount - Damage amount to take
   * @returns Actual damage taken
   */
  takeDamage(amount: number): number {
    const damageDealt = Math.min(amount, this.currentHP);
    this.currentHP = Math.max(0, this.currentHP - amount);
    return damageDealt;
  }

  /**
   * Restores health by amount, cannot exceed maxHP
   * @param amount - Health to restore
   * @returns Actual health restored
   */
  heal(amount: number): number {
    const previousHP = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    return this.currentHP - previousHP;
  }

  /**
   * Check if entity is dead
   * @returns true if currentHP <= 0
   */
  isDead(): boolean {
    return this.currentHP <= 0;
  }

  // ============================================================================
  // POSITION METHODS
  // ============================================================================

  /**
   * Get entity position as tuple
   * @returns [x, y] tuple
   */
  getPosition(): [number, number] {
    return [this.x, this.y];
  }

  /**
   * Set entity position
   * @param x - New X coordinate
   * @param y - New Y coordinate
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  // ============================================================================
  // LIFECYCLE (ABSTRACT)
  // ============================================================================

  /**
   * Update entity state (to be implemented by subclasses)
   */
  abstract update(): void;
}
