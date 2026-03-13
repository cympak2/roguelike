/**
 * Base Entity class for all game entities
 * Provides core properties and methods for positioning, health, and combat stats
 */
var Entity = /** @class */ (function () {
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
    function Entity(x, y, name, glyph, color, maxHP, attack, defense, speed) {
        // ============================================================================
        // POSITION PROPERTIES
        // ============================================================================
        /** Grid X coordinate */
        this.x = 0;
        /** Grid Y coordinate */
        this.y = 0;
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
    Entity.prototype.takeDamage = function (amount) {
        var damageDealt = Math.min(amount, this.currentHP);
        this.currentHP = Math.max(0, this.currentHP - amount);
        return damageDealt;
    };
    /**
     * Restores health by amount, cannot exceed maxHP
     * @param amount - Health to restore
     * @returns Actual health restored
     */
    Entity.prototype.heal = function (amount) {
        var previousHP = this.currentHP;
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        return this.currentHP - previousHP;
    };
    /**
     * Check if entity is dead
     * @returns true if currentHP <= 0
     */
    Entity.prototype.isDead = function () {
        return this.currentHP <= 0;
    };
    // ============================================================================
    // POSITION METHODS
    // ============================================================================
    /**
     * Get entity position as tuple
     * @returns [x, y] tuple
     */
    Entity.prototype.getPosition = function () {
        return [this.x, this.y];
    };
    /**
     * Set entity position
     * @param x - New X coordinate
     * @param y - New Y coordinate
     */
    Entity.prototype.setPosition = function (x, y) {
        this.x = x;
        this.y = y;
    };
    return Entity;
}());
export { Entity };
