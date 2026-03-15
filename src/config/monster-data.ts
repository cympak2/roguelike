/**
 * Monster Data Configuration
 * Aggregates monster definitions while keeping a stable public API.
 */

import { RAT } from './monsters/rat';
import { SKELETON } from './monsters/skeleton';
import { GOBLIN } from './monsters/goblin';
import { ORC_WARRIOR } from './monsters/orc-warrior';
import { DARK_MAGE } from './monsters/dark-mage';
import { GIANT_SPIDER } from './monsters/giant-spider';
import { TROLL } from './monsters/troll';
import { WRAITH } from './monsters/wraith';
import { DRAGON_WYRMLING } from './monsters/dragon-wyrmling';
import { LICH_KING } from './monsters/lich-king';
import type { MonsterDefinition } from './monsters/types';

export type {
  MonsterAbility,
  MonsterDefinition,
  MonsterPhaseDefinition,
  MonsterPhaseEffect,
  MonsterStats,
} from './monsters/types';

export const MONSTERS: MonsterDefinition[] = [
  RAT,
  SKELETON,
  GOBLIN,
  ORC_WARRIOR,
  DARK_MAGE,
  GIANT_SPIDER,
  TROLL,
  WRAITH,
  DRAGON_WYRMLING,
  LICH_KING,
];

export function getMonsterTemplate(id: string): MonsterDefinition | undefined {
  return MONSTERS.find((m) => m.id === id);
}

export function getMonstersForFloor(floor: number): MonsterDefinition[] {
  return MONSTERS.filter((m) => {
    if (m.id === 'lich_king') return floor === 10;
    return m.level <= Math.ceil(floor * 1.2);
  });
}

export const MONSTER_DATA = {
  MONSTERS,
  getMonsterTemplate,
  getMonstersForFloor,
};

export default MONSTER_DATA;
