import type { MonsterAIRules } from '../../types/monster-ai-rules';

export const RAT_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAbove: 0.5, requiresLineOfSight: true }, intent: 'flee' },
    { when: { selfHpAtMost: 0.5, requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};

export const GOBLIN_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAbove: 0.5, requiresLineOfSight: true }, intent: 'attack' },
    { when: { selfHpAtMost: 0.5, requiresLineOfSight: true }, intent: 'flee' },
  ],
  defaultIntent: 'chase',
};

export const AGGRESSIVE_MELEE_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.25, playerHpAbove: 0.4, requiresLineOfSight: true }, intent: 'flee' },
    { when: { requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};

export const SKELETON_AI_RULES: MonsterAIRules = {
  rules: [...AGGRESSIVE_MELEE_AI_RULES.rules],
  defaultIntent: AGGRESSIVE_MELEE_AI_RULES.defaultIntent,
  neverFlee: true,
};

export const AGGRESSIVE_RANGED_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.2, playerHpAbove: 0.3, requiresLineOfSight: true }, intent: 'flee' },
    { when: { requiresLineOfSight: true, distanceAtLeast: 3 }, intent: 'attack' },
    { when: { requiresLineOfSight: true, distanceAtMost: 2 }, intent: 'flee' },
  ],
  defaultIntent: 'chase',
};

export const AMBUSHER_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { requiresLineOfSight: true, distanceAtMost: 3 }, intent: 'attack' },
    { when: { selfHpAtMost: 0.3, requiresLineOfSight: true }, intent: 'flee' },
  ],
  defaultIntent: 'wait',
};

export const BOSS_AI_RULES: MonsterAIRules = {
  rules: [
    { when: { selfHpAtMost: 0.2, playerHpAbove: 0.5, requiresLineOfSight: true }, intent: 'flee' },
    { when: { playerHpAtMost: 0.35, requiresLineOfSight: true }, intent: 'attack' },
    { when: { requiresLineOfSight: true }, intent: 'attack' },
  ],
  defaultIntent: 'chase',
};
