import Phaser from 'phaser';

/**
 * Enumeration of message types for categorization and color-coding
 */
export enum MessageType {
  // Combat messages
  COMBAT = 'COMBAT',
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',
  DEATH = 'DEATH',
  
  // Item messages
  ITEM_PICKUP = 'ITEM_PICKUP',
  ITEM_DROP = 'ITEM_DROP',
  ITEM_USE = 'ITEM_USE',
  
  // Interaction messages
  DIALOGUE = 'DIALOGUE',
  QUEST = 'QUEST',
  
  // System messages
  SYSTEM = 'SYSTEM',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Interface representing a single message in the log
 */
export interface Message {
  text: string;
  type: MessageType;
  timestamp: number;
  color?: number;
}

/**
 * MessageLog class manages combat and event messages with rendering support
 */
export class MessageLog {
  messages: Message[] = [];
  maxMessages: number = 100;
  messageColors: Map<MessageType, number> = new Map();
  
  // Rendering properties
  private textObjects: Phaser.GameObjects.Text[] = [];
  private scrollOffset: number = 0;
  private lineHeight: number = 20;
  private fontSize: number = 14;
  private fontFamily: string = 'monospace';
  private padding: number = 10;
  
  constructor(maxMessages: number = 100) {
    this.maxMessages = maxMessages;
    this.initializeColors();
  }

  /**
   * Initialize default colors for each message type
   */
  private initializeColors(): void {
    // Combat - Red
    this.messageColors.set(MessageType.COMBAT, 0xff4444);
    this.messageColors.set(MessageType.DAMAGE, 0xff0000);
    this.messageColors.set(MessageType.DEATH, 0x990000);
    
    // Healing - Green
    this.messageColors.set(MessageType.HEAL, 0x00ff00);
    
    // Items - Yellow
    this.messageColors.set(MessageType.ITEM_PICKUP, 0xffff00);
    this.messageColors.set(MessageType.ITEM_DROP, 0xffaa00);
    this.messageColors.set(MessageType.ITEM_USE, 0xffff99);
    
    // Dialogue - Cyan
    this.messageColors.set(MessageType.DIALOGUE, 0x00ffff);
    this.messageColors.set(MessageType.QUEST, 0x0099ff);
    
    // System - White and variants
    this.messageColors.set(MessageType.SYSTEM, 0xffffff);
    this.messageColors.set(MessageType.INFO, 0xaaaaaa);
    this.messageColors.set(MessageType.WARNING, 0xff9900);
    this.messageColors.set(MessageType.ERROR, 0xff0000);
  }

  /**
   * Set custom color for a message type
   */
  setMessageColor(type: MessageType, color: number): void {
    this.messageColors.set(type, color);
  }

  /**
   * Add a new message to the log
   */
  addMessage(text: string, type: MessageType = MessageType.SYSTEM, color?: number): void {
    const message: Message = {
      text,
      type,
      timestamp: Date.now(),
      color: color || this.messageColors.get(type),
    };

    this.messages.push(message);

    // Maintain max message limit
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    // Reset scroll to show latest message
    this.scrollOffset = 0;
  }

  /**
   * Get recent messages
   */
  getMessages(count: number = 10): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * Get all messages (limited by maxMessages)
   */
  getAllMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Clear all messages from the log
   */
  clear(): void {
    this.messages = [];
    this.scrollOffset = 0;
    this.clearRenderObjects();
  }

  /**
   * Scroll up in the message log (show older messages)
   */
  scrollUp(lines: number = 1): void {
    this.scrollOffset += lines;
    // Ensure we don't scroll beyond the start
    this.scrollOffset = Math.min(
      this.scrollOffset,
      Math.max(0, this.messages.length - 1)
    );
  }

  /**
   * Scroll down in the message log (show newer messages)
   */
  scrollDown(lines: number = 1): void {
    this.scrollOffset -= lines;
    // Ensure we don't scroll below zero (latest messages)
    this.scrollOffset = Math.max(0, this.scrollOffset);
  }

  /**
   * Reset scroll to show latest messages
   */
  resetScroll(): void {
    this.scrollOffset = 0;
  }

  /**
   * Word wrap text to fit within a given width
   */
  private wordWrap(text: string, maxWidth: number, context: Phaser.GameObjects.Text): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = context.getTextMetrics();
      
      // Estimate width (rough approximation)
      const charWidth = maxWidth / (maxWidth / this.fontSize * 0.6);
      const estimatedWidth = testLine.length * charWidth;

      if (estimatedWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Clear all rendered text objects
   */
  private clearRenderObjects(): void {
    this.textObjects.forEach(obj => {
      if (obj && !obj.isDestroyed) {
        obj.destroy();
      }
    });
    this.textObjects = [];
  }

  /**
   * Render message log to the scene
   */
  render(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    showTimestamps: boolean = false
  ): void {
    this.clearRenderObjects();

    if (this.messages.length === 0) {
      return;
    }

    const availableHeight = height - this.padding * 2;
    const maxLines = Math.floor(availableHeight / this.lineHeight);
    
    // Get messages to display (accounting for scroll offset)
    const startIndex = Math.max(0, this.messages.length - maxLines - this.scrollOffset);
    const displayMessages = this.messages.slice(startIndex, startIndex + maxLines);

    let currentY = y + height - this.lineHeight - this.padding;

    // Render messages from bottom to top (latest at bottom)
    for (const message of displayMessages.reverse()) {
      if (currentY < y + this.padding) {
        break;
      }

      const displayText = showTimestamps
        ? `[${new Date(message.timestamp).toLocaleTimeString()}] ${message.text}`
        : message.text;

      const textObject = scene.make.text(
        {
          x: x + this.padding,
          y: currentY,
          text: displayText,
          style: {
            font: `${this.fontSize}px ${this.fontFamily}`,
            fill: '#' + (message.color ?? this.messageColors.get(message.type) ?? 0xffffff).toString(16).padStart(6, '0'),
            wordWrap: { width: width - this.padding * 2 },
            align: 'left',
          },
        },
        false
      );

      this.textObjects.push(textObject);

      // Account for wrapped lines
      const lines = textObject.text.split('\n').length;
      currentY -= lines * this.lineHeight;
    }
  }

  /**
   * Render with background panel (for better visibility)
   */
  renderWithPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    showTimestamps: boolean = false,
    panelColor: number = 0x000000,
    panelAlpha: number = 0.8
  ): void {
    // Create background panel
    const panel = scene.make.rectangle(
      {
        x: x + width / 2,
        y: y + height / 2,
        width,
        height,
        fillColor: panelColor,
        fillAlpha: panelAlpha,
      },
      false
    );

    // Create border
    const border = scene.make.graphics({}, false);
    border.lineStyle(2, 0xffffff, 1);
    border.strokeRect(x, y, width, height);

    // Render messages
    this.render(scene, x, y, width, height, showTimestamps);
  }

  /**
   * Get statistics about the message log
   */
  getStatistics(): {
    totalMessages: number;
    messagesByType: { [key: string]: number };
  } {
    const statistics = {
      totalMessages: this.messages.length,
      messagesByType: {} as { [key: string]: number },
    };

    for (const type of Object.values(MessageType)) {
      const count = this.messages.filter(m => m.type === type).length;
      if (count > 0) {
        statistics.messagesByType[type] = count;
      }
    }

    return statistics;
  }

  /**
   * Export messages as formatted text
   */
  exportAsText(includeTimestamps: boolean = true): string {
    return this.messages
      .map(msg => {
        const timeStr = includeTimestamps
          ? `[${new Date(msg.timestamp).toLocaleTimeString()}] `
          : '';
        return `${timeStr}[${msg.type}] ${msg.text}`;
      })
      .join('\n');
  }

  /**
   * Filter messages by type
   */
  filterByType(type: MessageType): Message[] {
    return this.messages.filter(m => m.type === type);
  }

  /**
   * Search messages by text content
   */
  search(query: string, caseSensitive: boolean = false): Message[] {
    const searchFn = caseSensitive
      ? (text: string) => text.includes(query)
      : (text: string) => text.toLowerCase().includes(query.toLowerCase());

    return this.messages.filter(m => searchFn(m.text));
  }

  /**
   * Set rendering options
   */
  setRenderingOptions(options: {
    lineHeight?: number;
    fontSize?: number;
    fontFamily?: string;
    padding?: number;
  }): void {
    if (options.lineHeight !== undefined) this.lineHeight = options.lineHeight;
    if (options.fontSize !== undefined) this.fontSize = options.fontSize;
    if (options.fontFamily !== undefined) this.fontFamily = options.fontFamily;
    if (options.padding !== undefined) this.padding = options.padding;
  }
}
