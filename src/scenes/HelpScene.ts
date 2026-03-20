import Phaser from 'phaser';
import { ASCIIRenderer } from '../ui/ascii-renderer';
import { ModalBackground } from '../ui/modal-background';

export class HelpScene extends Phaser.Scene {
  private asciiRenderer!: ASCIIRenderer;
  private modalBackground!: ModalBackground;
  private isVisible = true;

  private readonly panelStartX = 3;
  private readonly panelStartY = 2;
  private readonly panelWidth = 74;
  private readonly panelHeight = 34;

  constructor() {
    super({ key: 'HelpScene' });
  }

  create(): void {
    this.asciiRenderer = new ASCIIRenderer(this, 80, 40, 12, 12, 0, 0);
    this.modalBackground = new ModalBackground(
      this,
      this.panelStartX,
      this.panelStartY,
      this.panelWidth,
      this.panelHeight
    );

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isVisible) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'escape' || key === 'h') {
        event.preventDefault();
        this.hideHelp();
      }
    });

    this.draw();
  }

  private hideHelp(): void {
    this.isVisible = false;
    this.asciiRenderer.clear();
    this.modalBackground.hide();
    this.scene.resume('GameScene');
    this.scene.stop('HelpScene');
  }

  private draw(): void {
    this.asciiRenderer.clear();
    this.modalBackground.show();

    this.asciiRenderer.drawBox(
      this.panelStartX,
      this.panelStartY,
      this.panelWidth,
      this.panelHeight,
      0x00ff00
    );

    const title = 'HELP / CONTROLS';
    const titleX = this.panelStartX + Math.floor((this.panelWidth - title.length) / 2);
    this.asciiRenderer.drawText(titleX, this.panelStartY + 1, title, 0xffff00);

    const lines: Array<{ text: string; color?: number }> = [
      { text: 'General', color: 0x00ff88 },
      { text: '  Arrow keys / WASD  - Move' },
      { text: '  T                  - Talk to nearby NPC' },
      { text: '  G                  - Pick up item(s) on your tile' },
      { text: '  I                  - Open inventory' },
      { text: '  H                  - Open/close this help overlay' },
      { text: '  J                  - Open quest log' },
      { text: '  B                  - Break stick from nearby tree' },
      { text: '  F                  - Fill flask from nearby water' },
      { text: '  X                  - Disarm nearby revealed trap' },
      { text: '  R                  - Use altar when standing near it' },
      { text: '  C                  - Open cooking selection near fire' },
      { text: '  M                  - Make campfire from sticks' },
      { text: '  E                  - Eat corpse from inventory' },
      { text: '  V                  - Cast companion summon spell' },
      { text: '  L                  - Cast lightning bolt spell' },
      { text: '  Q                  - Perform ranged attack' },
      { text: '  < or ,             - Use stairs up' },
      { text: '  > or .             - Use stairs down' },
      { text: '' },
      { text: 'Selection overlays', color: 0x00ff88 },
      { text: '  Up/Down or W/S     - Change selection' },
      { text: '  Enter              - Confirm selection' },
      { text: '  Esc                - Cancel/close selection' },
      { text: '' },
      { text: '[H] or [Esc] to close', color: 0x00ff88 },
    ];

    const startX = this.panelStartX + 2;
    const startY = this.panelStartY + 3;
    lines.forEach((line, index) => {
      this.asciiRenderer.drawText(startX, startY + index, line.text, line.color ?? 0xffffff);
    });
  }
}

export default HelpScene;
