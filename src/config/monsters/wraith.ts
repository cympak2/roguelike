import type { MonsterDefinition } from './types';
import { AMBUSHER_AI_RULES } from './ai-rules';

export const WRAITH: MonsterDefinition = {
  id: 'wraith',
  name: 'Wraith',
  description: 'Ghostly spirit that phases through walls and drains experience.',
  baseStats: {
    hp: 75,
    maxHp: 75,
    attack: 11,
    defense: 3,
    magicPower: 8,
    speed: 2,
    experience: 200,
  },
  abilities: [
    {
      name: 'Spectral Touch',
      description: 'Ghostly attack that deals pure damage',
      damage: 11,
      cooldown: 2,
    },
    {
      name: 'Phase Through',
      description: 'Pass through walls and obstacles',
      cooldown: 0,
    },
    {
      name: 'Drain Life',
      description: 'Drain XP and mana from opponent',
      cooldown: 4,
    },
    {
      name: 'Ethereal Form',
      description: 'Reduced physical damage taken',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.7 },
    { itemId: 'soul_fragment', dropChance: 0.5 },
    { itemId: 'ghostly_amulet', dropChance: 0.2 },
    { itemId: 'xp_crystal', dropChance: 0.25 },
  ],
  level: 7,
  color: 0xbbbbff,
  glyph: 'W',
  aiType: 'ambusher',
  aiRules: AMBUSHER_AI_RULES,
  sightRange: 10,
  spawnWeight: 2,
};
