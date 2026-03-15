import type { MonsterDefinition } from './types';
import { GLYPHS } from '../game-config';
import { AGGRESSIVE_RANGED_AI_RULES } from './ai-rules';

export const DRAGON_WYRMLING: MonsterDefinition = {
  id: 'dragon_wyrmling',
  name: 'Dragon Wyrmling',
  description: 'Young dragon. Breathes cone of fire. Very dangerous.',
  baseStats: {
    hp: 140,
    maxHp: 140,
    attack: 16,
    defense: 10,
    magicPower: 15,
    speed: 1,
    experience: 300,
  },
  abilities: [
    {
      name: 'Claw Strike',
      description: 'Powerful melee claw attack',
      damage: 16,
      cooldown: 2,
    },
    {
      name: 'Fire Breath',
      description: 'Cone AoE fire attack',
      damage: 20,
      cooldown: 4,
    },
    {
      name: 'Dragon Scales',
      description: 'Heavily armored scales',
      cooldown: 0,
    },
    {
      name: 'Flight',
      description: 'Can hover above obstacles',
      cooldown: 0,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 0.9 },
    { itemId: 'dragon_scale', dropChance: 0.8 },
    { itemId: 'dragon_fang', dropChance: 0.6 },
    { itemId: 'dragonscale_armor', dropChance: 0.3 },
    { itemId: 'legendary_sword', dropChance: 0.1 },
  ],
  level: 8,
  color: 0xff6600,
  glyph: GLYPHS.DRAGON,
  aiType: 'aggressive',
  aiRules: AGGRESSIVE_RANGED_AI_RULES,
  phases: [
    {
      threshold: 70,
      abilityName: 'Scorching Breath',
      telegraph: 'The wyrmling inhales deeply, embers glowing in its throat.',
      effects: [{ type: 'damage_player', amount: 8 }],
    },
    {
      threshold: 40,
      abilityName: 'Molten Scales',
      telegraph: 'Molten scales harden across its body.',
      effects: [
        { type: 'buff_self', defense: 3 },
        { type: 'heal_self', amount: 20 },
      ],
    },
    {
      threshold: 15,
      abilityName: 'Dragon Frenzy',
      telegraph: 'The wyrmling roars and enters a desperate frenzy.',
      effects: [{ type: 'buff_self', attack: 4, speed: 1 }],
    },
  ],
  sightRange: 12,
  spawnWeight: 2,
};
