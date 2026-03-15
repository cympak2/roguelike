import type { MonsterDefinition } from './types';
import { BOSS_AI_RULES } from './ai-rules';

export const LICH_KING: MonsterDefinition = {
  id: 'lich_king',
  name: 'Lich King',
  description:
    'Boss Monster. Ancient undead sorcerer. Summons skeleton minions and casts powerful spells.',
  baseStats: {
    hp: 500,
    maxHp: 500,
    attack: 25,
    defense: 20,
    magicPower: 25,
    speed: 2,
    experience: 1000,
  },
  abilities: [
    {
      name: 'Deathbolt',
      description: 'Instant kill spell (requires LOS)',
      damage: 50,
      cooldown: 6,
    },
    {
      name: 'Summon Skeletons',
      description: 'Summon 2-3 skeleton minions',
      cooldown: 5,
    },
    {
      name: 'Curse',
      description: 'Curse enemy with weakness',
      cooldown: 4,
    },
    {
      name: 'Phylactery Shield',
      description: 'Protected by ancient magic - takes reduced damage',
      cooldown: 0,
    },
    {
      name: 'Teleport',
      description: 'Escape to safe location',
      cooldown: 5,
    },
    {
      name: 'Drain All',
      description: 'Massive life and mana drain',
      damage: 25,
      cooldown: 6,
    },
  ],
  lootTable: [
    { itemId: 'gold_coin', dropChance: 1.0 },
    { itemId: 'lich_crown', dropChance: 0.9 },
    { itemId: 'phylactery_shard', dropChance: 0.8 },
    { itemId: 'spellbook_of_power', dropChance: 0.7 },
    { itemId: 'robe_of_the_lich', dropChance: 0.6 },
    { itemId: 'staff_of_undeath', dropChance: 0.5 },
  ],
  level: 10,
  color: 0x9900ff,
  glyph: 'L',
  aiType: 'aggressive',
  aiRules: BOSS_AI_RULES,
  phases: [
    {
      threshold: 70,
      abilityName: 'Soul Curse',
      telegraph: 'Necrotic sigils flare around the Lich King.',
      effects: [
        {
          type: 'curse_player',
          curseType: 'curse_weakness',
          duration: 4,
          power: 2,
        },
      ],
    },
    {
      threshold: 40,
      abilityName: 'Drain All',
      telegraph: 'Shadows spiral outward as the Lich King siphons life.',
      effects: [
        { type: 'damage_player', amount: 12 },
        { type: 'heal_self', amount: 35 },
      ],
    },
    {
      threshold: 15,
      abilityName: 'Phylactery Overload',
      telegraph: 'The phylactery cracks with unstable arcane power.',
      effects: [
        { type: 'buff_self', attack: 3, defense: 2 },
        {
          type: 'curse_player',
          curseType: 'curse_wither',
          duration: 4,
          power: 2,
        },
      ],
    },
  ],
  sightRange: 15,
  spawnWeight: 1,
};
