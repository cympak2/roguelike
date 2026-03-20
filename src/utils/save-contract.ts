import type {
  Equipment,
  InventoryItem,
  PlayerClass,
  QuestObjective,
} from '../entities/player';
import type { StatusEffect } from '../types/status-effects';

export const GAME_SAVE_KEY = 'rogue:save:game';
export const GAME_SAVE_VERSION = 1;
export const FLOOR_SNAPSHOT_DTO_VERSION = 1;

export type SaveGamePhase = 'dungeon' | 'post_lich_recovery';

export interface RunAnalyticsSaveData {
  kills: number;
  damageDealt: number;
  maxDepthReached: number;
  causeOfDeath: string;
  buildUsed: string;
}

export interface ProgressionSaveData {
  currentFloor: number;
  gamePhase: SaveGamePhase;
  lichDefeated: boolean;
  recoveryTasksCompleted: number;
  recoveryTasksTotal: number;
  runAnalytics: RunAnalyticsSaveData;
}

export interface PlayerCoreStatsSaveData {
  x: number;
  y: number;
  name: string;
  glyph: string;
  color: number;
  maxHP: number;
  currentHP: number;
  attack: number;
  defense: number;
  speed: number;
  playerClass: PlayerClass;
  level: number;
  xp: number;
  xpForNextLevel: number;
  currentMana: number;
  maxMana: number;
  magicPower: number;
  lockpicking: number;
  inventoryCapacity: number;
  gold: bigint;
  statusEffects: StatusEffect[];
  unlockedTalentIds: Set<string>;
}

export interface PlayerSaveData extends PlayerCoreStatsSaveData {
  inventory: InventoryItem[];
  equipment: Equipment;
  questFlags: Map<string, boolean>;
  quests: QuestObjective[];
}

export interface FloorTileSnapshotSaveData {
  type: string;
  blocked: boolean;
  blocksSight: boolean;
  explored: boolean;
  visible: boolean;
}

export interface FloorMapSnapshotSaveData {
  width: number;
  height: number;
  tiles: FloorTileSnapshotSaveData[][];
}

export interface FloorMonsterStatusSaveData {
  isAggro: boolean;
  triggeredPhaseThresholds: number[];
  lastHeardNoisePos: { x: number; y: number } | null;
  noiseInvestigationTurnsRemaining: number;
  hearingThreshold: number;
  isFriendlySummon: boolean;
  summonOwner: 'player' | null;
  persistAcrossFloors: boolean;
  companionId?: string;
}

export interface FloorMonsterSnapshotSaveData {
  id: string;
  templateId: string;
  name: string;
  behavior: string;
  x: number;
  y: number;
  currentHP: number;
  maxHP: number;
  status: FloorMonsterStatusSaveData;
}

export interface FloorItemSnapshotSaveData {
  id: string;
  name: string;
  x: number;
  y: number;
  glyph: string;
  color: number;
  quantity?: number;
  inventoryType?: InventoryItem['type'];
  rarity?: InventoryItem['rarity'];
  identified?: boolean;
  enchantmentBonus?: number;
  currentDurability?: number;
  maxDurability?: number;
  corpseSourceId?: string;
  corpseCursed?: boolean;
  corpseEdible?: boolean;
  corpseCooked?: boolean;
  corpseSeasoned?: boolean;
  affixAttackBonus?: number;
  affixCritChanceBonus?: number;
  affixMagicResistBonus?: number;
  isGold?: boolean;
  goldAmount?: number;
}

export interface FloorTrapSnapshotSaveData {
  id: string;
  type: 'spike';
  x: number;
  y: number;
  damage: number;
  revealed: boolean;
  disarmed: boolean;
}

export interface FloorNPCSnapshotSaveData {
  id: string;
  definitionId?: string;
  npcType: string;
  name: string;
  glyph: string;
  color: number;
  x: number;
  y: number;
  dialogueStartId: string;
  currentDialogueId: string | null;
  isInteractable: boolean;
  interactionRange: number;
  questIds: string[];
  shopInventoryIds: string[];
}

export interface DungeonFloorSnapshotSaveDataV1 {
  version: typeof FLOOR_SNAPSHOT_DTO_VERSION;
  floor: number;
  map: FloorMapSnapshotSaveData;
  monsters: FloorMonsterSnapshotSaveData[];
  items: FloorItemSnapshotSaveData[];
  traps: FloorTrapSnapshotSaveData[];
  npcs: FloorNPCSnapshotSaveData[];
}

export interface FloorSnapshotsSaveData {
  currentFloorSnapshot?: DungeonFloorSnapshotSaveDataV1;
  dungeonFloorSnapshots?: DungeonFloorSnapshotSaveDataV1[];
}

export interface GameSaveState {
  player: PlayerSaveData;
  progression: ProgressionSaveData;
  floorSnapshots?: FloorSnapshotsSaveData;
}

export function isGameSaveState(value: unknown): value is GameSaveState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPlayerSaveData(value.player)
    && isProgressionSaveData(value.progression)
    && isOptionalFloorSnapshotsSaveData(value.floorSnapshots)
  );
}

function isProgressionSaveData(value: unknown): value is ProgressionSaveData {
  if (!isRecord(value) || !isRunAnalyticsSaveData(value.runAnalytics)) {
    return false;
  }

  return (
    isFiniteNumber(value.currentFloor)
    && isSaveGamePhase(value.gamePhase)
    && typeof value.lichDefeated === 'boolean'
    && isFiniteNumber(value.recoveryTasksCompleted)
    && isFiniteNumber(value.recoveryTasksTotal)
  );
}

function isRunAnalyticsSaveData(value: unknown): value is RunAnalyticsSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.kills)
    && isFiniteNumber(value.damageDealt)
    && isFiniteNumber(value.maxDepthReached)
    && typeof value.causeOfDeath === 'string'
    && typeof value.buildUsed === 'string'
  );
}

function isPlayerSaveData(value: unknown): value is PlayerSaveData {
  if (!isPlayerCoreStatsSaveData(value) || !isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.inventory)
    && value.inventory.every(isInventoryItem)
    && isEquipment(value.equipment)
    && value.questFlags instanceof Map
    && Array.from(value.questFlags.values()).every((entry) => typeof entry === 'boolean')
    && Array.isArray(value.quests)
    && value.quests.every(isQuestObjective)
  );
}

function isPlayerCoreStatsSaveData(value: unknown): value is PlayerCoreStatsSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && typeof value.name === 'string'
    && typeof value.glyph === 'string'
    && isFiniteNumber(value.color)
    && isFiniteNumber(value.maxHP)
    && isFiniteNumber(value.currentHP)
    && isFiniteNumber(value.attack)
    && isFiniteNumber(value.defense)
    && isFiniteNumber(value.speed)
    && isPlayerClass(value.playerClass)
    && isFiniteNumber(value.level)
    && isFiniteNumber(value.xp)
    && isFiniteNumber(value.xpForNextLevel)
    && isFiniteNumber(value.currentMana)
    && isFiniteNumber(value.maxMana)
    && isFiniteNumber(value.magicPower)
    && isFiniteNumber(value.lockpicking)
    && isFiniteNumber(value.inventoryCapacity)
    && typeof value.gold === 'bigint'
    && Array.isArray(value.statusEffects)
    && value.statusEffects.every(isStatusEffect)
    && value.unlockedTalentIds instanceof Set
    && Array.from(value.unlockedTalentIds.values()).every((entry) => typeof entry === 'string')
  );
}

export function isFloorSnapshotsSaveData(value: unknown): value is FloorSnapshotsSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalDungeonFloorSnapshotSaveData(value.currentFloorSnapshot)
    && isOptionalArrayOf(value.dungeonFloorSnapshots, isDungeonFloorSnapshotSaveData)
  );
}

export function isDungeonFloorSnapshotSaveData(value: unknown): value is DungeonFloorSnapshotSaveDataV1 {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === FLOOR_SNAPSHOT_DTO_VERSION
    && isFiniteNumber(value.floor)
    && isFloorMapSnapshotSaveData(value.map)
    && Array.isArray(value.monsters)
    && value.monsters.every(isFloorMonsterSnapshotSaveData)
    && Array.isArray(value.items)
    && value.items.every(isFloorItemSnapshotSaveData)
    && Array.isArray(value.traps)
    && value.traps.every(isFloorTrapSnapshotSaveData)
    && Array.isArray(value.npcs)
    && value.npcs.every(isFloorNPCSnapshotSaveData)
  );
}

export function isFloorMapSnapshotSaveData(value: unknown): value is FloorMapSnapshotSaveData {
  if (!isRecord(value) || !Array.isArray(value.tiles)) {
    return false;
  }

  if (!isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    return false;
  }

  if (value.tiles.length !== value.height) {
    return false;
  }

  return value.tiles.every((row) =>
    Array.isArray(row)
    && row.length === value.width
    && row.every(isFloorTileSnapshotSaveData)
  );
}

function isFloorTileSnapshotSaveData(value: unknown): value is FloorTileSnapshotSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.type === 'string'
    && typeof value.blocked === 'boolean'
    && typeof value.blocksSight === 'boolean'
    && typeof value.explored === 'boolean'
    && typeof value.visible === 'boolean'
  );
}

export function isFloorMonsterSnapshotSaveData(value: unknown): value is FloorMonsterSnapshotSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.templateId === 'string'
    && typeof value.name === 'string'
    && typeof value.behavior === 'string'
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isFiniteNumber(value.currentHP)
    && isFiniteNumber(value.maxHP)
    && isFloorMonsterStatusSaveData(value.status)
  );
}

function isFloorMonsterStatusSaveData(value: unknown): value is FloorMonsterStatusSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.isAggro === 'boolean'
    && Array.isArray(value.triggeredPhaseThresholds)
    && value.triggeredPhaseThresholds.every(isFiniteNumber)
    && isPointOrNull(value.lastHeardNoisePos)
    && isFiniteNumber(value.noiseInvestigationTurnsRemaining)
    && isFiniteNumber(value.hearingThreshold)
    && typeof value.isFriendlySummon === 'boolean'
    && isSummonOwner(value.summonOwner)
    && typeof value.persistAcrossFloors === 'boolean'
    && isOptionalString(value.companionId)
  );
}

export function isFloorItemSnapshotSaveData(value: unknown): value is FloorItemSnapshotSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && typeof value.glyph === 'string'
    && isFiniteNumber(value.color)
    && isOptionalNumber(value.quantity)
    && isOptionalInventoryItemType(value.inventoryType)
    && isOptionalInventoryRarity(value.rarity)
    && isOptionalBoolean(value.identified)
    && isOptionalNumber(value.enchantmentBonus)
    && isOptionalNumber(value.currentDurability)
    && isOptionalNumber(value.maxDurability)
    && isOptionalString(value.corpseSourceId)
    && isOptionalBoolean(value.corpseCursed)
    && isOptionalBoolean(value.corpseEdible)
    && isOptionalBoolean(value.corpseCooked)
    && isOptionalBoolean(value.corpseSeasoned)
    && isOptionalNumber(value.affixAttackBonus)
    && isOptionalNumber(value.affixCritChanceBonus)
    && isOptionalNumber(value.affixMagicResistBonus)
    && isOptionalBoolean(value.isGold)
    && isOptionalNumber(value.goldAmount)
  );
}

function isFloorTrapSnapshotSaveData(value: unknown): value is FloorTrapSnapshotSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && value.type === 'spike'
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isFiniteNumber(value.damage)
    && typeof value.revealed === 'boolean'
    && typeof value.disarmed === 'boolean'
  );
}

export function isFloorNPCSnapshotSaveData(value: unknown): value is FloorNPCSnapshotSaveData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && isOptionalString(value.definitionId)
    && typeof value.npcType === 'string'
    && typeof value.name === 'string'
    && typeof value.glyph === 'string'
    && isFiniteNumber(value.color)
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && typeof value.dialogueStartId === 'string'
    && (value.currentDialogueId === null || typeof value.currentDialogueId === 'string')
    && typeof value.isInteractable === 'boolean'
    && isFiniteNumber(value.interactionRange)
    && Array.isArray(value.questIds)
    && value.questIds.every((questId) => typeof questId === 'string')
    && Array.isArray(value.shopInventoryIds)
    && value.shopInventoryIds.every((itemId) => typeof itemId === 'string')
  );
}

function isSaveGamePhase(value: unknown): value is SaveGamePhase {
  return value === 'dungeon' || value === 'post_lich_recovery';
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && isInventoryItemType(value.type)
    && isFiniteNumber(value.quantity)
    && isInventoryRarity(value.rarity)
    && isOptionalBoolean(value.identified)
    && isOptionalNumber(value.enchantmentBonus)
    && isOptionalNumber(value.currentDurability)
    && isOptionalNumber(value.maxDurability)
    && isOptionalString(value.corpseSourceId)
    && isOptionalBoolean(value.corpseCursed)
    && isOptionalBoolean(value.corpseEdible)
    && isOptionalBoolean(value.corpseCooked)
    && isOptionalBoolean(value.corpseSeasoned)
    && isOptionalNumber(value.affixAttackBonus)
    && isOptionalNumber(value.affixCritChanceBonus)
    && isOptionalNumber(value.affixMagicResistBonus)
  );
}

function isEquipment(value: unknown): value is Equipment {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalInventoryItem(value.weapon)
    && isOptionalInventoryItem(value.armor)
    && isOptionalInventoryItem(value.shield)
    && isOptionalInventoryItem(value.accessory)
  );
}

function isQuestObjective(value: unknown): value is QuestObjective {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.objective === 'string'
    && typeof value.completed === 'boolean'
  );
}

function isStatusEffect(value: unknown): value is StatusEffect {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isStatusEffectType(value.type)
    && isFiniteNumber(value.duration)
    && isFiniteNumber(value.power)
  );
}

function isStatusEffectType(value: unknown): value is StatusEffect['type'] {
  return (
    value === 'poison'
    || value === 'regenerate'
    || value === 'phase'
    || value === 'curse_weakness'
    || value === 'curse_frailty'
    || value === 'curse_wither'
  );
}

function isPlayerClass(value: unknown): value is PlayerClass {
  return value === 'warrior' || value === 'mage' || value === 'rogue';
}

function isInventoryItemType(value: unknown): value is InventoryItem['type'] {
  return value === 'weapon' || value === 'armor' || value === 'potion' || value === 'misc';
}

function isOptionalInventoryItemType(value: unknown): value is InventoryItem['type'] | undefined {
  return value === undefined || isInventoryItemType(value);
}

function isInventoryRarity(value: unknown): value is InventoryItem['rarity'] {
  return (
    value === 'common'
    || value === 'uncommon'
    || value === 'rare'
    || value === 'epic'
    || value === 'legendary'
  );
}

function isOptionalInventoryRarity(value: unknown): value is InventoryItem['rarity'] | undefined {
  return value === undefined || isInventoryRarity(value);
}

function isOptionalInventoryItem(value: unknown): value is InventoryItem | undefined {
  return value === undefined || isInventoryItem(value);
}

function isOptionalFloorSnapshotsSaveData(value: unknown): value is FloorSnapshotsSaveData | undefined {
  return value === undefined || isFloorSnapshotsSaveData(value);
}

function isOptionalDungeonFloorSnapshotSaveData(
  value: unknown
): value is DungeonFloorSnapshotSaveDataV1 | undefined {
  return value === undefined || isDungeonFloorSnapshotSaveData(value);
}

function isOptionalArrayOf<TValue>(
  value: unknown,
  guard: (entry: unknown) => entry is TValue
): value is TValue[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(guard));
}

function isPointOrNull(value: unknown): value is { x: number; y: number } | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isSummonOwner(value: unknown): value is FloorMonsterStatusSaveData['summonOwner'] {
  return value === 'player' || value === null;
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
