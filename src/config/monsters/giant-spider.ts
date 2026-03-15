import type { MonsterDefinition } from './types';
import { AMBUSHER_AI_RULES } from './ai-rules';

export const GIANT_SPIDER: MonsterDefinition = {
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
