/**
 * Item Data Configuration
 * Defines all items, equipment, consumables, and their properties for the roguelike game
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  POTION = 'potion',
  SCROLL = 'scroll',
  MISCELLANEOUS = 'miscellaneous',
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum EquipmentSlot {
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand',
  HEAD = 'head',
  CHEST = 'chest',
  LEGS = 'legs',
  FEET = 'feet',
  HANDS = 'hands',
  BACK = 'back',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Base item interface
 */
export interface Item {
  id: string;
  name: string;
  glyph: string;
  color: string;
  type: ItemType;
  rarity: ItemRarity;
  value: number;
  weight: number;
  stackable: boolean;
  description: string;
}

/**
 * Weapon item interface
 */
export interface Weapon extends Item {
  type: ItemType.WEAPON;
  damage: number;
  attackBonus: number;
  range: number; // 1 for melee, >1 for ranged
}

/**
 * Armor item interface
 */
export interface Armor extends Item {
  type: ItemType.ARMOR;
  defense: number;
  armorClass: number;
  slot: EquipmentSlot;
}

/**
 * Potion item interface
 */
export interface Potion extends Item {
  type: ItemType.POTION;
  effect: string;
  potency: number;
}

/**
 * Scroll item interface
 */
export interface Scroll extends Item {
  type: ItemType.SCROLL;
  effect: string;
  uses: number;
}

/**
 * Union type for all items
 */
export type ItemDefinition = Item | Weapon | Armor | Potion | Scroll;

// ============================================================================
// ITEM CATALOG
// ============================================================================

// WEAPONS (8)
const DAGGER: Weapon = {
  id: 'weapon_dagger',
  name: 'Dagger',
  glyph: '|',
  color: '#888888',
  type: ItemType.WEAPON,
  rarity: ItemRarity.COMMON,
  value: 20,
  weight: 0.5,
  stackable: false,
  description: 'A small, sharp blade. Quick and light.',
  damage: 3,
  attackBonus: 1,
  range: 1,
};

const SHORT_SWORD: Weapon = {
  id: 'weapon_short_sword',
  name: 'Short Sword',
  glyph: '|',
  color: '#A0A0A0',
  type: ItemType.WEAPON,
  rarity: ItemRarity.COMMON,
  value: 50,
  weight: 2.0,
  stackable: false,
  description: 'A reliable weapon for beginners. Good balance of speed and damage.',
  damage: 5,
  attackBonus: 1,
  range: 1,
};

const LONG_SWORD: Weapon = {
  id: 'weapon_long_sword',
  name: 'Long Sword',
  glyph: '|',
  color: '#C0C0C0',
  type: ItemType.WEAPON,
  rarity: ItemRarity.UNCOMMON,
  value: 150,
  weight: 3.5,
  stackable: false,
  description: 'A masterwork blade with excellent reach and cutting power.',
  damage: 8,
  attackBonus: 2,
  range: 1,
};

const BATTLE_AXE: Weapon = {
  id: 'weapon_battle_axe',
  name: 'Battle Axe',
  glyph: 'T',
  color: '#A0A0A0',
  type: ItemType.WEAPON,
  rarity: ItemRarity.UNCOMMON,
  value: 180,
  weight: 4.5,
  stackable: false,
  description: 'A devastating two-handed axe. Slow but powerful.',
  damage: 10,
  attackBonus: 1,
  range: 1,
};

const SPEAR: Weapon = {
  id: 'weapon_spear',
  name: 'Spear',
  glyph: '/',
  color: '#888888',
  type: ItemType.WEAPON,
  rarity: ItemRarity.UNCOMMON,
  value: 120,
  weight: 2.5,
  stackable: false,
  description: 'A polearm with extended reach. Good for keeping enemies at bay.',
  damage: 6,
  attackBonus: 2,
  range: 2,
};

const STAFF: Weapon = {
  id: 'weapon_staff',
  name: 'Staff',
  glyph: '|',
  color: '#8B4513',
  type: ItemType.WEAPON,
  rarity: ItemRarity.UNCOMMON,
  value: 130,
  weight: 3.0,
  stackable: false,
  description: 'A magical focus for spellcasters. Amplifies spell power.',
  damage: 2,
  attackBonus: 3,
  range: 1,
};

const WAND: Weapon = {
  id: 'weapon_wand',
  name: 'Wand',
  glyph: '|',
  color: '#FFD700',
  type: ItemType.WEAPON,
  rarity: ItemRarity.RARE,
  value: 200,
  weight: 0.3,
  stackable: false,
  description: 'An arcane instrument of significant power. Increases magic damage.',
  damage: 1,
  attackBonus: 4,
  range: 3,
};

const BOW: Weapon = {
  id: 'weapon_bow',
  name: 'Bow',
  glyph: ')',
  color: '#8B4513',
  type: ItemType.WEAPON,
  rarity: ItemRarity.UNCOMMON,
  value: 140,
  weight: 2.0,
  stackable: false,
  description: 'A ranged weapon for hunters and scouts. Requires arrows.',
  damage: 5,
  attackBonus: 1,
  range: 5,
};

const STICK: Weapon = {
  id: 'weapon_stick',
  name: 'Stick',
  glyph: '/',
  color: '#8B5A2B',
  type: ItemType.WEAPON,
  rarity: ItemRarity.COMMON,
  value: 2,
  weight: 1.2,
  stackable: false,
  description: 'A rough wooden stick broken from a tree. Primitive, but better than bare hands.',
  damage: 2,
  attackBonus: 0,
  range: 1,
};

// ARMOR (6)
const LEATHER_ARMOR: Armor = {
  id: 'armor_leather',
  name: 'Leather Armor',
  glyph: '[',
  color: '#8B4513',
  type: ItemType.ARMOR,
  rarity: ItemRarity.COMMON,
  value: 60,
  weight: 3.0,
  stackable: false,
  description: 'Light leather protection. Good for mobility.',
  defense: 2,
  armorClass: 11,
  slot: EquipmentSlot.CHEST,
};

const CHAIN_MAIL: Armor = {
  id: 'armor_chain_mail',
  name: 'Chain Mail',
  glyph: '[',
  color: '#A0A0A0',
  type: ItemType.ARMOR,
  rarity: ItemRarity.UNCOMMON,
  value: 150,
  weight: 6.0,
  stackable: false,
  description: 'Interlocked metal rings. Solid protection with moderate weight.',
  defense: 4,
  armorClass: 14,
  slot: EquipmentSlot.CHEST,
};

const PLATE_ARMOR: Armor = {
  id: 'armor_plate',
  name: 'Plate Armor',
  glyph: '[',
  color: '#C0C0C0',
  type: ItemType.ARMOR,
  rarity: ItemRarity.RARE,
  value: 300,
  weight: 8.0,
  stackable: false,
  description: 'Heavy plate protection. Maximum defense at the cost of mobility.',
  defense: 6,
  armorClass: 16,
  slot: EquipmentSlot.CHEST,
};

const ROBE: Armor = {
  id: 'armor_robe',
  name: 'Robe',
  glyph: '[',
  color: '#4B0082',
  type: ItemType.ARMOR,
  rarity: ItemRarity.UNCOMMON,
  value: 100,
  weight: 2.0,
  stackable: false,
  description: 'Magical vestments that enhance spellcasting.',
  defense: 1,
  armorClass: 10,
  slot: EquipmentSlot.CHEST,
};

const CLOAK: Armor = {
  id: 'armor_cloak',
  name: 'Cloak',
  glyph: '"',
  color: '#000000',
  type: ItemType.ARMOR,
  rarity: ItemRarity.UNCOMMON,
  value: 80,
  weight: 1.5,
  stackable: false,
  description: 'A mysterious cloak. Provides modest protection and stealth bonus.',
  defense: 1,
  armorClass: 12,
  slot: EquipmentSlot.BACK,
};

const SHIELD: Armor = {
  id: 'armor_shield',
  name: 'Shield',
  glyph: 'o',
  color: '#A0A0A0',
  type: ItemType.ARMOR,
  rarity: ItemRarity.UNCOMMON,
  value: 100,
  weight: 3.0,
  stackable: false,
  description: 'A sturdy shield for defense. Can be equipped in off-hand.',
  defense: 3,
  armorClass: 13,
  slot: EquipmentSlot.OFF_HAND,
};

// POTIONS (4)
const HEALTH_POTION: Potion = {
  id: 'potion_health',
  name: 'Health Potion',
  glyph: '!',
  color: '#FF0000',
  type: ItemType.POTION,
  rarity: ItemRarity.COMMON,
  value: 40,
  weight: 0.2,
  stackable: true,
  description: 'Restores a significant amount of health.',
  effect: 'restore_health',
  potency: 30,
};

const MANA_POTION: Potion = {
  id: 'potion_mana',
  name: 'Mana Potion',
  glyph: '!',
  color: '#0000FF',
  type: ItemType.POTION,
  rarity: ItemRarity.UNCOMMON,
  value: 60,
  weight: 0.2,
  stackable: true,
  description: 'Restores magical energy.',
  effect: 'restore_mana',
  potency: 25,
};

const CURE_POISON: Potion = {
  id: 'potion_cure_poison',
  name: 'Cure Poison',
  glyph: '!',
  color: '#00FF00',
  type: ItemType.POTION,
  rarity: ItemRarity.UNCOMMON,
  value: 50,
  weight: 0.2,
  stackable: true,
  description: 'Cures all poison effects from the body.',
  effect: 'cure_poison',
  potency: 1,
};

const STRENGTH_POTION: Potion = {
  id: 'potion_strength',
  name: 'Strength Potion',
  glyph: '!',
  color: '#FFA500',
  type: ItemType.POTION,
  rarity: ItemRarity.RARE,
  value: 100,
  weight: 0.2,
  stackable: true,
  description: 'Temporarily increases physical damage output.',
  effect: 'boost_strength',
  potency: 3,
};

// SCROLLS (4)
const SCROLL_TELEPORT: Scroll = {
  id: 'scroll_teleport',
  name: 'Scroll of Teleport',
  glyph: '~',
  color: '#FFD700',
  type: ItemType.SCROLL,
  rarity: ItemRarity.UNCOMMON,
  value: 80,
  weight: 0.1,
  stackable: true,
  description: 'Instantly transports you to a safe location.',
  effect: 'teleport',
  uses: 1,
};

const SCROLL_IDENTIFY: Scroll = {
  id: 'scroll_identify',
  name: 'Scroll of Identify',
  glyph: '~',
  color: '#00FFFF',
  type: ItemType.SCROLL,
  rarity: ItemRarity.COMMON,
  value: 30,
  weight: 0.1,
  stackable: true,
  description: 'Reveals the properties of magical items.',
  effect: 'identify',
  uses: 1,
};

const SCROLL_ENCHANT_WEAPON: Scroll = {
  id: 'scroll_enchant_weapon',
  name: 'Scroll of Enchant Weapon',
  glyph: '~',
  color: '#FF00FF',
  type: ItemType.SCROLL,
  rarity: ItemRarity.RARE,
  value: 150,
  weight: 0.1,
  stackable: true,
  description: 'Permanently increases the power of a weapon.',
  effect: 'enchant_weapon',
  uses: 1,
};

const SCROLL_ENCHANT_ARMOR: Scroll = {
  id: 'scroll_enchant_armor',
  name: 'Scroll of Enchant Armor',
  glyph: '~',
  color: '#FF00FF',
  type: ItemType.SCROLL,
  rarity: ItemRarity.RARE,
  value: 150,
  weight: 0.1,
  stackable: true,
  description: 'Permanently increases the protection of armor.',
  effect: 'enchant_armor',
  uses: 1,
};

// MISCELLANEOUS
const GOLD: Item = {
  id: 'misc_gold',
  name: 'Gold Coin',
  glyph: '$',
  color: '#FFD700',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 1,
  weight: 0.01,
  stackable: true,
  description: 'Currency used throughout the realm.',
};

const RATION: Item = {
  id: 'misc_ration',
  name: 'Ration',
  glyph: '%',
  color: '#D2691E',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 10,
  weight: 0.3,
  stackable: true,
  description: 'A meal to sustain you on your journey.',
};

const LOCKPICK: Item = {
  id: 'lockpick',
  name: 'Lockpick',
  glyph: ';',
  color: '#C0C0C0',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 25,
  weight: 0.1,
  stackable: true,
  description: 'A thin metal pick used to open simple locks.',
};

const LOCKPICK_SET: Item = {
  id: 'lockpick_set',
  name: 'Lockpick Set',
  glyph: ';',
  color: '#D8D8D8',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 80,
  weight: 0.2,
  stackable: true,
  description: 'A professional set of lockpicks with higher quality tools.',
};

const RUSTY_KEY: Item = {
  id: 'rusty_key',
  name: 'Rusty Key',
  glyph: '?',
  color: '#B8860B',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 35,
  weight: 0.1,
  stackable: true,
  description: 'A worn key that can open old dungeon chests.',
};

const ROPE: Item = {
  id: 'rope',
  name: 'Rope',
  glyph: '~',
  color: '#C2A878',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 15,
  weight: 1.0,
  stackable: true,
  description: 'Useful rope for climbing and traversing hazards.',
};

const TORCH: Item = {
  id: 'torch',
  name: 'Torch',
  glyph: 'i',
  color: '#FFAA33',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 12,
  weight: 0.6,
  stackable: true,
  description: 'A basic light source for dark places.',
};

const TINDERBOX: Item = {
  id: 'misc_tinderbox',
  name: 'Tinderbox',
  glyph: 'i',
  color: '#FF9933',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 20,
  weight: 0.4,
  stackable: true,
  description: 'A kit for starting small fires in dry places.',
};

const SPICE_HERBS: Item = {
  id: 'misc_spice_herbs',
  name: 'Spice Herbs',
  glyph: ',',
  color: '#66CC66',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 14,
  weight: 0.1,
  stackable: true,
  description: 'Aromatic herbs that improve cooked meals.',
};

const SMOKE_BOMB: Item = {
  id: 'smoke_bomb',
  name: 'Smoke Bomb',
  glyph: '*',
  color: '#888888',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 45,
  weight: 0.3,
  stackable: true,
  description: 'Creates a cloud of smoke for quick escapes.',
};

const RAT_TAIL: Item = {
  id: 'misc_rat_tail',
  name: 'Rat Tail',
  glyph: ',',
  color: '#8B5A2B',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 6,
  weight: 0.1,
  stackable: true,
  description: 'A stringy tail often used in low-grade alchemy.',
};

const BONE_FRAGMENT: Item = {
  id: 'misc_bone_fragment',
  name: 'Bone Fragment',
  glyph: ':',
  color: '#D8D0C0',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.COMMON,
  value: 8,
  weight: 0.2,
  stackable: true,
  description: 'Splintered bone suitable for reinforcing light gear.',
};

const STOLEN_RING: Item = {
  id: 'misc_stolen_ring',
  name: 'Stolen Ring',
  glyph: 'o',
  color: '#E6C200',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 30,
  weight: 0.05,
  stackable: true,
  description: 'A tarnished ring infused with lingering magical residue.',
};

const SPIDER_SILK: Item = {
  id: 'misc_spider_silk',
  name: 'Spider Silk',
  glyph: '~',
  color: '#F5F5F5',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 18,
  weight: 0.1,
  stackable: true,
  description: 'Strong, flexible strands prized by tailors and fletchers.',
};

const POISON_FANG: Item = {
  id: 'misc_poison_fang',
  name: 'Poison Fang',
  glyph: 'v',
  color: '#7CFC00',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 24,
  weight: 0.1,
  stackable: true,
  description: 'A venomous fang used for toxins and anti-venom compounds.',
};

const TROLL_HIDE: Item = {
  id: 'misc_troll_hide',
  name: 'Troll Hide',
  glyph: '%',
  color: '#556B2F',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.UNCOMMON,
  value: 35,
  weight: 1.5,
  stackable: true,
  description: 'Thick, durable hide ideal for heavy-duty armor work.',
};

const SOUL_FRAGMENT: Item = {
  id: 'misc_soul_fragment',
  name: 'Soul Fragment',
  glyph: '*',
  color: '#9370DB',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.RARE,
  value: 55,
  weight: 0.1,
  stackable: true,
  description: 'A shimmering shard of spirit essence with arcane potential.',
};

const XP_CRYSTAL: Item = {
  id: 'misc_xp_crystal',
  name: 'XP Crystal',
  glyph: '*',
  color: '#00E5FF',
  type: ItemType.MISCELLANEOUS,
  rarity: ItemRarity.RARE,
  value: 60,
  weight: 0.15,
  stackable: true,
  description: 'A condensed crystal of arcane energy from dungeon anomalies.',
};

// ============================================================================
// ITEM COLLECTION
// ============================================================================

export const ITEMS: ItemDefinition[] = [
  // Weapons
  DAGGER,
  SHORT_SWORD,
  LONG_SWORD,
  BATTLE_AXE,
  SPEAR,
  STAFF,
  WAND,
  BOW,
  STICK,

  // Armor
  LEATHER_ARMOR,
  CHAIN_MAIL,
  PLATE_ARMOR,
  ROBE,
  CLOAK,
  SHIELD,

  // Potions
  HEALTH_POTION,
  MANA_POTION,
  CURE_POISON,
  STRENGTH_POTION,

  // Scrolls
  SCROLL_TELEPORT,
  SCROLL_IDENTIFY,
  SCROLL_ENCHANT_WEAPON,
  SCROLL_ENCHANT_ARMOR,

  // Miscellaneous
  GOLD,
  RATION,
  LOCKPICK,
  LOCKPICK_SET,
  RUSTY_KEY,
  ROPE,
  TORCH,
  TINDERBOX,
  SPICE_HERBS,
  SMOKE_BOMB,
  RAT_TAIL,
  BONE_FRAGMENT,
  STOLEN_RING,
  SPIDER_SILK,
  POISON_FANG,
  TROLL_HIDE,
  SOUL_FRAGMENT,
  XP_CRYSTAL,
];

export const ITEM_DATA = {
  ITEMS,
};

export default ITEM_DATA;
