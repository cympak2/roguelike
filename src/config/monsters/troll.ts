import type { MonsterDefinition } from './types';
import { AGGRESSIVE_MELEE_AI_RULES } from './ai-rules';

export const TROLL: MonsterDefinition = {
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
