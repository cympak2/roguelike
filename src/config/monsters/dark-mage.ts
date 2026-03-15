import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const DARK_MAGE: MonsterDefinition = {
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
