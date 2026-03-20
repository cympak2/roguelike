import { NPCType, type NPCDefinition } from './types';

export const ZANE_NPC: NPCDefinition =
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
          { text: 'What changed now that the Lich is gone?', action: 'recovery_phase_reflection', nextDialogueId: 'recovery_reflection' },
          { text: 'Who are you, exactly?', action: '', nextDialogueId: 'about_zane' },
          { text: 'Do you have any tasks for me?', action: '', nextDialogueId: 'side_quest' },
          { text: 'I have returned with news from the dungeon.', action: 'claim_quest_reward', nextDialogueId: 'end' },
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
          { text: 'I will seek Dawnbringer.', action: 'accept_quest_dawnbringer', nextDialogueId: 'end' },
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
        id: 'recovery_reflection',
        text: 'The shadow crown is broken, but old wards still tremble. I spend my nights steadying the ley lines so your workers can rebuild without waking what should stay buried.',
        options: [
          { text: 'I appreciate your vigilance.', action: '', nextDialogueId: 'start' },
          { text: 'May your wards hold.', action: '', nextDialogueId: 'end' },
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
  };
