export type NoiseSourceKind = 'player' | 'monster';

export interface NoiseEvent {
  x: number;
  y: number;
  loudness: number;
  radius: number;
  sourceKind: NoiseSourceKind;
  ttl: number;
  reason: string;
}

export interface NoiseEmission {
  x: number;
  y: number;
  loudness: number;
  radius: number;
  sourceKind: NoiseSourceKind;
  reason: string;
  ttl?: number;
}

export class NoiseSystem {
  private events: NoiseEvent[] = [];
  private readonly defaultTtl: number = 2;
  private readonly maxEvents: number = 64;

  emitNoise(emission: NoiseEmission): void {
    const loudness = Math.max(0, emission.loudness);
    const radius = Math.max(0, emission.radius);
    if (loudness <= 0 || radius <= 0) {
      return;
    }

    this.events.push({
      x: emission.x,
      y: emission.y,
      loudness,
      radius,
      sourceKind: emission.sourceKind,
      reason: emission.reason,
      ttl: Math.max(1, Math.floor(emission.ttl ?? this.defaultTtl)),
    });

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  getActiveNoiseEvents(): readonly NoiseEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }

  decayNoise(): void {
    this.events = this.events
      .map((event) => ({ ...event, ttl: event.ttl - 1 }))
      .filter((event) => event.ttl > 0);
  }
}

export default NoiseSystem;
