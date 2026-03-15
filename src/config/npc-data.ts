/**
 * NPC Data Configuration
 * Aggregates per-NPC definitions and provides spawn helpers.
 */

import { NPC } from '../entities/npc';
import type { NPCSpawnPoint } from '../world/town-gen';
import { ALDRIC_NPC } from './npcs/aldric';
import { HILDA_NPC } from './npcs/hilda';
import { MAREN_NPC } from './npcs/maren';
import { VEX_NPC } from './npcs/vex';
import { ZANE_NPC } from './npcs/zane';
import type { NPCDefinition, NPCSpawnLocation, NPCSpawnRules } from './npcs/types';
import { NPCType } from './npcs/types';

export { NPCType };
export type {
  DialogueNode,
  DialogueOption,
  NPCDefinition,
  NPCSpawnLocation,
  NPCSpawnRules,
} from './npcs/types';

export const NPCS: NPCDefinition[] = [
  ALDRIC_NPC,
  HILDA_NPC,
  MAREN_NPC,
  VEX_NPC,
  ZANE_NPC,
];

/**
 * Helper function to create NPC instances from spawn points
 * @param spawnPoints - Array of NPC spawn points from town generation
 * @returns Array of instantiated NPC entities
 */
export function createNPCsForTown(spawnPoints: NPCSpawnPoint[]): NPC[] {
  const npcInstances: NPC[] = [];

  for (const spawn of spawnPoints) {
    const npcDef = NPCS.find((def) => def.id === spawn.npcId);

    if (!npcDef) {
      console.warn(`NPC definition not found for spawn point: ${spawn.npcId}`);
      continue;
    }

    const npc = new NPC(
      spawn.x,
      spawn.y,
      npcDef.name,
      npcDef.glyph,
      npcDef.color,
      npcDef.type as any,
      'start'
    );

    if (npcDef.dialogue && npcDef.dialogue.length > 0) {
      const dialogueNodes = npcDef.dialogue.map((node) => ({
        id: node.id,
        text: node.text,
        options: node.options.map((opt) => ({
          id: opt.text.toLowerCase().replace(/\s+/g, '_'),
          text: opt.text,
          nextDialogueId: opt.nextDialogueId,
          action: opt.action
            ? () => {
                console.log(`Action triggered: ${opt.action}`);
              }
            : undefined,
        })),
      }));

      npc.addDialogues(dialogueNodes);
    }

    npcInstances.push(npc);
  }

  return npcInstances;
}

export function canNPCSpawnInContext(
  npc: NPCDefinition,
  location: NPCSpawnLocation,
  floor: number
): boolean {
  const rules: NPCSpawnRules = npc.spawnRules ?? { locations: ['town'] };

  if (!rules.locations.includes(location)) {
    return false;
  }

  if (location !== 'dungeon') {
    return true;
  }

  if (rules.dungeonFloorMin !== undefined && floor < rules.dungeonFloorMin) {
    return false;
  }

  if (rules.dungeonFloorMax !== undefined && floor > rules.dungeonFloorMax) {
    return false;
  }

  return true;
}

export function getNPCDefinitionsForContext(
  location: NPCSpawnLocation,
  floor: number
): NPCDefinition[] {
  return NPCS.filter((npc) => canNPCSpawnInContext(npc, location, floor));
}

export const NPC_DATA = {
  NPCS,
};

export default NPC_DATA;
