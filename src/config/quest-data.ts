export interface QuestTurnInRequirement {
  itemId: string;
  quantity: number;
}

export interface QuestReward {
  gold?: number;
  xp?: number;
  itemId?: string;
  itemQuantity?: number;
}

export interface QuestCompletionRule {
  type: 'clear_floor' | 'reach_depth' | 'have_item';
  floor?: number;
  depth?: number;
  itemId?: string;
  quantity?: number;
}

export type QuestGamePhase = 'dungeon' | 'post_lich_recovery';

export interface QuestDefinition {
  id: string;
  title: string;
  objective: string;
  turnInNpcId: string;
  acceptActions: string[];
  requiresCompletedQuestIds?: string[];
  requiredGamePhase?: QuestGamePhase;
  completion: QuestCompletionRule;
  turnInRequirements?: QuestTurnInRequirement[];
  rewards: QuestReward[];
}

export const QUEST_DEFINITIONS: Record<string, QuestDefinition> = {
  clear_dungeon_level_1: {
    id: 'clear_dungeon_level_1',
    title: 'Elder Aldric\'s Plea',
    objective: 'Clear all monsters on dungeon level 1.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    completion: { type: 'clear_floor', floor: 1 },
    rewards: [
      { gold: 100 },
      { itemId: 'misc_amulet_protection', itemQuantity: 1 },
    ],
  },
  clear_dungeon_level_2: {
    id: 'clear_dungeon_level_2',
    title: 'Into the Depths',
    objective: 'Clear all monsters on dungeon level 2.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['clear_dungeon_level_1'],
    completion: { type: 'clear_floor', floor: 2 },
    rewards: [
      { gold: 150 },
      { itemId: 'potion_strength', itemQuantity: 1 },
    ],
  },
  retrieve_stolen_ring: {
    id: 'retrieve_stolen_ring',
    title: 'A Quiet Retrieval',
    objective: 'Find a stolen ring and bring it back to Vex.',
    turnInNpcId: 'vex',
    acceptActions: ['accept_quest_theft'],
    requiresCompletedQuestIds: ['clear_dungeon_level_1'],
    completion: { type: 'have_item', itemId: 'misc_stolen_ring', quantity: 1 },
    turnInRequirements: [{ itemId: 'misc_stolen_ring', quantity: 1 }],
    rewards: [{ gold: 100 }],
  },
  find_lost_amulet: {
    id: 'find_lost_amulet',
    title: 'Lost Relic of the Luminae',
    objective: 'Reach dungeon level 3 and recover clues to Zane\'s amulet.',
    turnInNpcId: 'zane',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['clear_dungeon_level_1'],
    completion: { type: 'reach_depth', depth: 3 },
    rewards: [
      { gold: 120 },
      { itemId: 'scroll_identify', itemQuantity: 1 },
    ],
  },
  collect_keystones: {
    id: 'collect_keystones',
    title: 'Keystones of Binding',
    objective: 'Reach dungeon level 4 and secure the keystone trail.',
    turnInNpcId: 'zane',
    acceptActions: ['accept_quest_keystones'],
    requiresCompletedQuestIds: ['find_lost_amulet'],
    completion: { type: 'reach_depth', depth: 4 },
    rewards: [
      { gold: 220 },
      { itemId: 'potion_mana', itemQuantity: 2 },
    ],
  },
  bring_dungeon_water: {
    id: 'bring_dungeon_water',
    title: 'Water for the Healer',
    objective: 'Fill a flask with dungeon water and bring it to Healer Maren.',
    turnInNpcId: 'maren',
    acceptActions: ['accept_quest_dungeon_water'],
    completion: { type: 'have_item', itemId: 'misc_flask_dungeon_water', quantity: 1 },
    turnInRequirements: [{ itemId: 'misc_flask_dungeon_water', quantity: 1 }],
    rewards: [
      { gold: 70 },
      { itemId: 'potion_health', itemQuantity: 1 },
      { itemId: 'misc_empty_flask', itemQuantity: 1 },
    ],
  },
  find_dawnbringer: {
    id: 'find_dawnbringer',
    title: 'Blade of First Light',
    objective: 'Reach dungeon level 5 and claim the Dawnbringer path.',
    turnInNpcId: 'zane',
    acceptActions: ['accept_quest_dawnbringer'],
    requiresCompletedQuestIds: ['collect_keystones'],
    completion: { type: 'reach_depth', depth: 5 },
    rewards: [
      { gold: 300 },
      { itemId: 'scroll_enchant_weapon', itemQuantity: 1 },
    ],
  },
  repair_broken_wheelbarrow: {
    id: 'repair_broken_wheelbarrow',
    title: 'Wheelbarrow Repairs',
    objective: 'Gather sturdy rope and bring it to Elder Aldric so the workers can repair a broken wheelbarrow.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['find_dawnbringer'],
    requiredGamePhase: 'post_lich_recovery',
    completion: { type: 'have_item', itemId: 'rope', quantity: 2 },
    turnInRequirements: [{ itemId: 'rope', quantity: 2 }],
    rewards: [
      { gold: 140 },
      { itemId: 'potion_strength', itemQuantity: 1 },
    ],
  },
  deliver_recovery_tools: {
    id: 'deliver_recovery_tools',
    title: 'Tools for the Crew',
    objective: 'Bring practical tools for the rebuilding crew: one lockpick set and two torches.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['repair_broken_wheelbarrow'],
    requiredGamePhase: 'post_lich_recovery',
    completion: { type: 'have_item', itemId: 'lockpick_set', quantity: 1 },
    turnInRequirements: [
      { itemId: 'lockpick_set', quantity: 1 },
      { itemId: 'torch', quantity: 2 },
    ],
    rewards: [
      { gold: 170 },
      { itemId: 'scroll_identify', itemQuantity: 1 },
    ],
  },
  stabilize_dangerous_stones: {
    id: 'stabilize_dangerous_stones',
    title: 'Shore Up the Rubble',
    objective: 'Help secure the unstable stone pile by delivering throwing rocks and support rope.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['deliver_recovery_tools'],
    requiredGamePhase: 'post_lich_recovery',
    completion: { type: 'have_item', itemId: 'weapon_throwing_rocks', quantity: 1 },
    turnInRequirements: [
      { itemId: 'weapon_throwing_rocks', quantity: 1 },
      { itemId: 'rope', quantity: 1 },
    ],
    rewards: [
      { gold: 200 },
      { itemId: 'potion_health', itemQuantity: 1 },
    ],
  },
  aid_injured_workers: {
    id: 'aid_injured_workers',
    title: 'Aid for the Injured',
    objective: 'Deliver recovery supplies to the injured workers: two health potions and two empty flasks.',
    turnInNpcId: 'aldric',
    acceptActions: ['accept_quest'],
    requiresCompletedQuestIds: ['stabilize_dangerous_stones'],
    requiredGamePhase: 'post_lich_recovery',
    completion: { type: 'have_item', itemId: 'potion_health', quantity: 2 },
    turnInRequirements: [
      { itemId: 'potion_health', quantity: 2 },
      { itemId: 'misc_empty_flask', quantity: 2 },
    ],
    rewards: [
      { gold: 240 },
      { xp: 200 },
      { itemId: 'scroll_enchant_armor', itemQuantity: 1 },
    ],
  },
};

export const QUEST_IDS_BY_NPC: Record<string, string[]> = {
  aldric: [
    'clear_dungeon_level_1',
    'clear_dungeon_level_2',
    'repair_broken_wheelbarrow',
    'deliver_recovery_tools',
    'stabilize_dangerous_stones',
    'aid_injured_workers',
  ],
  maren: ['bring_dungeon_water'],
  vex: ['retrieve_stolen_ring'],
  zane: ['find_lost_amulet', 'collect_keystones', 'find_dawnbringer'],
};

export function isQuestUnlocked(
  quest: QuestDefinition,
  isQuestCompleted: (questId: string) => boolean
): boolean {
  if (!quest.requiresCompletedQuestIds || quest.requiresCompletedQuestIds.length === 0) {
    return true;
  }

  return quest.requiresCompletedQuestIds.every((questId) => isQuestCompleted(questId));
}

export function getQuestIdsForNpc(npcId: string): string[] {
  return QUEST_IDS_BY_NPC[npcId] ? [...QUEST_IDS_BY_NPC[npcId]] : [];
}

export function isQuestAvailableInPhase(
  quest: QuestDefinition,
  gamePhase: QuestGamePhase
): boolean {
  if (!quest.requiredGamePhase) {
    return true;
  }

  return quest.requiredGamePhase === gamePhase;
}
