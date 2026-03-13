/**
 * Character Class Definitions
 * Defines stats, abilities, and starting equipment for player classes
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ClassStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  magicPower: number;
  speed: number;
  experience: number;
  level: number;
}

export interface ClassAbility {
  name: string;
  description: string;
  manaCost: number;
  cooldown: number;
  damage?: number;
  healing?: number;
  range?: number;
  area?: number;
}

export interface StartingEquipment {
  weapon: string;
  armor: string;
  shield?: string;
  accessory?: string;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  baseStats: ClassStats;
  abilities: ClassAbility[];
  startingEquipment: StartingEquipment;
  primaryStat: 'attack' | 'defense' | 'magicPower';
  classColor: number;
  glyph: string;
}

// ============================================================================
// CHARACTER CLASSES
// ============================================================================

/** Warrior: Melee combat specialist with high HP and defense */
export const WARRIOR: CharacterClass = {
  id: 'warrior',
  name: 'Warrior',
  description: 'A mighty warrior specializing in melee combat and heavy armor. High HP and defense, moderate damage.',
  baseStats: {
    hp: 100,
    maxHp: 100,
    mana: 20,
    maxMana: 20,
    attack: 8,
    defense: 7,
    magicPower: 2,
    speed: 4,
    experience: 0,
    level: 1,
  },
  abilities: [
    {
      name: 'Slash',
      description: 'A basic melee attack',
      manaCost: 0,
      cooldown: 0,
      damage: 8,
      range: 1,
    },
    {
      name: 'Power Attack',
      description: 'A powerful strike dealing 150% damage, increased cooldown',
      manaCost: 10,
      cooldown: 3,
      damage: 12,
      range: 1,
    },
    {
      name: 'Shield Bash',
      description: 'Bash an enemy with your shield, stunning them',
      manaCost: 5,
      cooldown: 2,
      damage: 5,
      range: 1,
    },
    {
      name: 'Whirlwind',
      description: 'Attack all adjacent enemies',
      manaCost: 15,
      cooldown: 4,
      damage: 6,
      range: 1,
      area: 1,
    },
  ],
  startingEquipment: {
    weapon: 'iron_sword',
    armor: 'leather_armor',
    shield: 'wooden_shield',
  },
  primaryStat: 'attack',
  classColor: 0xff6b6b,
  glyph: 'W',
};

/** Mage: Ranged magic specialist with low HP but high magic power */
export const MAGE: CharacterClass = {
  id: 'mage',
  name: 'Mage',
  description: 'A powerful spellcaster with high magic power. Low HP but devastating spells from range.',
  baseStats: {
    hp: 50,
    maxHp: 50,
    mana: 100,
    maxMana: 100,
    attack: 3,
    defense: 2,
    magicPower: 10,
    speed: 5,
    experience: 0,
    level: 1,
  },
  abilities: [
    {
      name: 'Fireball',
      description: 'Hurl a fireball at enemies, dealing area damage',
      manaCost: 20,
      cooldown: 2,
      damage: 12,
      range: 6,
      area: 2,
    },
    {
      name: 'Frost Bolt',
      description: 'Shoot a bolt of ice, freezing and damaging enemies',
      manaCost: 15,
      cooldown: 1,
      damage: 10,
      range: 8,
    },
    {
      name: 'Heal',
      description: 'Restore your health',
      manaCost: 25,
      cooldown: 2,
      healing: 30,
      range: 1,
    },
    {
      name: 'Arcane Blast',
      description: 'A powerful magical explosion',
      manaCost: 30,
      cooldown: 3,
      damage: 20,
      range: 5,
      area: 1,
    },
  ],
  startingEquipment: {
    weapon: 'wooden_staff',
    armor: 'mage_robe',
  },
  primaryStat: 'magicPower',
  classColor: 0x6b9eff,
  glyph: 'M',
};

/** Rogue: Fast, stealthy class with high speed and critical damage */
export const ROGUE: CharacterClass = {
  id: 'rogue',
  name: 'Rogue',
  description: 'A nimble rogue specializing in stealth and quick strikes. High speed and critical chance.',
  baseStats: {
    hp: 60,
    maxHp: 60,
    mana: 30,
    maxMana: 30,
    attack: 7,
    defense: 3,
    magicPower: 4,
    speed: 8,
    experience: 0,
    level: 1,
  },
  abilities: [
    {
      name: 'Backstab',
      description: 'A quick melee attack with increased critical chance',
      manaCost: 0,
      cooldown: 1,
      damage: 9,
      range: 1,
    },
    {
      name: 'Poison Dart',
      description: 'Throw a poisoned dart from range',
      manaCost: 10,
      cooldown: 1,
      damage: 8,
      range: 8,
    },
    {
      name: 'Shadow Clone',
      description: 'Create a shadow clone to confuse enemies',
      manaCost: 20,
      cooldown: 4,
      range: 3,
    },
    {
      name: 'Assassinate',
      description: 'A devastating strike with extreme critical damage',
      manaCost: 15,
      cooldown: 3,
      damage: 15,
      range: 1,
    },
  ],
  startingEquipment: {
    weapon: 'dagger',
    armor: 'leather_armor',
  },
  primaryStat: 'attack',
  classColor: 0x9b6bff,
  glyph: 'R',
};

// ============================================================================
// EXPORTED CLASS DATA ARRAYS
// ============================================================================

export const CHARACTER_CLASSES: Record<string, CharacterClass> = {
  warrior: WARRIOR,
  mage: MAGE,
  rogue: ROGUE,
};

export const CLASS_LIST: CharacterClass[] = [WARRIOR, MAGE, ROGUE];

export const CLASS_DATA = {
  CHARACTER_CLASSES,
  CLASS_LIST,
};

export default CLASS_DATA;
