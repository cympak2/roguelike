/**
 * Game Over Scene Integration Examples
 * 
 * This file demonstrates how to integrate GameOverScene with
 * the combat system and other game systems to trigger on player death.
 */

import { GameOverScene, GameOverStats } from '../scenes/GameOverScene';
import { Player } from '../entities/player';

// ============================================================================
// EXAMPLE 1: Integration with Combat System
// ============================================================================

/**
 * Example of calling GameOverScene when player dies in combat
 */
export function handlePlayerDeath_CombatExample(
  scene: Phaser.Scene,
  player: Player,
  killedBy: string,
  totalKills: number,
  currentFloor: number,
  goldCollected: number
): void {
  // Prepare stats for game over screen
  const stats: GameOverStats = {
    level: player.level,
    kills: totalKills,
    floorsReached: currentFloor,
    gold: goldCollected,
    playerClass: player.playerClass.charAt(0).toUpperCase() + player.playerClass.slice(1),
    cause: `Slain by ${killedBy}`
  };

  // Transition to GameOverScene
  scene.scene.start('GameOverScene', { stats });
}

// ============================================================================
// EXAMPLE 2: Integration with Game Scene
// ============================================================================

/**
 * Example showing how to add death check in GameScene update loop
 */
export class GameSceneIntegrationExample {
  private player!: Player;
  private totalKills: number = 0;
  private currentFloor: number = 1;
  private scene!: Phaser.Scene;

  /**
   * Check for player death each turn/update
   */
  checkPlayerDeath(): void {
    if (this.player.currentHp <= 0) {
      this.triggerGameOver('Unknown');
    }
  }

  /**
   * Trigger game over screen
   */
  triggerGameOver(causeOfDeath: string): void {
    // Calculate gold from inventory or player property
    const gold = this.calculateGold();

    // Prepare stats
    const stats: GameOverStats = {
      level: this.player.level,
      kills: this.totalKills,
      floorsReached: this.currentFloor,
      gold: gold,
      playerClass: this.getPlayerClassName(),
      cause: causeOfDeath
    };

    // Start game over scene with fade out
    this.scene.cameras.main.fadeOut(500, 0, 0, 0);
    this.scene.time.delayedCall(500, () => {
      this.scene.scene.start('GameOverScene', { stats });
    });
  }

  /**
   * Calculate total gold from player inventory
   */
  private calculateGold(): number {
    // Option 1: If player has gold property
    if ('gold' in this.player) {
      return (this.player as any).gold;
    }

    // Option 2: Count gold items in inventory
    return this.player.inventory
      .filter(item => item.id === 'gold_coin')
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get formatted player class name
   */
  private getPlayerClassName(): string {
    const className = this.player.playerClass;
    return className.charAt(0).toUpperCase() + className.slice(1);
  }

  /**
   * Increment kill counter when monster dies
   */
  onMonsterKilled(): void {
    this.totalKills++;
  }
}

// ============================================================================
// EXAMPLE 3: Integration with Turn System
// ============================================================================

/**
 * Example of checking player death after each turn
 */
export class TurnSystemIntegrationExample {
  private scene!: Phaser.Scene;
  private player!: Player;
  private totalKills: number = 0;
  private currentFloor: number = 1;
  private lastMonsterAttacker: string = 'Unknown';

  /**
   * Execute player turn and check for death
   */
  executePlayerTurn(): void {
    // ... player actions ...

    // Check if player died this turn
    if (this.player.currentHp <= 0) {
      this.handlePlayerDeath();
    }
  }

  /**
   * Execute enemy turn and check for player death
   */
  executeEnemyTurn(enemyName: string): void {
    // Store last attacker
    this.lastMonsterAttacker = enemyName;

    // ... enemy attacks player ...

    // Check if player died this turn
    if (this.player.currentHp <= 0) {
      this.handlePlayerDeath();
    }
  }

  /**
   * Handle player death
   */
  private handlePlayerDeath(): void {
    const stats: GameOverStats = {
      level: this.player.level,
      kills: this.totalKills,
      floorsReached: this.currentFloor,
      gold: 0, // Calculate from player
      playerClass: this.player.playerClass,
      cause: `Killed by ${this.lastMonsterAttacker}`
    };

    // Show death animation, then game over
    this.showDeathAnimation(() => {
      this.scene.scene.start('GameOverScene', { stats });
    });
  }

  /**
   * Show death animation before game over
   */
  private showDeathAnimation(onComplete: () => void): void {
    // Flash red
    this.scene.cameras.main.flash(500, 255, 0, 0);
    
    // Shake camera
    this.scene.cameras.main.shake(300, 0.01);

    // After animation, show game over
    this.scene.time.delayedCall(800, onComplete);
  }
}

// ============================================================================
// EXAMPLE 4: Different Death Causes
// ============================================================================

export const DEATH_CAUSES = {
  // Combat deaths
  monsterKill: (monsterName: string) => `Slain by ${monsterName}`,
  criticalHit: (monsterName: string) => `Critical hit by ${monsterName}`,
  
  // Environmental deaths
  starvation: () => 'Died of starvation',
  poison: () => 'Succumbed to poison',
  drowning: () => 'Drowned in deep water',
  fire: () => 'Burned to death',
  
  // Trap deaths
  trapSpike: () => 'Impaled by spike trap',
  trapExplosion: () => 'Killed by explosive trap',
  trapPoison: () => 'Poisoned by dart trap',
  
  // Special deaths
  cursedItem: () => 'Killed by cursed artifact',
  suicide: () => 'Self-inflicted wounds',
  unknown: () => 'Mysterious circumstances'
};

/**
 * Example of using death cause helpers
 */
export function triggerGameOverWithCause(
  scene: Phaser.Scene,
  player: Player,
  causeType: keyof typeof DEATH_CAUSES,
  ...args: any[]
): void {
  const causeFunction = DEATH_CAUSES[causeType];
  const cause = typeof causeFunction === 'function' 
    ? causeFunction(...args) 
    : 'Unknown';

  const stats: GameOverStats = {
    level: player.level,
    kills: 0, // Get from game state
    floorsReached: 1, // Get from game state
    gold: 0, // Get from player
    playerClass: player.playerClass,
    cause: cause
  };

  scene.scene.start('GameOverScene', { stats });
}

// ============================================================================
// EXAMPLE 5: Testing/Debug Helper
// ============================================================================

/**
 * Quick function to test GameOverScene from console
 */
export function testGameOver(scene: Phaser.Scene): void {
  const stats: GameOverStats = {
    level: 7,
    kills: 84,
    floorsReached: 5,
    gold: 420,
    playerClass: 'Warrior',
    cause: 'Slain by Ancient Dragon'
  };

  scene.scene.start('GameOverScene', { stats });
}

/**
 * Test with minimal stats
 */
export function testGameOverMinimal(scene: Phaser.Scene): void {
  scene.scene.start('GameOverScene', {
    stats: {
      level: 1,
      kills: 0,
      floorsReached: 0,
      gold: 0,
      playerClass: 'Rogue',
      cause: 'Test death'
    }
  });
}

/**
 * Test with epic stats
 */
export function testGameOverEpic(scene: Phaser.Scene): void {
  scene.scene.start('GameOverScene', {
    stats: {
      level: 20,
      kills: 999,
      floorsReached: 10,
      gold: 9999,
      playerClass: 'Mage',
      cause: 'Defeated by Lich King'
    }
  });
}
