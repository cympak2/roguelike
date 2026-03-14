import type { InventoryItem } from '../entities/player';
import { ItemType, type ItemDefinition } from '../config/item-data';

const BASE_DURABILITY_BY_TYPE: Record<ItemType.WEAPON | ItemType.ARMOR, number> = {
  [ItemType.WEAPON]: 80,
  [ItemType.ARMOR]: 110,
};

const DURABILITY_RARITY_BONUS: Record<InventoryItem['rarity'], number> = {
  common: 0,
  uncommon: 10,
  rare: 20,
  epic: 35,
  legendary: 50,
};

export function isEquippableDefinition(
  itemDef: ItemDefinition
): itemDef is ItemDefinition & { type: ItemType.WEAPON | ItemType.ARMOR } {
  return itemDef.type === ItemType.WEAPON || itemDef.type === ItemType.ARMOR;
}

export function getDefaultMaxDurability(itemDef: ItemDefinition): number | undefined {
  if (!isEquippableDefinition(itemDef)) {
    return undefined;
  }

  const base = BASE_DURABILITY_BY_TYPE[itemDef.type];
  return base + DURABILITY_RARITY_BONUS[itemDef.rarity];
}

export function ensureDurability(
  item: InventoryItem,
  itemDef: ItemDefinition | undefined
): void {
  if (!itemDef || !isEquippableDefinition(itemDef)) {
    return;
  }

  const maxDurability = item.maxDurability ?? getDefaultMaxDurability(itemDef);
  if (!maxDurability) {
    return;
  }

  item.maxDurability = maxDurability;
  if (item.currentDurability === undefined) {
    item.currentDurability = maxDurability;
  }
}

export function isBroken(item: InventoryItem): boolean {
  if (item.maxDurability === undefined) {
    return false;
  }
  return (item.currentDurability ?? item.maxDurability) <= 0;
}

export function getMissingDurability(item: InventoryItem): number {
  if (item.maxDurability === undefined) {
    return 0;
  }
  const current = item.currentDurability ?? item.maxDurability;
  return Math.max(0, item.maxDurability - Math.max(0, current));
}
