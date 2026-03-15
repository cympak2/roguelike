import { NPCType, type NPCDefinition } from './types';

export const VEX_NPC: NPCDefinition =
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
          { text: 'I finished the job you asked for.', action: 'claim_quest_reward', nextDialogueId: 'end' },
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
    questsOffered: ['retrieve_stolen_ring'],
  };
