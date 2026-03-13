/**
 * Equipment System Usage Examples
 * Demonstrates common equipment system operations
 */

import { Player } from './entities/player';
import { EquipmentSystem } from './systems/equipment-system';
import { ITEMS } from './config/item-data';

// Helper to create inventory items from definitions
function createInventoryItem(itemId: string) {
  const itemDef = ITEMS.find((i) => i.id === itemId);
  if (!itemDef) return null;

  return {
    id: itemDef.id,
    name: itemDef.name,
    type: itemDef.type as any,
    quantity: 1,
    rarity: itemDef.rarity as any,
  };
}

// ============================================================================
// EXAMPLE 1: Basic Equipment Management
// ============================================================================
export function example1_basicEquipment() {
  console.log('=== Example 1: Basic Equipment ===');
  
  const player = new Player(5, 5, 'warrior');
  
  // Add items to inventory
  const sword = createInventoryItem('weapon_long_sword');
  const armor = createInventoryItem('armor_chain_mail');
  
  if (sword) player.addItem(sword);
  if (armor) player.addItem(armor);
  
  // Equip items
  if (sword) {
    const equipped = EquipmentSystem.equipItem(player, sword);
    console.log(`Equipped sword: ${equipped}`);
  }
  
  if (armor) {
    const equipped = EquipmentSystem.equipItem(player, armor);
    console.log(`Equipped armor: ${equipped}`);
  }
  
  // Check equipment
  console.log('Equipment:', EquipmentSystem.getEquipmentSummary(player));
  console.log('');
}

// ============================================================================
// EXAMPLE 2: Stat Calculations
// ============================================================================
export function example2_statCalculations() {
  console.log('=== Example 2: Stat Calculations ===');
  
  const player = new Player(5, 5, 'warrior');
  
  console.log(`Base Attack: ${player.attack}`);
  console.log(`Base Defense: ${player.defense}`);
  
  // Equip weapon
  const battleAxe = createInventoryItem('weapon_battle_axe');
  if (battleAxe) {
    player.addItem(battleAxe);
    EquipmentSystem.equipItem(player, battleAxe);
  }
  
  // Equip armor
  const plateArmor = createInventoryItem('armor_plate');
  if (plateArmor) {
    player.addItem(plateArmor);
    EquipmentSystem.equipItem(player, plateArmor);
  }
  
  // Calculate bonuses
  const attackBonus = EquipmentSystem.getAttackBonus(player);
  const defenseBonus = EquipmentSystem.getDefenseBonus(player);
  
  console.log(`Attack Bonus from Equipment: +${attackBonus}`);
  console.log(`Defense Bonus from Equipment: +${defenseBonus}`);
  console.log(`Total Attack: ${player.getTotalAttack()}`);
  console.log(`Total Defense: ${player.getTotalDefense()}`);
  console.log('');
}

// ============================================================================
// EXAMPLE 3: Replacing Equipment
// ============================================================================
export function example3_replacingEquipment() {
  console.log('=== Example 3: Replacing Equipment ===');
  
  const player = new Player(5, 5, 'rogue');
  
  // Equip initial weapon
  const dagger = createInventoryItem('weapon_dagger');
  if (dagger) {
    player.addItem(dagger);
    EquipmentSystem.equipItem(player, dagger);
    console.log(`Equipped: ${player.equipment.weapon?.name}`);
  }
  
  // Upgrade to better weapon
  const shortSword = createInventoryItem('weapon_short_sword');
  if (shortSword) {
    player.addItem(shortSword);
    console.log(`Inventory before upgrade: ${player.inventory.length} items`);
    
    EquipmentSystem.equipItem(player, shortSword);
    console.log(`Equipped: ${player.equipment.weapon?.name}`);
    console.log(`Inventory after upgrade: ${player.inventory.length} items`);
    console.log(`(Old weapon returned to inventory)`);
  }
  console.log('');
}

// ============================================================================
// EXAMPLE 4: Weapon Range
// ============================================================================
export function example4_weaponRange() {
  console.log('=== Example 4: Weapon Range ===');
  
  const player = new Player(5, 5, 'rogue');
  
  // Melee weapon
  const dagger = createInventoryItem('weapon_dagger');
  if (dagger) {
    player.addItem(dagger);
    EquipmentSystem.equipItem(player, dagger);
    console.log(`${dagger.name} range: ${EquipmentSystem.getWeaponRange(player)}`);
  }
  
  // Ranged weapon
  const bow = createInventoryItem('weapon_bow');
  if (bow) {
    player.addItem(bow);
    EquipmentSystem.equipItem(player, bow);
    console.log(`${bow.name} range: ${EquipmentSystem.getWeaponRange(player)}`);
  }
  
  // Magic weapon
  const wand = createInventoryItem('weapon_wand');
  if (wand) {
    player.addItem(wand);
    EquipmentSystem.equipItem(player, wand);
    console.log(`${wand.name} range: ${EquipmentSystem.getWeaponRange(player)}`);
  }
  console.log('');
}

// ============================================================================
// EXAMPLE 5: Full Loadout
// ============================================================================
export function example5_fullLoadout() {
  console.log('=== Example 5: Full Loadout ===');
  
  const player = new Player(5, 5, 'warrior');
  
  // Create full equipment set
  const weapon = createInventoryItem('weapon_long_sword');
  const armor = createInventoryItem('armor_plate');
  const shield = createInventoryItem('armor_shield');
  
  // Add to inventory
  if (weapon) player.addItem(weapon);
  if (armor) player.addItem(armor);
  if (shield) player.addItem(shield);
  
  // Equip all items
  if (weapon) EquipmentSystem.equipItem(player, weapon);
  if (armor) EquipmentSystem.equipItem(player, armor);
  if (shield) EquipmentSystem.equipItem(player, shield);
  
  // Display complete stats
  console.log('=== CHARACTER SHEET ===');
  console.log(`Class: ${player.playerClass.toUpperCase()}`);
  console.log(`Level: ${player.level}`);
  console.log('');
  console.log('Equipment:', EquipmentSystem.getEquipmentSummary(player));
  console.log('');
  console.log(`Base Attack: ${player.attack}`);
  console.log(`Equipment Attack: +${EquipmentSystem.getAttackBonus(player)}`);
  console.log(`TOTAL ATTACK: ${player.getTotalAttack()}`);
  console.log('');
  console.log(`Base Defense: ${player.defense}`);
  console.log(`Equipment Defense: +${EquipmentSystem.getDefenseBonus(player)}`);
  console.log(`TOTAL DEFENSE: ${player.getTotalDefense()}`);
  console.log('');
}

// ============================================================================
// EXAMPLE 6: Unequipping
// ============================================================================
export function example6_unequipping() {
  console.log('=== Example 6: Unequipping ===');
  
  const player = new Player(5, 5, 'mage');
  
  // Equip some items
  const staff = createInventoryItem('weapon_staff');
  const robe = createInventoryItem('armor_robe');
  
  if (staff) {
    player.addItem(staff);
    EquipmentSystem.equipItem(player, staff);
  }
  
  if (robe) {
    player.addItem(robe);
    EquipmentSystem.equipItem(player, robe);
  }
  
  console.log('Equipped items:', EquipmentSystem.getAllEquippedItems(player).length);
  console.log('Summary:', EquipmentSystem.getEquipmentSummary(player));
  
  // Unequip all
  const unequipped = EquipmentSystem.unequipAll(player);
  console.log(`Unequipped ${unequipped.length} items`);
  console.log('Equipped items:', EquipmentSystem.getAllEquippedItems(player).length);
  console.log('Inventory size:', player.inventory.length);
  console.log('');
}

// Run all examples
if (require.main === module) {
  example1_basicEquipment();
  example2_statCalculations();
  example3_replacingEquipment();
  example4_weaponRange();
  example5_fullLoadout();
  example6_unequipping();
}
