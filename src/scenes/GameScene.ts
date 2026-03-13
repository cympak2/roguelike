import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { CharacterClass } from '../config/class-data';
import { Player } from '../entities/player';
import { NPC, NPCType as EntityNPCType } from '../entities/npc';
import { Monster } from '../entities/monster';
import {
  getNPCDefinitionsForContext,
  NPCType as ConfigNPCType,
  type NPCDefinition,
} from '../config/npc-data';
import { GameMap, TileType, type Item as GroundItem } from '../world/map';
import { TownGenerator, type NPCSpawnPoint } from '../world/town-gen';
import { DungeonGenerator } from '../world/dungeon-gen';
import { fovSystem } from '../world/fov';
import { MessageLog, MessageType } from '../ui/message-log';
import { CombatSystem } from '../systems/combat-system';
import { MonsterSpawnSystem } from '../systems/monster-spawn-system';
import { ItemSpawnSystem } from '../systems/item-spawn-system';
import { MonsterAISystem, ActionType } from '../systems/monster-ai-system';

type DungeonGenerationMode = 'persistent' | 'regenerating';

interface DungeonFloorState {
  map: GameMap;
  monsters: Monster[];
  npcs: NPC[];
}

export class GameScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private player!: Player;
  private gameMap!: GameMap;
  private messageLog!: MessageLog;
  private npcs: NPC[] = []; // Store spawned NPCs
  private monsters: Monster[] = []; // Store spawned monsters
  private currentFloor: number = 0; // 0 = town
  private dungeonGenerationMode: DungeonGenerationMode = 'persistent';
  private dungeonFloorStates = new Map<number, DungeonFloorState>();

  // Idle power control
  private isLoopSleeping: boolean = false;
  private idleSleepTimer: number | null = null;
  private readonly idleSleepDelayMs: number = 120;

  // Game systems
  private combatSystem!: CombatSystem;
  private monsterSpawnSystem!: MonsterSpawnSystem;
  private itemSpawnSystem!: ItemSpawnSystem;
  private monsterAISystem!: MonsterAISystem;
  private pickupSelectionItems: GroundItem[] = [];
  private pickupSelectionIndex: number = 0;
  private pickupOverlay?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { selectedClass?: CharacterClass }): void {
    const playerClass = (data.selectedClass?.name.toLowerCase() || 'warrior') as 'warrior' | 'mage' | 'rogue';
    console.log('=== GAME INIT ===');
    console.log('Selected class:', playerClass);
    
    // Generate town
    const townGen = new TownGenerator();
    const townData = townGen.generate();
    this.gameMap = townData.map;
    console.log('Town generated:', this.gameMap.width, 'x', this.gameMap.height);
    
    this.spawnNPCsForTown(townData.npcs);
    console.log('Spawned', this.npcs.length, 'NPCs in town');
    
    // Find a safe spawn point - must be FLOOR type, not stairs, not near stairs
    let spawnX = 10, spawnY = 10; // Default fallback
    let foundSpawn = false;
    
    // Search for a safe floor tile
    searchLoop:
    for (let y = 5; y < this.gameMap.height - 5; y++) {
      for (let x = 5; x < this.gameMap.width - 5; x++) {
        const tile = this.gameMap.getTile(x, y);
        
        // Must be floor
        if (!tile || tile.type !== TileType.FLOOR) continue;
        if (this.gameMap.isBlocked(x, y)) continue;
        
        // Check 3x3 area around it - no stairs allowed
        let safe = true;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const checkTile = this.gameMap.getTile(x + dx, y + dy);
            if (checkTile && (checkTile.type === TileType.STAIRS_DOWN || checkTile.type === TileType.STAIRS_UP)) {
              safe = false;
              break;
            }
          }
          if (!safe) break;
        }
        
        if (safe) {
          spawnX = x;
          spawnY = y;
          foundSpawn = true;
          break searchLoop;
        }
      }
    }
    
    console.log('Spawn search result:', foundSpawn ? 'Found safe spawn' : 'Using fallback');
    console.log('Player spawn position:', spawnX, spawnY);
    
    // Create player
    this.player = new Player(spawnX, spawnY, playerClass);
    this.gameMap.addEntity(this.player);
    
    // Initialize message log
    this.messageLog = new MessageLog();
    this.messageLog.addMessage(`Welcome, ${data.selectedClass?.name || 'Warrior'}! Use arrow keys or WASD to move. Use < and > on stairs.`);
    
    console.log('Player created:', this.player.playerClass, 'at', this.player.x, this.player.y);
  }

  create(): void {
    console.log('=== GAME CREATE ===');
    
    // Black background
    this.add.rectangle(480, 240, 960, 480, 0x000000).setOrigin(0.5);

    // ASCII renderer (80x40 grid, 12x12 pixels per tile = 960x480)
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);
    console.log('ASCII renderer created');
    
    // Initialize game systems
    this.combatSystem = new CombatSystem(this.messageLog);
    this.monsterSpawnSystem = new MonsterSpawnSystem();
    this.itemSpawnSystem = new ItemSpawnSystem();
    this.monsterAISystem = new MonsterAISystem();
    console.log('Game systems initialized');

    // Use a global keydown listener so input can wake the game loop from idle sleep
    window.addEventListener('keydown', this.onWindowKeyDown, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupInputAndSleep();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.cleanupInputAndSleep();
    });
    console.log('Global keyboard input registered');

    // Setup visibility based on floor
    if (this.currentFloor === 0) {
      // Town: Full visibility (no FOV needed in safe zone)
      console.log('Town mode: enabling full visibility');
      let markedCount = 0;
      for (let y = 0; y < this.gameMap.height; y++) {
        for (let x = 0; x < this.gameMap.width; x++) {
          const tile = this.gameMap.getTile(x, y);
          if (tile) {
            tile.visible = true;
            tile.explored = true;
            markedCount++;
          }
        }
      }
      console.log('Full town visibility enabled:', markedCount, 'tiles');
    } else {
      // Dungeon: Use FOV system
      console.log('Dungeon mode: computing FOV at', this.player.x, this.player.y);
      const fovRadius = 8;
      fovSystem.compute(this.gameMap, this.player.x, this.player.y, fovRadius);
      
      // Count visible tiles
      let visibleCount = 0;
      let exploredCount = 0;
      for (let y = 0; y < this.gameMap.height; y++) {
        for (let x = 0; x < this.gameMap.width; x++) {
          const tile = this.gameMap.getTile(x, y);
          if (tile?.visible) visibleCount++;
          if (tile?.explored) exploredCount++;
        }
      }
      console.log('FOV computed:', exploredCount, 'explored,', visibleCount, 'visible');
    }

    // Initial render
    this.render();
    this.scheduleIdleSleep();
    console.log('=== GAME READY ===');
  }

  private cleanupInputAndSleep(): void {
    window.removeEventListener('keydown', this.onWindowKeyDown);
    this.clearIdleSleepTimer();
    this.wakeGameLoop();
    if (this.pickupOverlay) {
      this.pickupOverlay.destroy();
      this.pickupOverlay = undefined;
    }
  }

  private onWindowKeyDown = (event: KeyboardEvent): void => {
    if (!this.scene.isActive('GameScene')) {
      return;
    }

    if (this.isOverlaySceneActive()) {
      return;
    }

    if (this.isPickupSelectionActive()) {
      this.handlePickupSelectionKey(event.key);
      event.preventDefault();
      return;
    }

    const key = event.key.toLowerCase();
    const isHandledKey = (
      key === 'arrowup' ||
      key === 'arrowdown' ||
      key === 'arrowleft' ||
      key === 'arrowright' ||
      key === 'w' ||
      key === 'a' ||
      key === 's' ||
      key === 'd' ||
      key === 't' ||
      key === 'g' ||
      key === 'i' ||
      key === 'b' ||
      key === '<' ||
      key === '>'
    );

    if (!isHandledKey) {
      return;
    }

    event.preventDefault();
    this.wakeGameLoop();
    this.handleKeyPress(event.key);
  };

  private isOverlaySceneActive(): boolean {
    return (
      this.scene.isActive('DialogueScene') ||
      this.scene.isActive('InventoryScene') ||
      this.scene.isActive('MainMenuScene') ||
      this.scene.isActive('GameOverScene')
    );
  }

  private clearIdleSleepTimer(): void {
    if (this.idleSleepTimer !== null) {
      window.clearTimeout(this.idleSleepTimer);
      this.idleSleepTimer = null;
    }
  }

  private scheduleIdleSleep(): void {
    if (!this.scene.isActive('GameScene') || this.isOverlaySceneActive()) {
      return;
    }

    this.clearIdleSleepTimer();
    this.idleSleepTimer = window.setTimeout(() => {
      this.enterIdleSleep();
    }, this.idleSleepDelayMs);
  }

  private enterIdleSleep(): void {
    this.idleSleepTimer = null;

    if (this.isLoopSleeping) {
      return;
    }

    if (!this.scene.isActive('GameScene') || this.isOverlaySceneActive()) {
      return;
    }

    this.isLoopSleeping = true;
    this.game.loop.sleep();
  }

  private wakeGameLoop(): void {
    this.clearIdleSleepTimer();

    if (!this.isLoopSleeping) {
      return;
    }

    this.isLoopSleeping = false;
    this.game.loop.wake();
  }

  private handleKeyPress(key: string): void {
    let dx = 0, dy = 0;

    // Map keys to movement
    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        dy = -1;
        break;
      case 'arrowdown':
      case 's':
        dy = 1;
        break;
      case 'arrowleft':
      case 'a':
        dx = -1;
        break;
      case 'arrowright':
      case 'd':
        dx = 1;
        break;
      case 't':
        this.tryTalkToNPC();
        return;
      case 'g':
        this.tryPickupFromCurrentTile();
        return;
      case 'i':
        this.openInventory();
        return;
      case 'b':
        this.tryBreakStickFromNearbyTree();
        return;
      case '<':
        this.tryUseStairs('up');
        return;
      case '>':
        this.tryUseStairs('down');
        return;
      default:
        return; // Ignore other keys
    }

    console.log('Key pressed:', key, '→ movement:', dx, dy);
    this.tryMove(dx, dy);
  }

  private tryMove(dx: number, dy: number): void {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    console.log('Trying to move from', this.player.x, this.player.y, 'to', newX, newY);

    // Check bounds
    if (!this.gameMap.isInBounds(newX, newY)) {
      this.messageLog.addMessage('Blocked!', MessageType.SYSTEM);
      this.render();
      console.log('Out of bounds');
      return;
    }

    // Check if blocked
    if (this.gameMap.isBlocked(newX, newY)) {
      const tile = this.gameMap.getTile(newX, newY);
      
      // Check if there's a monster at target location - ATTACK IT!
      const monster = this.monsters.find(m => m.x === newX && m.y === newY && !m.isDead());
      if (monster) {
        console.log('Attacking monster:', monster.name);
        const result = this.combatSystem.meleeAttack(this.player, monster);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        
        // Handle monster death
          if (result.killed && monster.isDead()) {
            console.log('Monster killed:', monster.name);
            this.combatSystem.handleDeath(monster, this.gameMap);
            this.gameMap.removeEntity(monster);
            this.monsterAISystem.cleanupMonster(monster);
            
            // Award XP to player
            if (monster.xpReward) {
            this.player.gainXP(monster.xpReward);
            this.messageLog.addMessage(`You gain ${monster.xpReward} XP!`, MessageType.SYSTEM);
          }
        }
        
        // Monster attacked, so process monster turns
        this.processTurn();
        return;
      }
      
      // Try to open doors
      if (tile && tile.type === TileType.DOOR_CLOSED) {
        tile.type = TileType.DOOR_OPEN;
        tile.blocked = false;
        this.messageLog.addMessage('You open the door.', MessageType.SYSTEM);
        console.log('Opened door at', newX, newY);
        this.render();
      } else if (tile && tile.type === TileType.TREE) {
        this.messageLog.addMessage('A tree blocks your path. Press B near it to break a stick.', MessageType.SYSTEM);
      } else {
        this.messageLog.addMessage('Blocked!', MessageType.SYSTEM);
        console.log('Blocked by', tile?.type);
      }
      this.render();
      return;
    }

    // Check destination tile
    const tile = this.gameMap.getTile(newX, newY);
    if (!tile) {
      console.log('No tile at destination');
      return;
    }

    // Move player
    this.player.setPosition(newX, newY);
    console.log('Player moved to', newX, newY);

    this.autoCollectGoldAt(newX, newY);
    
    // Check for items at new position
    const items = this.getNonGoldItemsAt(newX, newY);
    if (items.length > 0) {
      const itemNames = items.map(item => item.name).join(', ');
      this.messageLog.addMessage(`You see: ${itemNames}`, MessageType.SYSTEM);
      console.log('Items at position:', itemNames);
    }
    
    // Update FOV (town doesn't need FOV recalculation since all tiles are always visible)
    if (this.currentFloor > 0) {
      // Failsafe: Mark 3 squares around player as EXPLORED (memory map)
      // Don't set visible - let FOV system control that for proper wall blocking
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const tile = this.gameMap.getTile(newX + dx, newY + dy);
          if (tile) {
            tile.explored = true; // Memory map only
            // Don't set visible here - FOV will do that
          }
        }
      }
      
      // Dungeon: recompute FOV from new position with larger radius
      const fovRadius = 10;
      fovSystem.compute(this.gameMap, newX, newY, fovRadius);
    }
    
    // Process monster turns after player movement
    this.processTurn();
  }

  private tryUseStairs(direction: 'up' | 'down'): void {
    const tile = this.gameMap.getTile(this.player.x, this.player.y);
    if (!tile) return;

    if (direction === 'up') {
      if (tile.type !== TileType.STAIRS_UP) {
        this.messageLog.addMessage('You are not standing on up stairs (<).', MessageType.SYSTEM);
        this.render();
        return;
      }
      this.goUpStairs();
      return;
    }

    if (tile.type !== TileType.STAIRS_DOWN) {
      this.messageLog.addMessage('You are not standing on down stairs (>).', MessageType.SYSTEM);
      this.render();
      return;
    }
    this.goDownStairs();
  }

  private tryBreakStickFromNearbyTree(): void {
    const treePositions = [
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x - 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x, y: this.player.y - 1 },
    ];

    const treePos = treePositions.find((pos) => this.gameMap.getTile(pos.x, pos.y)?.type === TileType.TREE);
    if (!treePos) {
      this.messageLog.addMessage('No tree nearby to break a stick from.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const stickItem = {
      id: 'weapon_stick',
      name: 'Stick',
      type: 'weapon' as const,
      quantity: 1,
      rarity: 'common' as const,
    };

    if (!this.player.addItem(stickItem)) {
      this.messageLog.addMessage('Your inventory is full. Clear space to take the stick.', MessageType.SYSTEM);
      this.render();
      return;
    }

    this.gameMap.setTile(treePos.x, treePos.y, TileType.GRASS, false, false);
    const newGrassTile = this.gameMap.getTile(treePos.x, treePos.y);
    if (newGrassTile) {
      newGrassTile.explored = true;
      newGrassTile.visible = this.currentFloor === 0;
    }
    this.messageLog.addMessage('You break off a sturdy stick. It can be equipped as a weapon.', MessageType.SYSTEM);
    this.render();
  }
  
  private processTurn(): void {
    // Clean up dead monsters
    this.monsters = this.monsters.filter(m => !m.isDead());
    
    // Only process monster turns in dungeons
    if (this.currentFloor === 0) {
      this.render();
      return;
    }
    
    // Let monsters act
    for (const monster of this.monsters) {
      if (monster.isDead()) continue;

      const action = this.monsterAISystem.updateMonsterAI(
        monster,
        this.player,
        this.gameMap,
        this.monsters
      );
      this.executeMonsterAction(monster, action);

      if (monster.isDead()) {
        this.monsterAISystem.cleanupMonster(monster);
      }

      if (this.player.isDead()) {
        this.handlePlayerDeath();
        return;
      }
    }
    
    // Render after all monsters have acted
    this.render();
  }

  private executeMonsterAction(monster: Monster, action: { type: ActionType; targetX?: number; targetY?: number }): void {
    switch (action.type) {
      case ActionType.MELEE_ATTACK: {
        const result = this.combatSystem.meleeAttack(monster, this.player);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        break;
      }
      case ActionType.RANGED_ATTACK: {
        const dx = this.player.x - monster.x;
        const dy = this.player.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const result = this.combatSystem.rangedAttack(monster, this.player, distance);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        break;
      }
      case ActionType.MOVE:
      case ActionType.FLEE: {
        if (action.targetX === undefined || action.targetY === undefined) {
          return;
        }

        if (!this.gameMap.isInBounds(action.targetX, action.targetY)) {
          return;
        }

        const tile = this.gameMap.getTile(action.targetX, action.targetY);
        if (!tile || tile.blocked) {
          return;
        }

        const occupiedByMonster = this.monsters.some(
          (other) => other !== monster && !other.isDead() && other.x === action.targetX && other.y === action.targetY
        );
        const occupiedByPlayer = this.player.x === action.targetX && this.player.y === action.targetY;
        if (occupiedByMonster || occupiedByPlayer) {
          return;
        }

        monster.setPosition(action.targetX, action.targetY);
        break;
      }
      case ActionType.SPECIAL_ABILITY:
      case ActionType.WAIT:
      default:
        break;
    }
  }

  private handlePlayerDeath(): void {
    this.messageLog.addMessage('You have died!', MessageType.COMBAT);
    console.log('Player died!');
    this.scene.start('GameOverScene', {
      finalLevel: this.currentFloor,
      finalXP: this.player.xp,
    });
  }

  private tryTalkToNPC(): void {
    // Find NPCs within interaction range (adjacent tiles)
    for (const npc of this.npcs) {
      const dx = Math.abs(this.player.x - npc.x);
      const dy = Math.abs(this.player.y - npc.y);
      
      // Use Chebyshev distance (max) to allow diagonal interaction
      const distance = Math.max(dx, dy);
      
      if (distance <= 1) {
        console.log('Talking to', npc.name);
        this.messageLog.addMessage(`You talk to ${npc.name}.`, MessageType.SYSTEM);
        
        // Launch DialogueScene with NPC object
        this.scene.launch('DialogueScene', { npc: npc });
        this.scene.pause('GameScene');
        return;
      }
    }
    
    // No NPC nearby
    this.messageLog.addMessage('No one nearby to talk to.', MessageType.SYSTEM);
  }

  private openInventory(): void {
    this.scene.launch('InventoryScene', {
      player: this.player,
      gameMap: this.gameMap,
      onInventoryChanged: () => this.render(),
    });
    this.scene.pause('GameScene');
  }

  private tryPickupFromCurrentTile(): void {
    const items = this.getNonGoldItemsAt(this.player.x, this.player.y);
    if (items.length === 0) {
      this.messageLog.addMessage('There are no items here to pick up.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (items.length === 1) {
      this.pickupSingleItem(items[0]);
      this.processTurn();
      return;
    }

    this.openPickupSelection(items);
  }

  private pickupSingleItem(item: GroundItem): void {
    const inventoryItem = this.toInventoryItem(item);
    if (!this.player.addItem(inventoryItem)) {
      this.messageLog.addMessage('Inventory is full.', MessageType.SYSTEM);
      return;
    }

    this.gameMap.removeItem(item);
    this.messageLog.addMessage(`Picked up ${inventoryItem.name}.`, MessageType.SYSTEM);
  }

  private toInventoryItem(item: GroundItem): {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'potion' | 'misc';
    quantity: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  } {
    return {
      id: item.id,
      name: item.name,
      type: item.inventoryType ?? 'misc',
      quantity: item.quantity ?? 1,
      rarity: item.rarity ?? 'common',
    };
  }

  private autoCollectGoldAt(x: number, y: number): void {
    const itemsAtTile = this.gameMap.getItemsAt(x, y);
    const goldItems = itemsAtTile.filter((item) => item.isGold || item.id === 'misc_gold');
    if (goldItems.length === 0) {
      return;
    }

    let collectedGold = 0n;
    for (const goldItem of goldItems) {
      const amount = goldItem.goldAmount ?? goldItem.quantity ?? 1;
      collectedGold += BigInt(Math.max(0, Math.floor(amount)));
      this.gameMap.removeItem(goldItem);
    }

    if (collectedGold > 0n) {
      this.player.addGold(collectedGold);
      this.messageLog.addMessage(`Collected ${collectedGold.toString()} gold.`, MessageType.SYSTEM);
    }
  }

  private getNonGoldItemsAt(x: number, y: number): GroundItem[] {
    return this.gameMap.getItemsAt(x, y).filter((item) => !item.isGold && item.id !== 'misc_gold');
  }

  private isPickupSelectionActive(): boolean {
    return this.pickupSelectionItems.length > 0;
  }

  private openPickupSelection(items: GroundItem[]): void {
    this.pickupSelectionItems = items;
    this.pickupSelectionIndex = 0;
    this.drawPickupSelectionOverlay();
  }

  private closePickupSelection(): void {
    this.pickupSelectionItems = [];
    this.pickupSelectionIndex = 0;
    if (this.pickupOverlay) {
      this.pickupOverlay.destroy();
      this.pickupOverlay = undefined;
    }
    this.render();
  }

  private handlePickupSelectionKey(key: string): void {
    if (!this.isPickupSelectionActive()) {
      return;
    }

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.pickupSelectionIndex = Math.max(0, this.pickupSelectionIndex - 1);
        this.drawPickupSelectionOverlay();
        break;
      case 'arrowdown':
      case 's':
        this.pickupSelectionIndex = Math.min(
          this.pickupSelectionItems.length - 1,
          this.pickupSelectionIndex + 1
        );
        this.drawPickupSelectionOverlay();
        break;
      case 'enter': {
        const selected = this.pickupSelectionItems[this.pickupSelectionIndex];
        this.closePickupSelection();
        this.pickupSingleItem(selected);
        this.processTurn();
        break;
      }
      case 'escape':
        this.closePickupSelection();
        break;
      default:
        break;
    }
  }

  private drawPickupSelectionOverlay(): void {
    if (this.pickupOverlay) {
      this.pickupOverlay.destroy();
    }

    const lines = ['Choose item to pick up:'];
    for (let i = 0; i < this.pickupSelectionItems.length; i++) {
      const item = this.pickupSelectionItems[i];
      const marker = i === this.pickupSelectionIndex ? '>' : ' ';
      lines.push(`${marker} ${item.name}`);
    }
    lines.push('');
    lines.push('Up/Down: select  Enter: pick  Esc: cancel');

    this.pickupOverlay = this.add.text(16, 40, lines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 8 },
    });
    this.pickupOverlay.setDepth(1000);
  }

  private spawnNPCsForTown(spawnPoints: NPCSpawnPoint[]): void {
    this.npcs = [];
    const allowedTownNPCs = new Map(
      getNPCDefinitionsForContext('town', this.currentFloor).map((npcDef) => [npcDef.id, npcDef])
    );

    for (const spawnPoint of spawnPoints) {
      const npcDef = allowedTownNPCs.get(spawnPoint.npcId);
      if (!npcDef) {
        continue;
      }

      const spawnPos = this.findNearestValidNPCTile(spawnPoint.x, spawnPoint.y, 6);
      if (!spawnPos) {
        console.warn(`No valid town spawn tile for NPC ${npcDef.id}`);
        continue;
      }

      const npc = this.createNPCFromDefinition(npcDef, spawnPos.x, spawnPos.y, spawnPoint.name);
      this.npcs.push(npc);
      this.gameMap.addEntity(npc);
    }
  }

  private spawnNPCsForDungeon(floor: number): void {
    this.npcs = [];
    const dungeonNPCs = getNPCDefinitionsForContext('dungeon', floor);
    if (dungeonNPCs.length === 0) {
      return;
    }

    const validTiles: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < this.gameMap.height - 1; y++) {
      for (let x = 1; x < this.gameMap.width - 1; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile && tile.type === TileType.FLOOR && this.isNPCSpawnTileValid(x, y)) {
          validTiles.push({ x, y });
        }
      }
    }

    for (const npcDef of dungeonNPCs) {
      if (validTiles.length === 0) {
        console.warn(`No valid dungeon spawn tile left for NPC ${npcDef.id}`);
        break;
      }

      const idx = Math.floor(Math.random() * validTiles.length);
      const location = validTiles[idx];
      validTiles.splice(idx, 1);

      const npc = this.createNPCFromDefinition(npcDef, location.x, location.y);
      this.npcs.push(npc);
      this.gameMap.addEntity(npc);
    }
  }

  private createNPCFromDefinition(
    npcDef: NPCDefinition,
    x: number,
    y: number,
    fallbackName?: string
  ): NPC {
    const npc = new NPC(
      x,
      y,
      fallbackName ?? npcDef.name,
      npcDef.glyph,
      npcDef.color,
      this.mapConfigNPCTypeToEntityNPCType(npcDef.type),
      'start'
    );

    const dialogueNodes = npcDef.dialogue.map((dialogue) => ({
      id: dialogue.id,
      text: dialogue.text,
      options: dialogue.options.map((option) => ({
        id: option.text.substring(0, 20),
        text: option.text,
        nextDialogueId: option.nextDialogueId,
        action: option.action ? () => console.log('Action:', option.action) : undefined,
      })),
    }));
    npc.addDialogues(dialogueNodes);

    return npc;
  }

  private findNearestValidNPCTile(
    startX: number,
    startY: number,
    maxRadius: number
  ): { x: number; y: number } | null {
    if (this.isNPCSpawnTileValid(startX, startY)) {
      return { x: startX, y: startY };
    }

    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          const x = startX + dx;
          const y = startY + dy;
          if (this.isNPCSpawnTileValid(x, y)) {
            return { x, y };
          }
        }
      }
    }

    return null;
  }

  private isNPCSpawnTileValid(x: number, y: number): boolean {
    if (!this.gameMap.isInBounds(x, y)) {
      return false;
    }

    const tile = this.gameMap.getTile(x, y);
    if (!tile || tile.blocked) {
      return false;
    }

    return this.gameMap.getEntityAt(x, y) === null;
  }

  private mapConfigNPCTypeToEntityNPCType(type: ConfigNPCType): EntityNPCType {
    switch (type) {
      case ConfigNPCType.MERCHANT:
        return EntityNPCType.MERCHANT;
      case ConfigNPCType.QUESTGIVER:
        return EntityNPCType.QUESTGIVER;
      case ConfigNPCType.HEALER:
        return EntityNPCType.HEALER;
      case ConfigNPCType.SAGE:
        return EntityNPCType.SAGE;
      case ConfigNPCType.GUARD:
        return EntityNPCType.GUARD;
      case ConfigNPCType.INNKEEPER:
      default:
        return EntityNPCType.GENERIC;
    }
  }

  private findSafeSpawnNear(startX: number, startY: number, maxRadius: number): { x: number; y: number } {
    // Try the starting position first
    const startTile = this.gameMap.getTile(startX, startY);
    if (startTile && startTile.type === TileType.FLOOR && !startTile.blocked) {
      return { x: startX, y: startY };
    }
    
    // Search in expanding radius
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          // Only check tiles at current radius (not already checked)
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const checkX = startX + dx;
          const checkY = startY + dy;
          const tile = this.gameMap.getTile(checkX, checkY);
          
          if (tile && tile.type === TileType.FLOOR && !tile.blocked) {
            console.log(`Found safe spawn at (${checkX}, ${checkY}) - ${radius} tiles from stairs`);
            return { x: checkX, y: checkY };
          }
        }
      }
    }
    
    // Fallback: return original position (should never happen in valid dungeon)
    console.warn('No safe spawn found! Using original position');
    return { x: startX, y: startY };
  }

  private findStairPosition(type: TileType): { x: number; y: number } | null {
    for (let y = 1; y < this.gameMap.height - 1; y++) {
      for (let x = 1; x < this.gameMap.width - 1; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile?.type === type) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private cacheCurrentDungeonFloorState(): void {
    if (this.currentFloor <= 0 || this.dungeonGenerationMode !== 'persistent') {
      return;
    }

    this.gameMap.removeEntity(this.player);
    this.monsters = this.monsters.filter((monster) => !monster.isDead());
    this.dungeonFloorStates.set(this.currentFloor, {
      map: this.gameMap,
      monsters: [...this.monsters],
      npcs: [...this.npcs],
    });
  }

  private rebuildFloorEntitiesFromMap(): void {
    this.monsters = [];
    this.npcs = [];

    for (const entity of this.gameMap.entities) {
      if (entity === this.player) {
        continue;
      }

      if (entity instanceof Monster) {
        if (entity.isDead()) {
          this.gameMap.removeEntity(entity);
          continue;
        }
        this.monsters.push(entity);
        continue;
      }

      if (entity instanceof NPC) {
        this.npcs.push(entity);
      }
    }
  }

  private markDungeonSpawnAreaExplored(spawnX: number, spawnY: number): void {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tile = this.gameMap.getTile(spawnX + dx, spawnY + dy);
        if (tile) {
          tile.explored = true;
        }
      }
    }
  }

  private enterDungeonFloor(targetFloor: number, entryStairType: TileType): void {
    this.currentFloor = targetFloor;
    const cachedState =
      this.dungeonGenerationMode === 'persistent' ? this.dungeonFloorStates.get(targetFloor) : undefined;

    if (cachedState) {
      this.gameMap = cachedState.map;
      this.rebuildFloorEntitiesFromMap();
    } else {
      const dungeonGen = new DungeonGenerator();
      this.gameMap = dungeonGen.generate(targetFloor, 80, 40);
      this.monsters = this.monsterSpawnSystem.spawnMonstersInDungeon(this.gameMap, targetFloor);
      this.itemSpawnSystem.spawnItemsInDungeon(this.gameMap, targetFloor);
      this.spawnNPCsForDungeon(targetFloor);
    }

    const stairPos = this.findStairPosition(entryStairType) ?? { x: 40, y: 20 };
    const safeSpawn = this.findSafeSpawnNear(stairPos.x, stairPos.y, 10);
    this.player.setPosition(safeSpawn.x, safeSpawn.y);
    this.gameMap.addEntity(this.player);

    if (cachedState) {
      const respawned = this.monsterSpawnSystem.respawnNonBossMonstersToMinimum(
        this.gameMap,
        targetFloor,
        this.monsters,
        { x: safeSpawn.x, y: safeSpawn.y, radius: 4 }
      );
      if (respawned.length > 0) {
        this.monsters.push(...respawned);
        this.messageLog.addMessage(
          `${respawned.length} monsters have repopulated this floor.`,
          MessageType.SYSTEM
        );
      }
    }

    if (this.dungeonGenerationMode === 'persistent') {
      this.dungeonFloorStates.set(targetFloor, {
        map: this.gameMap,
        monsters: [...this.monsters],
        npcs: [...this.npcs],
      });
    }

    this.markDungeonSpawnAreaExplored(safeSpawn.x, safeSpawn.y);
    fovSystem.compute(this.gameMap, safeSpawn.x, safeSpawn.y, 10);
    this.render();
  }

  private goDownStairs(): void {
    this.cacheCurrentDungeonFloorState();
    const targetFloor = this.currentFloor + 1;
    console.log('=== DESCENDING TO FLOOR', targetFloor, '===');
    this.messageLog.addMessage(`Descending to dungeon level ${targetFloor}...`, MessageType.SYSTEM);
    this.enterDungeonFloor(targetFloor, TileType.STAIRS_UP);
    console.log('=== FLOOR', targetFloor, 'READY ===');
  }

  private goUpStairs(): void {
    if (this.currentFloor === 1) {
      this.cacheCurrentDungeonFloorState();
      this.currentFloor = 0;
      console.log('=== RETURNING TO TOWN ===');
      this.messageLog.addMessage('Returning to town...', MessageType.SYSTEM);
      
      // Clear monsters when returning to town
      this.monsters = [];
      
      const townGen = new TownGenerator();
      const townData = townGen.generate();
      this.gameMap = townData.map;
      
      this.spawnNPCsForTown(townData.npcs);
      console.log('Respawned', this.npcs.length, 'NPCs in town');

      // Return the player to the town dungeon entrance (stairs down)
      let returnX = 19;
      let returnY = 36;
      let foundEntrance = false;
      for (let y = 1; y < this.gameMap.height - 1; y++) {
        for (let x = 1; x < this.gameMap.width - 1; x++) {
          const tile = this.gameMap.getTile(x, y);
          if (tile?.type === TileType.STAIRS_DOWN) {
            returnX = x;
            returnY = y;
            foundEntrance = true;
            break;
          }
        }
        if (foundEntrance) break;
      }

      this.player.setPosition(returnX, returnY);
      this.gameMap.addEntity(this.player);
      
      // Town: Enable full visibility
      console.log('Town mode: enabling full visibility');
      for (let y = 0; y < this.gameMap.height; y++) {
        for (let x = 0; x < this.gameMap.width; x++) {
          const tile = this.gameMap.getTile(x, y);
          if (tile) {
            tile.visible = true;
            tile.explored = true;
          }
        }
      }
      
      this.render();
    } else if (this.currentFloor > 1) {
      this.cacheCurrentDungeonFloorState();
      const targetFloor = this.currentFloor - 1;
      console.log('=== ASCENDING TO FLOOR', targetFloor, '===');
      this.messageLog.addMessage(`Ascending to dungeon level ${targetFloor}...`, MessageType.SYSTEM);
      this.enterDungeonFloor(targetFloor, TileType.STAIRS_DOWN);
    }
  }

  private render(): void {
    this.asciiRenderer.clear();

    // Render tiles
    let renderedCount = 0;
    for (let y = 0; y < Math.min(40, this.gameMap.height); y++) {
      for (let x = 0; x < Math.min(80, this.gameMap.width); x++) {
        const tile = this.gameMap.getTile(x, y);
        if (!tile || !tile.explored) continue;

        renderedCount++;
        let glyph = '.';
        let color = 0x666666;

        switch (tile.type) {
          case TileType.WALL:
            glyph = '#';
            color = tile.visible ? 0xaaaaaa : 0x555555;
            break;
          case TileType.FLOOR:
            glyph = '.';
            color = tile.visible ? 0x888888 : 0x444444;
            break;
          case TileType.DOOR_CLOSED:
            glyph = '+';
            color = tile.visible ? 0xaa8844 : 0x664422;
            break;
          case TileType.DOOR_OPEN:
            glyph = '/';
            color = tile.visible ? 0xaa8844 : 0x664422;
            break;
          case TileType.STAIRS_DOWN:
            glyph = '>';
            color = 0xffff00;
            break;
          case TileType.STAIRS_UP:
            glyph = '<';
            color = 0xffff00;
            break;
          case TileType.WATER:
            glyph = '~';
            color = tile.visible ? 0x0088ff : 0x004488;
            break;
          case TileType.GRASS:
            glyph = ',';
            color = tile.visible ? 0x44aa44 : 0x226622;
            break;
          case TileType.TREE:
            glyph = 'T';
            color = tile.visible ? 0x228b22 : 0x114411;
            break;
          case TileType.STONE:
            glyph = '*';
            color = tile.visible ? 0x888888 : 0x444444;
            break;
        }

        this.asciiRenderer.drawTile(x, y, glyph, color);
      }
    }

    console.log('Rendered', renderedCount, 'tiles');

    // Render items FIRST (so they appear on ground, visible when no entity is on them)
    const items = this.gameMap.items;
    let itemsRendered = 0;
    for (const item of items) {
      const tile = this.gameMap.getTile(item.x, item.y);
      if (tile && tile.visible) {
        // Always render items if tile is visible
        this.asciiRenderer.drawTile(item.x, item.y, item.glyph, item.color);
        itemsRendered++;
      }
    }
    if (itemsRendered > 0) {
      console.log(`Rendered ${itemsRendered} items`);
    }

    // Render NPCs (on top of items)
    for (const npc of this.npcs) {
      const tile = this.gameMap.getTile(npc.x, npc.y);
      if (tile && tile.explored) {
        // Dim the NPC color if not visible
        const color = tile.visible ? npc.color : (npc.color >> 1) & 0x7f7f7f;
        this.asciiRenderer.drawTile(npc.x, npc.y, npc.glyph, color);
      }
    }
    
    // Render monsters (on top of items)
    for (const monster of this.monsters) {
      if (monster.isDead()) continue;
      
      const tile = this.gameMap.getTile(monster.x, monster.y);
      if (tile && tile.visible) {
        // Only render monsters that are currently visible
        this.asciiRenderer.drawTile(monster.x, monster.y, monster.glyph, monster.color);
      }
    }

    // Render player
    this.asciiRenderer.drawTile(this.player.x, this.player.y, '@', 0xffffff);

    // Render HUD (top line)
    const status = `${this.player.playerClass.toUpperCase()} Lv${this.player.level} | HP: ${this.player.currentHP}/${this.player.maxHP} | XP: ${this.player.xp} | Gold: ${this.player.getGoldString()} | Floor: ${this.currentFloor === 0 ? 'Town' : this.currentFloor}`;
    this.asciiRenderer.drawText(1, 0, status, 0xffff00);

    // Render messages (bottom 3 lines)
    const msgs = this.messageLog.getMessages(3);
    for (let i = 0; i < msgs.length; i++) {
      this.asciiRenderer.drawText(1, 37 + i, msgs[msgs.length - 1 - i].text.substring(0, 78), 0x00ff00);
    }

    // Controls hint
    this.asciiRenderer.drawText(
      1,
      1,
      'Move: Arrows/WASD | G pickup | I inv | T talk | B stick | </> stairs',
      0xaaaaaa
    );

    // No animations are running: sleep loop shortly after each completed render.
    this.scheduleIdleSleep();
  }
}
