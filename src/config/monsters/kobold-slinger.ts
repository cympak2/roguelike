import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const KOBOLD_SLINGER: MonsterDefinition = {
  id: 'kobold_slinger',
  name: 'Kobold Slinger',
  description: 'A wiry tunnel raider that pelts intruders with sharp stones.',
  baseStats: {
    hp: 24,
    maxHp: 24,
    attack: 6,
    defense: 1,
    magicPower: 0,
    speed: 2,
    experience: 55,
  },
  abilities: [
    {
      name: 'Stone Toss',
      description: 'Throws jagged rocks from a safe distance.',
      damage: 6,
      cooldown: 1,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.5 },
    { itemId: 'weapon_throwing_rocks', dropChance: 0.25 },
    { itemId: 'misc_rat_tail', dropChance: 0.25 },
  ],
  level: 2,
  color: 0x9c7a48,
  glyph: 'k',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 8,
  spawnWeight: 5,
};

