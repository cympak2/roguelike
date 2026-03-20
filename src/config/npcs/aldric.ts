import { NPCType, type NPCDefinition } from './types';

export const ALDRIC_NPC: NPCDefinition =
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
          { text: 'I have completed a task for you.', action: 'claim_quest_reward', nextDialogueId: 'end' },
          { text: 'How goes the recovery effort?', action: 'recovery_milestone_response', nextDialogueId: 'recovery_status' },
          { text: 'What task should I handle next?', action: 'recovery_task_hook', nextDialogueId: 'recovery_task_hook' },
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
          { text: 'Rats and goblins are too fast. I can’t catch them.', action: '', nextDialogueId: 'throwing_advice' },
          { text: 'Do you have any final advice?', action: '', nextDialogueId: 'final_advice' },
        ],
      },
      {
        id: 'throwing_advice',
        text: 'A fair concern. Quick vermin are best answered at range. Visit Hilda and ask for throwing rocks, a bow, or a crossbow. One good ranged hit can stop them before they swarm you.',
        options: [
          { text: 'That helps. I will speak to Hilda.', action: '', nextDialogueId: 'end' },
          { text: 'Any other final advice?', action: '', nextDialogueId: 'final_advice' },
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
        id: 'recovery_status',
        text: 'Your victory over the Lich gave us a chance to rebuild. We are securing roads, tending the injured, and shoring up damaged homes one task at a time.',
        options: [
          { text: 'I can keep helping. What is next?', action: 'recovery_task_hook', nextDialogueId: 'recovery_task_hook' },
          { text: 'I will check in with the others.', action: '', nextDialogueId: 'start' },
        ],
      },
      {
        id: 'recovery_task_hook',
        text: 'Our recovery board tracks urgent work in sequence. Complete each assignment and report back so we can unlock the next effort safely.',
        options: [
          { text: 'Understood. I will keep the town moving forward.', action: '', nextDialogueId: 'end' },
          { text: 'Remind me how progress is going.', action: 'recovery_milestone_response', nextDialogueId: 'recovery_status' },
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
    questsOffered: ['clear_dungeon_level_1', 'clear_dungeon_level_2'],
  };
