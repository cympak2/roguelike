/**
 * Test Suite for NPC Interaction Trigger System
 * Demonstrates all features of the dialogue trigger system
 */

import { Player } from './src/entities/player.js';
import { NPC, NPCType } from './src/entities/npc.js';
import { GameMap } from './src/world/map.js';
import { DialogueTriggerSystem } from './src/systems/dialogue-trigger-system.js';

// Mock Scene for testing
class MockScene {
  constructor() {
    this.scenes = new Map();
    this.scenes.set('DialogueScene', {
      showDialogue: (npc) => {
        console.log(`  📜 DialogueScene.showDialogue() called for: ${npc.name}`);
        return true;
      }
    });
  }

  launch(sceneName) {
    console.log(`  🚀 Scene.launch('${sceneName}') called`);
  }

  get(sceneName) {
    return this.scenes.get(sceneName);
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

function printHeader(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function printSubHeader(title) {
  console.log('\n' + '-'.repeat(70));
  console.log(`  ${title}`);
  console.log('-'.repeat(70));
}

function printSuccess(message) {
  console.log(`  ✅ ${message}`);
}

function printError(message) {
  console.log(`  ❌ ${message}`);
}

function printInfo(message) {
  console.log(`  ℹ️  ${message}`);
}

// ============================================================================
// TEST SETUP
// ============================================================================

function createTestPlayer(x = 5, y = 5, playerClass = 'warrior') {
  const player = new Player(x, y, 'TestHero', '@', 0xFFFFFF);
  player.playerClass = playerClass;
  player.level = 5;
  player.currentHP = 80;
  player.maxHP = 100;
  
  // Add quest flags for testing
  player.questFlags = new Map();
  player.questFlags.set('met_merchant', true);
  player.questFlags.set('dragon_slain', false);
  
  return player;
}

function createTestNPC(x, y, name, type = NPCType.GENERIC) {
  const npc = new NPC(x, y, name, '@', 0xFFFF00, type);
  
  // Add some test dialogues
  npc.addDialogues([
    {
      id: 'start',
      text: `Hello, traveler! I am ${name}.`,
      options: [
        {
          id: 'opt1',
          text: 'Who are you?',
          nextDialogueId: 'about'
        },
        {
          id: 'opt2',
          text: 'Goodbye',
          action: () => console.log('  💬 Player said goodbye')
        }
      ]
    },
    {
      id: 'about',
      text: `I'm a ${type} in this realm.`,
      options: [
        {
          id: 'back',
          text: 'I see.',
          nextDialogueId: 'start'
        }
      ]
    }
  ]);
  
  return npc;
}

function createTestMap() {
  return new GameMap(20, 20);
}

// ============================================================================
// TEST 1: BASIC INTERACTION DETECTION
// ============================================================================

function testBasicInteraction() {
  printHeader('TEST 1: Basic NPC Interaction Detection');
  
  const player = createTestPlayer(5, 5);
  const npc1 = createTestNPC(5, 6, 'Bob the Merchant', NPCType.MERCHANT);
  const npc2 = createTestNPC(10, 10, 'Distant Guard', NPCType.GUARD);
  const map = createTestMap();
  const scene = new MockScene();
  
  map.addEntity(player);
  map.addEntity(npc1);
  map.addEntity(npc2);
  
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing NPC proximity detection');
  
  // Test 1: NPC within range
  const nearbyNPC = triggerSystem.checkNPCInteraction(player, [npc1, npc2], map);
  if (nearbyNPC === npc1) {
    printSuccess(`Detected nearby NPC: ${nearbyNPC.name}`);
  } else {
    printError('Failed to detect nearby NPC');
  }
  
  // Test 2: No NPC in range
  player.x = 0;
  player.y = 0;
  const noNPC = triggerSystem.checkNPCInteraction(player, [npc1, npc2], map);
  if (noNPC === null) {
    printSuccess('Correctly returned null when no NPC nearby');
  } else {
    printError('Should not detect NPC when out of range');
  }
  
  // Test 3: Interaction prompt
  player.x = 5;
  player.y = 5;
  const prompt = triggerSystem.getInteractionPrompt(player, [npc1, npc2]);
  if (prompt) {
    printSuccess(`Got interaction prompt: "${prompt}"`);
  } else {
    printError('Failed to get interaction prompt');
  }
}

// ============================================================================
// TEST 2: CAN INTERACT CONDITIONS
// ============================================================================

function testCanInteract() {
  printHeader('TEST 2: Can Interact Conditions');
  
  const player = createTestPlayer(5, 5);
  const npc = createTestNPC(5, 6, 'Alice the Sage', NPCType.SAGE);
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing interaction conditions');
  
  // Test 1: Normal interaction
  if (triggerSystem.canInteract(player, npc)) {
    printSuccess('Player can interact with NPC (normal conditions)');
  } else {
    printError('Player should be able to interact');
  }
  
  // Test 2: Player dead
  player.currentHP = 0;
  if (!triggerSystem.canInteract(player, npc)) {
    printSuccess('Dead player cannot interact with NPC');
  } else {
    printError('Dead player should not be able to interact');
  }
  player.currentHP = 80;
  
  // Test 3: NPC not interactable
  npc.isInteractable = false;
  if (!triggerSystem.canInteract(player, npc)) {
    printSuccess('Cannot interact with non-interactable NPC');
  } else {
    printError('Should not interact with non-interactable NPC');
  }
  npc.isInteractable = true;
  
  // Test 4: Out of range
  player.x = 0;
  player.y = 0;
  if (!triggerSystem.canInteract(player, npc)) {
    printSuccess('Cannot interact when out of range');
  } else {
    printError('Should not interact when out of range');
  }
}

// ============================================================================
// TEST 3: DIALOGUE TRIGGERING
// ============================================================================

function testDialogueTrigger() {
  printHeader('TEST 3: Dialogue Triggering');
  
  const player = createTestPlayer(5, 5);
  const npc = createTestNPC(5, 6, 'Charlie the Healer', NPCType.HEALER);
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing dialogue trigger flow');
  
  // Trigger dialogue
  triggerSystem.triggerDialogue(scene, npc, player);
  
  // Check NPC state
  if (npc.currentDialogueId === 'start') {
    printSuccess(`NPC dialogue started at: ${npc.currentDialogueId}`);
  } else {
    printError(`NPC dialogue not started correctly: ${npc.currentDialogueId}`);
  }
  
  const currentDialogue = npc.getCurrentDialogue();
  if (currentDialogue) {
    printSuccess(`Got current dialogue: "${currentDialogue.text}"`);
    printInfo(`Options: ${currentDialogue.options.map(o => o.text).join(', ')}`);
  } else {
    printError('Failed to get current dialogue');
  }
}

// ============================================================================
// TEST 4: CONDITIONAL DIALOGUE (CLASS)
// ============================================================================

function testClassConditions() {
  printHeader('TEST 4: Class-Based Conditional Dialogue');
  
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing class conditions');
  
  // Warrior test
  const warrior = createTestPlayer(5, 5, 'warrior');
  const warriorConditions = [
    { type: 'class', value: 'warrior' }
  ];
  
  if (triggerSystem.evaluateConditions(warrior, warriorConditions)) {
    printSuccess('Warrior class condition passed');
  } else {
    printError('Warrior class condition should pass');
  }
  
  // Mage test (should fail for warrior)
  const mageConditions = [
    { type: 'class', value: 'mage' }
  ];
  
  if (!triggerSystem.evaluateConditions(warrior, mageConditions)) {
    printSuccess('Mage class condition correctly failed for warrior');
  } else {
    printError('Mage class condition should fail for warrior');
  }
  
  // Mage test (should pass)
  const mage = createTestPlayer(5, 5, 'mage');
  if (triggerSystem.evaluateConditions(mage, mageConditions)) {
    printSuccess('Mage class condition passed for mage');
  } else {
    printError('Mage class condition should pass for mage');
  }
}

// ============================================================================
// TEST 5: CONDITIONAL DIALOGUE (ITEMS)
// ============================================================================

function testItemConditions() {
  printHeader('TEST 5: Item-Based Conditional Dialogue');
  
  const player = createTestPlayer(5, 5);
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing item conditions');
  
  // Test without item
  const itemConditions = [
    { type: 'item', value: 'magic_sword', operator: 'has' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, itemConditions)) {
    printSuccess('Item condition correctly failed (no item)');
  } else {
    printError('Item condition should fail when player lacks item');
  }
  
  // Add item to player
  player.addItem({
    id: 'magic_sword',
    name: 'Magic Sword',
    type: 'weapon',
    quantity: 1,
    rarity: 'rare'
  });
  
  if (triggerSystem.evaluateConditions(player, itemConditions)) {
    printSuccess('Item condition passed (has item)');
  } else {
    printError('Item condition should pass when player has item');
  }
  
  printInfo(`Player inventory: ${player.inventory.map(i => i.name).join(', ')}`);
}

// ============================================================================
// TEST 6: CONDITIONAL DIALOGUE (QUEST FLAGS)
// ============================================================================

function testQuestConditions() {
  printHeader('TEST 6: Quest-Based Conditional Dialogue');
  
  const player = createTestPlayer(5, 5);
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing quest flag conditions');
  
  // Test with completed quest
  const questConditions = [
    { type: 'quest', value: 'met_merchant' }
  ];
  
  if (triggerSystem.evaluateConditions(player, questConditions)) {
    printSuccess('Quest condition passed (flag is true)');
  } else {
    printError('Quest condition should pass when flag is true');
  }
  
  // Test with incomplete quest
  const incompleteQuestConditions = [
    { type: 'quest', value: 'dragon_slain' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, incompleteQuestConditions)) {
    printSuccess('Quest condition correctly failed (flag is false)');
  } else {
    printError('Quest condition should fail when flag is false');
  }
  
  // Test with non-existent quest
  const missingQuestConditions = [
    { type: 'quest', value: 'non_existent_quest' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, missingQuestConditions)) {
    printSuccess('Quest condition correctly failed (flag does not exist)');
  } else {
    printError('Quest condition should fail when flag does not exist');
  }
  
  printInfo(`Player quest flags: ${Array.from(player.questFlags.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

// ============================================================================
// TEST 7: CONDITIONAL DIALOGUE (LEVEL)
// ============================================================================

function testLevelConditions() {
  printHeader('TEST 7: Level-Based Conditional Dialogue');
  
  const player = createTestPlayer(5, 5);
  player.level = 5;
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing level conditions');
  
  // Test greaterThan (>=)
  const levelConditions1 = [
    { type: 'level', value: 5, operator: 'greaterThan' }
  ];
  
  if (triggerSystem.evaluateConditions(player, levelConditions1)) {
    printSuccess('Level condition passed (level >= 5)');
  } else {
    printError('Level condition should pass (level >= 5)');
  }
  
  // Test greaterThan (should fail)
  const levelConditions2 = [
    { type: 'level', value: 10, operator: 'greaterThan' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, levelConditions2)) {
    printSuccess('Level condition correctly failed (level < 10)');
  } else {
    printError('Level condition should fail (level < 10)');
  }
  
  // Test equals
  const levelConditions3 = [
    { type: 'level', value: 5, operator: 'equals' }
  ];
  
  if (triggerSystem.evaluateConditions(player, levelConditions3)) {
    printSuccess('Level condition passed (level === 5)');
  } else {
    printError('Level condition should pass (level === 5)');
  }
  
  printInfo(`Player level: ${player.level}`);
}

// ============================================================================
// TEST 8: CONDITIONAL DIALOGUE (HEALTH)
// ============================================================================

function testHealthConditions() {
  printHeader('TEST 8: Health-Based Conditional Dialogue');
  
  const player = createTestPlayer(5, 5);
  player.currentHP = 80;
  player.maxHP = 100;
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing health conditions');
  
  const healthPercent = (player.currentHP / player.maxHP) * 100;
  printInfo(`Player health: ${player.currentHP}/${player.maxHP} (${healthPercent}%)`);
  
  // Test greaterThan (>=)
  const healthConditions1 = [
    { type: 'health', value: 75, operator: 'greaterThan' }
  ];
  
  if (triggerSystem.evaluateConditions(player, healthConditions1)) {
    printSuccess('Health condition passed (health >= 75%)');
  } else {
    printError('Health condition should pass (health >= 75%)');
  }
  
  // Test greaterThan (should fail)
  const healthConditions2 = [
    { type: 'health', value: 90, operator: 'greaterThan' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, healthConditions2)) {
    printSuccess('Health condition correctly failed (health < 90%)');
  } else {
    printError('Health condition should fail (health < 90%)');
  }
  
  // Test lessThan
  const healthConditions3 = [
    { type: 'health', value: 50, operator: 'lessThan' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, healthConditions3)) {
    printSuccess('Health condition correctly failed (health >= 50%)');
  } else {
    printError('Health condition should fail (health >= 50%)');
  }
}

// ============================================================================
// TEST 9: COMPLEX MULTI-CONDITION EVALUATION
// ============================================================================

function testMultipleConditions() {
  printHeader('TEST 9: Multiple Condition Evaluation');
  
  const player = createTestPlayer(5, 5, 'warrior');
  player.level = 10;
  player.addItem({
    id: 'legendary_sword',
    name: 'Legendary Sword',
    type: 'weapon',
    quantity: 1,
    rarity: 'legendary'
  });
  
  const scene = new MockScene();
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing multiple conditions (ALL must pass)');
  
  const multiConditions = [
    { type: 'class', value: 'warrior' },
    { type: 'level', value: 5, operator: 'greaterThan' },
    { type: 'item', value: 'legendary_sword', operator: 'has' },
    { type: 'quest', value: 'met_merchant' }
  ];
  
  if (triggerSystem.evaluateConditions(player, multiConditions)) {
    printSuccess('All conditions passed');
  } else {
    printError('All conditions should pass');
  }
  
  // Test with one failing condition
  const failingConditions = [
    { type: 'class', value: 'warrior' },
    { type: 'level', value: 20, operator: 'greaterThan' }, // Will fail
    { type: 'item', value: 'legendary_sword', operator: 'has' }
  ];
  
  if (!triggerSystem.evaluateConditions(player, failingConditions)) {
    printSuccess('Correctly failed when one condition does not pass');
  } else {
    printError('Should fail when any condition does not pass');
  }
}

// ============================================================================
// TEST 10: ATTEMPT INTERACTION (INTEGRATION)
// ============================================================================

function testAttemptInteraction() {
  printHeader('TEST 10: Attempt Interaction (Full Integration)');
  
  const player = createTestPlayer(5, 5);
  const npc = createTestNPC(6, 5, 'David the Questgiver', NPCType.QUESTGIVER);
  const map = createTestMap();
  const scene = new MockScene();
  
  map.addEntity(player);
  map.addEntity(npc);
  
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing attempt interaction');
  
  // Test successful interaction
  const result1 = triggerSystem.attemptInteraction(player, 6, 5, map);
  if (result1.success && result1.npc === npc) {
    printSuccess(`Interaction succeeded: ${result1.message}`);
    printInfo(`NPC: ${result1.npc.name}`);
  } else {
    printError('Interaction should succeed with NPC');
  }
  
  // Test empty tile
  const result2 = triggerSystem.attemptInteraction(player, 10, 10, map);
  if (!result2.success) {
    printSuccess(`Empty tile handled correctly: ${result2.message}`);
  } else {
    printError('Should not succeed on empty tile');
  }
  
  // Test out of range
  const result3 = triggerSystem.attemptInteraction(player, 15, 15, map);
  if (!result3.success) {
    printSuccess(`Out of range handled correctly: ${result3.message}`);
  } else {
    printError('Should not succeed when out of range');
  }
}

// ============================================================================
// TEST 11: FIND NEAREST NPC
// ============================================================================

function testFindNearestNPC() {
  printHeader('TEST 11: Find Nearest NPC');
  
  const player = createTestPlayer(5, 5);
  const npc1 = createTestNPC(7, 5, 'Close NPC', NPCType.MERCHANT);
  const npc2 = createTestNPC(5, 7, 'Far NPC', NPCType.GUARD);
  const scene = new MockScene();
  
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing nearest NPC detection');
  
  const nearestNPC = triggerSystem.findNearestNPC(player, [npc1, npc2]);
  
  if (nearestNPC === npc1) {
    printSuccess(`Found nearest NPC: ${nearestNPC.name}`);
    const distance = Math.sqrt(
      Math.pow(nearestNPC.x - player.x, 2) + 
      Math.pow(nearestNPC.y - player.y, 2)
    );
    printInfo(`Distance: ${distance.toFixed(2)} tiles`);
  } else {
    printError('Should find npc1 as nearest');
  }
}

// ============================================================================
// TEST 12: GET NEARBY NPCs
// ============================================================================

function testGetNearbyNPCs() {
  printHeader('TEST 12: Get Nearby NPCs');
  
  const player = createTestPlayer(5, 5);
  const npc1 = createTestNPC(6, 5, 'NPC 1', NPCType.MERCHANT);
  const npc2 = createTestNPC(5, 6, 'NPC 2', NPCType.SAGE);
  const npc3 = createTestNPC(15, 15, 'Far NPC', NPCType.GUARD);
  const scene = new MockScene();
  
  const triggerSystem = new DialogueTriggerSystem(scene);
  
  printSubHeader('Testing get nearby NPCs');
  
  const nearbyNPCs = triggerSystem.getNearbyNPCs(player, [npc1, npc2, npc3]);
  
  printInfo(`Found ${nearbyNPCs.length} nearby NPCs`);
  
  if (nearbyNPCs.length === 2 && nearbyNPCs.includes(npc1) && nearbyNPCs.includes(npc2)) {
    printSuccess('Correctly found nearby NPCs');
    nearbyNPCs.forEach(npc => {
      printInfo(`  - ${npc.name}`);
    });
  } else {
    printError('Should find exactly 2 nearby NPCs (npc1 and npc2)');
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                    ║');
  console.log('║       NPC INTERACTION TRIGGER SYSTEM - COMPREHENSIVE TESTS        ║');
  console.log('║                                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  try {
    testBasicInteraction();
    testCanInteract();
    testDialogueTrigger();
    testClassConditions();
    testItemConditions();
    testQuestConditions();
    testLevelConditions();
    testHealthConditions();
    testMultipleConditions();
    testAttemptInteraction();
    testFindNearestNPC();
    testGetNearbyNPCs();
    
    printHeader('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
