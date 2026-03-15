import { NPCType, type NPCDefinition } from './types';

export const HILDA_NPC: NPCDefinition =
  {
    id: 'hilda',
    name: 'Blacksmith Hilda',
    description: 'A masterful blacksmith who forges the finest weapons and armor',
    type: NPCType.MERCHANT,
    level: 1,
    color: 0xC0C0C0, // Silver
    glyph: 'H',
    dialogue: [
      {
        id: 'start',
        text: 'Welcome to my forge! The smell of hot metal and the ring of hammer on anvil - music to my ears. Looking for quality steel? I have weapons and armor that will keep you alive in that cursed dungeon.',
        options: [
          { text: 'Show me your weapons.', action: '', nextDialogueId: 'shop_weapons' },
          { text: 'What armor do you have?', action: '', nextDialogueId: 'shop_armor' },
          { text: 'Can you repair my equipment?', action: '', nextDialogueId: 'repair_service' },
          { text: 'Can you craft with monster materials?', action: '', nextDialogueId: 'crafting_service' },
          { text: 'Tell me about your craft.', action: '', nextDialogueId: 'about_craft' },
          { text: 'Just browsing.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'shop_weapons',
        text: 'Forged with my own hands, each blade tested and true. I have daggers for quick strikes, swords for balance, axes for raw power, and spears for reach. What suits your fighting style?',
        options: [
          { text: 'Show me light weapons (daggers, short swords).', action: 'open_shop_light_weapons', nextDialogueId: 'browse_weapons' },
          { text: 'Show me heavy weapons (battle axes, long swords).', action: 'open_shop_heavy_weapons', nextDialogueId: 'browse_weapons' },
          { text: 'I need something for a warrior.', action: '', nextDialogueId: 'warrior_weapons' },
          { text: 'I need something for a rogue.', action: '', nextDialogueId: 'rogue_weapons' },
          { text: 'Actually, show me armor instead.', action: '', nextDialogueId: 'shop_armor' },
          { text: 'Maybe later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'warrior_weapons',
        text: 'Ah, a warrior! You need something with stopping power. I recommend the battle axe or long sword. Both will cleave through armor and bone alike. The long sword offers better balance, while the axe delivers devastating blows.',
        options: [
          { text: 'Show me these weapons.', action: 'open_shop_warrior', nextDialogueId: 'browse_weapons' },
          { text: 'What about armor for a warrior?', action: '', nextDialogueId: 'warrior_armor' },
          { text: 'Let me think about it.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'rogue_weapons',
        text: 'Speed and precision, eh? For a rogue, I suggest the dagger or short sword. Light, quick, perfect for finding weak spots in your enemy\'s defense. Easy to conceal too, if that matters to you.',
        options: [
          { text: 'Show me these weapons.', action: 'open_shop_rogue', nextDialogueId: 'browse_weapons' },
          { text: 'What armor suits a rogue?', action: '', nextDialogueId: 'rogue_armor' },
          { text: 'I will consider it.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'browse_weapons',
        text: 'Take your time. Feel the weight, test the balance. A weapon is an extension of yourself - choose wisely.',
        options: [
          { text: 'Open the weapon shop.', action: 'open_shop_weapons', nextDialogueId: 'end' },
          { text: 'Show me armor instead.', action: '', nextDialogueId: 'shop_armor' },
          { text: 'I will come back later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'shop_armor',
        text: 'Good armor is the difference between walking out of the dungeon and being carried out. I stock leather for flexibility, chainmail for balance, and plate for maximum protection. What do you need?',
        options: [
          { text: 'Show me light armor (leather, robes).', action: 'open_shop_light_armor', nextDialogueId: 'browse_armor' },
          { text: 'Show me medium armor (chainmail).', action: 'open_shop_medium_armor', nextDialogueId: 'browse_armor' },
          { text: 'Show me heavy armor (plate).', action: 'open_shop_heavy_armor', nextDialogueId: 'browse_armor' },
          { text: 'What armor is best for a warrior?', action: '', nextDialogueId: 'warrior_armor' },
          { text: 'What armor is best for a rogue?', action: '', nextDialogueId: 'rogue_armor' },
          { text: 'Show me weapons instead.', action: '', nextDialogueId: 'shop_weapons' },
        ],
      },
      {
        id: 'warrior_armor',
        text: 'Warriors need protection that can take a beating. Plate armor is your best bet - heavy, but it will turn aside blows that would kill a lesser-armored fighter. Pair it with a shield and you will be a walking fortress.',
        options: [
          { text: 'Show me heavy armor.', action: 'open_shop_heavy_armor', nextDialogueId: 'browse_armor' },
          { text: 'Too heavy. What else do you have?', action: '', nextDialogueId: 'shop_armor' },
        ],
      },
      {
        id: 'rogue_armor',
        text: 'Rogues need to stay quick on their feet. Leather armor is your friend - decent protection without slowing you down. Some rogues prefer a simple cloak, relying on not being hit rather than absorbing blows.',
        options: [
          { text: 'Show me light armor.', action: 'open_shop_light_armor', nextDialogueId: 'browse_armor' },
          { text: 'Show me all armor options.', action: '', nextDialogueId: 'shop_armor' },
        ],
      },
      {
        id: 'browse_armor',
        text: 'Each piece is crafted to last. The armor you choose could save your life a hundred times over.',
        options: [
          { text: 'Open the armor shop.', action: 'open_shop_armor', nextDialogueId: 'end' },
          { text: 'Show me weapons instead.', action: '', nextDialogueId: 'shop_weapons' },
          { text: 'I will return later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'repair_service',
        text: 'Aye, I can repair damaged equipment. Bring me your battered gear and I will make it good as new. For a price, of course. Nothing in this life is free, especially quality smithing.',
        options: [
          { text: 'Repair my equipment.', action: 'repair_equipment', nextDialogueId: 'repair_complete' },
          { text: 'How much do you charge?', action: '', nextDialogueId: 'repair_cost' },
          { text: 'Maybe later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'repair_cost',
        text: 'Depends on the damage. Minor repairs are 10 gold, major work could run you 50 or more. But it is cheaper than buying new gear, I promise you that.',
        options: [
          { text: 'Repair my equipment.', action: 'repair_equipment', nextDialogueId: 'repair_complete' },
          { text: 'I will think about it.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'repair_complete',
        text: 'There you are - good as new! That should hold up against whatever the dungeon throws at you. For a while, at least.',
        options: [
          { text: 'Thank you, Hilda.', action: '', nextDialogueId: 'end' },
          { text: 'Can I see your shop?', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'about_craft',
        text: 'Been smithing for thirty years, learned from my father who learned from his father. Every piece I forge carries that legacy. It is not just about hitting hot metal - it is about understanding the steel, respecting the process. That is why my work never fails.',
        options: [
          { text: 'Impressive dedication.', action: '', nextDialogueId: 'craft_pride' },
          { text: 'Can I see your wares?', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'craft_pride',
        text: 'Dedication is what separates a blacksmith from someone who just pounds metal. Now, was there something you needed, or are you just here for conversation?',
        options: [
          { text: 'Show me what you have for sale.', action: '', nextDialogueId: 'start' },
          { text: 'Can you craft with my materials?', action: '', nextDialogueId: 'crafting_service' },
          { text: 'Just wanted to talk. Farewell.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'crafting_service',
        text: 'Now this is my favorite work. Bring me dungeon scraps and I will forge something useful. Pick a pattern and I will get to work.',
        options: [
          { text: 'Weave a Venomcloak (Spider Silk x3, Poison Fang x1).', action: 'craft_venomcloak', nextDialogueId: 'crafting_service' },
          { text: 'Forge Bonebound Mail (Troll Hide x2, Bone Fragment x2).', action: 'craft_bonebound_mail', nextDialogueId: 'crafting_service' },
          { text: 'Bind a Soul Lens (Soul Fragment x1, XP Crystal x1).', action: 'craft_soul_lens', nextDialogueId: 'crafting_service' },
          { text: 'Imprint an Enchanting Sigil (Stolen Ring x1, XP Crystal x2).', action: 'craft_enchanting_sigil', nextDialogueId: 'crafting_service' },
          { text: 'Brew Antivenom Pack (Rat Tail x2, Poison Fang x1, Bone Fragment x1).', action: 'craft_antivenom_pack', nextDialogueId: 'crafting_service' },
          { text: 'Maybe another time.', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'farewell',
        text: 'Come back when you need proper equipment! The dungeon will not wait, and neither will the creatures inside.',
        options: [{ text: 'Farewell, Hilda.', action: '', nextDialogueId: 'end' }],
      },
      {
        id: 'end',
        text: '',
        options: [],
      },
    ],
    inventory: ['weapon_dagger', 'weapon_short_sword', 'weapon_long_sword', 'weapon_battle_axe', 'weapon_spear', 'armor_leather', 'armor_chain_mail', 'armor_plate', 'armor_shield'],
  };
