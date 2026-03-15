import type { MonsterDefinition } from './types';
import { GLYPHS } from '../game-config';
import { GOBLIN_AI_RULES } from './ai-rules';

export const GOBLIN: MonsterDefinition = {
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
