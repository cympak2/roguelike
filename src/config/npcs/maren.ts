import { NPCType, type NPCDefinition } from './types';

export const MAREN_NPC: NPCDefinition =
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
  };
