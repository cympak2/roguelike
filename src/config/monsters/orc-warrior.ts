import type { MonsterDefinition } from './types';
import { GLYPHS } from '../game-config';
import { AGGRESSIVE_MELEE_AI_RULES } from './ai-rules';

export const ORC_WARRIOR: MonsterDefinition = {
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
