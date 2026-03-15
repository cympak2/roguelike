import type { MonsterAIRules } from '../../types/monster-ai-rules';

export interface MonsterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magicPower: number;
  speed: number;
  experience: number;
}

export interface MonsterAbility {
  name: string;
  description: string;
  damage?: number;
  cooldown: number;
}

export type MonsterPhaseEffect =
  | {
      type: 'heal_self';
      amount: number;
    }
  | {
      type: 'damage_player';
      amount: number;
    }
  | {
      type: 'buff_self';
      attack?: number;
      defense?: number;
      speed?: number;
    }
  | {
      type: 'curse_player';
      curseType: 'curse_weakness' | 'curse_frailty' | 'curse_wither';
      duration: number;
      power: number;
    };

export interface MonsterPhaseDefinition {
  threshold: 70 | 40 | 15;
  abilityName: string;
  telegraph: string;
  effects: MonsterPhaseEffect[];
}

export interface MonsterDefinition {
  id: string;
  name: string;
  description: string;
  baseStats: MonsterStats;
  abilities: MonsterAbility[];
  lootTable: { itemId: string; dropChance: number }[];
  level: number;
  color: number;
  glyph: string;
  aiType: 'aggressive' | 'wanderer' | 'ambusher' | 'cowardly' | 'stationary';
  aiRules: MonsterAIRules;
  phases?: MonsterPhaseDefinition[];
  sightRange: number;
  spawnWeight: number;
}
