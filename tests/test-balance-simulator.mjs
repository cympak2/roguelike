#!/usr/bin/env node

/**
 * ROGUE GAME - BALANCE SIMULATOR
 * 
 * Simulates full playthroughs from floor 1-10 to test:
 * - Combat balance and difficulty progression
 * - XP/leveling curve
 * - Item availability and drops
 * - Boss fight viability
 * - Death rates and bottlenecks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== GAME DATA ====================

const MONSTER_DATA = {
  rat: { name: 'Rat', level: 1, hp: 8, atk: 3, def: 0, mgc: 0, xp: 15, weight: 8 },
  skeleton: { name: 'Skeleton', level: 2, hp: 20, atk: 5, def: 2, mgc: 1, xp: 35, weight: 7 },
  goblin: { name: 'Goblin', level: 2, hp: 25, atk: 6, def: 2, mgc: 0, xp: 50, weight: 6 },
  orc: { name: 'Orc Warrior', level: 3, hp: 55, atk: 10, def: 5, mgc: 0, xp: 100, weight: 5 },
  darkMage: { name: 'Dark Mage', level: 4, hp: 40, atk: 4, def: 3, mgc: 12, xp: 120, weight: 4 },
  spider: { name: 'Giant Spider', level: 5, hp: 65, atk: 9, def: 4, mgc: 0, xp: 140, weight: 4 },
  troll: { name: 'Troll', level: 6, hp: 90, atk: 12, def: 6, mgc: 0, xp: 180, weight: 3 },
  wraith: { name: 'Wraith', level: 7, hp: 75, atk: 11, def: 3, mgc: 8, xp: 200, weight: 2 },
  dragon: { name: 'Dragon Wyrmling', level: 8, hp: 140, atk: 16, def: 10, mgc: 15, xp: 300, weight: 2 },
  lichKing: { name: 'Lich King', level: 10, hp: 500, atk: 25, def: 20, mgc: 25, xp: 1000, weight: 1 }
};

const CLASS_DATA = {
  warrior: { name: 'Warrior', hp: 100, atk: 8, def: 7, mgc: 0, spd: 5 },
  mage: { name: 'Mage', hp: 50, atk: 3, def: 3, mgc: 10, spd: 5 },
  rogue: { name: 'Rogue', hp: 75, atk: 7, def: 4, mgc: 0, spd: 8 }
};

const XP_CURVE = {
  1: 100,
  2: 250,
  3: 500,
  4: 707,  // level^1.5 * 50
  5: 1118,
  6: 1581,
  7: 2097,
  8: 2663,
  9: 3280,
  10: 3943
};

const FLOOR_MONSTER_COUNTS = {
  1: { min: 3, max: 5 },
  2: { min: 4, max: 6 },
  3: { min: 5, max: 7 },
  4: { min: 6, max: 8 },
  5: { min: 6, max: 9 },
  6: { min: 7, max: 10 },
  7: { min: 8, max: 11 },
  8: { min: 9, max: 13 },
  9: { min: 10, max: 15 },
  10: { min: 1, max: 1 }  // Boss only
};

// ==================== SIMULATION LOGIC ====================

class Player {
  constructor(className) {
    const classData = CLASS_DATA[className];
    this.class = classData.name;
    this.level = 1;
    this.hp = classData.hp;
    this.maxHp = classData.hp;
    this.atk = classData.atk;
    this.def = classData.def;
    this.mgc = classData.mgc;
    this.spd = classData.spd;
    this.xp = 0;
    this.gold = 0;
    this.potions = 3;  // Starting potions
    this.itemsFound = 0;
    this.monstersKilled = 0;
  }

  levelUp() {
    this.level++;
    this.maxHp += 10;
    this.hp = this.maxHp;
    
    // Alternate stat increases for balance
    if (this.level % 2 === 0) {
      this.atk += 2;
      this.def += 1;
    } else {
      this.def += 2;
      this.atk += 1;
    }
    
    if (this.mgc > 0) {
      this.mgc += 2;
    }
  }

  gainXP(amount) {
    this.xp += amount;
    const requiredXP = XP_CURVE[this.level];
    
    if (this.xp >= requiredXP && this.level < 10) {
      this.xp -= requiredXP;
      this.levelUp();
      return true;
    }
    return false;
  }

  usePotion() {
    if (this.potions > 0) {
      this.potions--;
      this.hp = Math.min(this.maxHp, this.hp + 50);
      return true;
    }
    return false;
  }

  isAlive() {
    return this.hp > 0;
  }
}

class Monster {
  constructor(key) {
    const data = MONSTER_DATA[key];
    this.name = data.name;
    this.level = data.level;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.atk = data.atk;
    this.def = data.def;
    this.mgc = data.mgc;
    this.xp = data.xp;
  }

  isAlive() {
    return this.hp > 0;
  }
}

function calculateDamage(attacker, defender, useMagic = false) {
  if (useMagic && attacker.mgc > 0) {
    // Magic bypasses defense
    const baseDamage = attacker.mgc;
    const variance = Math.floor(Math.random() * 5) - 2;  // -2 to +2
    return Math.max(1, baseDamage + variance);
  } else {
    // Physical attack
    const baseDamage = attacker.atk - defender.def;
    const variance = Math.floor(Math.random() * 5) - 2;  // -2 to +2
    return Math.max(1, baseDamage + variance);
  }
}

function simulateCombat(player, monster, verbose = false) {
  const log = [];
  let turns = 0;
  const maxTurns = 50;  // Prevent infinite loops
  
  const playerCopy = { ...player, hp: player.hp };
  const monsterCopy = { ...monster, hp: monster.hp };
  
  log.push(`\n=== Combat: ${player.class} (L${player.level}) vs ${monster.name} (L${monster.level}) ===`);
  log.push(`Player: ${playerCopy.hp}/${player.maxHp} HP | ATK:${player.atk} DEF:${player.def} MGC:${player.mgc}`);
  log.push(`Monster: ${monsterCopy.hp}/${monster.maxHp} HP | ATK:${monster.atk} DEF:${monster.def}`);
  
  while (playerCopy.hp > 0 && monsterCopy.hp > 0 && turns < maxTurns) {
    turns++;
    
    // Player attacks first if SPD is higher
    const useMagic = player.mgc > player.atk;
    const playerDamage = calculateDamage(player, monster, useMagic);
    monsterCopy.hp -= playerDamage;
    
    if (verbose) {
      log.push(`Turn ${turns}: Player ${useMagic ? 'casts spell' : 'attacks'} for ${playerDamage} damage (Monster: ${Math.max(0, monsterCopy.hp)} HP)`);
    }
    
    if (monsterCopy.hp <= 0) {
      log.push(`Victory! Monster defeated in ${turns} turns. Player HP remaining: ${playerCopy.hp}/${player.maxHp}`);
      return { victory: true, playerHpLost: player.hp - playerCopy.hp, turns, log };
    }
    
    // Monster counterattacks
    const monsterDamage = calculateDamage(monster, player, monster.mgc > monster.atk);
    playerCopy.hp -= monsterDamage;
    
    if (verbose) {
      log.push(`         Monster ${monster.mgc > 0 ? 'casts spell' : 'attacks'} for ${monsterDamage} damage (Player: ${Math.max(0, playerCopy.hp)} HP)`);
    }
    
    // Use potion if HP critical and we have potions
    if (playerCopy.hp < player.maxHp * 0.3 && player.potions > 0) {
      player.usePotion();
      playerCopy.hp = player.hp;
      log.push(`         Player uses potion! (${player.potions} remaining, HP: ${playerCopy.hp})`);
    }
    
    if (playerCopy.hp <= 0) {
      log.push(`Defeat! Player died in ${turns} turns.`);
      return { victory: false, playerHpLost: player.hp, turns, log };
    }
  }
  
  if (turns >= maxTurns) {
    log.push(`Combat timeout after ${maxTurns} turns - assuming defeat`);
    return { victory: false, playerHpLost: player.hp, turns: maxTurns, log };
  }
}

function getAvailableMonsters(floor) {
  const maxLevel = Math.floor(floor * 1.2);
  const available = [];
  
  for (const [key, data] of Object.entries(MONSTER_DATA)) {
    if (floor === 10 && key === 'lichKing') {
      available.push(key);
    } else if (floor < 10 && key !== 'lichKing' && data.level <= maxLevel) {
      available.push(key);
    }
  }
  
  return available;
}

function spawnMonster(floor) {
  const available = getAvailableMonsters(floor);
  if (available.length === 0) return null;
  
  // Weight-based selection
  const weights = available.map(key => MONSTER_DATA[key].weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return new Monster(available[i]);
    }
  }
  
  return new Monster(available[0]);
}

function simulateFloor(player, floor, verbose = false) {
  const counts = FLOOR_MONSTER_COUNTS[floor];
  const monsterCount = Math.floor(Math.random() * (counts.max - counts.min + 1)) + counts.min;
  
  const results = {
    floor,
    monstersKilled: 0,
    xpGained: 0,
    deaths: 0,
    combats: [],
    playerLevelStart: player.level,
    playerLevelEnd: player.level
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FLOOR ${floor} - ${monsterCount} monsters - Player: L${player.level} (${player.hp}/${player.maxHp} HP, ${player.potions} potions)`);
  console.log(`${'='.repeat(60)}`);
  
  for (let i = 0; i < monsterCount; i++) {
    if (!player.isAlive()) {
      results.deaths++;
      break;
    }
    
    const monster = spawnMonster(floor);
    if (!monster) continue;
    
    const combat = simulateCombat(player, monster, verbose);
    results.combats.push(combat);
    
    if (combat.victory) {
      player.hp -= combat.playerHpLost;
      player.gainXP(monster.xp);
      player.monstersKilled++;
      results.monstersKilled++;
      results.xpGained += monster.xp;
      
      // Chance to find items/potions
      if (Math.random() < 0.3) {
        player.itemsFound++;
      }
      if (Math.random() < 0.2) {
        player.potions++;
      }
      
      console.log(`  ✓ Defeated ${monster.name} (+${monster.xp} XP) - HP: ${player.hp}/${player.maxHp}`);
      
      if (player.level > results.playerLevelStart) {
        console.log(`  ★ LEVEL UP! Now level ${player.level}`);
        results.playerLevelEnd = player.level;
      }
    } else {
      console.log(`  ✗ DIED to ${monster.name}`);
      results.deaths++;
      return results;
    }
    
    // Rest between fights (recover 20% HP)
    if (i < monsterCount - 1) {
      player.hp = Math.min(player.maxHp, Math.floor(player.hp + player.maxHp * 0.2));
    }
  }
  
  // Full heal between floors
  player.hp = player.maxHp;
  results.playerLevelEnd = player.level;
  
  return results;
}

function runFullPlaythrough(className, verbose = false) {
  console.log(`\n${'█'.repeat(70)}`);
  console.log(`  STARTING PLAYTHROUGH: ${className.toUpperCase()}`);
  console.log(`${'█'.repeat(70)}`);
  
  const player = new Player(className);
  const playthroughResults = {
    class: className,
    startTime: Date.now(),
    floors: [],
    completed: false,
    finalLevel: 1,
    totalMonstersKilled: 0,
    deathFloor: null
  };
  
  for (let floor = 1; floor <= 10; floor++) {
    const floorResults = simulateFloor(player, floor, verbose);
    playthroughResults.floors.push(floorResults);
    
    if (floorResults.deaths > 0 || !player.isAlive()) {
      playthroughResults.deathFloor = floor;
      playthroughResults.finalLevel = player.level;
      playthroughResults.totalMonstersKilled = player.monstersKilled;
      
      console.log(`\n💀 GAME OVER on Floor ${floor}`);
      console.log(`   Final Stats: Level ${player.level}, ${player.monstersKilled} monsters killed`);
      return playthroughResults;
    }
  }
  
  playthroughResults.completed = true;
  playthroughResults.finalLevel = player.level;
  playthroughResults.totalMonstersKilled = player.monstersKilled;
  
  console.log(`\n🏆 VICTORY! Completed all 10 floors!`);
  console.log(`   Final Stats: Level ${player.level}, ${player.monstersKilled} monsters killed`);
  
  return playthroughResults;
}

function runSimulation(iterations = 10) {
  const results = {
    warrior: [],
    mage: [],
    rogue: []
  };
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  BALANCE SIMULATION - ${iterations} runs per class`);
  console.log(`${'═'.repeat(70)}`);
  
  for (const className of ['warrior', 'mage', 'rogue']) {
    for (let i = 0; i < iterations; i++) {
      console.log(`\n--- ${className.toUpperCase()} Run ${i + 1}/${iterations} ---`);
      const result = runFullPlaythrough(className, false);
      results[className].push(result);
    }
  }
  
  return results;
}

function analyzeResults(results) {
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log(`  BALANCE ANALYSIS SUMMARY`);
  console.log(`${'═'.repeat(70)}`);
  
  const summary = {};
  
  for (const [className, runs] of Object.entries(results)) {
    const completed = runs.filter(r => r.completed).length;
    const avgFinalLevel = runs.reduce((sum, r) => sum + r.finalLevel, 0) / runs.length;
    const avgKills = runs.reduce((sum, r) => sum + r.totalMonstersKilled, 0) / runs.length;
    const deathFloors = runs.filter(r => r.deathFloor).map(r => r.deathFloor);
    const avgDeathFloor = deathFloors.length > 0 
      ? deathFloors.reduce((a, b) => a + b, 0) / deathFloors.length 
      : 10;
    
    summary[className] = {
      completionRate: (completed / runs.length * 100).toFixed(1),
      avgFinalLevel: avgFinalLevel.toFixed(1),
      avgKills: avgKills.toFixed(1),
      avgDeathFloor: avgDeathFloor.toFixed(1),
      deathFloors: deathFloors
    };
    
    console.log(`\n${className.toUpperCase()}:`);
    console.log(`  Completion Rate: ${summary[className].completionRate}%`);
    console.log(`  Avg Final Level: ${summary[className].avgFinalLevel}`);
    console.log(`  Avg Kills: ${summary[className].avgKills}`);
    console.log(`  Avg Death Floor: ${summary[className].avgDeathFloor}`);
    console.log(`  Death Distribution: ${deathFloors.length > 0 ? deathFloors.join(', ') : 'None'}`);
  }
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  KEY FINDINGS:`);
  console.log(`${'═'.repeat(70)}`);
  
  // Find balance issues
  const completionRates = Object.values(summary).map(s => parseFloat(s.completionRate));
  const maxCompletion = Math.max(...completionRates);
  const minCompletion = Math.min(...completionRates);
  const spread = maxCompletion - minCompletion;
  
  if (spread > 30) {
    console.log(`  ⚠️  HIGH CLASS IMBALANCE: ${spread.toFixed(1)}% spread in completion rates`);
  } else if (spread > 15) {
    console.log(`  ⚡ MODERATE IMBALANCE: ${spread.toFixed(1)}% spread in completion rates`);
  } else {
    console.log(`  ✓ GOOD CLASS BALANCE: ${spread.toFixed(1)}% spread in completion rates`);
  }
  
  const avgCompletion = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
  if (avgCompletion < 30) {
    console.log(`  ⚠️  GAME TOO HARD: ${avgCompletion.toFixed(1)}% average completion rate`);
  } else if (avgCompletion > 70) {
    console.log(`  ⚠️  GAME TOO EASY: ${avgCompletion.toFixed(1)}% average completion rate`);
  } else {
    console.log(`  ✓ GOOD DIFFICULTY: ${avgCompletion.toFixed(1)}% average completion rate`);
  }
  
  return summary;
}

// ==================== MAIN EXECUTION ====================

const args = process.argv.slice(2);
const iterations = parseInt(args[0]) || 10;
const verbose = args.includes('--verbose') || args.includes('-v');

console.log(`\n🎮 ROGUE GAME - BALANCE SIMULATOR\n`);
console.log(`Running ${iterations} simulations per class...\n`);

const results = runSimulation(iterations);
const summary = analyzeResults(results);

// Save detailed results
const outputPath = path.join(__dirname, 'balance-simulation-results.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({ results, summary, timestamp: new Date().toISOString() }, null, 2)
);

console.log(`\n📊 Detailed results saved to: balance-simulation-results.json\n`);
