import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { ModalBackground } from '../ui/modal-background';
import type { QuestObjective } from '../entities/player';

interface QuestCarrier {
  quests?: QuestObjective[];
}

interface QuestLogSceneInitData {
  player?: QuestCarrier;
  quests?: QuestObjective[];
}

export type { QuestLogSceneInitData };

/**
 * QuestLogScene - Overlay scene for accepted quest tracking
 */
export class QuestLogScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private modalBackground!: ModalBackground;
  private quests: QuestObjective[] = [];
  private selectedQuestIndex: number = 0;
  private questListOffset: number = 0;

  private readonly panelX = 6;
  private readonly panelY = 3;
  private readonly panelWidth = 68;
  private readonly panelHeight = 24;
  private readonly visibleQuestRows = 8;

  constructor() {
    super({ key: 'QuestLogScene' });
  }

  init(data: QuestLogSceneInitData): void {
    const sourceQuests = data.quests ?? data.player?.quests ?? [];
    this.quests = sourceQuests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      objective: quest.objective,
      completed: quest.completed,
    }));
    this.selectedQuestIndex = 0;
    this.questListOffset = 0;
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
      if (key === 'escape' || key === 'j') {
        this.closeQuestLog();
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
      }
    });

    this.draw();
  }

  private closeQuestLog(): void {
    this.modalBackground.hide();
    this.asciiRenderer.clear();
    this.scene.resume('GameScene');
    this.scene.stop('QuestLogScene');
  }

  private moveSelection(delta: number): void {
    if (this.quests.length === 0) {
      return;
    }

    this.selectedQuestIndex = Phaser.Math.Clamp(
      this.selectedQuestIndex + delta,
      0,
      this.quests.length - 1
    );

    if (this.selectedQuestIndex < this.questListOffset) {
      this.questListOffset = this.selectedQuestIndex;
    } else if (this.selectedQuestIndex >= this.questListOffset + this.visibleQuestRows) {
      this.questListOffset = this.selectedQuestIndex - this.visibleQuestRows + 1;
    }

    this.draw();
  }

  private draw(): void {
    this.asciiRenderer.clear();
    this.modalBackground.show();

    this.asciiRenderer.drawBox(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x00ff00);
    this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 1, 'QUEST LOG', 0xffff00);
    this.asciiRenderer.drawText(
      this.panelX + 20,
      this.panelY + 1,
      `Accepted: ${this.quests.length}`,
      0xffdd66
    );

    for (let i = 0; i < this.panelWidth - 2; i++) {
      this.asciiRenderer.drawTile(this.panelX + 1 + i, this.panelY + 3, '-', 0x00ff00);
      this.asciiRenderer.drawTile(
        this.panelX + 1 + i,
        this.panelY + this.panelHeight - 3,
        '-',
        0x00ff00
      );
    }

    if (this.quests.length === 0) {
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + 6, 'No accepted quests yet.', 0xaaaaaa);
      this.asciiRenderer.drawText(
        this.panelX + 2,
        this.panelY + 8,
        'Talk to townsfolk and choose quest dialogue options.',
        0x888888
      );
      this.drawControls();
      return;
    }

    const startY = this.panelY + 5;
    for (let row = 0; row < this.visibleQuestRows; row++) {
      const questIndex = this.questListOffset + row;
      const quest = this.quests[questIndex];
      if (!quest) {
        break;
      }

      const isSelected = questIndex === this.selectedQuestIndex;
      const statusText = quest.completed ? '[COMPLETED]' : '[ACTIVE]';
      const statusColor = quest.completed ? 0x66ff99 : 0xffcc66;
      const titleColor = isSelected ? 0x00ff00 : 0xffffff;
      const pointer = isSelected ? '> ' : '  ';
      const maxTitleLength = this.panelWidth - 18;
      const title = quest.title.length > maxTitleLength
        ? `${quest.title.substring(0, maxTitleLength - 3)}...`
        : quest.title;

      this.asciiRenderer.drawText(this.panelX + 2, startY + row * 2, `${pointer}${statusText}`, statusColor);
      this.asciiRenderer.drawText(this.panelX + 15, startY + row * 2, title, titleColor);
    }

    const selectedQuest = this.quests[this.selectedQuestIndex];
    if (selectedQuest) {
      this.asciiRenderer.drawText(this.panelX + 2, this.panelY + this.panelHeight - 6, 'Objective:', 0xaaaaaa);
      const objectiveWidth = this.panelWidth - 4;
      const objectiveText = selectedQuest.objective.length > objectiveWidth
        ? `${selectedQuest.objective.substring(0, objectiveWidth - 3)}...`
        : selectedQuest.objective;
      this.asciiRenderer.drawText(
        this.panelX + 2,
        this.panelY + this.panelHeight - 5,
        objectiveText,
        0xdddddd
      );
    }

    this.drawControls();
  }

  private drawControls(): void {
    const hint = '[UP/DOWN] Select  [J/ESC] Close';
    const hintX = this.panelX + Math.floor((this.panelWidth - hint.length) / 2);
    this.asciiRenderer.drawText(hintX, this.panelY + this.panelHeight - 2, hint, 0x00ff88);
  }
}

export default QuestLogScene;
