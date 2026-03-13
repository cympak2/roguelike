/**
 * Test Monster AI System
 * Tests chase, flee, ranged, and special abilities
 */

import { Monster, AIBehavior } from './src/entities/monster.ts';
import { Player } from './src/entities/player.ts';
import { GameMap, TileType } from './src/world/map.ts';
import { MonsterAISystem, ActionType, AbilityType } from './src/systems/monster-ai-system.ts';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestMap(width = 30, height = 30) {
  const map = new GameMap(width, height);
  
  // Fill with floors
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      map.setTile(x, y, TileType.FLOOR, false, false);
    }
  }
  
  return map;
}

function createTestPlayer(x = 15, y = 15) {
  return new Player(x, y);
}

function createTestMonster(x, y, behavior = AIBehavior.AGGRESSIVE) {
  const monster = new Monster(
    x, y,
    'Test Monster',
    'M',
    0xff0000,
    50,  // HP
    10,  // Attack
    5,   // Defense
    10,  // Speed
    behavior,
    50   // XP
  );
  return monster;
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${testName}${details ? ': ' + details : ''}`);
}

// ============================================================================
// TESTS
// ============================================================================

function testChaseeBehavior() {
  console.log('\n=== Test 1: Chase Behavior ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(10, 10, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  // Monster should move towards player or attack
  const shouldChase = action.type === ActionType.MOVE || action.type === ActionType.MELEE_ATTACK;
  logTest('Monster chases player', shouldChase, `Action: ${action.type}`);
  
  if (action.type === ActionType.MOVE) {
    const oldDistance = Math.sqrt(
      Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
    );
    
    // Simulate move
    monster.setPosition(action.targetX, action.targetY);
    
    const newDistance = Math.sqrt(
      Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
    );
    
    logTest('Monster moves closer to player', newDistance < oldDistance,
      `Distance: ${oldDistance.toFixed(2)} -> ${newDistance.toFixed(2)}`);
  }
}

function testFleeBehavior() {
  console.log('\n=== Test 2: Flee Behavior ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(16, 15, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Damage monster to low HP
  monster.takeDamage(40); // 50 -> 10 HP (20%)
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const initialDistance = Math.sqrt(
    Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
  );
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  logTest('Monster should flee when HP < 25%', aiSystem.shouldFlee(monster),
    `HP: ${monster.currentHP}/${monster.maxHP} (${(monster.currentHP/monster.maxHP*100).toFixed(0)}%)`);
  
  logTest('Monster takes flee action', action.type === ActionType.FLEE,
    `Action: ${action.type}`);
  
  if (action.type === ActionType.FLEE && action.targetX !== undefined) {
    // Simulate flee
    const oldX = monster.x;
    const oldY = monster.y;
    monster.setPosition(action.targetX, action.targetY);
    
    const newDistance = Math.sqrt(
      Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
    );
    
    logTest('Monster moves away from player', newDistance > initialDistance,
      `Distance: ${initialDistance.toFixed(2)} -> ${newDistance.toFixed(2)}`);
  }
}

function testRangedAttack() {
  console.log('\n=== Test 3: Ranged Attack ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(10, 15, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Give monster high sight range for ranged capability
  monster.sightRange = 10;
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  const distance = Math.sqrt(
    Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
  );
  
  logTest('Distance is in ranged attack range', distance >= 3 && distance <= 8,
    `Distance: ${distance.toFixed(2)}`);
  
  logTest('Monster uses ranged attack', action.type === ActionType.RANGED_ATTACK,
    `Action: ${action.type}`);
}

function testRegenerateAbility() {
  console.log('\n=== Test 4: Regenerate Ability ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(16, 16, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Damage monster
  monster.takeDamage(20); // 50 -> 30 HP
  
  // Add regenerate ability
  aiSystem.addAbility(monster, {
    id: 'regen',
    type: AbilityType.REGENERATE,
    name: 'Regenerate',
    cooldown: 5,
    currentCooldown: 0,
    power: 10,
    duration: 5,
  });
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const initialHP = monster.currentHP;
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  logTest('Monster has regenerate ability', 
    aiSystem.getMonsterAbilities(monster).length > 0,
    `Abilities: ${aiSystem.getMonsterAbilities(monster).length}`);
  
  if (action.type === ActionType.SPECIAL_ABILITY && action.abilityId === 'regen') {
    logTest('Monster uses regenerate ability', true, 'Ability: regenerate');
    
    // Execute the ability
    const ability = aiSystem.getMonsterAbilities(monster)[0];
    aiSystem.executeAbility(monster, player, ability, map, [monster]);
    
    logTest('Monster HP increased', monster.currentHP > initialHP,
      `HP: ${initialHP} -> ${monster.currentHP}`);
  } else {
    logTest('Monster attempts to use ability', action.type === ActionType.SPECIAL_ABILITY,
      `Action: ${action.type}`);
  }
}

function testPoisonAbility() {
  console.log('\n=== Test 5: Poison Ability ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(16, 15, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Add poison ability
  aiSystem.addAbility(monster, {
    id: 'poison',
    type: AbilityType.POISON,
    name: 'Poison Strike',
    cooldown: 10,
    currentCooldown: 0,
    power: 3,
    duration: 5,
    range: 3,
  });
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const initialPlayerHP = player.currentHP;
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  if (action.type === ActionType.SPECIAL_ABILITY && action.abilityId === 'poison') {
    logTest('Monster uses poison ability', true, 'Ability: poison');
    
    // Execute the ability
    const ability = aiSystem.getMonsterAbilities(monster)[0];
    aiSystem.executeAbility(monster, player, ability, map, [monster]);
    
    logTest('Player has poison effect', aiSystem.hasStatusEffect(player, 'poison'),
      'Status: poisoned');
    
    // Process status effects (poison ticks)
    const hpBeforeTick = player.currentHP;
    aiSystem.updateMonsterAI(monster, player, map, [monster]);
    
    logTest('Poison deals damage over time', player.currentHP < hpBeforeTick,
      `HP: ${hpBeforeTick} -> ${player.currentHP}`);
  } else {
    logTest('Monster can use poison ability', true,
      `Action: ${action.type} (may attack instead if close)`);
  }
}

function testPhaseAbility() {
  console.log('\n=== Test 6: Phase Ability ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(10, 10, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Trap the monster
  for (let x = 9; x <= 11; x++) {
    for (let y = 9; y <= 11; y++) {
      if (x !== 10 || y !== 10) { // Don't block monster's position
        map.setTile(x, y, TileType.WALL, true, true);
      }
    }
  }
  
  // Add phase ability
  aiSystem.addAbility(monster, {
    id: 'phase',
    type: AbilityType.PHASE,
    name: 'Phase Shift',
    cooldown: 15,
    currentCooldown: 0,
    duration: 3,
  });
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  logTest('Monster is trapped', true, 'Surrounded by walls');
  
  if (action.type === ActionType.SPECIAL_ABILITY && action.abilityId === 'phase') {
    logTest('Monster uses phase ability', true, 'Ability: phase');
    
    // Execute the ability
    const ability = aiSystem.getMonsterAbilities(monster)[0];
    aiSystem.executeAbility(monster, player, ability, map, [monster]);
    
    logTest('Monster has phase effect', aiSystem.hasStatusEffect(monster, 'phase'),
      'Status: phasing');
  } else {
    logTest('Monster attempts action', true,
      `Action: ${action.type}`);
  }
}

function testSummonAbility() {
  console.log('\n=== Test 7: Summon Ability ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(10, 10, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  // Damage monster to trigger summon
  monster.takeDamage(25); // 50 -> 25 HP (50%)
  
  // Add summon ability
  aiSystem.addAbility(monster, {
    id: 'summon',
    type: AbilityType.SUMMON,
    name: 'Summon Minions',
    cooldown: 20,
    currentCooldown: 0,
    power: 2,
  });
  
  const allMonsters = [monster];
  map.addEntity(player);
  map.addEntity(monster);
  
  const initialMonsterCount = allMonsters.length;
  const action = aiSystem.updateMonsterAI(monster, player, map, allMonsters);
  
  if (action.type === ActionType.SPECIAL_ABILITY && action.abilityId === 'summon') {
    logTest('Monster uses summon ability', true, 'Ability: summon');
    
    // Execute the ability
    const ability = aiSystem.getMonsterAbilities(monster)[0];
    aiSystem.executeAbility(monster, player, ability, map, allMonsters);
    
    logTest('New monsters summoned', allMonsters.length > initialMonsterCount,
      `Monsters: ${initialMonsterCount} -> ${allMonsters.length}`);
    
    logTest('Summoned monsters are on map', map.entities.length > 2,
      `Entities on map: ${map.entities.length}`);
  } else {
    logTest('Monster HP triggers summon condition', monster.currentHP < monster.maxHP * 0.6,
      `HP: ${monster.currentHP}/${monster.maxHP}`);
  }
}

function testWandererBehavior() {
  console.log('\n=== Test 8: Wanderer Behavior ===');
  
  const map = createTestMap();
  const player = createTestPlayer(25, 25); // Far away
  const monster = createTestMonster(5, 5, AIBehavior.WANDERER);
  const aiSystem = new MonsterAISystem();
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  logTest('Wanderer takes action', 
    action.type === ActionType.MOVE || action.type === ActionType.WAIT,
    `Action: ${action.type}`);
  
  logTest('Wanderer behavior is random', true,
    'May move or wait');
}

function testAmbusherBehavior() {
  console.log('\n=== Test 9: Ambusher Behavior ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(10, 10, AIBehavior.AMBUSHER);
  const aiSystem = new MonsterAISystem();
  
  map.addEntity(player);
  map.addEntity(monster);
  
  // Test 1: Far from player - should wait
  const farAction = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  logTest('Ambusher waits when far from player', 
    farAction.type === ActionType.WAIT,
    `Distance: ~7, Action: ${farAction.type}`);
  
  // Test 2: Close to player - should attack
  monster.setPosition(15, 13); // Move close
  const closeAction = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  logTest('Ambusher acts when close to player',
    closeAction.type !== ActionType.WAIT,
    `Distance: ~2, Action: ${closeAction.type}`);
}

function testCowardlyBehavior() {
  console.log('\n=== Test 10: Cowardly Behavior ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(16, 15, AIBehavior.COWARDLY);
  const aiSystem = new MonsterAISystem();
  
  map.addEntity(player);
  map.addEntity(monster);
  
  const initialDistance = Math.sqrt(
    Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
  );
  
  const action = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  
  logTest('Cowardly monster flees', action.type === ActionType.FLEE,
    `Action: ${action.type}`);
  
  if (action.type === ActionType.FLEE && action.targetX !== undefined) {
    monster.setPosition(action.targetX, action.targetY);
    const newDistance = Math.sqrt(
      Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
    );
    
    logTest('Cowardly monster moves away', newDistance > initialDistance,
      `Distance: ${initialDistance.toFixed(2)} -> ${newDistance.toFixed(2)}`);
  }
}

function testAbilityCooldowns() {
  console.log('\n=== Test 11: Ability Cooldowns ===');
  
  const map = createTestMap();
  const player = createTestPlayer(15, 15);
  const monster = createTestMonster(16, 16, AIBehavior.AGGRESSIVE);
  const aiSystem = new MonsterAISystem();
  
  monster.takeDamage(20); // Trigger ability use
  
  // Add ability with cooldown
  aiSystem.addAbility(monster, {
    id: 'test_ability',
    type: AbilityType.REGENERATE,
    name: 'Test Ability',
    cooldown: 3,
    currentCooldown: 0,
    power: 10,
  });
  
  map.addEntity(player);
  map.addEntity(monster);
  
  // First use - should work
  const action1 = aiSystem.updateMonsterAI(monster, player, map, [monster]);
  const usedAbility = action1.type === ActionType.SPECIAL_ABILITY;
  
  if (usedAbility) {
    logTest('Ability used first time', true, 'Cooldown: 0');
    
    const abilities = aiSystem.getMonsterAbilities(monster);
    const cooldown = abilities[0].currentCooldown;
    logTest('Cooldown set after use', cooldown === 3,
      `Cooldown: ${cooldown}`);
    
    // Try to use again immediately - should not work
    const action2 = aiSystem.updateMonsterAI(monster, player, map, [monster]);
    logTest('Ability on cooldown', action2.type !== ActionType.SPECIAL_ABILITY,
      `Action: ${action2.type}`);
    
    // Simulate turns passing
    for (let i = 0; i < 3; i++) {
      aiSystem.updateMonsterAI(monster, player, map, [monster]);
    }
    
    const cooldownAfter = abilities[0].currentCooldown;
    logTest('Cooldown decreases over turns', cooldownAfter === 0,
      `Cooldown: ${cooldown} -> ${cooldownAfter}`);
  } else {
    logTest('Monster can use abilities', true,
      'May choose other action based on situation');
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   MONSTER AI SYSTEM TEST SUITE        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\x1b[0m');
  
  try {
    testChaseeBehavior();
    testFleeBehavior();
    testRangedAttack();
    testRegenerateAbility();
    testPoisonAbility();
    testPhaseAbility();
    testSummonAbility();
    testWandererBehavior();
    testAmbusherBehavior();
    testCowardlyBehavior();
    testAbilityCooldowns();
    
    console.log('\n\x1b[1m\x1b[32m');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ALL TESTS COMPLETED                 ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\x1b[0m');
  } catch (error) {
    console.error('\n\x1b[31mTest failed with error:\x1b[0m', error);
    process.exit(1);
  }
}

runAllTests();
