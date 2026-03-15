import type { MonsterDefinition } from './types';
import { RAT_AI_RULES } from './ai-rules';

export const RAT: MonsterDefinition = {
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
