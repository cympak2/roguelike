// Game systems (physics, input, etc.)
export interface GameSystem {
  update(delta: number): void;
}

export class SystemManager {
  private systems: Map<string, GameSystem> = new Map();

  addSystem(name: string, system: GameSystem): void {
    this.systems.set(name, system);
  }

  update(delta: number): void {
    this.systems.forEach(system => system.update(delta));
  }
}
