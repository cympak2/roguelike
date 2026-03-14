/**
 * Monster Data Configuration
 * Defines all monster/enemy types, their stats, abilities, and loot tables
 *
 * Monsters are balanced by level with progressive difficulty:
 * - Early (L1-3): 10-30 HP, 3-6 ATK, 1-3 DEF
 * - Mid (L4-7): 40-80 HP, 7-12 ATK, 4-8 DEF
 * - Late (L8-10): 100-200 HP, 13-20 ATK, 9-15 DEF
 * - Boss (L10): 500 HP, 25 ATK, 20 DEF
 */

import { GLYPHS } from './game-config';
import type { MonsterAIRules } from '../types/monster-ai-rules';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MonsterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magicPower: number;
  speed: number;
  experience: number;
}

export interface MonsterAbility {
  name: string;
  description: string;
  damage?: number;
  cooldown: number;
}

export type MonsterPhaseEffect =
  | {
      type: 'heal_self';
      amount: number;
    }
  | {
      type: 'damage_player';
      amount: number;
    }
  | {
      type: 'buff_self';
      attack?: number;
      defense?: number;
      speed?: number;
    }
  | {
      type: 'curse_player';
      curseType: 'curse_weakness' | 'curse_frailty' | 'curse_wither';
      duration: number;
      power: number;
    };

export interface MonsterPhaseDefinition {
  threshold: 70 | 40 | 15;
  abilityName: string;
  telegraph: string;
  effects: MonsterPhaseEffect[];
}

export interface MonsterDefinition {
  id: string;
  name: string;
  description: string;
  baseStats: MonsterStats;
  abilities: MonsterAbility[];
  lootTable: { itemId: string; dropChance: number }[];
  level: number;
  color: number;
  glyph: string;
  aiType: 'aggressive' | 'wanderer' | 'ambusher' | 'cowardly' | 'stationary';
  aiRules: MonsterAIRules;
  phases?: MonsterPhaseDefinition[];
  sightRange: number;
  spawnWeight: number; // Probability weight for dungeon generation
}

const RAT_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAbove: 0.5, requiresLineOfSight: true }, intent: 'flee' },
    { when: { selfHpAtMost: 0.5, requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};

const GOBLIN_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAbove: 0.5, requiresLineOfSight: true }, intent: 'attack' },
    { when: { selfHpAtMost: 0.5, requiresLineOfSight: true }, intent: 'flee' },
  ],
  defaultIntent: 'chase',
};

const AGGRESSIVE_MELEE_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.25, playerHpAbove: 0.4, requiresLineOfSight: true }, intent: 'flee' },
    { when: { requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};

const SKELETON_AI_RULES: MonsterAIRules = {
  rules: [...AGGRESSIVE_MELEE_AI_RULES.rules],
  defaultIntent: AGGRESSIVE_MELEE_AI_RULES.defaultIntent,
  neverFlee: true,
};

const AGGRESSIVE_RANGED_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.2, playerHpAbove: 0.3, requiresLineOfSight: true }, intent: 'flee' },
    { when: { requiresLineOfSight: true, distanceAtLeast: 3 }, intent: 'attack' },
    { when: { requiresLineOfSight: true, distanceAtMost: 2 }, intent: 'flee' },
  ],
  defaultIntent: 'chase',
};

const AMBUSHER_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { requiresLineOfSight: true, distanceAtMost: 3 }, intent: 'attack' },
    { when: { selfHpAtMost: 0.3, requiresLineOfSight: true }, intent: 'flee' },
  ],
  defaultIntent: 'wait',
};

const BOSS_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.2, playerHpAbove: 0.5, requiresLineOfSight: true }, intent: 'flee' },
    { when: { playerHpAtMost: 0.35, requiresLineOfSight: true }, intent: 'attack' },
    { when: { requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};

// ============================================================================
// MONSTER DEFINITIONS (Sorted by Level)
// ============================================================================

const RAT: MonsterDefinition = {
  id: 'rat',
  name: 'Rat',
  description: 'A diseased rodent, quick and weak. Typically found in swarms.',
  baseStats: {
    hp: 8,
    maxHp: 8,
    attack: 3,
    defense: 0,
    magicPower: 0,
    speed: 2,
    experience: 15,
  },
  abilities: [
    {
      name: 'Bite',
      description: 'Quick bite attack',
      damage: 3,
      cooldown: 1,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.3 },
    { itemId: 'rat_tail', dropChance: 0.4 },
  ],
  level: 1,
  color: 0x996633,
  glyph: 'r',
  aiType: 'aggressive',
  aiRules: RAT_AI_RULES,
  sightRange: 6,
  spawnWeight: 8,
};

const SKELETON: MonsterDefinition = {
  id: 'skeleton',
  name: 'Skeleton',
  description: 'Undead bones animated by dark magic. Immune to poisons.',
  baseStats: {
    hp: 20,
    maxHp: 20,
    attack: 5,
    defense: 2,
    magicPower: 1,
    speed: 1,
    experience: 35,
  },
  abilities: [
    {
      name: 'Bone Strike',
      description: 'Powerful strike with bone',
      damage: 5,
      cooldown: 2,
    },
    {
      name: 'Undead Resilience',
      description: 'Immune to poison and disease',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.5 },
    { itemId: 'bone_fragment', dropChance: 0.7 },
    { itemId: 'worn_dagger', dropChance: 0.1 },
  ],
  level: 2,
  color: 0xcccccc,
  glyph: GLYPHS.SKELETON,
  aiType: 'aggressive',
  aiRules: SKELETON_AI_RULES,
  sightRange: 8,
  spawnWeight: 7,
};

const GOBLIN: MonsterDefinition = {
  id: 'goblin',
  name: 'Goblin',
  description: 'Mischievous creature with a weakness for shiny things. May steal items!',
  baseStats: {
    hp: 25,
    maxHp: 25,
    attack: 6,
    defense: 2,
    magicPower: 0,
    speed: 2,
    experience: 50,
  },
  abilities: [
    {
      name: 'Slash',
      description: 'Quick melee attack',
      damage: 6,
      cooldown: 1,
    },
    {
      name: 'Steal',
      description: 'Attempt to steal an item from player',
      cooldown: 4,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.6 },
    { itemId: 'small_potion', dropChance: 0.2 },
    { itemId: 'stolen_ring', dropChance: 0.15 },
  ],
  level: 2,
  color: 0x66dd66,
  glyph: GLYPHS.GOBLIN,
  aiType: 'aggressive',
  aiRules: GOBLIN_AI_RULES,
  sightRange: 7,
  spawnWeight: 6,
};

const ORC_WARRIOR: MonsterDefinition = {
  id: 'orc_warrior',
  name: 'Orc Warrior',
  description: 'Heavily muscled and armored. A tough melee fighter.',
  baseStats: {
    hp: 55,
    maxHp: 55,
    attack: 10,
    defense: 5,
    magicPower: 0,
    speed: 0,
    experience: 100,
  },
  abilities: [
    {
      name: 'Cleave',
      description: 'Powerful overhead strike',
      damage: 10,
      cooldown: 2,
    },
    {
      name: 'Battle Cry',
      description: 'Increase defense temporarily',
      cooldown: 5,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.7 },
    { itemId: 'iron_sword', dropChance: 0.3 },
    { itemId: 'leather_armor', dropChance: 0.2 },
  ],
  level: 3,
  color: 0x99aa00,
  glyph: GLYPHS.ORC,
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_MELEE_AI_RULES,
  sightRange: 9,
  spawnWeight: 5,
};

const DARK_MAGE: MonsterDefinition = {
  id: 'dark_mage',
  name: 'Dark Mage',
  description: 'Robed spellcaster wielding dark magic. Ranged attacks.',
  baseStats: {
    hp: 40,
    maxHp: 40,
    attack: 4,
    defense: 3,
    magicPower: 12,
    speed: 1,
    experience: 120,
  },
  abilities: [
    {
      name: 'Arcane Bolt',
      description: 'Ranged magical attack',
      damage: 12,
      cooldown: 2,
    },
    {
      name: 'Dark Shield',
      description: 'Protect with magical barrier',
      cooldown: 4,
    },
    {
      name: 'Mana Drain',
      description: 'Drain mana from target',
      cooldown: 5,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.8 },
    { itemId: 'spell_scroll', dropChance: 0.4 },
    { itemId: 'enchanted_robe', dropChance: 0.15 },
    { itemId: 'mana_crystal', dropChance: 0.2 },
  ],
  level: 4,
  color: 0x6633ff,
  glyph: 'm',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 10,
  spawnWeight: 4,
};

const GIANT_SPIDER: MonsterDefinition = {
  id: 'giant_spider',
  name: 'Giant Spider',
  description: 'Enormous arachnid with venomous fangs. Can web and poison enemies.',
  baseStats: {
    hp: 65,
    maxHp: 65,
    attack: 9,
    defense: 4,
    magicPower: 0,
    speed: 2,
    experience: 140,
  },
  abilities: [
    {
      name: 'Poison Bite',
      description: 'Bite that poisons the target',
      damage: 9,
      cooldown: 2,
    },
    {
      name: 'Web Trap',
      description: 'Slow enemy with webbing',
      cooldown: 4,
    },
    {
      name: 'Arachnid Agility',
      description: 'Enhanced speed and evasion',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.8 },
    { itemId: 'spider_silk', dropChance: 0.6 },
    { itemId: 'poison_fang', dropChance: 0.3 },
    { itemId: 'antidote', dropChance: 0.25 },
  ],
  level: 5,
  color: 0x664466,
  glyph: 'S',
  aiType: 'ambusher',
  aiRules: AMBUSHER_AI_RULES,
  sightRange: 8,
  spawnWeight: 4,
};

const TROLL: MonsterDefinition = {
  id: 'troll',
  name: 'Troll',
  description: 'Regenerating brute. Slowly heals damage over time.',
  baseStats: {
    hp: 90,
    maxHp: 90,
    attack: 12,
    defense: 6,
    magicPower: 0,
    speed: 0,
    experience: 180,
  },
  abilities: [
    {
      name: 'Slam',
      description: 'Powerful melee attack',
      damage: 12,
      cooldown: 2,
    },
    {
      name: 'Regeneration',
      description: 'Heal 5-10 HP each turn',
      cooldown: 1,
    },
    {
      name: 'Thick Skin',
      description: 'Resistance to damage types',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.8 },
    { itemId: 'troll_hide', dropChance: 0.7 },
    { itemId: 'great_club', dropChance: 0.2 },
    { itemId: 'regeneration_potion', dropChance: 0.15 },
  ],
  level: 6,
  color: 0x336633,
  glyph: 'T',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_MELEE_AI_RULES,
  sightRange: 7,
  spawnWeight: 3,
};

const WRAITH: MonsterDefinition = {
  id: 'wraith',
  name: 'Wraith',
  description: 'Ghostly spirit that phases through walls and drains experience.',
  baseStats: {
    hp: 75,
    maxHp: 75,
    attack: 11,
    defense: 3,
    magicPower: 8,
    speed: 2,
    experience: 200,
  },
  abilities: [
    {
      name: 'Spectral Touch',
      description: 'Ghostly attack that deals pure damage',
      damage: 11,
      cooldown: 2,
    },
    {
      name: 'Phase Through',
      description: 'Pass through walls and obstacles',
      cooldown: 0,
    },
    {
      name: 'Drain Life',
      description: 'Drain XP and mana from opponent',
      cooldown: 4,
    },
    {
      name: 'Ethereal Form',
      description: 'Reduced physical damage taken',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.7 },
    { itemId: 'soul_fragment', dropChance: 0.5 },
    { itemId: 'ghostly_amulet', dropChance: 0.2 },
    { itemId: 'xp_crystal', dropChance: 0.25 },
  ],
  level: 7,
  color: 0xbbbbff,
  glyph: 'W',
  aiType: 'ambusher',
  aiRules: AMBUSHER_AI_RULES,
  sightRange: 10,
  spawnWeight: 2,
};

const DRAGON_WYRMLING: MonsterDefinition = {
  id: 'dragon_wyrmling',
  name: 'Dragon Wyrmling',
  description: 'Young dragon. Breathes cone of fire. Very dangerous.',
  baseStats: {
    hp: 140,
    maxHp: 140,
    attack: 16,
    defense: 10,
    magicPower: 15,
    speed: 1,
    experience: 300,
  },
  abilities: [
    {
      name: 'Claw Strike',
      description: 'Powerful melee claw attack',
      damage: 16,
      cooldown: 2,
    },
    {
      name: 'Fire Breath',
      description: 'Cone AoE fire attack',
      damage: 20,
      cooldown: 4,
    },
    {
      name: 'Dragon Scales',
      description: 'Heavily armored scales',
      cooldown: 0,
    },
    {
      name: 'Flight',
      description: 'Can hover above obstacles',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.9 },
    { itemId: 'dragon_scale', dropChance: 0.8 },
    { itemId: 'dragon_fang', dropChance: 0.6 },
    { itemId: 'dragonscale_armor', dropChance: 0.3 },
    { itemId: 'legendary_sword', dropChance: 0.1 },
  ],
  level: 8,
  color: 0xff6600,
  glyph: GLYPHS.DRAGON,
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  phases: [
    {
      threshold: 70,
      abilityName: 'Scorching Breath',
      telegraph: 'The wyrmling inhales deeply, embers glowing in its throat.',
      effects: [{ type: 'damage_player', amount: 8 }],
    },
    {
      threshold: 40,
      abilityName: 'Molten Scales',
      telegraph: 'Molten scales harden across its body.',
      effects: [
        { type: 'buff_self', defense: 3 },
        { type: 'heal_self', amount: 20 },
      ],
    },
    {
      threshold: 15,
      abilityName: 'Dragon Frenzy',
      telegraph: 'The wyrmling roars and enters a desperate frenzy.',
      effects: [{ type: 'buff_self', attack: 4, speed: 1 }],
    },
  ],
  sightRange: 12,
  spawnWeight: 2,
};

const LICH_KING: MonsterDefinition = {
  id: 'lich_king',
  name: 'Lich King',
  description:
    'Boss Monster. Ancient undead sorcerer. Summons skeleton minions and casts powerful spells.',
  baseStats: {
    hp: 500,
    maxHp: 500,
    attack: 25,
    defense: 20,
    magicPower: 25,
    speed: 2,
    experience: 1000,
  },
  abilities: [
    {
      name: 'Deathbolt',
      description: 'Instant kill spell (requires LOS)',
      damage: 50,
      cooldown: 6,
    },
    {
      name: 'Summon Skeletons',
      description: 'Summon 2-3 skeleton minions',
      cooldown: 5,
    },
    {
      name: 'Curse',
      description: 'Curse enemy with weakness',
      cooldown: 4,
    },
    {
      name: 'Phylactery Shield',
      description: 'Protected by ancient magic - takes reduced damage',
      cooldown: 0,
    },
    {
      name: 'Teleport',
      description: 'Escape to safe location',
      cooldown: 5,
    },
    {
      name: 'Drain All',
      description: 'Massive life and mana drain',
      damage: 25,
      cooldown: 6,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 1.0 },
    { itemId: 'lich_crown', dropChance: 0.9 },
    { itemId: 'phylactery_shard', dropChance: 0.8 },
    { itemId: 'spellbook_of_power', dropChance: 0.7 },
    { itemId: 'robe_of_the_lich', dropChance: 0.6 },
    { itemId: 'staff_of_undeath', dropChance: 0.5 },
  ],
  level: 10,
  color: 0x9900ff,
  glyph: 'L',
  aiType: 'aggressive',
  aiRules: BOSS_AI_RULES,
  phases: [
    {
      threshold: 70,
      abilityName: 'Soul Curse',
      telegraph: 'Necrotic sigils flare around the Lich King.',
      effects: [
        {
          type: 'curse_player',
          curseType: 'curse_weakness',
          duration: 4,
          power: 2,
        },
      ],
    },
    {
      threshold: 40,
      abilityName: 'Drain All',
      telegraph: 'Shadows spiral outward as the Lich King siphons life.',
      effects: [
        { type: 'damage_player', amount: 12 },
        { type: 'heal_self', amount: 35 },
      ],
    },
    {
      threshold: 15,
      abilityName: 'Phylactery Overload',
      telegraph: 'The phylactery cracks with unstable arcane power.',
      effects: [
        { type: 'buff_self', attack: 3, defense: 2 },
        {
          type: 'curse_player',
          curseType: 'curse_wither',
          duration: 4,
          power: 2,
        },
      ],
    },
  ],
  sightRange: 15,
  spawnWeight: 1,
};

// ============================================================================
// MONSTER ARRAY AND UTILITIES
// ============================================================================

export const MONSTERS: MonsterDefinition[] = [
  RAT,
  SKELETON,
  GOBLIN,
  ORC_WARRIOR,
  DARK_MAGE,
  GIANT_SPIDER,
  TROLL,
  WRAITH,
  DRAGON_WYRMLING,
  LICH_KING,
];

/**
 * Get a monster template by ID
 * @param id - Monster ID
 * @returns Monster definition or undefined if not found
 */
export function getMonsterTemplate(id: string): MonsterDefinition | undefined {
  return MONSTERS.find((m) => m.id === id);
}

/**
 * Get all monsters valid for a given dungeon floor
 * @param floor - Dungeon floor number (1-10)
 * @returns Array of valid monsters for this floor
 */
export function getMonstersForFloor(floor: number): MonsterDefinition[] {
  return MONSTERS.filter((m) => {
    // Simple scaling: each monster has a level range
    // Early monsters: floors 1-3
    // Mid monsters: floors 3-7
    // Late monsters: floors 7-10
    // Boss: floor 10 only
    if (m.id === 'lich_king') return floor === 10;
    return m.level <= Math.ceil(floor * 1.2);
  });
}

export const MONSTER_DATA = {
  MONSTERS,
  getMonsterTemplate,
  getMonstersForFloor,
};

export default MONSTER_DATA;
