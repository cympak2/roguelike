import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { CharacterClass } from '../config/class-data';
import { Player } from '../entities/player';
import { GameMap, TileType } from '../world/map';
import { TownGenerator } from '../world/town-gen';
import { DungeonGenerator } from '../world/dungeon-gen';
import { fovSystem } from '../world/fov';
import { MessageLog, MessageType } from '../ui/message-log';

export class GameScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private player!: Player;
  private gameMap!: GameMap;
  private messageLog!: MessageLog;
  private currentFloor: number = 0; // 0 = town
  private keys!: { [key: string]: Phaser.Input.Keyboard.Key };

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
    this.messageLog.addMessage(`Welcome, ${data.selectedClass?.name || 'Warrior'}! Use arrow keys or WASD to move.`);
    
    console.log('Player created:', this.player.playerClass, 'at', this.player.x, this.player.y);
  }

  create(): void {
    console.log('=== GAME CREATE ===');
    
    // Black background
    this.add.rectangle(480, 240, 960, 480, 0x000000).setOrigin(0.5);

    // ASCII renderer (80x40 grid, 12x12 pixels per tile = 960x480)
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);
    console.log('ASCII renderer created');

    // Setup keyboard - use simpler approach
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyPress(event.key);
    });
    console.log('Keyboard input registered');

    // Compute initial FOV
    console.log('Computing FOV at', this.player.x, this.player.y);
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    
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

    // Initial render
    this.render();
    console.log('=== GAME READY ===');
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
      console.log('Out of bounds');
      return;
    }

    // Check if blocked
    if (this.gameMap.isBlocked(newX, newY)) {
      const tile = this.gameMap.getTile(newX, newY);
      
      // Try to open doors
      if (tile && tile.type === TileType.DOOR_CLOSED) {
        tile.type = TileType.DOOR_OPEN;
        tile.blocked = false;
        this.messageLog.addMessage('You open the door.', MessageType.SYSTEM);
        console.log('Opened door at', newX, newY);
        this.render();
      } else {
        this.messageLog.addMessage('Blocked!', MessageType.SYSTEM);
        console.log('Blocked by', tile?.type);
      }
      return;
    }

    // Check for stairs
    const tile = this.gameMap.getTile(newX, newY);
    if (!tile) {
      console.log('No tile at destination');
      return;
    }
    
    if (tile.type === TileType.STAIRS_DOWN) {
      console.log('Player stepped on stairs down');
      this.goDownStairs();
      return;
    } else if (tile.type === TileType.STAIRS_UP) {
      console.log('Player stepped on stairs up');
      this.goUpStairs();
      return;
    }

    // Move player
    this.player.setPosition(newX, newY);
    console.log('Player moved to', newX, newY);
    
    // Recompute FOV
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    
    // Render
    this.render();
  }

  private goDownStairs(): void {
    this.currentFloor++;
    console.log('=== DESCENDING TO FLOOR', this.currentFloor, '===');
    this.messageLog.addMessage(`Descending to dungeon level ${this.currentFloor}...`, MessageType.SYSTEM);
    
    // Generate dungeon
    const dungeonGen = new DungeonGenerator();
    this.gameMap = dungeonGen.generate(this.currentFloor, 80, 40);
    console.log('Dungeon generated');
    
    // Find stairs up to spawn player near them
    let spawnX = 40, spawnY = 20;
    let foundStairs = false;
    
    for (let y = 1; y < this.gameMap.height - 1; y++) {
      for (let x = 1; x < this.gameMap.width - 1; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile && tile.type === TileType.STAIRS_UP) {
          spawnX = x;
          spawnY = y;
          foundStairs = true;
          console.log('Found stairs up at', x, y);
          break;
        }
      }
      if (foundStairs) break;
    }
    
    if (!foundStairs) {
      console.warn('No stairs up found! Using default spawn');
    }
    
    this.player.setPosition(spawnX, spawnY);
    this.gameMap.addEntity(this.player);
    console.log('Player spawned at', spawnX, spawnY);
    
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    this.render();
    console.log('=== FLOOR', this.currentFloor, 'READY ===');
  }

  private goUpStairs(): void {
    if (this.currentFloor === 1) {
      this.currentFloor = 0;
      console.log('=== RETURNING TO TOWN ===');
      this.messageLog.addMessage('Returning to town...', MessageType.SYSTEM);
      
      const townGen = new TownGenerator();
      const townData = townGen.generate();
      this.gameMap = townData.map;
      this.player.setPosition(40, 20);
      this.gameMap.addEntity(this.player);
      fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
      this.render();
    } else if (this.currentFloor > 1) {
      this.currentFloor--;
      console.log('=== ASCENDING TO FLOOR', this.currentFloor, '===');
      this.messageLog.addMessage(`Ascending to dungeon level ${this.currentFloor}...`, MessageType.SYSTEM);
      
      const dungeonGen = new DungeonGenerator();
      this.gameMap = dungeonGen.generate(this.currentFloor, 80, 40);
      this.player.setPosition(40, 20);
      this.gameMap.addEntity(this.player);
      fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
      this.render();
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
        }

        this.asciiRenderer.drawTile(x, y, glyph, color);
      }
    }

    console.log('Rendered', renderedCount, 'tiles');

    // Render player
    this.asciiRenderer.drawTile(this.player.x, this.player.y, '@', 0xffffff);

    // Render HUD (top line)
    const status = `${this.player.playerClass.toUpperCase()} | HP: ${this.player.currentHP}/${this.player.maxHP} | Floor: ${this.currentFloor === 0 ? 'Town' : this.currentFloor}`;
    this.asciiRenderer.drawText(1, 0, status, 0xffff00);

    // Render messages (bottom 3 lines)
    const msgs = this.messageLog.getMessages(3);
    for (let i = 0; i < msgs.length; i++) {
      this.asciiRenderer.drawText(1, 37 + i, msgs[msgs.length - 1 - i].text.substring(0, 78), 0x00ff00);
    }

    // Controls hint
    this.asciiRenderer.drawText(1, 1, 'Arrow keys / WASD to move | > stairs down | < stairs up', 0xaaaaaa);
  }
}
