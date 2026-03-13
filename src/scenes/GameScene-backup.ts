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
    console.log('Starting game with class:', playerClass);
    
    // Generate town
    const townGen = new TownGenerator();
    const townData = townGen.generate();
    this.gameMap = townData.map;
    
    // Find spawn point (avoid stairs and special tiles)
    let spawnX = 40, spawnY = 20;
    let foundSpawn = false;
    outerLoop:
    for (let y = 1; y < this.gameMap.height - 1; y++) {
      for (let x = 1; x < this.gameMap.width - 1; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile && 
            tile.type === TileType.FLOOR && 
            !this.gameMap.isBlocked(x, y)) {
          // Make sure we're not too close to stairs
          let nearStairs = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const checkTile = this.gameMap.getTile(x + dx, y + dy);
              if (checkTile && (checkTile.type === TileType.STAIRS_DOWN || checkTile.type === TileType.STAIRS_UP)) {
                nearStairs = true;
                break;
              }
            }
            if (nearStairs) break;
          }
          if (!nearStairs) {
            spawnX = x;
            spawnY = y;
            foundSpawn = true;
            break outerLoop;
          }
        }
      }
    }
    
    if (!foundSpawn) {
      console.warn('Could not find safe spawn, using default');
    }
    
    this.player = new Player(spawnX, spawnY, playerClass);
    this.gameMap.addEntity(this.player);
    this.messageLog = new MessageLog();
    this.messageLog.addMessage(`Welcome, ${data.selectedClass?.name || 'Warrior'}!`);
    console.log(`Player spawned in town at ${spawnX}, ${spawnY}`);
  }

  create(): void {
    // Black background
    this.add.rectangle(480, 240, 960, 480, 0x000000).setOrigin(0.5);

    // ASCII renderer (80x40 grid, 12x12 pixels per tile = 960x480)
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);

    // Setup keyboard
    this.keys = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Compute initial FOV
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    console.log(`Initial FOV computed at ${this.player.x}, ${this.player.y}`);

    // Initial render
    this.render();
    console.log('Initial render complete');
  }

  update(): void {
    // Handle movement
    let dx = 0, dy = 0;

    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      dy = -1;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      dy = 1;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      dx = -1;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      dx = 1;
    }

    if (dx !== 0 || dy !== 0) {
      console.log(`Movement: dx=${dx}, dy=${dy}, playerPos=(${this.player.x},${this.player.y})`);
      this.tryMove(dx, dy);
    }
  }

  private tryMove(dx: number, dy: number): void {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    // Check bounds
    if (!this.gameMap.isInBounds(newX, newY)) return;

    // Check if blocked
    if (this.gameMap.isBlocked(newX, newY)) {
      const tile = this.gameMap.getTile(newX, newY);
      
      // Try to open doors
      if (tile && tile.type === TileType.DOOR_CLOSED) {
        tile.type = TileType.DOOR_OPEN;
        tile.blocked = false;
        this.messageLog.addMessage('You open the door.', MessageType.SYSTEM);
        this.render();
      } else {
        this.messageLog.addMessage('Blocked!', MessageType.SYSTEM);
      }
      return;
    }

    // Check for stairs
    const tile = this.gameMap.getTile(newX, newY);
    if (!tile) return;
    if (tile.type === TileType.STAIRS_DOWN) {
      this.goDownStairs();
      return;
    } else if (tile.type === TileType.STAIRS_UP) {
      this.goUpStairs();
      return;
    }

    // Move player
    this.player.setPosition(newX, newY);
    
    // Recompute FOV
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    
    // Render
    this.render();
  }

  private goDownStairs(): void {
    this.currentFloor++;
    this.messageLog.addMessage(`Descending to dungeon level ${this.currentFloor}...`, MessageType.SYSTEM);
    
    // Generate dungeon
    const dungeonGen = new DungeonGenerator();
    this.gameMap = dungeonGen.generate(this.currentFloor, 80, 40);
    
    // Find stairs up to spawn player
    let spawnX = 40, spawnY = 20;
    let foundStairs = false;
    outerLoop:
    for (let y = 1; y < this.gameMap.height - 1; y++) {
      for (let x = 1; x < this.gameMap.width - 1; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile && tile.type === TileType.STAIRS_UP) {
          spawnX = x;
          spawnY = y;
          foundStairs = true;
          break outerLoop;
        }
      }
    }
    
    if (!foundStairs) {
      console.warn('No stairs up found, using default spawn position');
    }
    
    this.player.setPosition(spawnX, spawnY);
    this.gameMap.addEntity(this.player);
    fovSystem.compute(this.gameMap, this.player.x, this.player.y, 8);
    this.render();
    console.log(`Player spawned at ${spawnX}, ${spawnY} on floor ${this.currentFloor}`);
  }

  private goUpStairs(): void {
    if (this.currentFloor === 1) {
      this.currentFloor = 0;
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

    // Count explored tiles for debugging
    let exploredCount = 0;
    let visibleCount = 0;

    // Render tiles
    for (let y = 0; y < Math.min(40, this.gameMap.height); y++) {
      for (let x = 0; x < Math.min(80, this.gameMap.width); x++) {
        const tile = this.gameMap.getTile(x, y);
        if (!tile) continue;
        
        if (tile.explored) exploredCount++;
        if (tile.visible) visibleCount++;
        
        if (!tile.explored) continue;

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

    // Log render stats
    console.log(`Render: ${exploredCount} explored, ${visibleCount} visible tiles`);

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
