import type { MonsterDefinition } from './types';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const CROSSBOW_RAIDER: MonsterDefinition = {
  id: 'crossbow_raider',
  name: 'Crossbow Raider',
  description: 'A hardened raider wielding a heavy crossbow with brutal bolts.',
  baseStats: {
    hp: 58,
    maxHp: 58,
    attack: 11,
    defense: 4,
    magicPower: 0,
    speed: 1,
    experience: 150,
  },
  abilities: [
    {
      name: 'Piercing Bolt',
      description: 'Fires a heavy bolt that punches through armor.',
      damage: 11,
      cooldown: 2,
    },
    {
      name: 'Brace and Reload',
      description: 'Takes position to line up a stronger shot.',
      cooldown: 4,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.75 },
    { itemId: 'weapon_crossbow', dropChance: 0.18 },
    { itemId: 'armor_leather', dropChance: 0.12 },
  ],
  level: 5,
  color: 0x8a4f2d,
  glyph: 'X',
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  sightRange: 11,
  spawnWeight: 3,
};

