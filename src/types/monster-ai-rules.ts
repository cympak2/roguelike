export type CombatIntent = 'attack' | 'chase' | 'flee' | 'wait';

export interface MonsterAICondition {
  selfHpAtMost?: number; // Ratio 0-1
  selfHpAbove?: number; // Ratio 0-1
  playerHpAtMost?: number; // Ratio 0-1
  playerHpAbove?: number; // Ratio 0-1
  distanceAtMost?: number;
  distanceAtLeast?: number;
  requiresLineOfSight?: boolean;
}

export interface MonsterAIRule {
  when: MonsterAICondition;
  intent: CombatIntent;
}

export interface MonsterAIRules {
  rules: MonsterAIRule[];
  defaultIntent?: CombatIntent;
  neverFlee?: boolean;
}
