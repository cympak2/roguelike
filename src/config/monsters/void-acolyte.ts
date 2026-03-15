import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const VOID_ACOLYTE: MonsterDefinition = {
  id: 'void_acolyte',
  name: 'Void Acolyte',
  description: 'A zealot channeling unstable arcane bolts from afar.',
  baseStats: {
    hp: 50,
    maxHp: 50,
    attack: 12,
    defense: 3,
    magicPower: 14,
    speed: 1,
    experience: 170,
  },
  abilities: [
    {
      name: 'Void Bolt',
      description: 'Launches a crackling orb of arcane force.',
      damage: 12,
      cooldown: 2,
    },
    {
      name: 'Mana Fracture',
      description: 'Unleashes a pulse that destabilizes magical defenses.',
      cooldown: 4,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.7 },
    { itemId: 'weapon_wand', dropChance: 0.15 },
    { itemId: 'potion_mana', dropChance: 0.25 },
    { itemId: 'misc_xp_crystal', dropChance: 0.2 },
  ],
  level: 6,
  color: 0x6c5ce7,
  glyph: 'v',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 11,
  spawnWeight: 3,
};

