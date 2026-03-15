import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const STONE_THROWER_OGRE: MonsterDefinition = {
  id: 'stone_thrower_ogre',
  name: 'Stone Thrower Ogre',
  description: 'A hulking brute that hurls boulders with terrifying force.',
  baseStats: {
    hp: 105,
    maxHp: 105,
    attack: 15,
    defense: 7,
    magicPower: 0,
    speed: 0,
    experience: 240,
  },
  abilities: [
    {
      name: 'Boulder Hurl',
      description: 'Throws a crushing stone that can shatter defenses.',
      damage: 15,
      cooldown: 2,
    },
    {
      name: 'Quake Toss',
      description: 'A heavy throw that staggers nearby foes.',
      cooldown: 4,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.85 },
    { itemId: 'weapon_throwing_rocks', dropChance: 0.2 },
    { itemId: 'misc_troll_hide', dropChance: 0.35 },
  ],
  level: 7,
  color: 0x6d4c41,
  glyph: 'O',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 9,
  spawnWeight: 2,
};

