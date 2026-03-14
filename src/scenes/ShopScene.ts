import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { ModalBackground } from '../ui/modal-background';
import { Player, type InventoryItem } from '../entities/player';
import { ITEMS, ItemType, type ItemDefinition } from '../config/item-data';
import { ensureDurability } from '../utils/durability';

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
  private mode: 'buy' | 'sell' = 'buy';
  private selectedIndex: number = 0;
  private listOffset: number = 0;
  private feedbackMessage: string = '';
  private readonly BUY_PRICE_MULTIPLIER = 1.25;
  private readonly SELL_PRICE_MULTIPLIER = 0.6;

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
    this.mode = 'buy';
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
      if (key === 'tab') {
        this.toggleMode();
        event.preventDefault();
        return;
      }
      if (key === 'enter') {
        if (this.mode === 'buy') {
          this.buySelectedItem();
        } else {
          this.sellSelectedItem();
        }
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
    const listLength = this.getActiveListLength();
    if (listLength === 0) {
      return;
    }
    this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex + delta, 0, listLength - 1);
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
    const price = this.getBuyPrice(item);
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
    ensureDurability(inventoryItem, item);

    if (!this.player.addItem(inventoryItem)) {
      this.player.addGold(price);
      this.feedbackMessage = 'Inventory full. Purchase cancelled.';
      this.draw();
      return;
    }

    this.feedbackMessage = `Bought ${item.name} for ${price} gold.`;
    this.draw();
  }

  private sellSelectedItem(): void {
    const sellableItems = this.getSellableInventoryItems();
    if (sellableItems.length === 0) {
      this.feedbackMessage = 'You have no items to sell.';
      this.draw();
      return;
    }

    const item = sellableItems[this.selectedIndex];
    if (!item) {
      return;
    }

    const price = this.getSellPrice(item);
    if (!this.player.removeItemInstance(item)) {
      this.feedbackMessage = 'Sale failed: item was not found.';
      this.draw();
      return;
    }

    this.player.addGold(price);
    this.feedbackMessage = `Sold ${item.name} for ${price} gold.`;
    const nextLength = this.getSellableInventoryItems().length;
    if (this.selectedIndex >= nextLength) {
      this.selectedIndex = Math.max(0, nextLength - 1);
    }
    this.draw();
  }

  private toggleMode(): void {
    this.mode = this.mode === 'buy' ? 'sell' : 'buy';
    this.selectedIndex = 0;
    this.listOffset = 0;
    this.feedbackMessage = this.mode === 'buy' ? 'Buy mode.' : 'Sell mode.';
    this.draw();
  }

  private getActiveListLength(): number {
    return this.mode === 'buy' ? this.stock.length : this.getSellableInventoryItems().length;
  }

  private draw(): void {
    this.asciiRenderer.clear();
    this.modalBackground.show();

    this.asciiRenderer.drawBox(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x00ff00);
    this.asciiRenderer.drawText(
      this.panelX + 2,
      this.panelY + 1,
      `${this.npcName.toUpperCase()} SHOP (${this.mode.toUpperCase()})`,
      0xffff00
    );
    this.asciiRenderer.drawText(
      this.panelX + 38,
      this.panelY + 1,
      `GOLD: ${this.player.getGoldString()}`,
      0xffdd66
    );

    this.asciiRenderer.drawText(
      this.panelX + 2,
      this.panelY + 3,
      this.mode === 'buy' ? 'Items for sale:' : 'Your items:',
      0xaaaaaa
    );

    for (let i = 0; i < this.visibleRows; i++) {
      const idx = this.listOffset + i;
      if (idx >= this.getActiveListLength()) {
        break;
      }
      const item = this.mode === 'buy' ? this.stock[idx] : this.getSellableInventoryItems()[idx];
      if (!item) {
        continue;
      }
      const selected = idx === this.selectedIndex;
      const marker = selected ? '>' : ' ';
      const price = this.mode === 'buy' ? this.getBuyPrice(item as ItemDefinition) : this.getSellPrice(item as InventoryItem);
      const line = `${marker} ${item.name.padEnd(24).substring(0, 24)} ${String(price).padStart(4)}g  ${item.rarity}`;
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 5 + i, line, selected ? 0xffffff : 0xcccccc);
    }

    const selectedItem =
      this.mode === 'buy' ? this.stock[this.selectedIndex] : this.getSellableInventoryItems()[this.selectedIndex];
    if (selectedItem) {
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 17, 'Description:', 0xaaaaaa);
      this.asciiRenderer.drawText(
        this.panelX + 2,
        this.panelY + 18,
        this.getItemDescription(selectedItem).substring(0, this.panelWidth - 4),
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
      '[UP/DOWN] Select  [TAB] Buy/Sell  [ENTER] Confirm  [ESC] Exit',
      0x00ff88
    );
  }

  private getSellableInventoryItems(): InventoryItem[] {
    return this.player.inventory.filter((item) => item.id !== 'misc_gold');
  }

  private getBuyPrice(item: ItemDefinition): number {
    return Math.max(1, Math.floor(this.getBaseValue(item) * this.BUY_PRICE_MULTIPLIER));
  }

  private getSellPrice(item: InventoryItem): number {
    return Math.max(1, Math.floor(this.getBaseValue(item) * this.SELL_PRICE_MULTIPLIER));
  }

  private getBaseValue(item: ItemDefinition | InventoryItem): number {
    if ('value' in item) {
      return Math.max(1, item.value);
    }

    const itemDef = ITEMS.find((entry) => entry.id === item.id);
    const base = itemDef?.value ?? 10;
    const affixValue =
      (item.affixAttackBonus ?? 0) * 20 +
      (item.affixCritChanceBonus ?? 0) * 3 +
      (item.affixMagicResistBonus ?? 0) * 3;
    return Math.max(1, base + affixValue);
  }

  private getItemDescription(item: ItemDefinition | InventoryItem): string {
    if ('description' in item) {
      return item.description;
    }

    const parts: string[] = [];
    if (item.affixAttackBonus) {
      parts.push(`+${item.affixAttackBonus} ATK`);
    }
    if (item.affixCritChanceBonus) {
      parts.push(`+${item.affixCritChanceBonus}% crit`);
    }
    if (item.affixMagicResistBonus) {
      parts.push(`+${item.affixMagicResistBonus}% resist`);
    }
    const affixText = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    const baseDesc = ITEMS.find((entry) => entry.id === item.id)?.description ?? 'No description';
    return `${baseDesc}${affixText}`;
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
