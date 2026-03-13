// UI components and managers
export interface UIComponent {
  show(): void;
  hide(): void;
  update(): void;
}

export class UIManager {
  private components: Map<string, UIComponent> = new Map();

  addComponent(name: string, component: UIComponent): void {
    this.components.set(name, component);
  }

  getComponent(name: string): UIComponent | undefined {
    return this.components.get(name);
  }
}
