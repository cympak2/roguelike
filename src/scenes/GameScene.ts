import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { CharacterClass } from '../config/class-data';
import { Player } from '../entities/player';
import { NPC, NPCType as EntityNPCType } from '../entities/npc';
import { Monster, AIBehavior } from '../entities/monster';
import {
  getNPCDefinitionsForContext,
  NPCS,
  NPCType as ConfigNPCType,
  type NPCDefinition,
} from '../config/npc-data';
import { GameMap, TileType, type Item as GroundItem, type Trap } from '../world/map';
import { TownGenerator, type NPCSpawnPoint } from '../world/town-gen';
import { DungeonGenerator } from '../world/dungeon-gen';
import { fovSystem } from '../world/fov';
import { MessageLog, MessageType } from '../ui/message-log';
import { CombatSystem, type Spell } from '../systems/combat-system';
import { MonsterSpawnSystem } from '../systems/monster-spawn-system';
import { ItemSpawnSystem } from '../systems/item-spawn-system';
import { MonsterAISystem, ActionType } from '../systems/monster-ai-system';
import { NoiseSystem } from '../systems/noise-system';
import { ITEMS, ItemType, type ItemDefinition, type Weapon } from '../config/item-data';
import {
  QUEST_DEFINITIONS,
  getQuestIdsForNpc,
  isQuestUnlocked,
  type QuestCompletionRule,
  type QuestDefinition,
  type QuestReward,
} from '../config/quest-data';
import { getMonsterTemplate, type MonsterPhaseDefinition } from '../config/monster-data';
import { ensureDurability, getMissingDurability } from '../utils/durability';
import type { PlayerStatusEffectType, PlayerStatusTickEvent } from '../types/status-effects';

type DungeonGenerationMode = 'persistent' | 'regenerating';

interface DungeonFloorState {
  map: GameMap;
  monsters: Monster[];
  npcs: NPC[];
}

interface AltarStatDelta {
  attack?: number;
  defense?: number;
  maxHP?: number;
  maxMana?: number;
  magicPower?: number;
}

interface AltarEffect {
  id: string;
  name: string;
  description: string;
  delta: AltarStatDelta;
}

interface ActiveAltarPact {
  floor: number;
  boon: AltarEffect;
  curse: AltarEffect;
  appliedDelta: AltarStatDelta;
}

interface CraftingIngredient {
  itemId: string;
  quantity: number;
}

interface BlacksmithRecipe {
  ingredients: CraftingIngredient[];
  resultItemId: string;
  resultQuantity?: number;
  successMessage: string;
}

interface CorpseInventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'misc';
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  corpseSourceId?: string;
  corpseCursed?: boolean;
  corpseEdible?: boolean;
  corpseCooked?: boolean;
  corpseSeasoned?: boolean;
  affixAttackBonus?: number;
  affixCritChanceBonus?: number;
  affixMagicResistBonus?: number;
}

interface InventoryChangeContext {
  itemId?: string;
  itemEffect?: string;
  phase?: 'before_use' | 'after_use';
}

interface RunAnalytics {
  kills: number;
  damageDealt: number;
  maxDepthReached: number;
  causeOfDeath: string;
  buildUsed: string;
}

const ALTAR_BOONS: AltarEffect[] = [
  {
    id: 'boon_might',
    name: 'Blessing of Might',
    description: '+3 attack',
    delta: { attack: 3 },
  },
  {
    id: 'boon_warding',
    name: 'Blessing of Warding',
    description: '+2 defense',
    delta: { defense: 2 },
  },
  {
    id: 'boon_vitality',
    name: 'Blessing of Vitality',
    description: '+12 max HP',
    delta: { maxHP: 12 },
  },
  {
    id: 'boon_sorcery',
    name: 'Blessing of Sorcery',
    description: '+3 magic power, +8 max mana',
    delta: { magicPower: 3, maxMana: 8 },
  },
];

const ALTAR_CURSES: AltarEffect[] = [
  {
    id: 'curse_weakness',
    name: 'Curse of Weakness',
    description: '-2 attack',
    delta: { attack: -2 },
  },
  {
    id: 'curse_frailty',
    name: 'Curse of Frailty',
    description: '-2 defense',
    delta: { defense: -2 },
  },
  {
    id: 'curse_withering',
    name: 'Curse of Withering',
    description: '-10 max HP',
    delta: { maxHP: -10 },
  },
  {
    id: 'curse_drain',
    name: 'Curse of Arcane Drain',
    description: '-1 magic power, -6 max mana',
    delta: { magicPower: -1, maxMana: -6 },
  },
];

const HEAL_PLAYER_COST = 0;
const REPAIR_COST_PER_DURABILITY = 1;
const NOISE_BUDGET = {
  PLAYER_MOVE: { loudness: 2, radius: 7 },
  PLAYER_MELEE: { loudness: 7, radius: 14 },
  PLAYER_RANGED: { loudness: 8, radius: 16 },
  PLAYER_INTERACT: { loudness: 3, radius: 9 },
  PLAYER_PICKUP: { loudness: 2, radius: 6 },
  PLAYER_USE_ITEM: { loudness: 3, radius: 8 },
  PLAYER_DOOR: { loudness: 4, radius: 10 },
  PLAYER_TRAP: { loudness: 6, radius: 12 },
  MONSTER_MOVE: { loudness: 2, radius: 6 },
  MONSTER_MELEE: { loudness: 6, radius: 12 },
  MONSTER_RANGED: { loudness: 7, radius: 14 },
  MONSTER_SPECIAL: { loudness: 7, radius: 14 },
} as const;
const HIGH_NOISE_THRESHOLD = 6;
const RAW_CORPSE_HEAL_RATIO = 0.15;
const COOKED_CORPSE_HEAL_RATIO = 0.3;
const SEASONED_BONUS_HEAL_RATIO = 0.12;
const BLACKSMITH_RECIPES: Record<string, BlacksmithRecipe> = {
  craft_venomcloak: {
    ingredients: [
      { itemId: 'misc_spider_silk', quantity: 3 },
      { itemId: 'misc_poison_fang', quantity: 1 },
    ],
    resultItemId: 'armor_cloak',
    successMessage: 'Hilda weaves a Venomcloak from your materials.',
  },
  craft_bonebound_mail: {
    ingredients: [
      { itemId: 'misc_troll_hide', quantity: 2 },
      { itemId: 'misc_bone_fragment', quantity: 2 },
    ],
    resultItemId: 'armor_chain_mail',
    successMessage: 'Hilda reforges the scraps into sturdy Bonebound Mail.',
  },
  craft_soul_lens: {
    ingredients: [
      { itemId: 'misc_soul_fragment', quantity: 1 },
      { itemId: 'misc_xp_crystal', quantity: 1 },
    ],
    resultItemId: 'scroll_identify',
    successMessage: 'Hilda stabilizes the essence into a Scroll of Identify.',
  },
  craft_enchanting_sigil: {
    ingredients: [
      { itemId: 'misc_stolen_ring', quantity: 1 },
      { itemId: 'misc_xp_crystal', quantity: 2 },
    ],
    resultItemId: 'scroll_enchant_weapon',
    successMessage: 'Hilda etches an Enchant Weapon scroll from your arcane salvage.',
  },
  craft_antivenom_pack: {
    ingredients: [
      { itemId: 'misc_rat_tail', quantity: 2 },
      { itemId: 'misc_poison_fang', quantity: 1 },
      { itemId: 'misc_bone_fragment', quantity: 1 },
    ],
    resultItemId: 'potion_cure_poison',
    resultQuantity: 2,
    successMessage: 'Hilda compounds your reagents into an antivenom pack.',
  },
};
const COMPANION_SUMMON_EFFECT_ID = 'summon_companion';
const COMPANION_SUMMON_ITEM_ID = 'scroll_companion_call';
const COMPANION_SPELL_MANA_COST = 20;
const COMPANION_SPELL_KEY = 'v';
const COMPANION_MAX_CHASE_DISTANCE = 8;
const COMPANION_NAME = 'Summoned Wolf';
const COMPANION_TEMPLATE_ID = 'summoned_wolf_companion';
const COMPANION_COLOR = 0x77ddff;
const COMPANION_GLYPH = 'w';
const COMPANION_STATS = {
  maxHP: 38,
  attack: 7,
  defense: 3,
  speed: 7,
};
const LIGHTNING_SPELL_KEY = 'l';
const LIGHTNING_SPELL_RANGE = 6;
const LIGHTNING_SPELL_MANA_COST = 18;
const LIGHTNING_SPELL_POWER = 3;
const PLAYER_RANGED_ATTACK_KEY = 'q';
const ARCANE_BOLT_RANGE = 6;
const ARCANE_BOLT_MANA_COST = 8;
const ARCANE_BOLT_POWER = 1.4;
const WATER_LIGHTNING_BONUS_MULTIPLIER = 1.5;
const TREE_COVER_DAMAGE_REDUCTION = 2;
const LAVA_BURN_DAMAGE = 4;
const CAMPFIRE_BURN_DAMAGE = 4;
const BUILD_ID = 'rogue@0.0.0';
const EMPTY_FLASK_ITEM_ID = 'misc_empty_flask';
const DUNGEON_WATER_FLASK_ITEM_ID = 'misc_flask_dungeon_water';

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
  private noiseSystem!: NoiseSystem;
  private pickupSelectionItems: GroundItem[] = [];
  private pickupSelectionIndex: number = 0;
  private pickupOverlay?: Phaser.GameObjects.Text;
  private cookingSelectionItems: CorpseInventoryItem[] = [];
  private cookingSelectionIndex: number = 0;
  private cookingOverlay?: Phaser.GameObjects.Text;
  private altarSelectionIndex: number = 0;
  private altarOverlay?: Phaser.GameObjects.Text;
  private pendingAltarOffer?: { boon: AltarEffect; curse: AltarEffect };
  private activeAltarPact?: ActiveAltarPact;
  private altarUsedFloors = new Set<number>();
  private altarOffersByFloor = new Map<number, { boon: AltarEffect; curse: AltarEffect }>();
  private runAnalytics: RunAnalytics = {
    kills: 0,
    damageDealt: 0,
    maxDepthReached: 0,
    causeOfDeath: 'Unknown',
    buildUsed: BUILD_ID,
  };

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
    this.messageLog.addMessage(
      `Welcome, ${data.selectedClass?.name || 'Warrior'}! Move with arrows/WASD. Q: ranged attack, E: eat corpse, C: cook near fire, M: make fire, F: fill/drink water, V: summon wolf, L: lightning, </,: up stairs, >/.: down stairs.`
    );
    
    console.log('Player created:', this.player.playerClass, 'at', this.player.x, this.player.y);
    this.runAnalytics = {
      kills: 0,
      damageDealt: 0,
      maxDepthReached: 0,
      causeOfDeath: 'Unknown',
      buildUsed: BUILD_ID,
    };
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
    this.noiseSystem = new NoiseSystem();
    console.log('Game systems initialized');

    // Use a global keydown listener so input can wake the game loop from idle sleep
    window.addEventListener('keydown', this.onWindowKeyDown, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('dialogue-action', this.handleDialogueAction, this);
      this.cleanupInputAndSleep();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.events.off('dialogue-action', this.handleDialogueAction, this);
      this.cleanupInputAndSleep();
    });
    this.events.on('dialogue-action', this.handleDialogueAction, this);
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
    if (this.cookingOverlay) {
      this.cookingOverlay.destroy();
      this.cookingOverlay = undefined;
    }
    if (this.altarOverlay) {
      this.altarOverlay.destroy();
      this.altarOverlay = undefined;
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

    if (this.isAltarSelectionActive()) {
      this.handleAltarSelectionKey(event.key);
      event.preventDefault();
      return;
    }
    if (this.isCookingSelectionActive()) {
      this.handleCookingSelectionKey(event.key);
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
      key === 'f' ||
      key === 'x' ||
      key === 'r' ||
      key === 'c' ||
      key === 'm' ||
      key === 'e' ||
      key === COMPANION_SPELL_KEY ||
      key === LIGHTNING_SPELL_KEY ||
      key === PLAYER_RANGED_ATTACK_KEY ||
      key === ',' ||
      key === '.' ||
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
      this.scene.isActive('ShopScene') ||
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
      case 'f':
        this.tryHandleWaterInteraction();
        return;
      case 'x':
        this.tryDisarmNearbyTrap();
        return;
      case 'r':
        this.tryUseAltar();
        return;
      case 'c':
        this.tryOpenCookingSelection();
        return;
      case 'm':
        this.tryMakeFire();
        return;
      case 'e':
        this.tryEatCorpse();
        return;
      case COMPANION_SPELL_KEY:
        this.tryCastCompanionSpell();
        return;
      case LIGHTNING_SPELL_KEY:
        this.tryCastLightningBolt();
        return;
      case PLAYER_RANGED_ATTACK_KEY:
        this.tryPerformPlayerRangedAttack();
        return;
      case '<':
      case ',':
        this.tryUseStairs('up');
        return;
      case '>':
      case '.':
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
        if (monster.isFriendlySummon) {
          this.messageLog.addMessage(`${monster.name} is your ally.`, MessageType.SYSTEM);
          this.render();
          return;
        }
        console.log('Attacking monster:', monster.name);
        const result = this.resolvePlayerMeleeAttack(monster);
        this.recordPlayerDamageDealt(result.damage);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        this.applyDurabilityWearOnPlayerAttack();
        this.emitPlayerNoise(newX, newY, NOISE_BUDGET.PLAYER_MELEE, 'player_melee');
        
        // Handle monster death
          if (result.killed && monster.isDead()) {
            console.log('Monster killed:', monster.name);
            this.handleHostileMonsterDeath(monster, true);
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
        this.emitPlayerNoise(newX, newY, NOISE_BUDGET.PLAYER_DOOR, 'open_door');
        console.log('Opened door at', newX, newY);
        this.render();
      } else if (tile && tile.type === TileType.CHEST_CLOSED) {
        this.tryOpenChest(newX, newY);
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

    if (tile.type === TileType.WATER) {
      this.messageLog.addMessage('The water is too deep to cross.', MessageType.SYSTEM);
      this.render();
      return;
    }

    // Move player
    this.player.setPosition(newX, newY);
    this.emitPlayerNoise(newX, newY, NOISE_BUDGET.PLAYER_MOVE, 'player_move');
    console.log('Player moved to', newX, newY);

    if (tile.type === TileType.CAMPFIRE) {
      const fireDamage = this.player.takeDamage(4);
      this.messageLog.addMessage(`You step into the fire and take ${fireDamage} damage!`, MessageType.DAMAGE);
      this.noteDeathCauseIfPlayerDead('Burned by fire');
      if (this.player.isDead()) {
        this.handlePlayerDeath();
        return;
      }
    }

    const trapTriggered = this.tryTriggerTrapAt(newX, newY);
    this.revealNearbyTraps(newX, newY);

    this.autoCollectGoldAt(newX, newY);
    
    // Check for items at new position
    const items = this.getNonGoldItemsAt(newX, newY);
    if (items.length > 0) {
      const itemNames = items.map(item => item.name).join(', ');
      this.messageLog.addMessage(`You see: ${itemNames}`, MessageType.SYSTEM);
      console.log('Items at position:', itemNames);
    }

    if (tile.type === TileType.ALTAR && this.currentFloor > 0 && !this.altarUsedFloors.has(this.currentFloor)) {
      this.messageLog.addMessage(
        'An altar hums with power. Press R to accept a boon and a curse.',
        MessageType.WARNING
      );
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

    if (trapTriggered && this.player.isDead()) {
      this.handlePlayerDeath();
      return;
    }

    // Process monster turns after player movement
    this.processTurn();
  }

  private tryTriggerTrapAt(x: number, y: number): boolean {
    const trap = this.getTrapAtSafe(x, y);
    if (!trap || trap.disarmed) {
      return false;
    }

    trap.revealed = true;
    const damage = this.player.takeDamage(trap.damage);
    this.noteDeathCauseIfPlayerDead('Killed by a spike trap');
    this.emitPlayerNoise(x, y, NOISE_BUDGET.PLAYER_TRAP, 'trigger_trap');
    this.messageLog.addMessage(
      `You trigger a spike trap and take ${damage} damage!`,
      MessageType.DAMAGE
    );
    return true;
  }

  private revealNearbyTraps(x: number, y: number): void {
    const nearby = this.getAdjacentTrapsSafe(x, y);
    for (const trap of nearby) {
      if (trap.revealed || trap.disarmed) {
        continue;
      }
      if (Math.random() < 0.35) {
        trap.revealed = true;
        this.messageLog.addMessage('You spot a hidden spike trap nearby.', MessageType.SYSTEM);
      }
    }
  }

  private tryDisarmNearbyTrap(): void {
    if (this.currentFloor === 0) {
      this.messageLog.addMessage('No traps to disarm in town.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const candidates = this.getAdjacentTrapsSafe(this.player.x, this.player.y)
      .filter((trap) => trap.revealed && !trap.disarmed);

    if (candidates.length === 0) {
      this.messageLog.addMessage('No revealed trap nearby to disarm.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const trap = candidates[0];
    const disarmChance = 0.7;
    if (Math.random() <= disarmChance) {
      this.disarmTrapAtSafe(trap.x, trap.y);
      this.messageLog.addMessage('You carefully disarm a spike trap.', MessageType.SYSTEM);
      this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'disarm_trap');
    } else {
      const damage = this.player.takeDamage(Math.max(1, Math.floor(trap.damage / 2)));
      this.noteDeathCauseIfPlayerDead('Killed by a trap while disarming');
      trap.revealed = true;
      this.messageLog.addMessage(`Disarm failed! The trap wounds you for ${damage} damage.`, MessageType.DAMAGE);
      this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_TRAP, 'failed_disarm');
      if (this.player.isDead()) {
        this.handlePlayerDeath();
        return;
      }
    }

    this.processTurn();
  }

  private getTrapsArraySafe(): Trap[] {
    return Array.isArray(this.gameMap.traps) ? this.gameMap.traps : [];
  }

  private getTrapAtSafe(x: number, y: number): Trap | null {
    const mapWithTrapMethods = this.gameMap as GameMap & {
      getTrapAt?: (x: number, y: number) => Trap | null;
    };
    if (typeof mapWithTrapMethods.getTrapAt === 'function') {
      return mapWithTrapMethods.getTrapAt(x, y);
    }

    return this.getTrapsArraySafe().find((trap) => trap.x === x && trap.y === y && !trap.disarmed) ?? null;
  }

  private getAdjacentTrapsSafe(x: number, y: number): Trap[] {
    const mapWithTrapMethods = this.gameMap as GameMap & {
      getAdjacentTraps?: (x: number, y: number) => Trap[];
    };
    if (typeof mapWithTrapMethods.getAdjacentTraps === 'function') {
      return mapWithTrapMethods.getAdjacentTraps(x, y);
    }

    return this.getTrapsArraySafe().filter((trap) => {
      if (trap.disarmed) return false;
      const dx = Math.abs(trap.x - x);
      const dy = Math.abs(trap.y - y);
      return Math.max(dx, dy) <= 1;
    });
  }

  private disarmTrapAtSafe(x: number, y: number): boolean {
    const mapWithTrapMethods = this.gameMap as GameMap & {
      disarmTrapAt?: (x: number, y: number) => boolean;
    };
    if (typeof mapWithTrapMethods.disarmTrapAt === 'function') {
      return mapWithTrapMethods.disarmTrapAt(x, y);
    }

    const trap = this.getTrapAtSafe(x, y);
    if (!trap) {
      return false;
    }
    trap.disarmed = true;
    trap.revealed = true;
    return true;
  }

  private tryUseStairs(direction: 'up' | 'down'): void {
    let tile = this.gameMap.getTile(this.player.x, this.player.y);
    if (!tile) return;

    if (direction === 'up') {
      if (tile.type !== TileType.STAIRS_UP) {
        const nearby = this.findNearbyStair(TileType.STAIRS_UP);
        if (!nearby) {
          this.messageLog.addMessage('You are not standing on up stairs (<).', MessageType.SYSTEM);
          this.render();
          return;
        }
        this.player.setPosition(nearby.x, nearby.y);
        tile = this.gameMap.getTile(this.player.x, this.player.y);
      }
      this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'use_stairs');
      this.goUpStairs();
      return;
    }

    if (tile.type !== TileType.STAIRS_DOWN) {
      const nearby = this.findNearbyStair(TileType.STAIRS_DOWN);
      if (!nearby) {
        this.messageLog.addMessage('You are not standing on down stairs (>).', MessageType.SYSTEM);
        this.render();
        return;
      }
      this.player.setPosition(nearby.x, nearby.y);
      tile = this.gameMap.getTile(this.player.x, this.player.y);
    }
    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'use_stairs');
    this.goDownStairs();
  }

  private findNearbyStair(type: TileType.STAIRS_UP | TileType.STAIRS_DOWN): { x: number; y: number } | null {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = this.player.x + dx;
        const y = this.player.y + dy;
        const tile = this.gameMap.getTile(x, y);
        if (tile?.type === type) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private tryUseAltar(): void {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('No altar rituals are needed in town.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const tile = this.gameMap.getTile(this.player.x, this.player.y);
    if (!tile || tile.type !== TileType.ALTAR) {
      this.messageLog.addMessage('You must stand on an altar to perform a ritual.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (this.altarUsedFloors.has(this.currentFloor)) {
      this.messageLog.addMessage('The altar is dormant on this floor.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const offer =
      this.altarOffersByFloor.get(this.currentFloor) ??
      {
        boon: ALTAR_BOONS[Math.floor(Math.random() * ALTAR_BOONS.length)],
        curse: ALTAR_CURSES[Math.floor(Math.random() * ALTAR_CURSES.length)],
      };
    this.altarOffersByFloor.set(this.currentFloor, offer);
    this.pendingAltarOffer = offer;
    this.altarSelectionIndex = 0;
    this.drawAltarSelectionOverlay();
  }

  private isAltarSelectionActive(): boolean {
    return this.pendingAltarOffer !== undefined;
  }

  private handleAltarSelectionKey(key: string): void {
    if (!this.pendingAltarOffer) {
      return;
    }

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
      case 'arrowdown':
      case 's':
        this.altarSelectionIndex = this.altarSelectionIndex === 0 ? 1 : 0;
        this.drawAltarSelectionOverlay();
        break;
      case 'enter':
        if (this.altarSelectionIndex === 0) {
          this.acceptAltarOffer();
        } else {
          this.declineAltarOffer();
        }
        break;
      case 'escape':
        this.closeAltarSelectionOverlay();
        this.render();
        break;
      default:
        break;
    }
  }

  private drawAltarSelectionOverlay(): void {
    if (!this.pendingAltarOffer) {
      return;
    }
    if (this.altarOverlay) {
      this.altarOverlay.destroy();
    }

    const { boon, curse } = this.pendingAltarOffer;
    const acceptMarker = this.altarSelectionIndex === 0 ? '>' : ' ';
    const declineMarker = this.altarSelectionIndex === 1 ? '>' : ' ';
    const lines = [
      'Ancient Altar',
      '',
      `Boon:  ${boon.name} (${boon.description})`,
      `Curse: ${curse.name} (${curse.description})`,
      '',
      `${acceptMarker} Accept the pact`,
      `${declineMarker} Leave the altar`,
      '',
      'Up/Down: select  Enter: confirm  Esc: close',
    ];

    this.altarOverlay = this.add.text(16, 40, lines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 8 },
    });
    this.altarOverlay.setDepth(1001);
  }

  private closeAltarSelectionOverlay(): void {
    this.pendingAltarOffer = undefined;
    this.altarSelectionIndex = 0;
    if (this.altarOverlay) {
      this.altarOverlay.destroy();
      this.altarOverlay = undefined;
    }
  }

  private acceptAltarOffer(): void {
    if (!this.pendingAltarOffer) {
      return;
    }

    const { boon, curse } = this.pendingAltarOffer;
    const boonApplied = this.applyPlayerStatDelta(boon.delta);
    const curseApplied = this.applyPlayerStatDelta(curse.delta);
    const appliedDelta = this.combineAltarDeltas(boonApplied, curseApplied);
    this.activeAltarPact = { floor: this.currentFloor, boon, curse, appliedDelta };
    this.altarUsedFloors.add(this.currentFloor);
    this.altarOffersByFloor.delete(this.currentFloor);
    this.messageLog.addMessage(`Altar boon: ${boon.name} (${boon.description}).`, MessageType.HEAL);
    this.messageLog.addMessage(`Altar curse: ${curse.name} (${curse.description}).`, MessageType.WARNING);
    this.closeAltarSelectionOverlay();
    this.processTurn();
  }

  private declineAltarOffer(): void {
    this.altarUsedFloors.add(this.currentFloor);
    this.altarOffersByFloor.delete(this.currentFloor);
    this.messageLog.addMessage('You reject the ritual. The altar falls silent.', MessageType.SYSTEM);
    this.closeAltarSelectionOverlay();
    this.processTurn();
  }

  private applyPlayerStatDelta(delta: AltarStatDelta): AltarStatDelta {
    const beforeAttack = this.player.attack;
    const beforeDefense = this.player.defense;
    const beforeMagicPower = this.player.magicPower;
    const beforeMaxHP = this.player.maxHP;
    const beforeMaxMana = this.player.maxMana;

    const nextAttack = Math.max(1, beforeAttack + (delta.attack ?? 0));
    const nextDefense = Math.max(0, beforeDefense + (delta.defense ?? 0));
    const nextMagicPower = Math.max(0, beforeMagicPower + (delta.magicPower ?? 0));
    const nextMaxHP = Math.max(1, beforeMaxHP + (delta.maxHP ?? 0));
    const nextMaxMana = Math.max(0, beforeMaxMana + (delta.maxMana ?? 0));

    this.player.attack = nextAttack;
    this.player.defense = nextDefense;
    this.player.magicPower = nextMagicPower;
    this.player.maxHP = nextMaxHP;
    this.player.maxMana = nextMaxMana;

    const appliedMaxHPDelta = nextMaxHP - beforeMaxHP;
    const appliedMaxManaDelta = nextMaxMana - beforeMaxMana;

    this.player.currentHP = Math.min(this.player.currentHP, this.player.maxHP);
    if (appliedMaxHPDelta > 0) {
      this.player.currentHP = Math.min(this.player.maxHP, this.player.currentHP + appliedMaxHPDelta);
    }

    this.player.currentMana = Math.min(this.player.currentMana, this.player.maxMana);
    if (appliedMaxManaDelta > 0) {
      this.player.currentMana = Math.min(this.player.maxMana, this.player.currentMana + appliedMaxManaDelta);
    }

    return {
      attack: nextAttack - beforeAttack,
      defense: nextDefense - beforeDefense,
      magicPower: nextMagicPower - beforeMagicPower,
      maxHP: appliedMaxHPDelta,
      maxMana: appliedMaxManaDelta,
    };
  }

  private combineAltarDeltas(...deltas: AltarStatDelta[]): AltarStatDelta {
    return deltas.reduce<AltarStatDelta>(
      (acc, delta) => ({
        attack: (acc.attack ?? 0) + (delta.attack ?? 0),
        defense: (acc.defense ?? 0) + (delta.defense ?? 0),
        maxHP: (acc.maxHP ?? 0) + (delta.maxHP ?? 0),
        maxMana: (acc.maxMana ?? 0) + (delta.maxMana ?? 0),
        magicPower: (acc.magicPower ?? 0) + (delta.magicPower ?? 0),
      }),
      {}
    );
  }

  private negateAltarDelta(delta: AltarStatDelta): AltarStatDelta {
    return {
      attack: -(delta.attack ?? 0),
      defense: -(delta.defense ?? 0),
      maxHP: -(delta.maxHP ?? 0),
      maxMana: -(delta.maxMana ?? 0),
      magicPower: -(delta.magicPower ?? 0),
    };
  }

  private clearAltarPactOnFloorExit(): void {
    if (!this.activeAltarPact) {
      return;
    }

    const { floor, appliedDelta } = this.activeAltarPact;
    this.applyPlayerStatDelta(this.negateAltarDelta(appliedDelta));
    this.activeAltarPact = undefined;
    this.messageLog.addMessage(`The altar pact from floor ${floor} fades away.`, MessageType.SYSTEM);
  }

  private tryDrinkFromFountain(): void {
    const positions = [
      { x: this.player.x, y: this.player.y },
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x - 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x, y: this.player.y - 1 },
    ];

    const fountainPos = positions.find((pos) => this.gameMap.getTile(pos.x, pos.y)?.type === TileType.FOUNTAIN);
    if (!fountainPos) {
      this.messageLog.addMessage('No fountain nearby to drink from.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const roll = Math.random();
    if (roll < 0.45) {
      const healAmount = Math.max(6, Math.floor(this.player.maxHP * 0.35));
      const restored = this.player.heal(healAmount);
      if (restored > 0) {
        this.messageLog.addMessage(`You drink from the fountain and recover ${restored} HP.`, MessageType.HEAL);
      } else {
        this.messageLog.addMessage('The fountain water is refreshing, but you are already at full health.', MessageType.INFO);
      }
    } else if (roll < 0.8) {
      const manaAmount = Math.max(4, Math.floor(this.player.maxMana * 0.4));
      const restored = this.player.restoreMana(manaAmount);
      if (restored > 0) {
        this.messageLog.addMessage(`Arcane water restores ${restored} mana.`, MessageType.INFO);
      } else {
        this.messageLog.addMessage('The fountain hums with mana, but your reserves are full.', MessageType.INFO);
      }
    } else if (Math.random() < 0.5) {
      const hpRestored = this.player.heal(Math.max(3, Math.floor(this.player.maxHP * 0.15)));
      const manaRestored = this.player.restoreMana(Math.max(2, Math.floor(this.player.maxMana * 0.2)));
      this.player.addStatusEffect({
        type: 'regenerate',
        duration: 4,
        power: Math.max(1, Math.floor(this.player.maxHP * 0.04)),
      });
      this.messageLog.addMessage(
        `A blessed surge revitalizes you (+${hpRestored} HP, +${manaRestored} mana).`,
        MessageType.HEAL
      );
      this.messageLog.addMessage('A regenerative blessing settles over you.', MessageType.INFO);
    } else if (this.player.currentHP <= 1) {
      const manaLoss = Math.min(this.player.currentMana, 3 + Math.floor(Math.random() * 4));
      this.player.currentMana -= manaLoss;
      this.player.addStatusEffect({
        type: 'curse_weakness',
        duration: 5,
        power: 2,
      });
      this.messageLog.addMessage(
        `Bitter water drains your spirit (-${manaLoss} mana).`,
        MessageType.WARNING
      );
      this.messageLog.addMessage('A curse of weakness saps your strength.', MessageType.WARNING);
    } else {
      const maxSafeDamage = this.player.currentHP - 1;
      const damage = Math.min(maxSafeDamage, 4 + Math.floor(Math.random() * 7));
      this.player.takeDamage(damage);
      this.noteDeathCauseIfPlayerDead('Killed by tainted fountain water');
      this.messageLog.addMessage(`The water is tainted! You suffer ${damage} damage.`, MessageType.DAMAGE);

      if (Math.random() < 0.5) {
        this.player.addStatusEffect({
          type: 'poison',
          duration: 4,
          power: 2,
        });
        this.messageLog.addMessage('Toxic residue poisons you.', MessageType.WARNING);
      } else {
        const curses: Array<'curse_frailty' | 'curse_wither'> = ['curse_frailty', 'curse_wither'];
        const curseType = curses[Math.floor(Math.random() * curses.length)];
        this.player.addStatusEffect({
          type: curseType,
          duration: 5,
          power: 2,
        });
        if (curseType === 'curse_frailty') {
          this.messageLog.addMessage('A curse of frailty weakens your defenses.', MessageType.WARNING);
        } else {
          this.messageLog.addMessage('A withering curse clings to you.', MessageType.WARNING);
        }
      }
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'drink_fountain');
    this.processTurn();
  }

  private tryHandleWaterInteraction(): void {
    if (this.tryFillFlaskFromNearbySource()) {
      return;
    }
    this.tryDrinkFromFountain();
  }

  private tryFillFlaskFromNearbySource(): boolean {
    if (this.currentFloor <= 0) {
      return false;
    }

    if (this.getInventoryQuantity(EMPTY_FLASK_ITEM_ID) <= 0) {
      return false;
    }

    const source = this.findAdjacentTileOfTypes([TileType.WATER, TileType.FOUNTAIN]);
    if (!source) {
      this.messageLog.addMessage('No water source nearby to fill your flask.', MessageType.SYSTEM);
      this.render();
      return true;
    }

    const waterFlaskDef = ITEMS.find((item) => item.id === DUNGEON_WATER_FLASK_ITEM_ID);
    const emptyFlaskDef = ITEMS.find((item) => item.id === EMPTY_FLASK_ITEM_ID);
    if (!waterFlaskDef || !emptyFlaskDef) {
      this.messageLog.addMessage('Water flask data is missing.', MessageType.SYSTEM);
      this.render();
      return true;
    }

    const filledFlask = this.createInventoryItemFromDefinition(waterFlaskDef, 1);
    if (!this.player.canAddItem(filledFlask)) {
      this.messageLog.addMessage('Your inventory is too full to carry filled flasks.', MessageType.SYSTEM);
      this.render();
      return true;
    }

    if (!this.consumeInventoryItemById(EMPTY_FLASK_ITEM_ID, 1)) {
      this.messageLog.addMessage('You fumble with your flask and fail to fill it.', MessageType.SYSTEM);
      this.render();
      return true;
    }

    if (!this.player.addItem(filledFlask)) {
      this.player.addItem(this.createInventoryItemFromDefinition(emptyFlaskDef, 1));
      this.messageLog.addMessage('You fail to secure the filled flask.', MessageType.SYSTEM);
      this.render();
      return true;
    }

    if (source.type === TileType.WATER) {
      this.messageLog.addMessage('You fill an empty flask with dungeon water.', MessageType.INFO);
    } else {
      this.messageLog.addMessage('You bottle potent fountain water into your flask.', MessageType.INFO);
    }
    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'fill_flask');
    this.processTurn();
    return true;
  }

  private findAdjacentTileOfTypes(types: TileType[]): { x: number; y: number; type: TileType } | null {
    const positions = [
      { x: this.player.x, y: this.player.y },
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x - 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x, y: this.player.y - 1 },
    ];

    for (const position of positions) {
      const tileType = this.gameMap.getTile(position.x, position.y)?.type;
      if (tileType && types.includes(tileType)) {
        return { ...position, type: tileType };
      }
    }
    return null;
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
    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'break_stick');
    this.render();
  }

  private consumeInventoryItem(itemId: string): boolean {
    const item = this.player.getItem(itemId);
    if (!item) {
      return false;
    }
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.player.removeItem(itemId);
    }
    return true;
  }

  private tryOpenChest(x: number, y: number): void {
    const tile = this.gameMap.getTile(x, y);
    if (!tile || tile.type !== TileType.CHEST_CLOSED) {
      this.render();
      return;
    }

    const keyItemId = this.player.getItem('rusty_key') ? 'rusty_key' : null;
    const lockpickItemId = this.player.getItem('lockpick_set')
      ? 'lockpick_set'
      : this.player.getItem('lockpick')
      ? 'lockpick'
      : null;

    let unlocked = false;
    if (keyItemId) {
      this.consumeInventoryItem(keyItemId);
      unlocked = true;
      this.messageLog.addMessage('You unlock the chest with a key.', MessageType.SYSTEM);
    } else if (lockpickItemId) {
      this.consumeInventoryItem(lockpickItemId);
      const toolId = lockpickItemId === 'lockpick_set' ? 'lockpick_set' : 'lockpick';
      const successChance = this.player.getLockpickSuccessChance(toolId);
      unlocked = Math.random() <= successChance;
      const training = this.player.trainLockpicking(unlocked);

      if (unlocked) {
        this.messageLog.addMessage(
          `You pick the chest lock (${Math.round(successChance * 100)}%).`,
          MessageType.SYSTEM
        );
      } else {
        this.messageLog.addMessage('Lockpicking failed. The chest remains locked.', MessageType.SYSTEM);
      }

      if (training.increased) {
        this.messageLog.addMessage(`Lockpicking improves to ${training.value}.`, MessageType.SYSTEM);
      }
    } else {
      this.messageLog.addMessage('The chest is locked. You need a key or lockpick.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (!unlocked) {
      this.processTurn();
      return;
    }

    tile.type = TileType.CHEST_OPEN;
    tile.blocked = false;
    tile.blocksSight = false;

    const loot = this.itemSpawnSystem.generateChestLoot(this.currentFloor, x, y);
    for (const item of loot) {
      this.gameMap.addItem(item, x, y);
    }

    if (loot.length > 0) {
      const preview = loot
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ');
      this.messageLog.addMessage(`Chest opened! Loot: ${preview}`, MessageType.ITEM_DROP);
    } else {
      this.messageLog.addMessage('The chest was empty.', MessageType.SYSTEM);
    }

    this.emitPlayerNoise(x, y, NOISE_BUDGET.PLAYER_INTERACT, 'open_chest');
    this.processTurn();
  }
  
  private processTurn(): void {
    this.processPlayerStatusEffects();
    if (this.player.isDead()) {
      this.handlePlayerDeath();
      return;
    }

    this.applyLavaBurnEffects();
    if (this.player.isDead()) {
      this.handlePlayerDeath();
      return;
    }

    // Clean up dead monsters
    this.monsters = this.monsters.filter((m) => !m.isDead());
    
    // Only process monster turns in dungeons
    if (this.currentFloor === 0) {
      this.noiseSystem.decayNoise();
      this.render();
      return;
    }
    
    const friendlySummons = this.monsters.filter((monster) => monster.isFriendlySummon && !monster.isDead());
    const hostileMonsters = this.monsters.filter((monster) => !monster.isFriendlySummon && !monster.isDead());

    for (const companion of friendlySummons) {
      this.executeFriendlyCompanionTurn(companion);
      if (this.player.isDead()) {
        this.handlePlayerDeath();
        return;
      }
    }

    // Let hostile monsters act
    for (const monster of hostileMonsters) {
      if (monster.isDead()) continue;

      this.triggerMonsterPhaseIfNeeded(monster);
      if (monster.isDead()) {
        this.monsterAISystem.cleanupMonster(monster);
        continue;
      }
      if (this.player.isDead()) {
        this.handlePlayerDeath();
        return;
      }

      const action = this.monsterAISystem.updateMonsterAI(
        monster,
        this.player,
        this.gameMap,
        this.monsters,
        this.noiseSystem.getActiveNoiseEvents()
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

    this.updateQuestProgress();
    this.noiseSystem.decayNoise();
    
    // Render after all monsters have acted
    this.render();
  }

  private awardPlayerXP(amount: number): void {
    const progression = this.player.gainXPAndResolveProgression(amount);
    if (progression.xpGained <= 0) {
      return;
    }

    this.messageLog.addMessage(`You gain ${progression.xpGained} XP!`, MessageType.SYSTEM);

    if (progression.levelsGained > 0) {
      this.messageLog.addMessage(
        `*** LEVEL UP! You are now level ${this.player.level}! ***`,
        MessageType.SYSTEM
      );
    }

    for (const talent of progression.unlockedTalents) {
      this.messageLog.addMessage(
        `Talent unlocked: ${talent.name} (${talent.description}).`,
        MessageType.INFO
      );
    }
  }

  private triggerMonsterPhaseIfNeeded(monster: Monster): void {
    const template = getMonsterTemplate(monster.templateId);
    if (!template?.phases || template.phases.length === 0) {
      return;
    }

    const hpPercent = (monster.currentHP / monster.maxHP) * 100;
    const pendingPhase = [...template.phases]
      .sort((left, right) => right.threshold - left.threshold)
      .find(
        (phase) =>
          hpPercent <= phase.threshold &&
          !monster.triggeredPhaseThresholds.has(phase.threshold)
      );

    if (!pendingPhase) {
      return;
    }

    monster.triggeredPhaseThresholds.add(pendingPhase.threshold);
    this.messageLog.addMessage(
      `${monster.name} telegraphs ${pendingPhase.abilityName}: ${pendingPhase.telegraph}`,
      MessageType.WARNING
    );
    this.applyMonsterPhaseEffects(monster, pendingPhase);
  }

  private applyMonsterPhaseEffects(monster: Monster, phase: MonsterPhaseDefinition): void {
    for (const effect of phase.effects) {
      switch (effect.type) {
        case 'heal_self': {
          const healed = monster.heal(effect.amount);
          if (healed > 0) {
            this.messageLog.addMessage(
              `${monster.name} restores ${healed} HP.`,
              MessageType.HEAL
            );
          }
          break;
        }
        case 'damage_player': {
          const damage = this.player.takeDamage(effect.amount);
          this.noteDeathCauseIfPlayerDead(`Slain by ${monster.name}'s ${phase.abilityName}`);
          if (damage > 0) {
            this.messageLog.addMessage(
              `${monster.name}'s ${phase.abilityName} hits you for ${damage} damage!`,
              MessageType.DAMAGE
            );
          }
          break;
        }
        case 'buff_self': {
          if (effect.attack) {
            monster.attack += effect.attack;
          }
          if (effect.defense) {
            monster.defense = Math.max(0, monster.defense + effect.defense);
          }
          if (effect.speed) {
            monster.speed += effect.speed;
          }
          this.messageLog.addMessage(
            `${monster.name} grows more dangerous.`,
            MessageType.INFO
          );
          break;
        }
        case 'curse_player': {
          this.player.addStatusEffect({
            type: effect.curseType,
            duration: effect.duration,
            power: effect.power,
          });
          this.messageLog.addMessage(
            `${monster.name} inflicts ${this.formatCurseName(effect.curseType)}!`,
            MessageType.WARNING
          );
          break;
        }
      }
    }
  }

  private formatCurseName(curseType: PlayerStatusEffectType): string {
    switch (curseType) {
      case 'curse_weakness':
        return 'Curse of Weakness';
      case 'curse_frailty':
        return 'Curse of Frailty';
      case 'curse_wither':
        return 'Withering Curse';
      case 'poison':
        return 'Poison';
      case 'regenerate':
        return 'Regeneration';
      default:
        return 'a curse';
    }
  }

  private processPlayerStatusEffects(): void {
    const events = this.player.processStatusEffects();
    for (const event of events) {
      this.logPlayerStatusEvent(event);
      if (event.kind === 'damage' && event.amount > 0) {
        if (event.type === 'poison') {
          this.noteDeathCauseIfPlayerDead('Succumbed to poison');
        } else if (event.type === 'curse_wither') {
          this.noteDeathCauseIfPlayerDead('Withered by a curse');
        }
      }
    }
  }

  private logPlayerStatusEvent(event: PlayerStatusTickEvent): void {
    switch (event.type) {
      case 'poison':
        if (event.kind === 'damage' && event.amount > 0) {
          this.messageLog.addMessage(`Poison deals ${event.amount} damage.`, MessageType.DAMAGE);
        } else if (event.kind === 'expired') {
          this.messageLog.addMessage('The poison wears off.', MessageType.INFO);
        }
        break;
      case 'regenerate':
        if (event.kind === 'heal' && event.amount > 0) {
          this.messageLog.addMessage(`Regeneration restores ${event.amount} HP.`, MessageType.HEAL);
        } else if (event.kind === 'expired') {
          this.messageLog.addMessage('Your regeneration fades.', MessageType.INFO);
        }
        break;
      case 'curse_weakness':
        if (event.kind === 'expired') {
          this.messageLog.addMessage('The curse of weakness is lifted.', MessageType.INFO);
        }
        break;
      case 'curse_frailty':
        if (event.kind === 'expired') {
          this.messageLog.addMessage('The curse of frailty is lifted.', MessageType.INFO);
        }
        break;
      case 'curse_wither':
        if (event.kind === 'damage' && event.amount > 0) {
          this.messageLog.addMessage(`A withering curse drains ${event.amount} HP.`, MessageType.WARNING);
        } else if (event.kind === 'expired') {
          this.messageLog.addMessage('The withering curse dissipates.', MessageType.INFO);
        }
        break;
    }
  }

  private handleDialogueAction(payload: {
    action: string;
    npcId: string | null;
    npcName: string | null;
    questIds: string[];
    shopInventoryIds: string[];
  }): void {
    if (payload.action.startsWith('open_shop')) {
      this.scene.launch('ShopScene', {
        player: this.player,
        npcName: payload.npcName ?? 'Merchant',
        inventoryIds: payload.shopInventoryIds,
        shopAction: payload.action,
      });
      this.scene.pause('GameScene');
      return;
    }

    if (payload.action === 'heal_player') {
      this.applyHealerService();
      return;
    }

    if (payload.action === 'repair_equipment') {
      this.applyBlacksmithRepair();
      return;
    }

    if (payload.action.startsWith('craft_')) {
      this.applyBlacksmithCrafting(payload.action);
      return;
    }

    if (payload.action === 'claim_quest_reward') {
      this.claimQuestReward(payload.npcId);
      return;
    }

    if (payload.action.startsWith('accept_quest')) {
      this.acceptQuestFromDialogue(payload.action, payload.questIds);
      return;
    }

    this.render();
  }

  private acceptQuestFromDialogue(action: string, availableQuestIds: string[]): void {
    const questId = this.resolveQuestIdForAction(action, availableQuestIds);
    if (!questId) {
      this.messageLog.addMessage('No available quest matches this dialogue option.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const quest = QUEST_DEFINITIONS[questId];
    if (!quest) {
      this.messageLog.addMessage(`Unknown quest: ${questId}`, MessageType.SYSTEM);
      this.render();
      return;
    }

    const accepted = this.player.acceptQuest({
      id: quest.id,
      title: quest.title,
      objective: quest.objective,
    });

    if (!accepted) {
      this.messageLog.addMessage(`Quest already active: ${quest.title}`, MessageType.SYSTEM);
      this.render();
      return;
    }

    this.messageLog.addMessage(`Quest accepted: ${quest.title}`, MessageType.SYSTEM);
    this.render();
  }

  private resolveQuestIdForAction(action: string, availableQuestIds: string[]): string | null {
    for (const questId of availableQuestIds) {
      const quest = QUEST_DEFINITIONS[questId];
      if (!quest || !quest.acceptActions.includes(action)) {
        continue;
      }
      return questId;
    }
    return null;
  }

  private claimQuestReward(npcId: string | null): void {
    if (!npcId) {
      return;
    }

    const claimableQuest = this.getClaimableQuestForNpc(npcId);
    if (!claimableQuest) {
      this.messageLog.addMessage('You have no completed quests to turn in here.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (!this.canGrantQuestRewardsForQuest(claimableQuest)) {
      this.messageLog.addMessage('Your inventory is too full to claim this reward.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (!this.consumeQuestTurnInRequirements(claimableQuest)) {
      this.messageLog.addMessage('You do not have the required turn-in items.', MessageType.SYSTEM);
      this.render();
      return;
    }

    this.grantQuestRewards(claimableQuest.rewards);
    if (!this.player.claimQuestReward(claimableQuest.id)) {
      this.messageLog.addMessage('This quest reward has already been claimed.', MessageType.SYSTEM);
      this.render();
      return;
    }

    this.messageLog.addMessage(`Quest reward claimed: ${claimableQuest.title}`, MessageType.HEAL);
    this.render();
  }

  private getClaimableQuestForNpc(npcId: string): QuestDefinition | null {
    if (!this.player) {
      return null;
    }

    const questIds = getQuestIdsForNpc(npcId);
    for (const questId of questIds) {
      if (!this.player.isQuestCompleted(questId) || this.player.isQuestRewardClaimed(questId)) {
        continue;
      }
      const quest = QUEST_DEFINITIONS[questId];
      if (!quest || quest.turnInNpcId !== npcId) {
        continue;
      }
      return quest;
    }
    return null;
  }

  private consumeQuestTurnInRequirements(quest: QuestDefinition): boolean {
    if (!quest.turnInRequirements || quest.turnInRequirements.length === 0) {
      return true;
    }

    for (const requirement of quest.turnInRequirements) {
      if (this.getInventoryQuantity(requirement.itemId) < requirement.quantity) {
        return false;
      }
    }

    for (const requirement of quest.turnInRequirements) {
      if (!this.consumeInventoryItemById(requirement.itemId, requirement.quantity)) {
        return false;
      }
    }
    return true;
  }

  private canGrantQuestRewardsForQuest(quest: QuestDefinition): boolean {
    const simulatedInventory = this.player.inventory.map((item) => ({
      id: item.id,
      type: item.type,
      quantity: item.quantity,
    }));

    for (const requirement of quest.turnInRequirements ?? []) {
      const entry = simulatedInventory.find((item) => item.id === requirement.itemId);
      if (!entry || entry.quantity < requirement.quantity) {
        return false;
      }
      if (entry.quantity === requirement.quantity) {
        const index = simulatedInventory.indexOf(entry);
        simulatedInventory.splice(index, 1);
      } else {
        entry.quantity -= requirement.quantity;
      }
    }

    for (const reward of quest.rewards) {
      if (!reward.itemId) {
        continue;
      }
      const itemDef = ITEMS.find((item) => item.id === reward.itemId);
      if (!itemDef) {
        return false;
      }
      const inventoryItem = this.createInventoryItemFromDefinition(itemDef, reward.itemQuantity ?? 1);
      const existing = simulatedInventory.find((item) => item.id === inventoryItem.id);
      const isStackable = inventoryItem.type === 'potion' || inventoryItem.type === 'misc';
      if (existing && isStackable) {
        existing.quantity += inventoryItem.quantity;
        continue;
      }
      if (simulatedInventory.length >= this.player.inventoryCapacity) {
        return false;
      }
      simulatedInventory.push({
        id: inventoryItem.id,
        type: inventoryItem.type,
        quantity: inventoryItem.quantity,
      });
    }

    return true;
  }

  private grantQuestRewards(rewards: QuestReward[]): void {
    for (const reward of rewards) {
      if (reward.gold && reward.gold > 0) {
        this.player.addGold(reward.gold);
      }
      if (reward.xp && reward.xp > 0) {
        this.awardPlayerXP(reward.xp);
      }
      if (reward.itemId) {
        const itemDef = ITEMS.find((item) => item.id === reward.itemId);
        if (!itemDef) {
          continue;
        }
        const item = this.createInventoryItemFromDefinition(itemDef, reward.itemQuantity ?? 1);
        this.player.addItem(item);
      }
    }
  }

  private applyHealerService(): void {
    if (HEAL_PLAYER_COST > 0 && !this.player.spendGold(HEAL_PLAYER_COST)) {
      this.messageLog.addMessage(
        `You need ${HEAL_PLAYER_COST} gold for healing.`,
        MessageType.SYSTEM
      );
      this.render();
      return;
    }

    const hpRestored = this.player.maxHP - this.player.currentHP;
    const manaRestored = this.player.maxMana - this.player.currentMana;
    this.player.currentHP = this.player.maxHP;
    this.player.currentMana = this.player.maxMana;

    if (hpRestored === 0 && manaRestored === 0) {
      this.messageLog.addMessage('You are already at full health and mana.', MessageType.SYSTEM);
    } else {
      let msg = `Healed for ${hpRestored} HP`;
      if (manaRestored > 0) {
        msg += ` and ${manaRestored} MP`;
      }
      if (HEAL_PLAYER_COST > 0) {
        msg += ` for ${HEAL_PLAYER_COST} gold`;
      }
      this.messageLog.addMessage(`${msg}.`, MessageType.HEAL);
    }

    this.render();
  }

  private applyBlacksmithRepair(): void {
    if (this.currentFloor !== 0) {
      this.messageLog.addMessage('Repairs are only available in town.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const equipmentSlots: ('weapon' | 'armor' | 'shield' | 'accessory')[] = ['weapon', 'armor', 'shield', 'accessory'];
    const equippedItems = equipmentSlots
      .map((slot) => this.player.equipment[slot])
      .filter((item): item is NonNullable<typeof item> => item !== undefined);
    for (const item of equippedItems) {
      const itemDef = ITEMS.find((entry) => entry.id === item.id);
      ensureDurability(item, itemDef);
    }
    const damagedItems = equippedItems.filter(
      (item) => item.maxDurability !== undefined && getMissingDurability(item) > 0
    );

    if (damagedItems.length === 0) {
      this.messageLog.addMessage('Your equipment does not need repairs.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const totalMissingDurability = damagedItems.reduce(
      (sum, item) => sum + getMissingDurability(item),
      0
    );
    const repairCost = Math.max(10, Math.ceil(totalMissingDurability * REPAIR_COST_PER_DURABILITY));

    if (!this.player.spendGold(repairCost)) {
      this.messageLog.addMessage(
        `Hilda charges ${repairCost} gold for repairs. You cannot afford it.`,
        MessageType.SYSTEM
      );
      this.render();
      return;
    }

    for (const item of damagedItems) {
      item.currentDurability = item.maxDurability;
    }

    this.messageLog.addMessage(
      `Hilda repairs ${damagedItems.length} item(s) for ${repairCost} gold.`,
      MessageType.SYSTEM
    );
    this.render();
  }

  private applyDurabilityWearOnPlayerAttack(): void {
    this.damageEquippedItem('weapon', 1, 'Your weapon breaks from wear!');
  }

  private applyDurabilityWearOnPlayerDefense(): void {
    const candidates: ('armor' | 'shield')[] = [];
    if (this.player.equipment.armor) {
      candidates.push('armor');
    }
    if (this.player.equipment.shield) {
      candidates.push('shield');
    }
    if (candidates.length === 0) {
      return;
    }

    const slot = candidates[Math.floor(Math.random() * candidates.length)];
    const brokenItemName = this.player.equipment[slot]?.name ?? 'equipment';
    this.damageEquippedItem(slot, 1, `Your ${brokenItemName} is broken and needs repair!`);
  }

  private damageEquippedItem(
    slot: 'weapon' | 'armor' | 'shield' | 'accessory',
    amount: number,
    brokenMessage: string
  ): void {
    const equipped = this.player.equipment[slot];
    if (!equipped || amount <= 0) {
      return;
    }

    const itemDef = ITEMS.find((item) => item.id === equipped.id);
    ensureDurability(equipped, itemDef);
    if (equipped.maxDurability === undefined) {
      return;
    }

    const previousDurability = equipped.currentDurability ?? equipped.maxDurability;
    const nextDurability = Math.max(0, previousDurability - amount);
    equipped.currentDurability = nextDurability;

    if (previousDurability > 0 && nextDurability === 0) {
      this.messageLog.addMessage(brokenMessage, MessageType.WARNING);
    }
  }

  private applyBlacksmithCrafting(actionId: string): void {
    const recipe = BLACKSMITH_RECIPES[actionId];
    if (!recipe) {
      this.messageLog.addMessage('Hilda cannot craft that recipe.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const resultDef = ITEMS.find((item) => item.id === recipe.resultItemId);
    if (!resultDef) {
      this.messageLog.addMessage('Crafting failed: invalid recipe result.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const missing = this.getMissingCraftingIngredients(recipe);
    if (missing.length > 0) {
      this.messageLog.addMessage(`Missing materials: ${missing.join(', ')}.`, MessageType.SYSTEM);
      this.render();
      return;
    }

    const craftedItem = this.createInventoryItemFromDefinition(resultDef, recipe.resultQuantity ?? 1);
    if (!this.player.canAddItem(craftedItem)) {
      this.messageLog.addMessage('Inventory is full. Crafting cancelled.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const consumed = this.consumeCraftingIngredients(recipe);
    if (!consumed) {
      this.messageLog.addMessage('Crafting failed: required materials were not found.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const added = this.player.addItem(craftedItem);
    if (!added) {
      for (const ingredient of recipe.ingredients) {
        const ingredientDef = ITEMS.find((item) => item.id === ingredient.itemId);
        if (!ingredientDef) {
          continue;
        }
        this.player.addItem(this.createInventoryItemFromDefinition(ingredientDef, ingredient.quantity));
      }
      this.messageLog.addMessage('Crafting failed: inventory changed unexpectedly.', MessageType.SYSTEM);
      this.render();
      return;
    }

    this.messageLog.addMessage(recipe.successMessage, MessageType.ITEM_DROP);
    this.render();
  }

  private getMissingCraftingIngredients(recipe: BlacksmithRecipe): string[] {
    const missing: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const have = this.getInventoryQuantity(ingredient.itemId);
      if (have >= ingredient.quantity) {
        continue;
      }

      const itemName = ITEMS.find((item) => item.id === ingredient.itemId)?.name ?? ingredient.itemId;
      missing.push(`${itemName} x${ingredient.quantity - have}`);
    }

    return missing;
  }

  private consumeCraftingIngredients(recipe: BlacksmithRecipe): boolean {
    for (const ingredient of recipe.ingredients) {
      const entry = this.player.inventory.find((item) => item.id === ingredient.itemId);
      if (!entry || entry.quantity < ingredient.quantity) {
        return false;
      }
    }

    for (const ingredient of recipe.ingredients) {
      const entry = this.player.inventory.find((item) => item.id === ingredient.itemId);
      if (!entry) {
        return false;
      }

      if (entry.quantity === ingredient.quantity) {
        const index = this.player.inventory.indexOf(entry);
        if (index !== -1) {
          this.player.inventory.splice(index, 1);
        }
      } else {
        entry.quantity -= ingredient.quantity;
      }
    }

    return true;
  }

  private getInventoryQuantity(itemId: string): number {
    const entry = this.player.inventory.find((item) => item.id === itemId);
    return entry?.quantity ?? 0;
  }

  private createInventoryItemFromDefinition(
    itemDef: ItemDefinition,
    quantity: number
  ): {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'potion' | 'misc';
    quantity: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    identified?: boolean;
    enchantmentBonus?: number;
    currentDurability?: number;
    maxDurability?: number;
  } {
    const inventoryItem = {
      id: itemDef.id,
      name: itemDef.name,
      type: this.mapItemTypeToInventoryType(itemDef.type),
      quantity,
      rarity: itemDef.rarity,
      identified: true,
    };
    ensureDurability(inventoryItem, itemDef);
    return inventoryItem;
  }

  private mapItemTypeToInventoryType(type: ItemType): 'weapon' | 'armor' | 'potion' | 'misc' {
    if (type === ItemType.WEAPON) return 'weapon';
    if (type === ItemType.ARMOR) return 'armor';
    if (type === ItemType.POTION) return 'potion';
    return 'misc';
  }

  private updateQuestProgress(): void {
    for (const quest of this.player.quests) {
      if (quest.completed) {
        continue;
      }
      const definition = QUEST_DEFINITIONS[quest.id];
      if (!definition) {
        continue;
      }

      if (!this.isQuestCompletionSatisfied(definition.completion)) {
        continue;
      }

      if (this.player.completeQuest(quest.id)) {
        this.messageLog.addMessage(
          `Quest complete: ${definition.title}. Return to ${this.getQuestTurnInName(definition.turnInNpcId)} for your reward.`,
          MessageType.SYSTEM
        );
      }
    }
  }

  private isQuestCompletionSatisfied(completion: QuestCompletionRule): boolean {
    if (completion.type === 'clear_floor') {
      if (completion.floor === undefined || this.currentFloor !== completion.floor) {
        return false;
      }
      const livingMonsters = this.monsters.filter(
        (monster) => !monster.isDead() && !monster.isFriendlySummon
      );
      return livingMonsters.length === 0;
    }

    if (completion.type === 'reach_depth') {
      const depth = completion.depth ?? 0;
      return this.runAnalytics.maxDepthReached >= depth;
    }

    if (completion.type === 'have_item') {
      if (!completion.itemId) {
        return false;
      }
      const quantity = completion.quantity ?? 1;
      return this.getInventoryQuantity(completion.itemId) >= quantity;
    }

    return false;
  }

  private getQuestTurnInName(npcId: string): string {
    const npc = this.npcs.find((entry) => entry.definitionId === npcId);
    if (npc) {
      return npc.name;
    }
    if (npcId === 'aldric') return 'Elder Aldric';
    if (npcId === 'maren') return 'Healer Maren';
    if (npcId === 'vex') return 'Vex';
    if (npcId === 'zane') return 'Hermit Zane';
    return 'the quest giver';
  }

  private recordPlayerDamageDealt(amount: number): void {
    if (amount <= 0) {
      return;
    }
    this.runAnalytics.damageDealt += amount;
  }

  private recordHostileKill(monster: Monster): void {
    if (monster.isFriendlySummon) {
      return;
    }
    this.runAnalytics.kills += 1;
  }

  private noteDeathCauseIfPlayerDead(cause: string): void {
    if (!this.player.isDead()) {
      return;
    }
    this.runAnalytics.causeOfDeath = cause;
  }

  private handleHostileMonsterDeath(monster: Monster, awardXP: boolean): void {
    this.recordHostileKill(monster);
    this.combatSystem.handleDeath(monster, this.gameMap);
    this.gameMap.removeEntity(monster);
    this.monsterAISystem.cleanupMonster(monster);
    if (awardXP && monster.xpReward) {
      this.awardPlayerXP(monster.xpReward);
    }
  }

  private resolvePlayerMeleeAttack(defender: Monster) {
    const result = this.combatSystem.meleeAttack(this.player, defender);
    this.applyTreeCoverMitigation(defender, result.damage);
    return result;
  }

  private resolveMonsterMeleeAttack(attacker: Monster) {
    const result = this.combatSystem.meleeAttack(attacker, this.player);
    this.applyTreeCoverMitigation(this.player, result.damage);
    return result;
  }

  private resolveMonsterRangedAttack(attacker: Monster, distance: number) {
    const result = this.combatSystem.rangedAttack(attacker, this.player, distance);
    this.applyTreeCoverMitigation(this.player, result.damage);
    return result;
  }

  private resolveCompanionMeleeAttack(attacker: Monster, defender: Monster) {
    const result = this.combatSystem.meleeAttack(attacker, defender);
    this.applyTreeCoverMitigation(defender, result.damage);
    return result;
  }

  private applyTreeCoverMitigation(defender: Player | Monster, incomingDamage: number): void {
    if (incomingDamage <= 0 || defender.isDead() || !this.hasAdjacentTreeCover(defender.x, defender.y)) {
      return;
    }

    const prevented = Math.min(TREE_COVER_DAMAGE_REDUCTION, Math.max(0, incomingDamage - 1));
    if (prevented <= 0) {
      return;
    }

    defender.heal(prevented);
    if (defender === this.player) {
      this.messageLog.addMessage(`Tree cover blocks ${prevented} damage.`, MessageType.INFO);
      return;
    }
    const tile = this.gameMap.getTile(defender.x, defender.y);
    if (tile?.visible) {
      this.messageLog.addMessage(`${defender.name} uses tree cover to block ${prevented} damage.`, MessageType.INFO);
    }
  }

  private hasAdjacentTreeCover(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const tile = this.gameMap.getTile(x + dx, y + dy);
        if (tile?.type === TileType.TREE) {
          return true;
        }
      }
    }
    return false;
  }

  private applyLavaBurnEffects(): void {
    if (this.currentFloor <= 0) {
      return;
    }

    const playerTile = this.gameMap.getTile(this.player.x, this.player.y);
    if (playerTile?.type === TileType.LAVA) {
      const damage = this.player.takeDamage(LAVA_BURN_DAMAGE);
      this.messageLog.addMessage(`Lava burns you for ${damage} damage!`, MessageType.DAMAGE);
      this.noteDeathCauseIfPlayerDead('Consumed by lava');
    }

    const monstersOnLava = this.monsters.filter((monster) => {
      if (monster.isDead()) {
        return false;
      }
      const tile = this.gameMap.getTile(monster.x, monster.y);
      return tile?.type === TileType.LAVA;
    });

    for (const monster of monstersOnLava) {
      const damage = monster.takeDamage(LAVA_BURN_DAMAGE);
      const tile = this.gameMap.getTile(monster.x, monster.y);
      if (tile?.visible) {
        this.messageLog.addMessage(`${monster.name} is scorched by lava (${damage}).`, MessageType.DAMAGE);
      }
      if (!monster.isDead()) {
        continue;
      }
      if (monster.isFriendlySummon) {
        this.messageLog.addMessage(`${monster.name} is consumed by lava.`, MessageType.WARNING);
      } else {
        this.handleHostileMonsterDeath(monster, false);
        continue;
      }
      this.gameMap.removeEntity(monster);
      this.monsterAISystem.cleanupMonster(monster);
    }

    const monstersOnCampfire = this.monsters.filter((monster) => {
      if (monster.isDead()) {
        return false;
      }
      const tile = this.gameMap.getTile(monster.x, monster.y);
      return tile?.type === TileType.CAMPFIRE;
    });

    for (const monster of monstersOnCampfire) {
      const damage = monster.takeDamage(CAMPFIRE_BURN_DAMAGE);
      const tile = this.gameMap.getTile(monster.x, monster.y);
      if (tile?.visible) {
        this.messageLog.addMessage(`${monster.name} is burned by fire (${damage}).`, MessageType.DAMAGE);
      }
      if (!monster.isDead()) {
        continue;
      }
      if (monster.isFriendlySummon) {
        this.messageLog.addMessage(`${monster.name} is burned to ash.`, MessageType.WARNING);
      } else {
        this.handleHostileMonsterDeath(monster, false);
        continue;
      }
      this.gameMap.removeEntity(monster);
      this.monsterAISystem.cleanupMonster(monster);
    }
  }

  private executeMonsterAction(
    monster: Monster,
    action: { type: ActionType; targetX?: number; targetY?: number; intent?: 'investigate' }
  ): void {
    switch (action.type) {
      case ActionType.MELEE_ATTACK: {
        const result = this.resolveMonsterMeleeAttack(monster);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        this.noteDeathCauseIfPlayerDead(`Slain by ${monster.name}`);
        this.applyDurabilityWearOnPlayerDefense();
        this.emitMonsterNoise(monster, NOISE_BUDGET.MONSTER_MELEE, 'monster_melee');
        break;
      }
      case ActionType.RANGED_ATTACK: {
        const dx = this.player.x - monster.x;
        const dy = this.player.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const result = this.resolveMonsterRangedAttack(monster, distance);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        this.noteDeathCauseIfPlayerDead(`Shot down by ${monster.name}`);
        this.applyDurabilityWearOnPlayerDefense();
        this.emitMonsterNoise(monster, NOISE_BUDGET.MONSTER_RANGED, 'monster_ranged');
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
        this.emitMonsterNoise(monster, NOISE_BUDGET.MONSTER_MOVE, 'monster_move');
        if (action.intent === 'investigate') {
          const tile = this.gameMap.getTile(monster.x, monster.y);
          if (tile?.visible) {
            this.messageLog.addMessage(`${monster.name} moves toward a suspicious sound.`, MessageType.INFO);
          }
        }
        break;
      }
      case ActionType.SPECIAL_ABILITY:
        this.emitMonsterNoise(monster, NOISE_BUDGET.MONSTER_SPECIAL, 'monster_special');
        break;
      case ActionType.WAIT:
      default:
        break;
    }
  }

  private executeFriendlyCompanionTurn(companion: Monster): void {
    const nearestHostile = this.getNearestHostileMonster(companion);
    if (nearestHostile) {
      const dx = Math.abs(nearestHostile.x - companion.x);
      const dy = Math.abs(nearestHostile.y - companion.y);
      if (Math.max(dx, dy) <= 1) {
        const result = this.resolveCompanionMeleeAttack(companion, nearestHostile);
        this.recordPlayerDamageDealt(result.damage);
        this.messageLog.addMessage(result.message, MessageType.COMBAT);
        this.emitMonsterNoise(companion, NOISE_BUDGET.MONSTER_MELEE, 'companion_melee');
        if (result.killed && nearestHostile.isDead()) {
          this.handleHostileMonsterDeath(nearestHostile, true);
        }
        return;
      }

      const distance = Math.max(dx, dy);
      if (distance <= COMPANION_MAX_CHASE_DISTANCE) {
        if (this.tryMoveMonsterStepToward(companion, nearestHostile.x, nearestHostile.y)) {
          this.emitMonsterNoise(companion, NOISE_BUDGET.MONSTER_MOVE, 'companion_move');
        }
        return;
      }
    }

    const playerDistance = Math.max(Math.abs(this.player.x - companion.x), Math.abs(this.player.y - companion.y));
    if (playerDistance > 2 && this.tryMoveMonsterStepToward(companion, this.player.x, this.player.y)) {
      this.emitMonsterNoise(companion, NOISE_BUDGET.MONSTER_MOVE, 'companion_follow');
    }
  }

  private getNearestHostileMonster(companion: Monster): Monster | null {
    let nearest: Monster | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const monster of this.monsters) {
      if (monster.isDead() || monster.isFriendlySummon || monster === companion) {
        continue;
      }
      const distance = Math.max(Math.abs(monster.x - companion.x), Math.abs(monster.y - companion.y));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = monster;
      }
    }
    return nearest;
  }

  private tryMoveMonsterStepToward(monster: Monster, targetX: number, targetY: number): boolean {
    const stepX = Math.sign(targetX - monster.x);
    const stepY = Math.sign(targetY - monster.y);
    const candidates: Array<{ x: number; y: number }> = [];

    if (stepX !== 0 || stepY !== 0) {
      candidates.push({ x: monster.x + stepX, y: monster.y + stepY });
    }
    if (stepX !== 0) {
      candidates.push({ x: monster.x + stepX, y: monster.y });
    }
    if (stepY !== 0) {
      candidates.push({ x: monster.x, y: monster.y + stepY });
    }

    for (const candidate of candidates) {
      if (!this.canMonsterMoveTo(monster, candidate.x, candidate.y)) {
        continue;
      }
      monster.setPosition(candidate.x, candidate.y);
      return true;
    }
    return false;
  }

  private canMonsterMoveTo(monster: Monster | undefined, x: number, y: number): boolean {
    if (!this.gameMap.isInBounds(x, y)) {
      return false;
    }

    const tile = this.gameMap.getTile(x, y);
    if (!tile || tile.blocked) {
      return false;
    }

    if (this.player.x === x && this.player.y === y) {
      return false;
    }

    const occupiedByMonster = this.monsters.some(
      (other) => other !== monster && !other.isDead() && other.x === x && other.y === y
    );
    if (occupiedByMonster) {
      return false;
    }

    const occupiedByNPC = this.npcs.some((npc) => npc.x === x && npc.y === y);
    return !occupiedByNPC;
  }

  private handlePlayerDeath(): void {
    this.messageLog.addMessage('You have died!', MessageType.COMBAT);
    console.log('Player died!');
    if (this.runAnalytics.causeOfDeath === 'Unknown') {
      this.runAnalytics.causeOfDeath = 'Fatal injuries';
    }
    this.scene.start('GameOverScene', {
      stats: {
        level: this.player.level,
        kills: this.runAnalytics.kills,
        floorsReached: this.currentFloor,
        depthReached: this.runAnalytics.maxDepthReached,
        damageDealt: this.runAnalytics.damageDealt,
        gold: Number(this.player.gold),
        playerClass: this.player.playerClass,
        cause: this.runAnalytics.causeOfDeath,
        buildUsed: this.runAnalytics.buildUsed,
      },
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
        this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'talk_npc');
        this.refreshNpcQuestAvailability(npc);

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
      onInventoryChanged: (action?: 'equip' | 'unequip' | 'use' | 'drop', context?: InventoryChangeContext) => {
        if (
          action === 'use' &&
          context?.phase === 'before_use' &&
          context.itemEffect === COMPANION_SUMMON_EFFECT_ID &&
          context.itemId === COMPANION_SUMMON_ITEM_ID
        ) {
          return this.trySummonCompanion('item');
        }
        if (action === 'use' && context?.phase === 'before_use') {
          return true;
        }
        if (
          action === 'use' &&
          context?.phase === 'after_use' &&
          context.itemEffect === COMPANION_SUMMON_EFFECT_ID &&
          context.itemId === COMPANION_SUMMON_ITEM_ID
        ) {
          this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'summon_companion_item');
          this.processTurn();
          return true;
        }

        if (action === 'use') {
          this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'inventory_use');
        } else if (action === 'drop' || action === 'equip' || action === 'unequip') {
          this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'inventory_manage');
        }
        this.render();
        return true;
      },
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
    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_PICKUP, 'pickup_item');
  }

  private emitPlayerNoise(
    x: number,
    y: number,
    budget: { loudness: number; radius: number },
    reason: string
  ): void {
    if (this.currentFloor <= 0) {
      return;
    }
    this.noiseSystem.emitNoise({
      x,
      y,
      loudness: budget.loudness,
      radius: budget.radius,
      sourceKind: 'player',
      reason,
    });
    if (budget.loudness >= HIGH_NOISE_THRESHOLD) {
      this.messageLog.addMessage('Your action echoes loudly through the dungeon.', MessageType.WARNING);
    }
  }

  private emitMonsterNoise(
    monster: Monster,
    budget: { loudness: number; radius: number },
    reason: string
  ): void {
    if (this.currentFloor <= 0) {
      return;
    }
    this.noiseSystem.emitNoise({
      x: monster.x,
      y: monster.y,
      loudness: budget.loudness,
      radius: budget.radius,
      sourceKind: 'monster',
      reason,
    });
  }

  private toInventoryItem(item: GroundItem): {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'potion' | 'misc';
    quantity: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
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
  } {
    const itemDef = ITEMS.find((entry) => entry.id === item.id);
    const isPotentiallyMagicalEquipment =
      itemDef !== undefined &&
      (itemDef.type === ItemType.WEAPON || itemDef.type === ItemType.ARMOR) &&
      (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary');

    const inventoryItem = {
      id: item.id,
      name: item.name,
      type: item.inventoryType ?? 'misc',
      quantity: item.quantity ?? 1,
      rarity: item.rarity ?? 'common',
      identified: item.identified ?? (isPotentiallyMagicalEquipment ? false : true),
      enchantmentBonus: item.enchantmentBonus,
      currentDurability: item.currentDurability,
      maxDurability: item.maxDurability,
      corpseSourceId: item.corpseSourceId,
      corpseCursed: item.corpseCursed,
      corpseEdible: item.corpseEdible,
      corpseCooked: item.corpseCooked,
      corpseSeasoned: item.corpseSeasoned,
      affixAttackBonus: item.affixAttackBonus,
      affixCritChanceBonus: item.affixCritChanceBonus,
      affixMagicResistBonus: item.affixMagicResistBonus,
    };
    ensureDurability(inventoryItem, itemDef);
    return inventoryItem;
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
          this.pickupSelectionItems.length,
          this.pickupSelectionIndex + 1
        );
        this.drawPickupSelectionOverlay();
        break;
      case 'enter': {
        if (this.pickupSelectionIndex === this.pickupSelectionItems.length) {
          this.pickupAllFromSelection();
          this.closePickupSelection();
          this.processTurn();
          break;
        }
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
    const allMarker = this.pickupSelectionIndex === this.pickupSelectionItems.length ? '>' : ' ';
    lines.push(`${allMarker} All`);
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

  private pickupAllFromSelection(): void {
    let pickedCount = 0;
    let blockedCount = 0;

    for (const item of this.pickupSelectionItems) {
      const inventoryItem = this.toInventoryItem(item);
      if (!this.player.addItem(inventoryItem)) {
        blockedCount++;
        continue;
      }

      this.gameMap.removeItem(item);
      pickedCount++;
    }

    if (pickedCount > 0) {
      this.messageLog.addMessage(`Picked up ${pickedCount} item(s).`, MessageType.SYSTEM);
      this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_PICKUP, 'pickup_item');
    }

    if (blockedCount > 0) {
      this.messageLog.addMessage(
        `${blockedCount} item(s) could not be picked up (inventory full).`,
        MessageType.SYSTEM
      );
    }
  }

  private isCookingSelectionActive(): boolean {
    return this.cookingSelectionItems.length > 0;
  }

  private tryOpenCookingSelection(): void {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('You cannot cook in town right now.', MessageType.SYSTEM);
      this.render();
      return;
    }
    if (!this.isNearFire(this.player.x, this.player.y)) {
      this.messageLog.addMessage('You need to stand near a campfire to cook.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const cookableCorpses = this.getCookableCorpses();
    if (cookableCorpses.length === 0) {
      this.messageLog.addMessage('You have no edible raw corpses to cook.', MessageType.SYSTEM);
      this.render();
      return;
    }

    this.cookingSelectionItems = cookableCorpses;
    this.cookingSelectionIndex = 0;
    this.drawCookingSelectionOverlay();
  }

  private closeCookingSelection(): void {
    this.cookingSelectionItems = [];
    this.cookingSelectionIndex = 0;
    if (this.cookingOverlay) {
      this.cookingOverlay.destroy();
      this.cookingOverlay = undefined;
    }
    this.render();
  }

  private handleCookingSelectionKey(key: string): void {
    if (!this.isCookingSelectionActive()) {
      return;
    }

    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.cookingSelectionIndex = Math.max(0, this.cookingSelectionIndex - 1);
        this.drawCookingSelectionOverlay();
        break;
      case 'arrowdown':
      case 's':
        this.cookingSelectionIndex = Math.min(
          this.cookingSelectionItems.length - 1,
          this.cookingSelectionIndex + 1
        );
        this.drawCookingSelectionOverlay();
        break;
      case 'enter': {
        const selected = this.cookingSelectionItems[this.cookingSelectionIndex];
        this.closeCookingSelection();
        this.cookCorpseItem(selected);
        break;
      }
      case 'escape':
        this.closeCookingSelection();
        break;
      default:
        break;
    }
  }

  private drawCookingSelectionOverlay(): void {
    if (this.cookingOverlay) {
      this.cookingOverlay.destroy();
    }

    const herbsCount = this.getInventoryQuantity('misc_spice_herbs');
    const lines = ['Cook corpse near fire:', `Spice Herbs: ${herbsCount}`, ''];
    for (let i = 0; i < this.cookingSelectionItems.length; i++) {
      const corpse = this.cookingSelectionItems[i];
      const marker = i === this.cookingSelectionIndex ? '>' : ' ';
      const cursedTag = corpse.corpseCursed ? ' [cursed]' : '';
      lines.push(`${marker} ${corpse.name}${cursedTag}`);
    }
    lines.push('');
    lines.push('Enter: cook  Esc: cancel');

    this.cookingOverlay = this.add.text(16, 40, lines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 8 },
    });
    this.cookingOverlay.setDepth(1000);
  }

  private cookCorpseItem(corpse: CorpseInventoryItem): void {
    const consumedCorpse = this.consumeInventoryItemByReference(corpse, 1);
    if (!consumedCorpse) {
      this.messageLog.addMessage('Cooking failed: corpse was not available.', MessageType.ERROR);
      this.render();
      return;
    }

    let seasoned = false;
    if (this.consumeInventoryItemById('misc_spice_herbs', 1)) {
      seasoned = true;
    }

    const cookedName = seasoned ? `Seasoned ${corpse.name}` : `Cooked ${corpse.name}`;
    const cookedItem: CorpseInventoryItem = {
      id: `cooked_${corpse.id}`,
      name: cookedName,
      type: 'misc',
      quantity: 1,
      rarity: corpse.rarity,
      corpseSourceId: corpse.corpseSourceId,
      corpseCursed: corpse.corpseCursed,
      corpseEdible: true,
      corpseCooked: true,
      corpseSeasoned: seasoned,
    };

    if (!this.player.addItem(cookedItem)) {
      this.messageLog.addMessage('Inventory full. The cooked meal is left on the ground.', MessageType.SYSTEM);
      this.gameMap.addItem(
        {
          id: cookedItem.id,
          name: cookedItem.name,
          x: this.player.x,
          y: this.player.y,
          glyph: '%',
          color: seasoned ? 0x55cc55 : 0xcc8844,
          quantity: 1,
          inventoryType: 'misc',
          rarity: cookedItem.rarity,
          corpseSourceId: cookedItem.corpseSourceId,
          corpseCursed: cookedItem.corpseCursed,
          corpseEdible: true,
          corpseCooked: true,
          corpseSeasoned: seasoned,
        },
        this.player.x,
        this.player.y
      );
    } else {
      this.messageLog.addMessage(
        seasoned ? 'You cook and season the corpse into a hearty meal.' : 'You cook the corpse over the fire.',
        MessageType.HEAL
      );
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'cook_corpse');
    this.processTurn();
  }

  private tryEatCorpse(): void {
    const corpses = this.player.inventory.filter(
      (item) => item.type === 'misc' && item.corpseEdible === true
    ) as CorpseInventoryItem[];
    if (corpses.length === 0) {
      this.messageLog.addMessage('You have no edible corpse in your inventory.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const preferred = corpses.find((item) => item.corpseCooked) ?? corpses[0];
    this.consumeInventoryItemByReference(preferred, 1);

    const baseRatio = preferred.corpseCooked ? COOKED_CORPSE_HEAL_RATIO : RAW_CORPSE_HEAL_RATIO;
    const seasonedBonus = preferred.corpseSeasoned ? SEASONED_BONUS_HEAL_RATIO : 0;
    const healAmount = Math.max(3, Math.floor(this.player.maxHP * (baseRatio + seasonedBonus)));
    const healed = this.player.heal(healAmount);
    this.messageLog.addMessage(
      `You eat ${preferred.name} and recover ${healed} HP.`,
      MessageType.HEAL
    );

    const curseChance = preferred.corpseCursed
      ? preferred.corpseCooked
        ? preferred.corpseSeasoned
          ? 0.15
          : 0.3
        : 0.7
      : 0;
    const poisonChance = preferred.corpseCooked ? 0.05 : 0.2;
    if (preferred.corpseCursed && Math.random() < curseChance) {
      const curseTypes: Array<'curse_weakness' | 'curse_frailty' | 'curse_wither'> = [
        'curse_weakness',
        'curse_frailty',
        'curse_wither',
      ];
      const curseType = curseTypes[Math.floor(Math.random() * curseTypes.length)];
      this.player.addStatusEffect({ type: curseType, duration: 5, power: 2 });
      this.messageLog.addMessage('Dark energies seep from the meal and curse you.', MessageType.WARNING);
    } else if (!preferred.corpseCursed && Math.random() < poisonChance) {
      this.player.addStatusEffect({ type: 'poison', duration: 4, power: 2 });
      this.messageLog.addMessage('The meat was tainted. You are poisoned!', MessageType.WARNING);
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'eat_corpse');
    this.processTurn();
  }

  private tryCastCompanionSpell(): void {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('Your summoning magic only answers in the dungeon.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (!this.player.useMana(COMPANION_SPELL_MANA_COST)) {
      this.messageLog.addMessage(
        `Not enough mana to summon a companion (${COMPANION_SPELL_MANA_COST} MP needed).`,
        MessageType.SYSTEM
      );
      this.render();
      return;
    }

    if (!this.trySummonCompanion('spell')) {
      this.player.restoreMana(COMPANION_SPELL_MANA_COST);
      this.render();
      return;
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_USE_ITEM, 'summon_companion_spell');
    this.processTurn();
  }

  private tryPerformPlayerRangedAttack(): void {
    const rangedWeapon = this.getEquippedRangedWeapon();
    if (rangedWeapon) {
      this.performWeaponRangedAttack(rangedWeapon);
      return;
    }

    if (this.player.playerClass === 'mage') {
      this.performArcaneBoltAttack();
      return;
    }

    this.messageLog.addMessage(
      'Equip a ranged weapon (rocks, bow, crossbow, wand, or spear) to attack from distance.',
      MessageType.SYSTEM
    );
    this.render();
  }

  private getEquippedRangedWeapon(): Weapon | null {
    const equippedWeapon = this.player.equipment.weapon;
    if (!equippedWeapon) {
      return null;
    }

    const weaponDefinition = ITEMS.find(
      (item): item is Weapon => item.id === equippedWeapon.id && item.type === ItemType.WEAPON
    );
    if (!weaponDefinition || weaponDefinition.range <= 1) {
      return null;
    }

    return weaponDefinition;
  }

  private performWeaponRangedAttack(weapon: Weapon): void {
    const target = this.findNearestVisibleHostileMonster(this.player.x, this.player.y, weapon.range);
    if (!target) {
      this.messageLog.addMessage(`No hostile target in range for ${weapon.name}.`, MessageType.SYSTEM);
      this.render();
      return;
    }

    const distance = Math.sqrt((target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2);
    const result = this.combatSystem.rangedAttack(this.player, target, distance);
    this.messageLog.addMessage(result.message, MessageType.COMBAT);
    this.recordPlayerDamageDealt(result.damage);
    this.applyDurabilityWearOnPlayerAttack();

    if (target.isDead()) {
      this.handleHostileMonsterDeath(target, true);
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_RANGED, 'player_ranged_weapon');
    this.processTurn();
  }

  private performArcaneBoltAttack(): void {
    const target = this.findNearestVisibleHostileMonster(this.player.x, this.player.y, ARCANE_BOLT_RANGE);
    if (!target) {
      this.messageLog.addMessage('No hostile target in sight for Arcane Bolt.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const spell: Spell = {
      name: 'Arcane Bolt',
      manaCost: ARCANE_BOLT_MANA_COST,
      spellPower: ARCANE_BOLT_POWER,
      damageType: 'arcane',
    };

    const result = this.combatSystem.magicAttack(this.player, target, spell);
    this.messageLog.addMessage(result.message, MessageType.COMBAT);
    if (!result.hit) {
      this.render();
      return;
    }
    this.recordPlayerDamageDealt(result.damage);

    if (target.isDead()) {
      this.handleHostileMonsterDeath(target, true);
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_RANGED, 'player_arcane_bolt');
    this.processTurn();
  }

  private tryCastLightningBolt(): void {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('Lightning casting is only available in the dungeon.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const target = this.findNearestVisibleHostileMonster(this.player.x, this.player.y, LIGHTNING_SPELL_RANGE);
    if (!target) {
      this.messageLog.addMessage('No hostile target in sight for Lightning Bolt.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const spell: Spell = {
      name: 'Lightning Bolt',
      manaCost: LIGHTNING_SPELL_MANA_COST,
      spellPower: LIGHTNING_SPELL_POWER,
      damageType: 'lightning',
    };
    const result = this.combatSystem.magicAttack(this.player, target, spell);
    this.messageLog.addMessage(result.message, MessageType.COMBAT);
    if (!result.hit) {
      this.render();
      return;
    }
    this.recordPlayerDamageDealt(result.damage);

    let totalLightningDamage = result.damage;
    if (!target.isDead() && this.isEntityOnWater(target)) {
      const bonusDamage = Math.max(1, Math.floor(result.damage * (WATER_LIGHTNING_BONUS_MULTIPLIER - 1)));
      const dealt = target.takeDamage(bonusDamage);
      if (dealt > 0) {
        this.messageLog.addMessage(`Water amplifies lightning for +${dealt} damage!`, MessageType.WARNING);
        totalLightningDamage += dealt;
        this.recordPlayerDamageDealt(dealt);
      }
    }

    this.applyTreeCoverMitigation(target, totalLightningDamage);

    if (target.isDead()) {
      this.handleHostileMonsterDeath(target, true);
    }

    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_RANGED, 'cast_lightning');
    this.processTurn();
  }

  private findNearestVisibleHostileMonster(originX: number, originY: number, range: number): Monster | null {
    let nearest: Monster | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const monster of this.monsters) {
      if (monster.isDead() || monster.isFriendlySummon) {
        continue;
      }
      const tile = this.gameMap.getTile(monster.x, monster.y);
      if (!tile?.visible) {
        continue;
      }
      const distance = Math.sqrt((monster.x - originX) ** 2 + (monster.y - originY) ** 2);
      if (distance > range || distance >= nearestDistance) {
        continue;
      }
      nearest = monster;
      nearestDistance = distance;
    }
    return nearest;
  }

  private isEntityOnWater(entity: Player | Monster): boolean {
    const tile = this.gameMap.getTile(entity.x, entity.y);
    return tile?.type === TileType.WATER;
  }

  private trySummonCompanion(source: 'item' | 'spell'): boolean {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('Companions can only be summoned in the dungeon.', MessageType.SYSTEM);
      return false;
    }

    const existing = this.getActiveCompanion();
    if (existing) {
      const nearby = this.findFreeAdjacentTile(this.player.x, this.player.y);
      existing.currentHP = existing.maxHP;
      if (nearby) {
        existing.setPosition(nearby.x, nearby.y);
      }
      this.messageLog.addMessage(
        source === 'spell'
          ? `${existing.name} answers your call again.`
          : `${existing.name} emerges from the scroll's sigil.`,
        MessageType.INFO
      );
      return true;
    }

    const spawnPos = this.findFreeAdjacentTile(this.player.x, this.player.y);
    if (!spawnPos) {
      this.messageLog.addMessage('No open space nearby to summon a companion.', MessageType.SYSTEM);
      return false;
    }

    const companion = new Monster(
      spawnPos.x,
      spawnPos.y,
      COMPANION_NAME,
      COMPANION_GLYPH,
      COMPANION_COLOR,
      COMPANION_STATS.maxHP,
      COMPANION_STATS.attack,
      COMPANION_STATS.defense,
      COMPANION_STATS.speed,
      AIBehavior.AGGRESSIVE,
      0
    );
    companion.templateId = COMPANION_TEMPLATE_ID;
    companion.isFriendlySummon = true;
    companion.summonOwner = 'player';
    companion.persistAcrossFloors = true;
    companion.companionId = 'wolf';

    this.monsters.push(companion);
    this.gameMap.addEntity(companion);
    this.messageLog.addMessage(
      source === 'spell'
        ? 'You weave mana into a loyal wolf companion.'
        : 'The scroll manifests a loyal wolf companion.',
      MessageType.INFO
    );
    return true;
  }

  private getActiveCompanion(): Monster | null {
    return (
      this.monsters.find(
        (monster) => !monster.isDead() && monster.isFriendlySummon && monster.summonOwner === 'player'
      ) ?? null
    );
  }

  private findFreeAdjacentTile(centerX: number, centerY: number): { x: number; y: number } | null {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const x = centerX + dx;
        const y = centerY + dy;
        if (this.canMonsterMoveTo(undefined, x, y)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private tryMakeFire(): void {
    if (this.currentFloor <= 0) {
      this.messageLog.addMessage('No need to build a fire in town.', MessageType.SYSTEM);
      this.render();
      return;
    }

    if (!this.consumeInventoryItemById('misc_tinderbox', 1)) {
      this.messageLog.addMessage('You need a tinderbox to start a fire.', MessageType.SYSTEM);
      this.render();
      return;
    }

    const tile = this.gameMap.getTile(this.player.x, this.player.y);
    if (!tile || tile.type !== TileType.FLOOR) {
      this.messageLog.addMessage('You cannot start a fire on this tile.', MessageType.SYSTEM);
      this.player.addItem({
        id: 'misc_tinderbox',
        name: 'Tinderbox',
        type: 'misc',
        quantity: 1,
        rarity: 'common',
      });
      this.render();
      return;
    }

    this.gameMap.setTile(this.player.x, this.player.y, TileType.CAMPFIRE, false, false);
    this.messageLog.addMessage('You ignite a campfire using your tinderbox.', MessageType.INFO);
    this.emitPlayerNoise(this.player.x, this.player.y, NOISE_BUDGET.PLAYER_INTERACT, 'make_fire');
    this.processTurn();
  }

  private isNearFire(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = this.gameMap.getTile(x + dx, y + dy);
        if (tile?.type === TileType.CAMPFIRE) {
          return true;
        }
      }
    }
    return false;
  }

  private getCookableCorpses(): CorpseInventoryItem[] {
    return this.player.inventory.filter(
      (item) => item.type === 'misc' && item.corpseEdible === true && item.corpseCooked !== true
    ) as CorpseInventoryItem[];
  }

  private consumeInventoryItemById(itemId: string, quantity: number): boolean {
    const entry = this.player.inventory.find((item) => item.id === itemId);
    if (!entry || entry.quantity < quantity) {
      return false;
    }
    if (entry.quantity === quantity) {
      const index = this.player.inventory.indexOf(entry);
      if (index !== -1) {
        this.player.inventory.splice(index, 1);
      }
    } else {
      entry.quantity -= quantity;
    }
    return true;
  }

  private consumeInventoryItemByReference(item: CorpseInventoryItem, quantity: number): boolean {
    if (item.quantity < quantity) {
      return false;
    }
    if (item.quantity === quantity) {
      const index = this.player.inventory.indexOf(item);
      if (index !== -1) {
        this.player.inventory.splice(index, 1);
      }
    } else {
      item.quantity -= quantity;
    }
    return true;
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
    npc.definitionId = npcDef.id;
    npc.questIds = this.getAvailableQuestIdsForNpc(npcDef.id);
    npc.shopInventoryIds = npcDef.inventory ? [...npcDef.inventory] : [];
    this.populateNPCDialogues(npc, npcDef);

    return npc;
  }

  private refreshNpcQuestAvailability(npc: NPC): void {
    if (!npc.definitionId) {
      return;
    }
    npc.questIds = this.getAvailableQuestIdsForNpc(npc.definitionId);
    const npcDefinition = NPCS.find((entry) => entry.id === npc.definitionId);
    if (npcDefinition) {
      this.populateNPCDialogues(npc, npcDefinition);
    }
  }

  private getAvailableQuestIdsForNpc(npcId: string): string[] {
    const configuredQuestIds = getQuestIdsForNpc(npcId);
    if (configuredQuestIds.length === 0) {
      return [];
    }

    if (!this.player) {
      return configuredQuestIds.filter((questId) => {
        const quest = QUEST_DEFINITIONS[questId];
        return !!quest && (!quest.requiresCompletedQuestIds || quest.requiresCompletedQuestIds.length === 0);
      });
    }

    return configuredQuestIds.filter((questId) => {
      const quest = QUEST_DEFINITIONS[questId];
      if (!quest) {
        return false;
      }
      if (
        !isQuestUnlocked(quest, (dependencyQuestId) =>
          this.player.isQuestRewardClaimed(dependencyQuestId)
        )
      ) {
        return false;
      }
      return !this.player.hasAcceptedQuest(questId) && !this.player.isQuestRewardClaimed(questId);
    });
  }

  private populateNPCDialogues(npc: NPC, npcDef: NPCDefinition): void {
    npc.dialogues.clear();
    const dialogueNodes = npcDef.dialogue.map((dialogue) => ({
      id: dialogue.id,
      text: dialogue.text,
      options: dialogue.options
        .filter((option) => this.isDialogueOptionVisible(option.action, npc))
        .map((option) => ({
          id: option.text.substring(0, 20),
          text: option.text,
          actionId: option.action || undefined,
          nextDialogueId: option.nextDialogueId,
          action: option.action ? () => console.log('Action:', option.action) : undefined,
        })),
    }));
    npc.addDialogues(dialogueNodes);
  }

  private isDialogueOptionVisible(action: string, npc: NPC): boolean {
    if (!action) {
      return true;
    }

    if (!this.player) {
      return action !== 'claim_quest_reward' && !action.startsWith('accept_quest');
    }

    if (action === 'claim_quest_reward') {
      return npc.definitionId ? this.getClaimableQuestForNpc(npc.definitionId) !== null : false;
    }

    if (action.startsWith('accept_quest')) {
      return this.resolveQuestIdForAction(action, npc.questIds) !== null;
    }

    return true;
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

  private detachPersistentCompanionForTransition(): Monster | null {
    const companion = this.getActiveCompanion();
    if (!companion || !companion.persistAcrossFloors) {
      return null;
    }
    this.gameMap.removeEntity(companion);
    this.monsters = this.monsters.filter((monster) => monster !== companion);
    this.monsterAISystem.cleanupMonster(companion);
    return companion;
  }

  private attachPersistentCompanionAfterTransition(companion: Monster | null): void {
    if (!companion) {
      return;
    }

    for (const existing of this.monsters.filter((monster) => monster.isFriendlySummon)) {
      this.gameMap.removeEntity(existing);
      this.monsterAISystem.cleanupMonster(existing);
    }
    this.monsters = this.monsters.filter((monster) => !monster.isFriendlySummon);

    const spawnPos = this.findFreeAdjacentTile(this.player.x, this.player.y);
    if (!spawnPos) {
      this.messageLog.addMessage(`${companion.name} could not find a safe place on this floor.`, MessageType.WARNING);
      return;
    }

    companion.setPosition(spawnPos.x, spawnPos.y);
    this.monsters.push(companion);
    this.gameMap.addEntity(companion);
    this.messageLog.addMessage(`${companion.name} follows you to the next floor.`, MessageType.INFO);
  }

  private enterDungeonFloor(
    targetFloor: number,
    entryStairType: TileType.STAIRS_UP | TileType.STAIRS_DOWN,
    carriedCompanion: Monster | null = null
  ): void {
    const previousFloor = this.currentFloor;
    const previousMap = this.gameMap;
    this.currentFloor = targetFloor;
    this.runAnalytics.maxDepthReached = Math.max(this.runAnalytics.maxDepthReached, targetFloor);
    this.noiseSystem.clear();
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

    if (this.gameMap === previousMap && targetFloor !== previousFloor) {
      const dungeonGen = new DungeonGenerator();
      this.gameMap = dungeonGen.generate(targetFloor, 80, 40);
      this.monsters = this.monsterSpawnSystem.spawnMonstersInDungeon(this.gameMap, targetFloor);
      this.itemSpawnSystem.spawnItemsInDungeon(this.gameMap, targetFloor);
      this.spawnNPCsForDungeon(targetFloor);
    }

    const stairPos =
      this.findStairPosition(entryStairType) ??
      this.ensureEntryStair(entryStairType) ??
      { x: 40, y: 20 };
    const safeSpawn = this.findSafeSpawnNear(stairPos.x, stairPos.y, 10);
    this.player.setPosition(safeSpawn.x, safeSpawn.y);
    this.gameMap.addEntity(this.player);
    this.attachPersistentCompanionAfterTransition(carriedCompanion);

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
    this.messageLog.addMessage(`Entered dungeon level ${targetFloor}.`, MessageType.INFO);
    this.render();
  }

  private ensureEntryStair(type: TileType.STAIRS_UP | TileType.STAIRS_DOWN): { x: number; y: number } | null {
    const centerX = Math.floor(this.gameMap.width / 2);
    const centerY = Math.floor(this.gameMap.height / 2);
    const safe = this.findSafeSpawnNear(centerX, centerY, 12);
    const tile = this.gameMap.getTile(safe.x, safe.y);
    if (!tile || tile.type !== TileType.FLOOR) {
      return null;
    }
    this.gameMap.setTile(safe.x, safe.y, type, false, false);
    return { x: safe.x, y: safe.y };
  }

  private goDownStairs(): void {
    this.clearAltarPactOnFloorExit();
    this.closeAltarSelectionOverlay();
    const carriedCompanion = this.detachPersistentCompanionForTransition();
    this.cacheCurrentDungeonFloorState();
    const targetFloor = this.currentFloor + 1;
    console.log('=== DESCENDING TO FLOOR', targetFloor, '===');
    this.messageLog.addMessage(`Descending to dungeon level ${targetFloor}...`, MessageType.SYSTEM);
    this.enterDungeonFloor(targetFloor, TileType.STAIRS_UP, carriedCompanion);
    console.log('=== FLOOR', targetFloor, 'READY ===');
  }

  private goUpStairs(): void {
    this.clearAltarPactOnFloorExit();
    this.closeAltarSelectionOverlay();
    if (this.currentFloor === 1) {
      const carriedCompanion = this.detachPersistentCompanionForTransition();
      this.cacheCurrentDungeonFloorState();
      this.currentFloor = 0;
      console.log('=== RETURNING TO TOWN ===');
      this.messageLog.addMessage('Returning to town...', MessageType.SYSTEM);
      
      // Clear monsters when returning to town
      this.monsters = [];
      this.noiseSystem.clear();
      
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
      if (carriedCompanion) {
        this.messageLog.addMessage(
          `${carriedCompanion.name} waits for you at the dungeon entrance.`,
          MessageType.INFO
        );
      }
      
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
      const carriedCompanion = this.detachPersistentCompanionForTransition();
      this.cacheCurrentDungeonFloorState();
      const targetFloor = this.currentFloor - 1;
      console.log('=== ASCENDING TO FLOOR', targetFloor, '===');
      this.messageLog.addMessage(`Ascending to dungeon level ${targetFloor}...`, MessageType.SYSTEM);
      this.enterDungeonFloor(targetFloor, TileType.STAIRS_DOWN, carriedCompanion);
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
          case TileType.LAVA:
            glyph = '~';
            color = tile.visible ? 0xff6600 : 0x7a2e00;
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
          case TileType.CHEST_CLOSED:
            glyph = 'C';
            color = tile.visible ? 0xcc8800 : 0x664400;
            break;
          case TileType.CHEST_OPEN:
            glyph = 'c';
            color = tile.visible ? 0xaa7733 : 0x553311;
            break;
          case TileType.ALTAR:
            glyph = 'A';
            color = tile.visible ? 0xff44ff : 0x772277;
            break;
          case TileType.CAMPFIRE:
            glyph = '^';
            color = tile.visible ? 0xffee66 : 0x996600;
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

    let trapsRendered = 0;
    const traps = this.getTrapsArraySafe();
    for (const trap of traps) {
      if (trap.disarmed || !trap.revealed) {
        continue;
      }
      const tile = this.gameMap.getTile(trap.x, trap.y);
      if (tile && tile.visible) {
        this.asciiRenderer.drawTile(trap.x, trap.y, '^', 0xff4444);
        trapsRendered++;
      }
    }
    if (trapsRendered > 0) {
      console.log(`Rendered ${trapsRendered} traps`);
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
        const drawColor = monster.isFriendlySummon ? COMPANION_COLOR : monster.color;
        this.asciiRenderer.drawTile(monster.x, monster.y, monster.glyph, drawColor);
      }
    }

    // Render player
    this.asciiRenderer.drawTile(this.player.x, this.player.y, '@', 0xffffff);

    // Render HUD (top line)
    const status = `${this.player.playerClass.toUpperCase()} Lv${this.player.level} | HP: ${this.player.currentHP}/${this.player.maxHP} | XP: ${this.player.xp} | Gold: ${this.player.getGoldString()} | Floor: ${this.currentFloor === 0 ? 'Town' : this.currentFloor}`;
    this.asciiRenderer.drawText(1, 0, status, 0xffff00);

    const objective = this.player.getPrimaryObjectiveText();
    if (objective) {
      this.asciiRenderer.drawText(1, 2, `Quest: ${objective}`.substring(0, 78), 0x66ccff);
    }

    // Render messages (bottom 3 lines)
    const msgs = this.messageLog.getMessages(3);
    for (let i = 0; i < msgs.length; i++) {
      this.asciiRenderer.drawText(1, 37 + i, msgs[msgs.length - 1 - i].text.substring(0, 78), 0x00ff00);
    }

    // Controls hint
    this.asciiRenderer.drawText(
      1,
      1,
      'Move: Arrows/WASD | Q ranged | G pickup | I inv | T talk | F drink | X disarm | R altar | V summon | L lightning | </> stairs',
      0xaaaaaa
    );

    // No animations are running: sleep loop shortly after each completed render.
    this.scheduleIdleSleep();
  }
}
