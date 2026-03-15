import type { MonsterDefinition } from './types';
import { GLYPHS } from '../game-config';
import { SKELETON_AI_RULES } from './ai-rules';

export const SKELETON: MonsterDefinition = {
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
