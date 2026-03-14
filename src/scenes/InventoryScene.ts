import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { Player, InventoryItem, Equipment } from '../entities/player';
import { ItemRarity, ITEMS, ItemType, type ItemDefinition, type Potion, type Weapon, type Armor } from '../config/item-data';
import { EquipmentSystem } from '../systems/equipment-system';
import { isBroken } from '../utils/durability';
import { GameMap, Item as GroundItem } from '../world/map';
import { ModalBackground } from '../ui/modal-background';

/**
 * InventoryScene - Overlay scene for managing inventory and equipment
 * Displays a 20-slot backpack grid (5x4) alongside equipment slots
 */
export class InventoryScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private player!: Player;
  private gameMap!: GameMap;
  private onInventoryChanged?: () => void;
  private isVisible: boolean = false;
  private modalBackground!: ModalBackground;

  // Grid dimensions for inventory display
  private inventorySlots = 20;
  private inventoryColumns = 5;
  private inventoryRows = 4;

  // Currently selected slot (-1 = none, 0-19 = backpack, 20+ = equipment)
  private selectedSlot: number = -1;

  // Equipment slot indices (after inventory slots)
  private equipmentSlotIndices: { [key: string]: number } = {
    weapon: 20,
    armor: 21,
    shield: 22,
    accessory: 23,
  };

  // Layout constants
  private panelStartX = 5;
  private panelStartY = 2;
  private panelWidth = 70;
  private panelHeight = 26;

  private equipmentStartX = 8;
  private equipmentStartY = 5;

  private inventoryStartX = 25;
  private inventoryStartY = 5;

  private detailsStartX = 8;
  private detailsStartY = 15;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  init(data: { player?: Player; gameMap?: GameMap; onInventoryChanged?: () => void }): void {
    if (data.player && data.gameMap) {
      this.player = data.player;
      this.gameMap = data.gameMap;
      this.onInventoryChanged = data.onInventoryChanged;
      this.isVisible = true;
      this.selectedSlot = 0;
    }
  }

  create(): void {
    // Initialize ASCII renderer
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);
    this.modalBackground = new ModalBackground(
      this,
      this.panelStartX,
      this.panelStartY,
      this.panelWidth,
      this.panelHeight
    );

    // Input handling
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      switch (event.key.toLowerCase()) {
        case 'escape':
        case 'i':
          this.hideInventory();
          break;
        case 'arrowup':
          this.moveSelection(-this.inventoryColumns);
          event.preventDefault();
          break;
        case 'arrowdown':
          this.moveSelection(this.inventoryColumns);
          event.preventDefault();
          break;
        case 'arrowleft':
          this.moveSelection(-1);
          event.preventDefault();
          break;
        case 'arrowright':
          this.moveSelection(1);
          event.preventDefault();
          break;
        case 'enter':
          this.selectItem();
          break;
        case 'e':
          this.equipItem();
          event.preventDefault();
          break;
        case 'u':
          this.useItem();
          event.preventDefault();
          break;
        case 'd':
          this.dropItem();
          event.preventDefault();
          break;
      }
    });

    if (this.isVisible) {
      this.draw();
    }
  }

  /**
   * Show inventory overlay for a player
   * @param player - The player whose inventory to display
   */
  public showInventory(player: Player, gameMap: GameMap, onInventoryChanged?: () => void): void {
    this.player = player;
    this.gameMap = gameMap;
    this.onInventoryChanged = onInventoryChanged;
    this.isVisible = true;
    this.selectedSlot = 0;
    if (this.asciiRenderer) {
      this.draw();
    }
  }

  /**
   * Hide inventory overlay and return to game
   */
  public hideInventory(): void {
    this.isVisible = false;
    this.asciiRenderer.clear();
    this.modalBackground.hide();
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  /**
   * Draw the entire inventory UI
   */
  private draw(): void {
    this.asciiRenderer.clear();
    this.modalBackground.show();

    // Draw main panel border
    this.asciiRenderer.drawBox(
      this.panelStartX,
      this.panelStartY,
      this.panelWidth,
      this.panelHeight,
      0x00ff00
    );

    // Draw title
    this.asciiRenderer.drawText(
      this.panelStartX + 2,
      this.panelStartY + 1,
      `INVENTORY & EQUIPMENT | GOLD: ${this.player.getGoldString()}`,
      0xffff00
    );

    // Draw separator line
    for (let i = 0; i < this.panelWidth - 2; i++) {
      this.asciiRenderer.drawTile(this.panelStartX + 1 + i, this.panelStartY + 3, '-', 0x00ff00);
    }

    // Draw equipment section
    this.drawEquipmentSection();

    // Draw inventory section header
    this.asciiRenderer.drawText(
      this.inventoryStartX,
      this.inventoryStartY - 1,
      `BACKPACK (${this.player.inventory.length}/${this.player.inventoryCapacity})`,
      0xffff00
    );

    // Draw inventory grid
    this.drawInventoryGrid();

    // Draw details section
    this.drawDetailsSection();

    // Draw action hints at bottom
    this.drawActionHints();
  }

  /**
   * Draw equipped items section on the left
   */
  private drawEquipmentSection(): void {
    this.asciiRenderer.drawText(this.equipmentStartX, this.equipmentStartY, 'EQUIPMENT:', 0xffff00);

    const slots = [
      { name: 'Weapon', key: 'weapon' },
      { name: 'Armor', key: 'armor' },
      { name: 'Shield', key: 'shield' },
      { name: 'Accessory', key: 'accessory' },
    ];

    let y = this.equipmentStartY + 2;
    slots.forEach((slot) => {
      const item = this.player.equipment[slot.key as keyof Equipment];
      const slotIndex = this.equipmentSlotIndices[slot.key];
      const isSelected = this.selectedSlot === slotIndex;
      const color = isSelected ? 0xff0000 : item ? 0x00ff00 : 0x888888;
      const border = isSelected ? '[' : ' ';
      const borderEnd = isSelected ? ']' : ' ';
      const itemName = item ? item.name : '---';

      this.asciiRenderer.drawText(
        this.equipmentStartX,
        y,
        `${border}${slot.name.padEnd(8)} ${itemName.substring(0, 8).padEnd(8)}${borderEnd}`,
        color
      );
      y += 2;
    });
  }

  /**
   * Draw the 5x4 inventory grid
   */
  private drawInventoryGrid(): void {
    let slotIndex = 0;

    for (let row = 0; row < this.inventoryRows; row++) {
      for (let col = 0; col < this.inventoryColumns; col++) {
        const x = this.inventoryStartX + col * 9;
        const y = this.inventoryStartY + row * 2;

        const item = this.player.inventory[slotIndex];
        const isSelected = this.selectedSlot === slotIndex;
        const color = isSelected ? 0xff0000 : item ? this.getItemColor(item) : 0x888888;
        const border = isSelected ? '[' : ' ';
        const borderEnd = isSelected ? ']' : ' ';

        let slotDisplay = '';
        if (item) {
          const quantity = item.quantity > 1 ? `x${item.quantity}` : '';
          slotDisplay = `${item.name.substring(0, 5).padEnd(5)}${quantity.padEnd(2)}`;
        } else {
          slotDisplay = '-------';
        }

        this.asciiRenderer.drawText(x, y, `${border}${slotDisplay}${borderEnd}`, color);
        slotIndex++;
      }
    }
  }

  /**
   * Draw selected item details at bottom
   */
  private drawDetailsSection(): void {
    this.asciiRenderer.drawText(this.detailsStartX, this.detailsStartY - 1, 'DETAILS:', 0xffff00);

    if (this.selectedSlot === -1) {
      this.asciiRenderer.drawText(this.detailsStartX, this.detailsStartY + 1, 'No item selected', 0x888888);
      return;
    }

    let item: InventoryItem | undefined;

    // Get item from appropriate slot
    if (this.selectedSlot < this.inventorySlots) {
      item = this.player.inventory[this.selectedSlot];
    } else {
      // Equipment slot
      const equipmentKeys = Object.keys(this.equipmentSlotIndices);
      for (const key of equipmentKeys) {
        if (this.equipmentSlotIndices[key] === this.selectedSlot) {
          item = this.player.equipment[key as keyof Equipment];
          break;
        }
      }
    }

    if (!item) {
      this.asciiRenderer.drawText(this.detailsStartX, this.detailsStartY + 1, 'Empty slot', 0x888888);
      return;
    }

    // Display item info
    let y = this.detailsStartY + 1;

    // Name
    this.asciiRenderer.drawText(this.detailsStartX, y, `Name: ${item.name}`, 0xffffff);
    y++;

    // Type and Rarity
    this.asciiRenderer.drawText(this.detailsStartX, y, `Type: ${item.type}`, 0xffffff);
    y++;

    this.asciiRenderer.drawText(
      this.detailsStartX,
      y,
      `Rarity: ${item.rarity}`,
      this.getRarityColor(item.rarity)
    );
    y++;

    // Show stats if it's equipment and identified
    const itemDef = this.resolveItemDefinition(item);
    if (itemDef && (itemDef.type === ItemType.WEAPON || itemDef.type === ItemType.ARMOR)) {
      if (!this.isIdentified(item)) {
        this.asciiRenderer.drawText(this.detailsStartX, y, 'Properties: Unidentified', 0xffaa00);
        y++;
      } else if (itemDef.type === ItemType.WEAPON) {
        const weaponDef = itemDef as Weapon;
        const enchantmentBonus = item.enchantmentBonus ?? 0;
        this.asciiRenderer.drawText(
          this.detailsStartX,
          y,
          `Damage: ${weaponDef.damage} | Bonus: +${weaponDef.attackBonus + enchantmentBonus}`,
          0x00ff00
        );
        y++;
        this.asciiRenderer.drawText(
          this.detailsStartX,
          y,
          `Range: ${weaponDef.range}`,
          0x00ff00
        );
        y++;
      } else if (itemDef.type === ItemType.ARMOR) {
        const armorDef = itemDef as Armor;
        const enchantmentBonus = item.enchantmentBonus ?? 0;
        this.asciiRenderer.drawText(
          this.detailsStartX,
          y,
          `Defense: ${armorDef.defense + enchantmentBonus} | AC: ${armorDef.armorClass}`,
          0x00ff00
        );
        y++;
      }

      if (item.maxDurability !== undefined) {
        const currentDurability = Math.max(0, item.currentDurability ?? item.maxDurability);
        const durabilityColor = isBroken(item) ? 0xff5555 : 0x88ddff;
        this.asciiRenderer.drawText(
          this.detailsStartX,
          y,
          `Durability: ${currentDurability}/${item.maxDurability}`,
          durabilityColor
        );
        y++;
      }
    }

    // Description (truncate to fit)
    const isUnidentifiedEquipment =
      itemDef !== undefined &&
      (itemDef.type === ItemType.WEAPON || itemDef.type === ItemType.ARMOR) &&
      !this.isIdentified(item);
    const desc = isUnidentifiedEquipment ? 'The item hums with hidden magic.' : this.getItemDescription(item);
    if (desc) {
      this.asciiRenderer.drawText(this.detailsStartX, y, 'Desc: ' + desc.substring(0, 45), 0xaaaaaa);
      y++;
    }

    // Quantity for stackable items
    if (item.quantity > 1) {
      this.asciiRenderer.drawText(this.detailsStartX, y, `Quantity: ${item.quantity}`, 0xffffff);
      y++;
    }

    // Show total equipment stats at the bottom
    y++;
    const equipStats = EquipmentSystem.getEquippedStats(this.player);
    this.asciiRenderer.drawText(this.detailsStartX, y, 'EQUIPMENT STATS:', 0xffff00);
    y++;
    this.asciiRenderer.drawText(
      this.detailsStartX,
      y,
      `ATK: +${equipStats.attack} | DEF: +${equipStats.defense}`,
      0x00ffff
    );
  }

  /**
   * Draw action hint keys at the bottom
   */
  private drawActionHints(): void {
    const hintsY = this.panelStartY + this.panelHeight - 2;
    const hintColor = 0x00ff88;

    this.asciiRenderer.drawText(this.panelStartX + 2, hintsY, '[E]quip/Uneq', hintColor);
    this.asciiRenderer.drawText(this.panelStartX + 16, hintsY, '[U]se', hintColor);
    this.asciiRenderer.drawText(this.panelStartX + 23, hintsY, '[D]rop', hintColor);
    this.asciiRenderer.drawText(this.panelStartX + 31, hintsY, '[I/ESC]Close', hintColor);
  }

  /**
   * Move selection in a direction
   * @param delta - Amount to move (-1, 1, etc.)
   */
  private moveSelection(delta: number): void {
    if (this.selectedSlot === -1) {
      this.selectedSlot = 0;
      this.draw();
      return;
    }

    const equipmentStart = this.inventorySlots;
    const equipmentEnd = this.inventorySlots + Object.keys(this.equipmentSlotIndices).length - 1;

    // Navigation while focused on equipment slots
    if (this.selectedSlot >= equipmentStart && this.selectedSlot <= equipmentEnd) {
      if (delta === 1) {
        // Move from equipment to first inventory column of same row
        const equipmentRow = this.selectedSlot - equipmentStart;
        this.selectedSlot = equipmentRow * this.inventoryColumns;
      } else if (delta === -this.inventoryColumns) {
        // Up through equipment rows
        this.selectedSlot = this.selectedSlot === equipmentStart ? equipmentEnd : this.selectedSlot - 1;
      } else if (delta === this.inventoryColumns) {
        // Down through equipment rows
        this.selectedSlot = this.selectedSlot === equipmentEnd ? equipmentStart : this.selectedSlot + 1;
      }

      this.draw();
      return;
    }

    // Navigation while focused on backpack slots
    const col = this.selectedSlot % this.inventoryColumns;
    const row = Math.floor(this.selectedSlot / this.inventoryColumns);

    if (delta === -1 && col === 0) {
      // Move from first backpack column to equipment slot in same row
      this.selectedSlot = equipmentStart + Math.min(row, equipmentEnd - equipmentStart);
    } else {
      this.selectedSlot += delta;

      // Keep within backpack bounds
      if (this.selectedSlot < 0) {
        this.selectedSlot = this.inventorySlots - 1;
      } else if (this.selectedSlot >= this.inventorySlots) {
        this.selectedSlot = 0;
      }
    }

    this.draw();
  }

  /**
   * Handle item selection (press Enter)
   */
  private selectItem(): void {
    // Currently just highlights; can be extended for additional behavior
    this.draw();
  }

  /**
   * Equip the selected item
   */
  private equipItem(): void {
    if (this.selectedSlot < 0) {
      return;
    }

    if (this.selectedSlot >= this.inventorySlots) {
      const slot = this.getSelectedEquipmentSlot();
      if (!slot) return;

      const unequipped = EquipmentSystem.unequipItem(this.player, slot);
      if (unequipped) {
        this.onInventoryChanged?.();
        this.draw();
      }
      return;
    }

    const item = this.player.inventory[this.selectedSlot];
    if (!item) return;

    // Check if item can be equipped using equipment system
    if (!EquipmentSystem.canEquip(this.player, item)) {
      return;
    }

    // Use equipment system to equip item (handles slot detection and unequipping)
    const success = EquipmentSystem.equipItem(this.player, item);
    
    if (success) {
      this.onInventoryChanged?.();
      this.draw();
    }
  }

  private getSelectedEquipmentSlot(): keyof Equipment | null {
    for (const [slot, index] of Object.entries(this.equipmentSlotIndices)) {
      if (index === this.selectedSlot) {
        return slot as keyof Equipment;
      }
    }
    return null;
  }

  /**
   * Use the selected item (potion or consumable)
   */
  private useItem(): void {
    if (this.selectedSlot < 0 || this.selectedSlot >= this.inventorySlots) {
      return;
    }

    const item = this.player.inventory[this.selectedSlot];
    if (!item) return;

    const itemDef = this.resolveItemDefinition(item);
    if (!itemDef || !('effect' in itemDef)) {
      return;
    }

    let applied = false;
    switch (itemDef.effect) {
      case 'restore_health':
        if (itemDef.type !== ItemType.POTION) {
          return;
        }
        const healthPotency = (itemDef as Potion).potency || 30;
        const maxRestorable = this.player.maxHP - this.player.currentHP;
        this.player.currentHP += Math.min(healthPotency * 10, maxRestorable);
        applied = true;
        break;
      case 'restore_mana':
        if (itemDef.type !== ItemType.POTION) {
          return;
        }
        this.player.restoreMana((itemDef as Potion).potency * 10);
        applied = true;
        break;
      case 'boost_strength':
        // Could apply temporary status effect
        applied = true;
        break;
      case 'cure_poison':
        if (itemDef.type !== ItemType.POTION) {
          return;
        }
        this.player.clearStatusEffects(['poison']);
        applied = true;
        break;
      case 'identify':
        applied = this.handleIdentifyEffect(item);
        break;
      case 'enchant_weapon':
        applied = this.handleEnchantWeaponEffect();
        break;
    }

    if (!applied) {
      return;
    }

    // Decrease quantity or remove item
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.player.removeItem(item.id);
    }

    this.onInventoryChanged?.();
    this.draw();
  }

  /**
   * Drop the selected item
   */
  private dropItem(): void {
    if (this.selectedSlot < 0 || this.selectedSlot >= this.inventorySlots) {
      return;
    }

    const item = this.player.inventory[this.selectedSlot];
    if (item) {
      if (this.player.removeItem(item.id)) {
        const droppedItem = this.createGroundItemFromInventoryItem(item);
        this.gameMap.addItem(droppedItem, this.player.x, this.player.y);
        this.onInventoryChanged?.();
      }
    }

    this.draw();
  }

  /**
   * Get color for an item based on rarity
   */
  private getItemColor(item: InventoryItem): number {
    switch (item.rarity) {
      case ItemRarity.LEGENDARY:
        return 0xffa500; // Orange
      case ItemRarity.EPIC:
        return 0xff00ff; // Magenta
      case ItemRarity.RARE:
        return 0x0088ff; // Blue
      case ItemRarity.UNCOMMON:
        return 0x00ff00; // Green
      case ItemRarity.COMMON:
      default:
        return 0xffffff; // White
    }
  }

  /**
   * Get color for rarity text
   */
  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case ItemRarity.LEGENDARY:
        return 0xffa500;
      case ItemRarity.EPIC:
        return 0xff00ff;
      case ItemRarity.RARE:
        return 0x0088ff;
      case ItemRarity.UNCOMMON:
        return 0x00ff00;
      case ItemRarity.COMMON:
      default:
        return 0xffffff;
    }
  }

  /**
   * Get item description based on type
   */
  private getItemDescription(item: InventoryItem): string {
    const itemDef = ITEMS.find((i) => i.id === item.id);
    return itemDef?.description || 'No description';
  }

  private resolveItemDefinition(item: InventoryItem): ItemDefinition | undefined {
    return ITEMS.find((candidate) => candidate.id === item.id);
  }

  private isIdentified(item: InventoryItem): boolean {
    return item.identified !== false;
  }

  private handleIdentifyEffect(consumedItem: InventoryItem): boolean {
    const toIdentify: InventoryItem[] = [];

    for (const entry of this.player.inventory) {
      if (entry !== consumedItem && entry.identified === false) {
        toIdentify.push(entry);
      }
    }

    const equipmentSlots: (keyof Equipment)[] = ['weapon', 'armor', 'shield', 'accessory'];
    for (const slot of equipmentSlots) {
      const equipped = this.player.equipment[slot];
      if (equipped && equipped.identified === false) {
        toIdentify.push(equipped);
      }
    }

    if (toIdentify.length === 0) {
      return false;
    }

    for (const entry of toIdentify) {
      entry.identified = true;
    }

    return true;
  }

  private handleEnchantWeaponEffect(): boolean {
    const weapon = this.player.equipment.weapon;
    if (!weapon) {
      return false;
    }

    weapon.enchantmentBonus = (weapon.enchantmentBonus ?? 0) + 1;
    weapon.identified = true;
    return true;
  }

  private createGroundItemFromInventoryItem(item: InventoryItem): GroundItem {
    const itemDef = ITEMS.find((i) => i.id === item.id);
    const glyph = itemDef?.glyph ?? '*';
    const color = itemDef ? parseInt(itemDef.color.replace('#', ''), 16) : 0xffffff;

    return {
      id: item.id,
      name: item.name,
      x: this.player.x,
      y: this.player.y,
      glyph,
      color,
      quantity: item.quantity,
      inventoryType: item.type,
      rarity: item.rarity,
      identified: item.identified,
      enchantmentBonus: item.enchantmentBonus,
      currentDurability: item.currentDurability,
      maxDurability: item.maxDurability,
      isGold: false,
    };
  }
}

export default InventoryScene;
