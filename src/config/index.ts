/**
 * Configuration Index
 * Central export point for all game configurations
 */

export * from './game-config';
export * from './class-data';
export * from './monster-data';
export * from './item-data';
export * from './npc-data';

// Re-export default configurations for convenience
export { default as GAME_CONFIG } from './game-config';
export { default as CLASS_DATA } from './class-data';
export { default as MONSTER_DATA } from './monster-data';
export { default as ITEM_DATA } from './item-data';
export { default as NPC_DATA } from './npc-data';
