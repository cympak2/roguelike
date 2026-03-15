import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const BANDIT_ARCHER: MonsterDefinition = {
  id: 'bandit_archer',
  name: 'Bandit Archer',
  description: 'A practiced outlaw archer who picks targets before they get close.',
  baseStats: {
    hp: 36,
    maxHp: 36,
    attack: 8,
    defense: 2,
    magicPower: 0,
    speed: 2,
    experience: 90,
  },
  abilities: [
    {
      name: 'Aimed Shot',
      description: 'A precise bow shot aimed at vital spots.',
      damage: 8,
      cooldown: 2,
    },
    {
      name: 'Quick Draw',
      description: 'Rapidly nocks and fires at exposed targets.',
      cooldown: 3,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.65 },
    { itemId: 'weapon_bow', dropChance: 0.2 },
    { itemId: 'potion_health', dropChance: 0.15 },
  ],
  level: 3,
  color: 0x7b5f3b,
  glyph: 'A',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 10,
  spawnWeight: 4,
};

