export enum NPCType {
  MERCHANT = 'merchant',
  QUESTGIVER = 'questgiver',
  HEALER = 'healer',
  SAGE = 'sage',
  GUARD = 'guard',
  INNKEEPER = 'innkeeper',
}

export interface DialogueOption {
  text: string;
  action: string;
  nextDialogueId?: string;
}

export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
}

export type NPCSpawnLocation = 'town' | 'dungeon';

export interface NPCSpawnRules {
  locations: NPCSpawnLocation[];
  dungeonFloorMin?: number;
  dungeonFloorMax?: number;
}

export interface NPCDefinition {
  id: string;
  name: string;
  description: string;
  type: NPCType;
  level: number;
  color: number;
  glyph: string;
  dialogue: DialogueNode[];
  inventory?: string[];
  questsOffered?: string[];
  spawnRules?: NPCSpawnRules;
}

