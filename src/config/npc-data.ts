/**
 * NPC Data Configuration
 * Defines all non-player characters (NPCs), merchants, questgivers, and dialogue
 */

import { NPC } from '../entities/npc';
import type { NPCSpawnPoint } from '../world/town-gen';

export enum NPCType {
  MERCHANT = 'merchant',
  QUESTGIVER = 'questgiver',
  HEALER = 'healer',
  SAGE = 'sage',
  GUARD = 'guard',
  INNKEEPER = 'innkeeper',
}

export interface DialogueOption {
  text: string;
  action: string;
  nextDialogueId?: string;
}

export interface DialogueNode {
  id: string;
  text: string;
  options: DialogueOption[];
}

export interface NPCDefinition {
  id: string;
  name: string;
  description: string;
  type: NPCType;
  level: number;
  color: number;
  glyph: string;
  dialogue: DialogueNode[];
  inventory?: string[];
  questsOffered?: string[];
  spawnRules?: NPCSpawnRules;
}

export type NPCSpawnLocation = 'town' | 'dungeon';

export interface NPCSpawnRules {
  locations: NPCSpawnLocation[];
  dungeonFloorMin?: number;
  dungeonFloorMax?: number;
}

export const NPCS: NPCDefinition[] = [
  // Elder Aldric - Quest Giver in Elder's House
  {
    id: 'aldric',
    name: 'Elder Aldric',
    description: 'The wise village elder who guides adventurers in their quests',
    type: NPCType.QUESTGIVER,
    level: 1,
    color: 0xFFD700, // Gold
    glyph: '@',
    dialogue: [
      {
        id: 'start',
        text: 'Greetings, adventurer. Our town faces great danger from the dungeon below. Will you help us?',
        options: [
          { text: 'Tell me more about this danger.', action: '', nextDialogueId: 'quest_details' },
          { text: 'I am ready to help!', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'What reward do you offer?', action: '', nextDialogueId: 'reward_info' },
          { text: 'Perhaps another time.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'quest_details',
        text: 'Dark creatures have been emerging from the ancient dungeon beneath our town. Once a sacred temple, it now spawns monsters that terrorize our people. We need someone brave enough to venture inside and eliminate the threat at its source.',
        options: [
          { text: 'How many levels deep is this dungeon?', action: '', nextDialogueId: 'dungeon_depth' },
          { text: 'I will take on this quest.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'This sounds too dangerous.', action: '', nextDialogueId: 'too_dangerous' },
        ],
      },
      {
        id: 'dungeon_depth',
        text: 'The dungeon descends at least five levels, each more perilous than the last. We believe the source of the evil lies deep below. Start by clearing the first level and report back to me.',
        options: [
          { text: 'I accept this challenge.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'I need to prepare better first.', action: '', nextDialogueId: 'preparation' },
        ],
      },
      {
        id: 'reward_info',
        text: 'For clearing the first level, I offer 100 gold and a magical amulet of protection. More dangerous levels will yield greater rewards. The gratitude of our entire town is worth more than gold, brave one.',
        options: [
          { text: 'I accept this quest.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'Let me think about it.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'too_dangerous',
        text: 'I understand your hesitation. Many have tried and failed. But you... you have something different about you. Speak with the other townspeople - they can help prepare you for what lies ahead.',
        options: [
          { text: 'Perhaps you are right. I will accept.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'I will consider it after I prepare.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'preparation',
        text: 'A wise choice. Hilda the blacksmith can provide weapons and armor. Maren the healer sells potions. And if you seek unconventional tools, find Vex - though be careful with that one.',
        options: [
          { text: 'Thank you for the advice.', action: '', nextDialogueId: 'farewell' },
          { text: 'Actually, I am ready now.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
        ],
      },
      {
        id: 'quest_accepted',
        text: 'Thank you, brave soul! Your courage gives hope to us all. The dungeon entrance is at the southern edge of town. May the light guide your path. Return to me when you have cleared the first level, and I shall reward you well.',
        options: [
          { text: 'I will not fail you.', action: '', nextDialogueId: 'end' },
          { text: 'Do you have any final advice?', action: '', nextDialogueId: 'final_advice' },
        ],
      },
      {
        id: 'final_advice',
        text: 'Trust your instincts. Watch for traps. And remember - not all who dwell in darkness are evil. Some may even help you, if approached with wisdom rather than steel.',
        options: [
          { text: 'Wise words. Farewell, Elder.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'farewell',
        text: 'Return when you are ready. The town needs heroes like you. Time is not on our side, but I have faith you will answer the call.',
        options: [{ text: 'Farewell, Elder Aldric.', action: '', nextDialogueId: 'end' }],
      },
      {
        id: 'end',
        text: '',
        options: [],
      },
    ],
    questsOffered: ['clear_dungeon_level_1'],
  },

  // Blacksmith Hilda - Weapon and Armor Merchant
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
  },

  // Healer Maren - Potions and Healing Services
  {
    id: 'maren',
    name: 'Healer Maren',
    description: 'A compassionate healer skilled in restorative magic and herbalism',
    type: NPCType.HEALER,
    level: 1,
    color: 0x00FF7F, // Spring green
    glyph: '+',
    dialogue: [
      {
        id: 'start',
        text: 'Welcome, traveler. You look weary from your journey. I can restore your health with healing magic, or provide potions for your adventures. How may I help you?',
        options: [
          { text: 'Please heal my wounds. [Free]', action: 'heal_player', nextDialogueId: 'heal_complete' },
          { text: 'I need healing potions.', action: '', nextDialogueId: 'shop_potions' },
          { text: 'What other services do you offer?', action: '', nextDialogueId: 'services' },
          { text: 'Tell me about your healing arts.', action: '', nextDialogueId: 'about_healing' },
          { text: 'I am fine, thank you.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'heal_complete',
        text: 'There you are, restored to full health. The healing light has mended your wounds. May it protect you on your journey into the dungeon.',
        options: [
          { text: 'Thank you, Maren. That feels much better.', action: '', nextDialogueId: 'heal_thanks' },
          { text: 'Can I purchase some potions as well?', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'heal_thanks',
        text: 'You are welcome, brave one. Return to me anytime you need healing. I am here to ensure our defenders stay strong.',
        options: [
          { text: 'I will. Farewell.', action: '', nextDialogueId: 'end' },
          { text: 'Actually, I would like to buy potions.', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'shop_potions',
        text: 'These potions are brewed from the finest herbs gathered from the surrounding forests. I have health potions of varying strengths, mana potions for spellcasters, antidotes for poison, and strength enhancers. What do you need?',
        options: [
          { text: 'Tell me about health potions.', action: '', nextDialogueId: 'health_potions' },
          { text: 'What about mana potions?', action: '', nextDialogueId: 'mana_potions' },
          { text: 'Do you have antidotes?', action: '', nextDialogueId: 'antidotes' },
          { text: 'Show me everything you have.', action: 'open_shop_potions', nextDialogueId: 'browse_shop' },
          { text: 'Maybe later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'health_potions',
        text: 'Health potions restore your vitality instantly. Small potions heal minor wounds, while larger ones can bring you back from the brink of death. Always keep a few on hand when exploring the dungeon - they have saved countless lives.',
        options: [
          { text: 'I will take some.', action: 'open_shop_health', nextDialogueId: 'browse_shop' },
          { text: 'Tell me about other potions.', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'mana_potions',
        text: 'For those who wield arcane powers, mana potions restore your magical energy. Essential for mages and clerics who depend on spells. Without mana, your most powerful abilities become useless.',
        options: [
          { text: 'I need mana potions.', action: 'open_shop_mana', nextDialogueId: 'browse_shop' },
          { text: 'What else do you have?', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'antidotes',
        text: 'The dungeon is home to venomous creatures - giant spiders, poisonous snakes, and worse. An antidote can save your life when venom courses through your veins. I recommend carrying at least two.',
        options: [
          { text: 'Give me some antidotes.', action: 'open_shop_antidote', nextDialogueId: 'browse_shop' },
          { text: 'Show me other potions.', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'browse_shop',
        text: 'Take your time. Each potion is carefully labeled with its effects and duration.',
        options: [
          { text: 'Open potion shop.', action: 'open_shop_potions', nextDialogueId: 'end' },
          { text: 'Tell me about your other services.', action: '', nextDialogueId: 'services' },
          { text: 'I will come back later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'services',
        text: 'Beyond healing and potions, I can cure diseases, remove curses, and even identify magical ailments. I also provide blessings for those venturing into danger - a small boost to your resilience.',
        options: [
          { text: 'Can you remove a curse?', action: '', nextDialogueId: 'curse_removal' },
          { text: 'I would like a blessing.', action: 'give_blessing', nextDialogueId: 'blessing_given' },
          { text: 'Tell me about diseases.', action: '', nextDialogueId: 'disease_info' },
          { text: 'Just potions for now.', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'curse_removal',
        text: 'Curses are dark magic that clings to the soul. I can remove most curses for 50 gold, though ancient curses may require rare components. Do you need this service now?',
        options: [
          { text: 'Yes, remove my curse.', action: 'remove_curse', nextDialogueId: 'curse_removed' },
          { text: 'Not right now.', action: '', nextDialogueId: 'services' },
        ],
      },
      {
        id: 'curse_removed',
        text: 'The curse has been lifted. You should feel the darkness receding. Be more careful with cursed items in the future - not all treasures are worth the price.',
        options: [
          { text: 'Thank you, I feel better already.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'blessing_given',
        text: 'May the light protect you. This blessing will grant you increased resistance to harm for a time. Use it wisely.',
        options: [
          { text: 'I am grateful, Maren.', action: '', nextDialogueId: 'end' },
          { text: 'Can I buy potions too?', action: '', nextDialogueId: 'shop_potions' },
        ],
      },
      {
        id: 'disease_info',
        text: 'Dungeon diseases are spread by rats, undead, and contaminated water. Symptoms include weakness, confusion, and festering wounds. If you contract a disease, return to me immediately. Left untreated, they can be fatal.',
        options: [
          { text: 'Good to know. Thank you.', action: '', nextDialogueId: 'services' },
          { text: 'Can you cure diseases now?', action: 'cure_disease', nextDialogueId: 'disease_cured' },
        ],
      },
      {
        id: 'disease_cured',
        text: 'The disease has been purged from your body. Rest for a moment - you will feel stronger soon.',
        options: [
          { text: 'Thank you for your help.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'about_healing',
        text: 'I learned the healing arts from the temple of light. Magic flows through all living things, and with the right training, you can channel that energy to mend wounds, cure ailments, and even turn aside death itself. It is a sacred calling.',
        options: [
          { text: 'A noble profession.', action: '', nextDialogueId: 'noble_profession' },
          { text: 'Can you teach me to heal?', action: '', nextDialogueId: 'teach_healing' },
        ],
      },
      {
        id: 'noble_profession',
        text: 'It is more than a profession - it is a duty. As long as brave souls fight to protect this town, I will be here to heal them. Now, what can I do for you?',
        options: [
          { text: 'Heal my wounds, please.', action: 'heal_player', nextDialogueId: 'heal_complete' },
          { text: 'Show me your potions.', action: '', nextDialogueId: 'shop_potions' },
          { text: 'Nothing right now. Farewell.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'teach_healing',
        text: 'Teaching the healing arts takes years of study and practice. But I can share some basic knowledge - herbs for treating wounds, pressure points to stop bleeding. If you truly wish to learn, seek out the Temple of Light in the eastern kingdoms.',
        options: [
          { text: 'Thank you for the advice.', action: '', nextDialogueId: 'end' },
          { text: 'For now, I need healing.', action: 'heal_player', nextDialogueId: 'heal_complete' },
        ],
      },
      {
        id: 'farewell',
        text: 'Stay safe, traveler. And remember - no treasure is worth your life. Return to me if you need healing.',
        options: [{ text: 'Goodbye, Maren.', action: '', nextDialogueId: 'end' }],
      },
      {
        id: 'end',
        text: '',
        options: [],
      },
    ],
    inventory: ['potion_health', 'potion_mana', 'potion_cure_poison', 'potion_strength'],
  },

  // Thief Vex - Lockpicks and Hints
  {
    id: 'vex',
    name: 'Vex the Rogue',
    description: 'A mysterious thief who deals in lockpicks, traps, and secret information',
    type: NPCType.MERCHANT,
    level: 1,
    color: 0x9370DB, // Medium purple
    glyph: 'V',
    dialogue: [
      {
        id: 'start',
        text: 'Psst... Looking for something special? I deal in goods and information that the more... respectable merchants won\'t touch. Tools for getting into places you shouldn\'t be, and secrets about what you will find there.',
        options: [
          { text: 'What kind of tools do you sell?', action: '', nextDialogueId: 'shop_tools' },
          { text: 'Tell me what you know about the dungeon.', action: '', nextDialogueId: 'dungeon_hints' },
          { text: 'How did you become a thief?', action: '', nextDialogueId: 'backstory' },
          { text: 'Do you have any special jobs?', action: '', nextDialogueId: 'special_jobs' },
          { text: 'I should go.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'shop_tools',
        text: 'Lockpicks, naturally - both single picks for the skilled and full sets for beginners. Rope for climbing, torches for seeing in the dark, and smoke bombs for quick escapes. Everything a discerning adventurer needs for unsanctioned entry.',
        options: [
          { text: 'Tell me about lockpicks.', action: '', nextDialogueId: 'about_lockpicks' },
          { text: 'What are smoke bombs used for?', action: '', nextDialogueId: 'smoke_bombs' },
          { text: 'Show me what you have.', action: 'open_shop_tools', nextDialogueId: 'browse_shop' },
          { text: 'Tell me about the dungeon instead.', action: '', nextDialogueId: 'dungeon_hints' },
        ],
      },
      {
        id: 'about_lockpicks',
        text: 'Lockpicks are essential for treasure hunters. Many of the best loot in the dungeon is behind locked doors and chests. A skilled picker can open anything - though some locks are trickier than others. Single picks are cheap but break easily. A full set costs more but gives you backup options.',
        options: [
          { text: 'Can you teach me to pick locks?', action: '', nextDialogueId: 'teach_lockpicking' },
          { text: 'I will take some lockpicks.', action: 'open_shop_lockpicks', nextDialogueId: 'browse_shop' },
          { text: 'What else do you sell?', action: '', nextDialogueId: 'shop_tools' },
        ],
      },
      {
        id: 'teach_lockpicking',
        text: 'Lockpicking is an art. It is about feeling the pins, listening to the tumblers, having a gentle touch. I could teach you the basics for, say, 30 gold? Or you can fumble around with a set of picks and learn the hard way.',
        options: [
          { text: 'Teach me. [30 gold]', action: 'learn_lockpicking', nextDialogueId: 'taught_lockpicking' },
          { text: 'I will figure it out myself.', action: '', nextDialogueId: 'self_taught' },
        ],
      },
      {
        id: 'taught_lockpicking',
        text: 'There you go - the basics. Remember: gentle pressure, listen to the clicks, don\'t force it. You will get better with practice. Now you can open most common locks.',
        options: [
          { text: 'Thanks for the lesson.', action: '', nextDialogueId: 'end' },
          { text: 'Sell me some lockpicks.', action: 'open_shop_lockpicks', nextDialogueId: 'browse_shop' },
        ],
      },
      {
        id: 'self_taught',
        text: 'Suit yourself. Just know that broken picks are expensive to replace, and some locks will punish you for fumbling. Come back if you change your mind.',
        options: [
          { text: 'I will keep that in mind.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'smoke_bombs',
        text: 'Smoke bombs create a thick cloud that lets you vanish from sight. Perfect for escaping when things go wrong, or setting up an ambush. Toss one down, slip into the shadows, and your enemies will be swinging at ghosts.',
        options: [
          { text: 'Useful. I will take some.', action: 'open_shop_tools', nextDialogueId: 'browse_shop' },
          { text: 'Tell me about your other tools.', action: '', nextDialogueId: 'shop_tools' },
        ],
      },
      {
        id: 'browse_shop',
        text: 'All high quality, I assure you. No shoddy merchandise here - I have a reputation to maintain.',
        options: [
          { text: 'Open shop.', action: 'open_shop', nextDialogueId: 'end' },
          { text: 'Tell me about the dungeon.', action: '', nextDialogueId: 'dungeon_hints' },
          { text: 'I will come back later.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'dungeon_hints',
        text: 'I have... explored the upper levels myself. Not as a hero, mind you - I was looking for portable wealth. But I learned things. Things that might keep you alive.',
        options: [
          { text: 'What did you learn?', action: '', nextDialogueId: 'hints_general' },
          { text: 'Tell me about locked areas.', action: '', nextDialogueId: 'hints_locks' },
          { text: 'What about traps?', action: '', nextDialogueId: 'hints_traps' },
          { text: 'Any hints about treasure?', action: '', nextDialogueId: 'hints_treasure' },
        ],
      },
      {
        id: 'hints_general',
        text: 'The dungeon has many locked doors and hidden passages. Bring lockpicks. Watch for pressure plates and tripwires - this place is rigged to kill. And the monsters get tougher the deeper you go. Obvious, maybe, but worth remembering.',
        options: [
          { text: 'Tell me more about locks.', action: '', nextDialogueId: 'hints_locks' },
          { text: 'What about traps?', action: '', nextDialogueId: 'hints_traps' },
          { text: 'Thanks for the warnings.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'hints_locks',
        text: 'Most treasure rooms are locked. Some doors need keys - silver, gold, ornate ones. Others can be picked. There is a master vault on the third level that requires three different keys. Whatever is inside must be valuable.',
        options: [
          { text: 'Where are these keys?', action: '', nextDialogueId: 'hints_keys' },
          { text: 'Tell me about traps.', action: '', nextDialogueId: 'hints_traps' },
          { text: 'Good information. Thanks.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'hints_keys',
        text: 'Keys are usually on elite monsters or hidden in secret rooms. Sometimes behind other locks. It is layers of security, see? The ancients really didn\'t want people getting to their treasures.',
        options: [
          { text: 'I will keep an eye out.', action: '', nextDialogueId: 'end' },
          { text: 'What else can you tell me?', action: '', nextDialogueId: 'dungeon_hints' },
        ],
      },
      {
        id: 'hints_traps',
        text: 'Pressure plates trigger dart traps, collapsing floors, even poisoned gas. Tripwires can bring down ceiling spikes. And some chests are trapped - opening them wrong sets off explosions. Always check before you touch.',
        options: [
          { text: 'How do I spot traps?', action: '', nextDialogueId: 'spotting_traps' },
          { text: 'Can traps be disarmed?', action: '', nextDialogueId: 'disarm_traps' },
        ],
      },
      {
        id: 'spotting_traps',
        text: 'Look for seams in the floor, suspicious holes in walls, wires across doorways. Some are well hidden and require a keen eye. Rogues like me have a natural talent for it, but anyone can learn to be cautious.',
        options: [
          { text: 'Can you teach me? [20 gold]', action: 'learn_trap_detection', nextDialogueId: 'taught_traps' },
          { text: 'I will just be careful.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'taught_traps',
        text: 'There - now you know what to look for. You will spot most common traps now. Just remember: when in doubt, don\'t step on it.',
        options: [
          { text: 'Valuable knowledge. Thanks.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'disarm_traps',
        text: 'Some traps can be disarmed if you have the right tools and knowledge. Others are best avoided entirely. The ones I couldn\'t disarm, I just went around. No shame in staying alive.',
        options: [
          { text: 'Smart approach.', action: '', nextDialogueId: 'end' },
          { text: 'Tell me about treasure.', action: '', nextDialogueId: 'hints_treasure' },
        ],
      },
      {
        id: 'hints_treasure',
        text: 'The best loot is always locked away or guarded by the toughest monsters. Secret rooms hide rare items. And if you find anything with a purple glow, that is rare gear - very valuable. Worth the risk.',
        options: [
          { text: 'Where are secret rooms?', action: '', nextDialogueId: 'secret_rooms' },
          { text: 'Thanks for the tips.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'secret_rooms',
        text: 'Look for cracks in walls, suspicious decorations, floors that sound hollow. Secret passages are everywhere if you know how to look. I found a fortune in one of those rooms before things got too hot and I had to leave.',
        options: [
          { text: 'I will search thoroughly.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'backstory',
        text: 'Everyone has a past. Let us just say I had talents that weren\'t appreciated in the... legitimate business world. This town suits me better. I stay out of trouble, mostly, and sell tools to those who need them.',
        options: [
          { text: 'Fair enough. Show me your wares.', action: '', nextDialogueId: 'shop_tools' },
          { text: 'We all have our paths.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'special_jobs',
        text: 'Occasionally I hear about special items people want acquired. Or information they need gathered. If you are interested in lucrative side work - the kind that doesn\'t ask too many questions - I might have something for you.',
        options: [
          { text: 'I am interested. What is the job?', action: '', nextDialogueId: 'side_quest' },
          { text: 'Not right now.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'side_quest',
        text: 'There is a merchant in town who... let us say he has an item that should be mine. A jade statue, small, kept in his locked strongbox. Bring it to me discreetly, and I will make it worth your while. 100 gold.',
        options: [
          { text: 'Consider it done.', action: 'accept_quest_theft', nextDialogueId: 'quest_accepted' },
          { text: 'I am not a thief.', action: '', nextDialogueId: 'not_a_thief' },
        ],
      },
      {
        id: 'quest_accepted',
        text: 'Excellent. No rush, but don\'t dawdle either. The statue is in a locked box in the merchant\'s house. You will need lockpicks. And discretion.',
        options: [
          { text: 'I will get it.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'not_a_thief',
        text: 'Suit yourself. The offer stands if you change your mind. We all have to make compromises sometimes.',
        options: [
          { text: 'Maybe later.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'farewell',
        text: 'Be seeing you... maybe. And remember - if you need tools or information, I am your best source. Don\'t tell the others.',
        options: [{ text: 'Goodbye, Vex.', action: '', nextDialogueId: 'end' }],
      },
      {
        id: 'end',
        text: '',
        options: [],
      },
    ],
    inventory: ['lockpick', 'lockpick_set', 'rope', 'torch', 'smoke_bomb', 'scroll_companion_call'],
  },

  // Hermit Zane - Lore and Side Quests
  {
    id: 'zane',
    name: 'Hermit Zane',
    description: 'An ancient hermit who possesses deep knowledge of the world\'s forgotten secrets',
    type: NPCType.SAGE,
    level: 1,
    color: 0x8B4513, // Saddle brown
    glyph: 'Z',
    dialogue: [
      {
        id: 'start',
        text: 'Ah, a visitor... Few find their way to my humble dwelling at the edge of town. Most avoid the hermit who speaks of old things and forgotten times. But you... you seek knowledge, perhaps? Or merely curiosity brought you here?',
        options: [
          { text: 'Tell me about the ancient dungeon.', action: '', nextDialogueId: 'lore_dungeon' },
          { text: 'Who are you, exactly?', action: '', nextDialogueId: 'about_zane' },
          { text: 'Do you have any tasks for me?', action: '', nextDialogueId: 'side_quest' },
          { text: 'What do you know of the creatures below?', action: '', nextDialogueId: 'lore_monsters' },
          { text: 'Just exploring.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'about_zane',
        text: 'I am but an old man who has lived too long and seen too much. Once I was a scholar, delving into ancient texts and forgotten languages. The knowledge I uncovered drove me to solitude. Some truths are too heavy to share with the unready.',
        options: [
          { text: 'What truths did you uncover?', action: '', nextDialogueId: 'forbidden_knowledge' },
          { text: 'Tell me about the dungeon.', action: '', nextDialogueId: 'lore_dungeon' },
          { text: 'I should leave you in peace.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'forbidden_knowledge',
        text: 'Knowledge of things that predate our civilization. Powers that were sealed away for good reason. The dungeon below is but one remnant of an age when darkness walked freely. I warn those who will listen, but few do.',
        options: [
          { text: 'I am listening. What should I know?', action: '', nextDialogueId: 'lore_dungeon' },
          { text: 'Some things are best left forgotten.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'lore_dungeon',
        text: 'The dungeon beneath this town was once a temple - the Temple of Eternal Night, they called it. Built by an ancient civilization to contain and seal a powerful shadow lord. For millennia the seal held, but time weakens all bindings. The seal is cracking.',
        options: [
          { text: 'What was sealed there?', action: '', nextDialogueId: 'lore_sealed' },
          { text: 'Can the seal be repaired?', action: '', nextDialogueId: 'repair_seal' },
          { text: 'Why was it built here?', action: '', nextDialogueId: 'temple_location' },
          { text: 'Tell me about this civilization.', action: '', nextDialogueId: 'ancient_civ' },
        ],
      },
      {
        id: 'lore_sealed',
        text: 'A shadow lord - a being of pure darkness who commanded legions of nightmarish creatures. The ancients defeated it in a great war, but could not destroy it. So they imprisoned it instead, deep beneath layers of magical wards and physical barriers. The creatures you see now are but shadows of its power, seeping through the weakening seal.',
        options: [
          { text: 'How do we stop it?', action: '', nextDialogueId: 'stop_shadow' },
          { text: 'What happens if it breaks free?', action: '', nextDialogueId: 'shadow_freed' },
          { text: 'This is grave news.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'stop_shadow',
        text: 'The seal can be reinforced, but it requires artifacts scattered throughout the dungeon - keystones that anchor the binding magic. Gather them, and the seal can be renewed. Or... you could attempt to destroy the shadow lord itself. A dangerous path.',
        options: [
          { text: 'I will find these keystones.', action: 'accept_quest_keystones', nextDialogueId: 'quest_keystones_accepted' },
          { text: 'How would I destroy it?', action: '', nextDialogueId: 'destroy_shadow' },
        ],
      },
      {
        id: 'quest_keystones_accepted',
        text: 'A noble choice. There are five keystones, each on a different level of the dungeon. They glow with a faint blue light. Bring them to me, and I will perform the ritual to strengthen the seal.',
        options: [
          { text: 'I will find them all.', action: '', nextDialogueId: 'end' },
          { text: 'Tell me more about the shadow lord.', action: '', nextDialogueId: 'lore_sealed' },
        ],
      },
      {
        id: 'destroy_shadow',
        text: 'To destroy such a being requires a weapon of pure light - the kind forged in the heart of stars. Such weapons exist only in legend now. Unless... there is one sealed in the deepest chamber of the temple. But reaching it means passing through the shadow lord\'s domain.',
        options: [
          { text: 'I will try for this weapon.', action: '', nextDialogueId: 'legendary_weapon' },
          { text: 'The keystones sound safer.', action: '', nextDialogueId: 'stop_shadow' },
        ],
      },
      {
        id: 'legendary_weapon',
        text: 'Brave, or foolish - perhaps both. The weapon is called Dawnbringer, a blade that burns with holy fire. If you can claim it, the shadow lord can be slain permanently. But the path is perilous beyond measure.',
        options: [
          { text: 'I understand the risk.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'shadow_freed',
        text: 'Darkness will spread across the land like a plague. All light will be extinguished. The creatures of nightmare will multiply endlessly. Civilization will fall, and the world will become an eternal night. This must not come to pass.',
        options: [
          { text: 'Then I will stop it.', action: '', nextDialogueId: 'stop_shadow' },
          { text: 'That is... terrifying.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'repair_seal',
        text: 'Yes, but it requires powerful magic and ancient artifacts. The keystones that anchor the seal are scattered throughout the dungeon. If you could retrieve them, I could perform the ritual to strengthen the binding.',
        options: [
          { text: 'I will find these keystones.', action: 'accept_quest_keystones', nextDialogueId: 'quest_keystones_accepted' },
          { text: 'What else can I do?', action: '', nextDialogueId: 'lore_sealed' },
        ],
      },
      {
        id: 'temple_location',
        text: 'This land sits atop a convergence of ley lines - rivers of magical energy that flow through the earth. Such places have great power, which the ancients harnessed for their sealing ritual. It is both the perfect prison and, ironically, a source of power for what is imprisoned.',
        options: [
          { text: 'Fascinating. Tell me more.', action: '', nextDialogueId: 'lore_dungeon' },
          { text: 'What about the sealed evil?', action: '', nextDialogueId: 'lore_sealed' },
        ],
      },
      {
        id: 'ancient_civ',
        text: 'They called themselves the Luminae - the Light Bearers. Masters of magic, builders of wonders, protectors against darkness. They waged a centuries-long war against the shadow lord. Though victorious, they were broken by the conflict. Their civilization collapsed, leaving only ruins like this temple.',
        options: [
          { text: 'What happened to them?', action: '', nextDialogueId: 'luminae_fate' },
          { text: 'Are there other ruins?', action: '', nextDialogueId: 'other_ruins' },
          { text: 'Let us speak of other matters.', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'luminae_fate',
        text: 'Some say they ascended to a higher plane of existence. Others believe they simply died out, exhausted by war. I have read accounts of survivors fleeing to distant lands. Perhaps their descendants still live, unaware of their heritage.',
        options: [
          { text: 'A sad ending to a great people.', action: '', nextDialogueId: 'end' },
          { text: 'What else can you tell me?', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'other_ruins',
        text: 'Scattered across the world, yes. Most are buried, forgotten, or destroyed. Some still hold treasures and knowledge. And dangers - the Luminae did not only seal the shadow lord. Other evils were imprisoned in other places.',
        options: [
          { text: 'Perhaps I will seek them one day.', action: '', nextDialogueId: 'end' },
          { text: 'First, this dungeon.', action: '', nextDialogueId: 'lore_dungeon' },
        ],
      },
      {
        id: 'lore_monsters',
        text: 'The creatures that infest the dungeon are manifestations of the shadow lord\'s power. Goblins twisted by darkness, undead animated by necromantic energy, demons summoned from the void. As you descend deeper, you will face more powerful manifestations - echoes of the original nightmare.',
        options: [
          { text: 'How do I fight such creatures?', action: '', nextDialogueId: 'combat_advice' },
          { text: 'Are any not hostile?', action: '', nextDialogueId: 'friendly_creatures' },
          { text: 'Tell me more about the dungeon.', action: '', nextDialogueId: 'lore_dungeon' },
        ],
      },
      {
        id: 'combat_advice',
        text: 'Light-based magic and enchanted weapons are most effective. Holy water burns the undead. Silver harms demons. But more than weapons, you need strategy. Study your enemies, learn their patterns, exploit their weaknesses. Brute force alone will not carry you through.',
        options: [
          { text: 'Wise advice. Thank you.', action: '', nextDialogueId: 'end' },
          { text: 'Where can I get such weapons?', action: '', nextDialogueId: 'weapon_sources' },
        ],
      },
      {
        id: 'weapon_sources',
        text: 'The blacksmith Hilda can forge enchanted weapons if you bring her the right materials. And blessed items can sometimes be found in the dungeon itself - the Luminae left caches of weapons for future defenders.',
        options: [
          { text: 'I will seek these caches.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'friendly_creatures',
        text: 'Not all who dwell below are corrupted. Some spirits of the Luminae still linger, bound to protect the seal. They may aid you if you prove yourself worthy. And occasionally, adventurers who died below rise as guardians rather than monsters. Treat the dungeon with respect.',
        options: [
          { text: 'I will remember that.', action: '', nextDialogueId: 'end' },
        ],
      },
      {
        id: 'side_quest',
        text: 'I once possessed an amulet - a relic of the Luminae, inscribed with protective wards. I lost it years ago while exploring the third level of the dungeon, before age made such excursions impossible. If you find it, bring it to me. I will reward you with knowledge no gold can buy.',
        options: [
          { text: 'What does this amulet look like?', action: '', nextDialogueId: 'amulet_description' },
          { text: 'I will search for it.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'What knowledge do you offer?', action: '', nextDialogueId: 'quest_reward' },
          { text: 'I cannot help right now.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'amulet_description',
        text: 'Silver, with a sapphire gemstone in the center. The chain is fine, almost delicate. Luminae script is etched around the gem - words of protection and warding. It hums faintly with residual magic. You will know it when you see it.',
        options: [
          { text: 'I will search for it.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'What reward do you offer?', action: '', nextDialogueId: 'quest_reward' },
        ],
      },
      {
        id: 'quest_reward',
        text: 'I can teach you to read Luminae script, granting access to ancient tomes and inscriptions throughout the dungeon. I can enchant an item with protective magic. Or I can share the location of a hidden cache of powerful artifacts. Your choice, should you return the amulet.',
        options: [
          { text: 'A generous offer. I accept.', action: 'accept_quest', nextDialogueId: 'quest_accepted' },
          { text: 'Let me consider it.', action: '', nextDialogueId: 'farewell' },
        ],
      },
      {
        id: 'quest_accepted',
        text: 'Thank you, young one. The amulet means much to me - it is the last connection to my days of exploration. Search the third level thoroughly. It may be hidden in a chest or carried by a powerful creature. Good luck.',
        options: [
          { text: 'I will find it, Zane.', action: '', nextDialogueId: 'end' },
          { text: 'Before I go, tell me more.', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'farewell',
        text: 'May wisdom guide your path, traveler. Return when you seek knowledge or simply wish to speak with an old man. Few visit me these days. It is... pleasant to have company.',
        options: [{ text: 'Farewell, Zane.', action: '', nextDialogueId: 'end' }],
      },
      {
        id: 'end',
        text: '',
        options: [],
      },
    ],
    questsOffered: ['find_lost_amulet', 'collect_keystones', 'find_dawnbringer'],
  },
];

/**
 * Helper function to create NPC instances from spawn points
 * @param spawnPoints - Array of NPC spawn points from town generation
 * @returns Array of instantiated NPC entities
 */
export function createNPCsForTown(spawnPoints: NPCSpawnPoint[]): NPC[] {
  const npcInstances: NPC[] = [];

  for (const spawn of spawnPoints) {
    // Find the NPC definition matching this spawn point
    const npcDef = NPCS.find(def => def.id === spawn.npcId);
    
    if (!npcDef) {
      console.warn(`NPC definition not found for spawn point: ${spawn.npcId}`);
      continue;
    }

    // Create NPC instance with spawn position and NPC data
    const npc = new NPC(
      spawn.x,
      spawn.y,
      npcDef.name,
      npcDef.glyph,
      npcDef.color,
      npcDef.type as any, // Cast to match NPC class NPCType
      'start' // Default dialogue start ID
    );

    // Add all dialogue nodes from the definition
    if (npcDef.dialogue && npcDef.dialogue.length > 0) {
      const dialogueNodes = npcDef.dialogue.map(node => ({
        id: node.id,
        text: node.text,
        options: node.options.map(opt => ({
          id: opt.text.toLowerCase().replace(/\s+/g, '_'), // Generate simple ID
          text: opt.text,
          nextDialogueId: opt.nextDialogueId,
          action: opt.action ? () => {
            console.log(`Action triggered: ${opt.action}`);
          } : undefined,
        })),
      }));
      
      npc.addDialogues(dialogueNodes);
    }

    npcInstances.push(npc);
  }

  return npcInstances;
}

export function canNPCSpawnInContext(
  npc: NPCDefinition,
  location: NPCSpawnLocation,
  floor: number
): boolean {
  const rules: NPCSpawnRules = npc.spawnRules ?? { locations: ['town'] };

  if (!rules.locations.includes(location)) {
    return false;
  }

  if (location !== 'dungeon') {
    return true;
  }

  if (rules.dungeonFloorMin !== undefined && floor < rules.dungeonFloorMin) {
    return false;
  }

  if (rules.dungeonFloorMax !== undefined && floor > rules.dungeonFloorMax) {
    return false;
  }

  return true;
}

export function getNPCDefinitionsForContext(
  location: NPCSpawnLocation,
  floor: number
): NPCDefinition[] {
  return NPCS.filter((npc) => canNPCSpawnInContext(npc, location, floor));
}

export const NPC_DATA = {
  NPCS,
};

export default NPC_DATA;
