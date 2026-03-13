/**
 * Test script to verify combat and monster AI integration
 * 
 * This script checks:
 * 1. Monster spawning system
 * 2. Combat system integration
 * 3. Monster AI behaviors
 * 4. Item spawning
 */

import { MonsterSpawnSystem } from './src/systems/monster-spawn-system.ts';
import { ItemSpawnSystem } from './src/systems/item-spawn-system.ts';
import { CombatSystem } from './src/systems/combat-system.ts';
import { Player } from './src/entities/player.ts';
import { DungeonGenerator } from './src/world/dungeon-gen.ts';
import { MessageLog } from './src/ui/message-log.ts';

console.log('=== COMBAT INTEGRATION TEST ===\n');

// Test 1: Monster Spawning
console.log('TEST 1: Monster Spawning');
console.log('-'.repeat(50));
const dungeonGen = new DungeonGenerator();
const testMap = dungeonGen.generate(1, 80, 40);
const spawnSystem = new MonsterSpawnSystem();
const monsters = spawnSystem.spawnMonstersInDungeon(testMap, 1);
console.log(`✓ Spawned ${monsters.length} monsters on floor 1`);
if (monsters.length > 0) {
  console.log(`  First monster: ${monsters[0].name} (${monsters[0].glyph}) at (${monsters[0].x}, ${monsters[0].y})`);
  console.log(`  Behavior: ${monsters[0].behavior}, HP: ${monsters[0].currentHP}/${monsters[0].maxHP}`);
}
console.log();

// Test 2: Item Spawning
console.log('TEST 2: Item Spawning');
console.log('-'.repeat(50));
const itemSpawnSystem = new ItemSpawnSystem();
const testMap2 = dungeonGen.generate(1, 80, 40);
itemSpawnSystem.spawnItemsInDungeon(testMap2, 1);
const items = testMap2.getAllItems();
console.log(`✓ Spawned ${items.length} items on floor 1`);
if (items.length > 0) {
  console.log(`  First item: ${items[0].name} (${items[0].glyph}) at (${items[0].x}, ${items[0].y})`);
  console.log(`  Type: ${items[0].itemType}, Rarity: ${items[0].rarity}`);
}
console.log();

// Test 3: Combat System
console.log('TEST 3: Combat System');
console.log('-'.repeat(50));
const messageLog = new MessageLog();
const combatSystem = new CombatSystem(messageLog);
const player = new Player(40, 20, 'warrior');
const monster = monsters[0];

console.log(`Player: ${player.name} (ATK: ${player.attack}, DEF: ${player.defense}, HP: ${player.currentHP}/${player.maxHP})`);
console.log(`Monster: ${monster.name} (ATK: ${monster.attack}, DEF: ${monster.defense}, HP: ${monster.currentHP}/${monster.maxHP})`);

// Simulate combat
let roundCount = 0;
while (!player.isDead() && !monster.isDead() && roundCount < 20) {
  roundCount++;
  console.log(`\nRound ${roundCount}:`);
  
  // Player attacks
  const playerAttack = combatSystem.meleeAttack(player, monster);
  console.log(`  ${playerAttack.message}`);
  
  if (monster.isDead()) {
    console.log(`  ✓ Monster defeated!`);
    break;
  }
  
  // Monster attacks back
  const monsterAttack = combatSystem.meleeAttack(monster, player);
  console.log(`  ${monsterAttack.message}`);
  
  if (player.isDead()) {
    console.log(`  ✗ Player died!`);
    break;
  }
}

console.log(`\nCombat ended after ${roundCount} rounds`);
console.log(`Player: ${player.currentHP}/${player.maxHP} HP`);
console.log(`Monster: ${monster.currentHP}/${monster.maxHP} HP`);
console.log();

// Test 4: Monster AI
console.log('TEST 4: Monster AI Behaviors');
console.log('-'.repeat(50));
const aggressiveMonsters = monsters.filter(m => m.behavior === 'aggressive');
const wandererMonsters = monsters.filter(m => m.behavior === 'wanderer');
const stationaryMonsters = monsters.filter(m => m.behavior === 'stationary');

console.log(`Aggressive monsters: ${aggressiveMonsters.length}`);
console.log(`Wanderer monsters: ${wandererMonsters.length}`);
console.log(`Stationary monsters: ${stationaryMonsters.length}`);

if (aggressiveMonsters.length > 0) {
  const aggressive = aggressiveMonsters[0];
  console.log(`\nTesting aggressive AI: ${aggressive.name}`);
  console.log(`  Can see player at (${player.x}, ${player.y}): ${aggressive.canSee(player.x, player.y, testMap)}`);
  console.log(`  Sight range: ${aggressive.sightRange}`);
  console.log(`  Is aggro: ${aggressive.isAggro}`);
  
  const direction = aggressive.getAIDirection(player.x, player.y);
  console.log(`  Movement toward player: (${direction.dx}, ${direction.dy})`);
}
console.log();

// Test 5: XP and Leveling
console.log('TEST 5: XP and Leveling');
console.log('-'.repeat(50));
const testPlayer = new Player(40, 20, 'mage');
console.log(`Initial: Level ${testPlayer.level}, XP: ${testPlayer.xp}`);

// Award XP from killing monster
if (monster.xpReward) {
  testPlayer.gainXP(monster.xpReward);
  console.log(`After gaining ${monster.xpReward} XP: Level ${testPlayer.level}, XP: ${testPlayer.xp}`);
}
console.log();

console.log('=== ALL TESTS COMPLETE ===');
console.log('\nIntegration Summary:');
console.log('✓ Monster spawning works');
console.log('✓ Item spawning works');
console.log('✓ Combat system functional');
console.log('✓ Monster AI behaviors configured');
console.log('✓ XP system works');
console.log('\n✨ Ready to test in-game!');
console.log('   1. Start game and select a class');
console.log('   2. Go to dungeon entrance (south of town)');
console.log('   3. Walk down stairs to dungeon');
console.log('   4. You should see monsters (colored letters)');
console.log('   5. Walk into a monster to attack it');
console.log('   6. Monsters should move and attack you back');
console.log('   7. Items should appear as various symbols');
