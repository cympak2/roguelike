import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { ModalBackground } from '../ui/modal-background';
import { Player, type InventoryItem } from '../entities/player';
import { ITEMS, ItemType, type ItemDefinition } from '../config/item-data';

interface ShopSceneInitData {
  player?: Player;
  npcName?: string;
  inventoryIds?: string[];
  shopAction?: string;
}

export class ShopScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private modalBackground!: ModalBackground;
  private player!: Player;
  private npcName: string = 'Merchant';
  private shopAction: string = 'open_shop';
  private stock: ItemDefinition[] = [];
  private selectedIndex: number = 0;
  private listOffset: number = 0;
  private feedbackMessage: string = '';

  private readonly panelX = 6;
  private readonly panelY = 3;
  private readonly panelWidth = 68;
  private readonly panelHeight = 24;
  private readonly visibleRows = 10;

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data: ShopSceneInitData): void {
    if (!data.player) {
      throw new Error('ShopScene requires a player');
    }
    this.player = data.player;
    this.npcName = data.npcName ?? 'Merchant';
    this.shopAction = data.shopAction ?? 'open_shop';
    this.stock = this.resolveShopStock(data.inventoryIds ?? [], this.shopAction);
    this.selectedIndex = 0;
    this.listOffset = 0;
    this.feedbackMessage = this.stock.length === 0 ? 'No items available.' : '';
  }

  create(): void {
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);
    this.modalBackground = new ModalBackground(
      this,
      this.panelX,
      this.panelY,
      this.panelWidth,
      this.panelHeight
    );

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'escape' || key === 'i') {
        this.closeShop();
        event.preventDefault();
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.moveSelection(-1);
        event.preventDefault();
        return;
      }
      if (key === 'arrowdown' || key === 's') {
        this.moveSelection(1);
        event.preventDefault();
        return;
      }
      if (key === 'enter') {
        this.buySelectedItem();
        event.preventDefault();
      }
    });

    this.draw();
  }

  private closeShop(): void {
    this.modalBackground.hide();
    this.asciiRenderer.clear();
    this.scene.resume('GameScene');
    this.scene.stop('ShopScene');
  }

  private moveSelection(delta: number): void {
    if (this.stock.length === 0) {
      return;
    }
    this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + delta, 0, this.stock.length - 1);
    if (this.selectedIndex < this.listOffset) {
      this.listOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.listOffset + this.visibleRows) {
      this.listOffset = this.selectedIndex - this.visibleRows + 1;
    }
    this.draw();
  }

  private buySelectedItem(): void {
    if (this.stock.length === 0) {
      return;
    }

    const item = this.stock[this.selectedIndex];
    const price = Math.max(1, item.value);
    const paid = this.player.spendGold(price);
    if (!paid) {
      this.feedbackMessage = `Need ${price} gold, you have ${this.player.getGoldString()}.`;
      this.draw();
      return;
    }

    const inventoryItem: InventoryItem = {
      id: item.id,
      name: item.name,
      type: this.mapToInventoryType(item.type),
      quantity: 1,
      rarity: item.rarity,
    };

    if (!this.player.addItem(inventoryItem)) {
      this.player.addGold(price);
      this.feedbackMessage = 'Inventory full. Purchase cancelled.';
      this.draw();
      return;
    }

    this.feedbackMessage = `Bought ${item.name} for ${price} gold.`;
    this.draw();
  }

  private draw(): void {
    this.asciiRenderer.clear();
    this.modalBackground.show();

    this.asciiRenderer.drawBox(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x00ff00);
    this.asciiRenderer.drawText(
      this.panelX + 2,
      this.panelY + 1,
      `${this.npcName.toUpperCase()} SHOP`,
      0xffff00
    );
    this.asciiRenderer.drawText(
      this.panelX + 38,
      this.panelY + 1,
      `GOLD: ${this.player.getGoldString()}`,
      0xffdd66
    );

    this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 3, 'Items:', 0xaaaaaa);

    for (let i = 0; i < this.visibleRows; i++) {
      const idx = this.listOffset + i;
      if (idx >= this.stock.length) {
        break;
      }
      const item = this.stock[idx];
      const selected = idx === this.selectedIndex;
      const marker = selected ? '>' : ' ';
      const line = `${marker} ${item.name.padEnd(24).substring(0, 24)} ${String(item.value).padStart(4)}g  ${item.rarity}`;
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 5 + i, line, selected ? 0xffffff : 0xcccccc);
    }

    const selectedItem = this.stock[this.selectedIndex];
    if (selectedItem) {
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 17, 'Description:', 0xaaaaaa);
      this.asciiRenderer.drawText(
        this.panelX + 2,
        this.panelY + 18,
        selectedItem.description.substring(0, this.panelWidth - 4),
        0x88ccff
      );
    }

    if (this.feedbackMessage) {
      this.asciiRenderer.drawText(
        this.panelX + 2,
        this.panelY + this.panelHeight - 3,
        this.feedbackMessage.substring(0, this.panelWidth - 4),
        0x66ff66
      );
    }

    this.asciiRenderer.drawText(
      this.panelX + 2,
      this.panelY + this.panelHeight - 2,
      '[UP/DOWN] Select  [ENTER] Buy  [ESC] Exit',
      0x00ff88
    );
  }

  private resolveShopStock(inventoryIds: string[], shopAction: string): ItemDefinition[] {
    const inventoryItems = inventoryIds
      .map((id) => ITEMS.find((item) => item.id === id))
      .filter((item): item is ItemDefinition => Boolean(item));

    if (inventoryItems.length === 0) {
      return [];
    }

    if (shopAction.includes('weapon')) {
      return inventoryItems.filter((item) => item.type === ItemType.WEAPON);
    }
    if (shopAction.includes('armor')) {
      return inventoryItems.filter((item) => item.type === ItemType.ARMOR);
    }
    if (shopAction.includes('potion') || shopAction.includes('health') || shopAction.includes('mana')) {
      return inventoryItems.filter((item) => item.type === ItemType.POTION);
    }
    if (shopAction.includes('antidote')) {
      return inventoryItems.filter((item) => item.id.includes('antidote') || item.id.includes('cure_poison'));
    }

    return inventoryItems;
  }

  private mapToInventoryType(type: ItemType): InventoryItem['type'] {
    if (type === ItemType.WEAPON) return 'weapon';
    if (type === ItemType.ARMOR) return 'armor';
    if (type === ItemType.POTION) return 'potion';
    return 'misc';
  }
}

export default ShopScene;
