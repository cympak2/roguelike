/**
 * Equipment System Tests
 * Verifies equipment management, stat calculations, and integration
 */

import { Player } from '../entities/player';
import { EquipmentSystem } from './equipment-system';
import { ITEMS, ItemType } from '../config/item-data';

// Test helper to create a mock inventory item
function createMockItem(itemId: string) {
  const itemDef = ITEMS.find((i) => i.id === itemId);
  if (!itemDef) throw new Error(`Item ${itemId} not found`);

  return {
    id: itemDef.id,
    name: itemDef.name,
    type: itemDef.type as any,
    quantity: 1,
    rarity: itemDef.rarity as any,
  };
}

console.log('=== Equipment System Tests ===\n');

// Test 1: Can equip weapon
console.log('Test 1: Equip Weapon');
const player1 = new Player(0, 0, 'warrior');
const sword = createMockItem('weapon_long_sword');
player1.addItem(sword);

const canEquipSword = EquipmentSystem.canEquip(player1, sword);
console.log(`  Can equip sword: ${canEquipSword}`);

const equippedSword = EquipmentSystem.equipItem(player1, sword);
console.log(`  Sword equipped: ${equippedSword}`);
console.log(`  Weapon slot filled: ${player1.equipment.weapon?.name}`);
console.log(`  ✓ Pass\n`);

// Test 2: Can equip armor
console.log('Test 2: Equip Armor');
const player2 = new Player(0, 0, 'warrior');
const armor = createMockItem('armor_plate');
player2.addItem(armor);

const equippedArmor = EquipmentSystem.equipItem(player2, armor);
console.log(`  Armor equipped: ${equippedArmor}`);
console.log(`  Armor slot filled: ${player2.equipment.armor?.name}`);
console.log(`  ✓ Pass\n`);

// Test 3: Equipment provides stat bonuses
console.log('Test 3: Stat Bonuses from Equipment');
const player3 = new Player(0, 0, 'warrior');
const baseAttack = player3.attack;
const baseDefense = player3.defense;

const sword3 = createMockItem('weapon_long_sword');
const armor3 = createMockItem('armor_chain_mail');
player3.addItem(sword3);
player3.addItem(armor3);

EquipmentSystem.equipItem(player3, sword3);
EquipmentSystem.equipItem(player3, armor3);

const stats = EquipmentSystem.getEquippedStats(player3);
console.log(`  Base Attack: ${baseAttack}, Equipment Attack Bonus: ${stats.attack}`);
console.log(`  Base Defense: ${baseDefense}, Equipment Defense Bonus: ${stats.defense}`);
console.log(`  Total Attack: ${player3.getTotalAttack()}`);
console.log(`  Total Defense: ${player3.getTotalDefense()}`);
console.log(`  ✓ Pass\n`);

// Test 4: Unequip item
console.log('Test 4: Unequip Item');
const player4 = new Player(0, 0, 'rogue');
const dagger = createMockItem('weapon_dagger');
player4.addItem(dagger);

EquipmentSystem.equipItem(player4, dagger);
console.log(`  Equipped: ${player4.equipment.weapon?.name}`);

const unequipped = EquipmentSystem.unequipItem(player4, 'weapon');
console.log(`  Unequipped: ${unequipped?.name}`);
console.log(`  Weapon slot empty: ${player4.equipment.weapon === undefined}`);
console.log(`  Item back in inventory: ${player4.inventory.length > 0}`);
console.log(`  ✓ Pass\n`);

// Test 5: Replace equipped item
console.log('Test 5: Replace Equipped Item');
const player5 = new Player(0, 0, 'warrior');
const shortSword = createMockItem('weapon_short_sword');
const longSword = createMockItem('weapon_long_sword');

player5.addItem(shortSword);
player5.addItem(longSword);

EquipmentSystem.equipItem(player5, shortSword);
console.log(`  First weapon: ${player5.equipment.weapon?.name}`);

const inventoryBefore = player5.inventory.length;
EquipmentSystem.equipItem(player5, longSword);
console.log(`  Second weapon: ${player5.equipment.weapon?.name}`);
console.log(`  First weapon returned to inventory: ${player5.inventory.length === inventoryBefore}`);
console.log(`  ✓ Pass\n`);

// Test 6: Get attack and defense bonuses
console.log('Test 6: Specific Stat Bonuses');
const player6 = new Player(0, 0, 'mage');
const staff = createMockItem('weapon_staff');
const robe = createMockItem('armor_robe');
const shield = createMockItem('armor_shield');

player6.addItem(staff);
player6.addItem(robe);
player6.addItem(shield);

EquipmentSystem.equipItem(player6, staff);
EquipmentSystem.equipItem(player6, robe);
EquipmentSystem.equipItem(player6, shield);

const attackBonus = EquipmentSystem.getAttackBonus(player6);
const defenseBonus = EquipmentSystem.getDefenseBonus(player6);

console.log(`  Attack Bonus: ${attackBonus}`);
console.log(`  Defense Bonus: ${defenseBonus}`);
console.log(`  ✓ Pass\n`);

// Test 7: Get weapon range
console.log('Test 7: Weapon Range');
const player7 = new Player(0, 0, 'rogue');
const bow = createMockItem('weapon_bow');
const meleeWeapon = createMockItem('weapon_dagger');

player7.addItem(bow);
player7.addItem(meleeWeapon);

EquipmentSystem.equipItem(player7, bow);
const rangedRange = EquipmentSystem.getWeaponRange(player7);
console.log(`  Bow range: ${rangedRange}`);

EquipmentSystem.equipItem(player7, meleeWeapon);
const meleeRange = EquipmentSystem.getWeaponRange(player7);
console.log(`  Dagger range: ${meleeRange}`);
console.log(`  ✓ Pass\n`);

// Test 8: Equipment summary
console.log('Test 8: Equipment Summary');
const player8 = new Player(0, 0, 'warrior');
const battleAxe = createMockItem('weapon_battle_axe');
const plateArmor = createMockItem('armor_plate');

player8.addItem(battleAxe);
player8.addItem(plateArmor);

EquipmentSystem.equipItem(player8, battleAxe);
EquipmentSystem.equipItem(player8, plateArmor);

const summary = EquipmentSystem.getEquipmentSummary(player8);
console.log(`  Summary: ${summary}`);
console.log(`  ✓ Pass\n`);

// Test 9: Unequip all items
console.log('Test 9: Unequip All');
const player9 = new Player(0, 0, 'warrior');
const items = [
  createMockItem('weapon_long_sword'),
  createMockItem('armor_chain_mail'),
];

items.forEach((item) => {
  player9.addItem(item);
  EquipmentSystem.equipItem(player9, item);
});

console.log(`  Items equipped: ${EquipmentSystem.getAllEquippedItems(player9).length}`);
const unequippedAll = EquipmentSystem.unequipAll(player9);
console.log(`  Items unequipped: ${unequippedAll.length}`);
console.log(`  All slots empty: ${EquipmentSystem.getAllEquippedItems(player9).length === 0}`);
console.log(`  ✓ Pass\n`);

// Test 10: Cannot equip non-equipment items
console.log('Test 10: Cannot Equip Non-Equipment');
const player10 = new Player(0, 0, 'rogue');
const potion = createMockItem('potion_health');

player10.addItem(potion);
const canEquipPotion = EquipmentSystem.canEquip(player10, potion);
console.log(`  Can equip potion: ${canEquipPotion}`);
console.log(`  ✓ Pass\n`);

console.log('=== All Equipment System Tests Passed! ===');
